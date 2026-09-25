"""Load the prototype standards corpus into PostgreSQL.

Run this module after database initialization with:
    python -m app.services.seed_loader
"""

import json
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.db.base import SessionLocal
from app.models import Standard, StandardRelationship, StandardRelationshipType

SEED_PATH = Path(__file__).resolve().parents[1] / "data" / "standards_seed.json"


def load_standards_seed(seed_path: Path = SEED_PATH) -> tuple[int, int]:
    with seed_path.open(encoding="utf-8") as seed_file:
        payload: dict[str, Any] = json.load(seed_file)

    entries = payload["standards"]
    numbers = {entry["is_number"] for entry in entries}
    relationships = {
        relationship["is_number"]
        for entry in entries
        for relationship in entry.get("related_to", [])
    }
    missing_numbers = relationships - numbers
    if missing_numbers:
        raise ValueError(
            "Seed relationships reference missing standards: "
            + ", ".join(sorted(missing_numbers))
        )

    inserted_standards = 0
    inserted_relationships = 0
    with SessionLocal.begin() as session:
        standards_by_number: dict[str, Standard] = {}
        for entry in entries:
            standard = session.scalar(
                select(Standard).where(Standard.is_number == entry["is_number"])
            )
            if standard is None:
                standard = Standard(is_number=entry["is_number"])
                session.add(standard)
                inserted_standards += 1

            standard.title = entry["title"]
            standard.scope = entry["scope"]
            standard.product_domain = entry["product_domain"]
            standard.aliases = entry["aliases"]
            standard.technical_parameters = entry["technical_parameters"]
            standard.version_edition = entry["version_edition"]
            standard.amendments = entry["amendments"]
            standard.certification_metadata = entry["certification_metadata"]
            standard.source_reference = entry["source_reference"]
            standards_by_number[standard.is_number] = standard

        session.flush()

        for entry in entries:
            source = standards_by_number[entry["is_number"]]
            for related in entry.get("related_to", []):
                target = standards_by_number[related["is_number"]]
                relationship_type = StandardRelationshipType(
                    related["relationship_type"]
                )
                existing = session.scalar(
                    select(StandardRelationship).where(
                        StandardRelationship.from_standard_id == source.id,
                        StandardRelationship.to_standard_id == target.id,
                        StandardRelationship.relationship_type == relationship_type,
                    )
                )
                if existing is None:
                    session.add(
                        StandardRelationship(
                            from_standard_id=source.id,
                            to_standard_id=target.id,
                            relationship_type=relationship_type,
                        )
                    )
                    inserted_relationships += 1

    # TODO(B7): Generate and persist sentence-transformers embeddings in Vector(384).
    # TODO(B8): Build the NetworkX standards relationship graph.
    return inserted_standards, inserted_relationships


if __name__ == "__main__":
    standards, relationships = load_standards_seed()
    print(
        f"Seed complete: {standards} standards, "
        f"{relationships} relationships inserted."
    )
