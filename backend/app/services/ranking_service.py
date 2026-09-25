from typing import Any

from app.services.validation_service import check_version_status

# These are prototype engineering weights, not an official BIS scoring system.
SIGNAL_WEIGHTS = {
    "semantic_similarity": 0.35,
    "parameter_coverage": 0.25,
    "domain_relevance": 0.15,
    "relationship_evidence": 0.10,
    "version_status": 0.10,
    "evidence_quality": 0.05,
}


def compute_confidence_score(signals: dict[str, float]) -> float:
    score = sum(
        SIGNAL_WEIGHTS[name] * max(0.0, min(1.0, signals.get(name, 0.0)))
        for name in SIGNAL_WEIGHTS
    )
    return round(max(0.0, min(1.0, score)), 4)


def generate_explanation(
    standard: Any,
    matched_requirement_fields: dict[str, Any],
) -> str:
    evidence = matched_requirement_fields.get("evidence", [])
    relationship_type = matched_requirement_fields.get("relationship_type")
    primary_standard = matched_requirement_fields.get("primary_standard")
    parts = [f"Matched {item}" for item in evidence]
    if relationship_type and primary_standard:
        parts.append(f"found via {relationship_type} from {primary_standard}")
    if not parts:
        parts.append(
            f"Candidate standard {standard.is_number} matched the extracted requirements"
        )
    return "; ".join(parts) + "."


def parameter_coverage(
    extracted_parameters: list[dict[str, Any]],
    standard_parameters: dict[str, Any],
) -> tuple[float, list[str]]:
    if not extracted_parameters:
        return 0.0, []

    standard_text = " ".join(
        f"{key} {value}".lower() for key, value in standard_parameters.items()
    )
    matches: list[str] = []
    for parameter in extracted_parameters:
        name = str(parameter.get("name", "")).strip()
        value = str(parameter.get("value", "")).strip()
        if name and name.lower() in standard_text:
            if value and value.lower() in standard_text:
                matches.append(
                    f"technical_parameter {name}={value}{parameter.get('unit') or ''}"
                )
            else:
                matches.append(f"technical_parameter {name}")
    return len(matches) / len(extracted_parameters), matches
