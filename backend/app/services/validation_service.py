from collections.abc import Mapping
from typing import Any


def check_version_status(standard: Any) -> dict[str, Any]:
    """Summarize version metadata without consulting an external BIS feed."""
    latest_version = standard.version_edition or "Unknown version"
    amendments = list(standard.amendments or [])

    if amendments:
        note = (
            "Amendments are recorded for this prototype entry; review the "
            "latest official BIS publication before procurement."
        )
    elif standard.version_edition:
        note = (
            "No amendments are recorded in this prototype dataset. "
            "This is not a live BIS currency check."
        )
    else:
        note = (
            "No version information is available in this prototype entry; "
            "verify the latest official BIS publication."
        )

    return {
        "is_current": bool(standard.version_edition) and not amendments,
        "latest_version": latest_version,
        "amendments": amendments,
        "note": note,
    }


def get_certification_guidance(standard: Any) -> dict[str, Any]:
    """Format stored certification flags without inferring unrecorded schemes."""
    metadata: Mapping[str, Any] = standard.certification_metadata or {}
    if not metadata:
        return {
            "applicable_schemes": [],
            "mandatory": False,
            "notes": "No certification metadata available for this prototype entry",
        }

    scheme_labels = {
        "bis_product_certification": "BIS Product Certification",
        "crs": "Compulsory Registration Scheme (CRS)",
        "hallmarking": "Hallmarking",
    }
    applicable_schemes = [
        label
        for key, label in scheme_labels.items()
        if metadata.get(key) is True
    ]
    unknown_flags = [
        key
        for key, value in metadata.items()
        if key not in scheme_labels and value is True
    ]
    if unknown_flags:
        applicable_schemes.extend(unknown_flags)

    if applicable_schemes:
        notes = (
            "The listed schemes are flagged in the stored prototype metadata. "
            "Confirm current applicability and mandatory status with BIS."
        )
    else:
        notes = (
            "Certification metadata is present, but no applicable scheme is "
            "flagged in this prototype entry."
        )

    return {
        "applicable_schemes": applicable_schemes,
        "mandatory": metadata.get("bis_product_certification") is True,
        "notes": notes,
    }
