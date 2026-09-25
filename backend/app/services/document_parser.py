import re
from io import BytesIO

import fitz
import pytesseract
from PIL import Image

_temporary_documents: dict[str, str] = {}


def store_temporary_document(document_id: str, parsed_text: str) -> None:
    _temporary_documents[document_id] = parsed_text


def get_temporary_document(document_id: str) -> str | None:
    return _temporary_documents.get(document_id)


def parse_pdf(file_bytes: bytes) -> str:
    """Extract PDF text, using OCR for pages with little selectable text."""
    pages: list[str] = []
    with fitz.open(stream=file_bytes, filetype="pdf") as document:
        for page in document:
            extracted = page.get_text("text").strip()
            if len(extracted) < 20:
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                image = Image.open(BytesIO(pixmap.tobytes("png")))
                extracted = pytesseract.image_to_string(image).strip()
            pages.append(extracted)
    return parse_plain_text("\n\n".join(pages))


def parse_plain_text(text: str) -> str:
    """Normalize whitespace while retaining paragraph and line boundaries."""
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    normalized = re.sub(r"[ \t]+", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def detect_language_hint(text: str) -> str:
    """Return a lightweight language hint without translating the input."""
    normalized = parse_plain_text(text)
    if not normalized:
        return "unknown"

    if re.search(r"[^\x00-\x7F]", normalized):
        return "other"

    words = set(re.findall(r"[a-z]+", normalized.lower()))
    english_markers = {
        "a",
        "and",
        "for",
        "in",
        "is",
        "of",
        "the",
        "to",
        "with",
    }
    return "english" if len(words & english_markers) >= 2 else "other"
