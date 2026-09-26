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
    """Format stored certification metadata without inferring unrecorded schemes."""
    metadata: Mapping[str, Any] = standard.certification_metadata or {}
    if not metadata:
        return {
            "applicable_schemes": [],
            "mandatory": False,
            "notes": "No certification metadata available for this standard",
        }

    scheme_details = {
        "bis_product_certification": {
            "scheme_name": "BIS Product Certification",
            "certificate_license_number_format": "Format: CM/L-XXXXXXX",
            "validity_note": (
                "Validity periods and renewal requirements vary by applicable "
                "scheme. Verify the current license directly with BIS."
            ),
        },
        "crs": {
            "scheme_name": "Compulsory Registration Scheme (CRS)",
            "certificate_license_number_format": "Format: R-XXXXXXXX",
            "validity_note": (
                "Verify the registration's current validity and renewal status "
                "directly with BIS."
            ),
        },
        "hallmarking": {
            "scheme_name": "Hallmarking",
            "certificate_license_number_format": (
                "Format varies by hallmarking registration and applicable mark."
            ),
            "validity_note": (
                "Verify current hallmarking registration and applicable "
                "requirements directly with BIS."
            ),
        },
    }
    applicable_schemes: list[dict[str, Any]] = []
    for key, defaults in scheme_details.items():
        stored_scheme = metadata.get(key)
        if stored_scheme is True:
            stored_scheme = {"mandatory": key == "bis_product_certification"}
        elif not isinstance(stored_scheme, Mapping):
            continue

        scheme = {**defaults, **stored_scheme}
        scheme["scheme_name"] = str(scheme.get("scheme_name") or defaults["scheme_name"])
        scheme["mandatory"] = bool(scheme.get("mandatory", False))
        scheme["certificate_license_number_format"] = str(
            scheme.get("certificate_license_number_format")
            or defaults["certificate_license_number_format"]
        )
        scheme["validity_note"] = str(
            scheme.get("validity_note") or defaults["validity_note"]
        )
        applicable_schemes.append(scheme)

    for key, value in metadata.items():
        if key not in scheme_details and value is True:
            applicable_schemes.append(
                {
                    "scheme_name": key.replace("_", " ").title(),
                    "mandatory": False,
                    "certificate_license_number_format": (
                        "Number format not provided in the stored metadata."
                    ),
                    "validity_note": (
                        "Verify current applicability and validity with the "
                        "relevant issuing authority."
                    ),
                }
            )

    if applicable_schemes:
        notes = (
            "Scheme details are recorded in the standards dataset. Confirm "
            "current applicability and mandatory status with BIS."
        )
    else:
        notes = (
            "Certification metadata is present, but no applicable scheme is "
            "flagged for this standard."
        )

    return {
        "applicable_schemes": applicable_schemes,
        "mandatory": any(scheme["mandatory"] for scheme in applicable_schemes),
        "notes": notes,
    }
