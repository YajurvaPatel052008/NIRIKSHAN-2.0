from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Analysis, AnalysisStatus, Recommendation, Standard, StandardRelationshipType
from app.services.embedding_service import semantic_search
from app.services.graph_service import expand_related
from app.services.ranking_service import (
    compute_confidence_score,
    generate_explanation,
    parameter_coverage,
)
from app.services.validation_service import (
    check_version_status,
    get_certification_guidance,
)


def _query_text(requirements: dict[str, Any]) -> str:
    parameters = " ".join(
        f"{item.get('name', '')} {item.get('value', '')} {item.get('unit') or ''}"
        for item in requirements.get("technical_parameters", [])
    )
    return " ".join(
        [
            requirements.get("product", ""),
            requirements.get("intended_use", ""),
            parameters,
            " ".join(requirements.get("constraints", [])),
            " ".join(requirements.get("safety_requirements", [])),
        ]
    ).strip()


def _domain_relevance(requirements: dict[str, Any], standard: Standard) -> float:
    query = " ".join(
        [
            requirements.get("product", ""),
            requirements.get("intended_use", ""),
        ]
    ).lower()
    domain = (standard.product_domain or "").replace("_", " ").lower()
    aliases = " ".join(standard.aliases or []).lower()
    return 1.0 if domain and (domain in query or any(word in query for word in aliases.split())) else 0.0


def run_analysis_pipeline(
    analysis: Analysis,
    db_session: Session,
    top_k: int = 10,
) -> list[dict[str, Any]]:
    requirements = analysis.extracted_requirements or {}
    candidates = semantic_search(_query_text(requirements), db_session, top_k=top_k)
    candidate_data: dict[int, dict[str, Any]] = {
        standard_id: {
            "semantic_similarity": score,
            "relationship_type": None,
            "primary_standard": None,
        }
        for standard_id, score in candidates
    }

    for primary_id, primary_score in candidates[:3]:
        if primary_score < 0.45:
            continue
        for related in expand_related(primary_id, max_depth=1):
            related_id = related["standard"]["id"]
            if related_id not in candidate_data:
                candidate_data[related_id] = {
                    "semantic_similarity": primary_score * 0.9,
                    "relationship_type": related["relationship_type"],
                    "primary_standard": related["standard"]["is_number"],
                }

    standards = {
        standard.id: standard
        for standard in db_session.scalars(
            select(Standard).where(Standard.id.in_(candidate_data))
        ).all()
    }
    db_session.execute(
        delete(Recommendation).where(Recommendation.analysis_id == analysis.id)
    )

    results: list[dict[str, Any]] = []
    for standard_id, candidate in candidate_data.items():
        standard = standards.get(standard_id)
        if standard is None:
            continue
        coverage, parameter_matches = parameter_coverage(
            requirements.get("technical_parameters", []),
            standard.technical_parameters or {},
        )
        version_status = check_version_status(standard)
        certification = get_certification_guidance(standard)
        requirement_text = _query_text(requirements).lower()
        searchable_product_text = " ".join(
            [
                standard.title or "",
                standard.product_domain or "",
                " ".join(standard.aliases or []),
            ]
        ).lower()
        evidence = []
        if any(
            len(token) > 2
            and token not in {"the", "for", "and", "with", "use"}
            and token in searchable_product_text
            for token in requirement_text.split()
        ):
            evidence.append(
                f"product/domain={standard.product_domain or standard.title}"
            )
        evidence.extend(parameter_matches)
        matched_fields = {
            "evidence": evidence,
            "relationship_type": candidate["relationship_type"],
            "primary_standard": candidate["primary_standard"],
        }
        signals = {
            "semantic_similarity": candidate["semantic_similarity"],
            "parameter_coverage": coverage,
            "domain_relevance": _domain_relevance(requirements, standard),
            "relationship_evidence": 1.0 if candidate["relationship_type"] else 0.0,
            "version_status": 1.0 if version_status["is_current"] else 0.0,
            "evidence_quality": 1.0 if evidence else 0.0,
        }
        confidence = compute_confidence_score(signals)
        explanation = generate_explanation(standard, matched_fields)
        recommendation = Recommendation(
            analysis_id=analysis.id,
            standard_id=standard.id,
            rank=0,
            confidence_score=confidence,
            relationship_type=(
                StandardRelationshipType(candidate["relationship_type"])
                if candidate["relationship_type"]
                else None
            ),
            semantic_similarity=candidate["semantic_similarity"],
            parameter_coverage=coverage,
            evidence_snippets=[{"text": item, "source": "retrieved standard metadata"} for item in evidence],
        )
        db_session.add(recommendation)
        results.append(
            {
                "recommendation": recommendation,
                "standard": standard,
                "confidence_score": confidence,
                "explanation": explanation,
                "version_status": version_status,
                "certification_guidance": certification,
                "evidence": evidence,
            }
        )

    results.sort(key=lambda item: item["confidence_score"], reverse=True)
    for rank, result in enumerate(results, start=1):
        result["recommendation"].rank = rank
    analysis.status = AnalysisStatus.ANALYZED
    db_session.commit()
    return results
