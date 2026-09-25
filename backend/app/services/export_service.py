import json
import tempfile
from pathlib import Path
from typing import Any

from docx import Document

from app.services.validation_service import (
    check_version_status,
    get_certification_guidance,
)


def _recommendation_content(accepted_recommendations: list[Any]) -> list[dict[str, Any]]:
    content = []
    for recommendation in accepted_recommendations:
        standard = recommendation.standard
        version = check_version_status(standard)
        certification = get_certification_guidance(standard)
        content.append(
            {
                "is_number": standard.is_number,
                "title": standard.title,
                "relationship_type": (
                    recommendation.relationship_type.value
                    if recommendation.relationship_type
                    else None
                ),
                "version_amendment_note": version["note"],
                "certification_note": certification["notes"],
            }
        )
    return content


def _analysis_summary(analysis: Any) -> dict[str, Any]:
    requirements = analysis.extracted_requirements or {}
    return {
        "title": analysis.title,
        "product": requirements.get("product", ""),
        "intended_use": requirements.get("intended_use", ""),
    }


def generate_specification_json(
    analysis: Any,
    accepted_recommendations: list[Any],
) -> dict[str, Any]:
    return {
        "document_type": "tender-ready specification block",
        "analysis": _analysis_summary(analysis),
        "accepted_standards": _recommendation_content(accepted_recommendations),
    }


def generate_specification_docx(
    analysis: Any,
    accepted_recommendations: list[Any],
) -> str:
    document = Document()
    document.add_heading("Tender-Ready Specification Block", level=1)
    document.add_paragraph(f"Analysis title: {analysis.title}")

    summary = _analysis_summary(analysis)
    document.add_heading("Product and Use Case Summary", level=2)
    document.add_paragraph(f"Product: {summary['product'] or 'Not specified'}")
    document.add_paragraph(
        f"Intended use: {summary['intended_use'] or 'Not specified'}"
    )

    document.add_heading("Accepted Indian Standards", level=2)
    table = document.add_table(rows=1, cols=5)
    table.style = "Table Grid"
    headers = [
        "IS number",
        "Title",
        "Relationship type",
        "Version/amendment note",
        "Certification note",
    ]
    for cell, header in zip(table.rows[0].cells, headers):
        cell.text = header

    for standard in _recommendation_content(accepted_recommendations):
        cells = table.add_row().cells
        values = [
            standard["is_number"],
            standard["title"],
            standard["relationship_type"] or "primary",
            standard["version_amendment_note"],
            standard["certification_note"],
        ]
        for cell, value in zip(cells, values):
            cell.text = value

    output = tempfile.NamedTemporaryFile(
        prefix="NIRIKSHAN-specification-",
        suffix=".docx",
        delete=False,
    )
    output.close()
    path = Path(output.name)
    document.save(path)
    return str(path)
