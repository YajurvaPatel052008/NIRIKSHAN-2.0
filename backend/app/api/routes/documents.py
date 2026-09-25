from uuid import uuid4

import fitz
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.security import require_role
from app.models import User, UserRole
from app.services.document_parser import (
    detect_language_hint,
    store_temporary_document,
    parse_pdf,
    parse_plain_text,
)

router = APIRouter(prefix="/api/documents", tags=["documents"])


class DocumentUploadResponse(BaseModel):
    document_id: str
    parsed_text: str
    detected_language: str


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    _: User = Depends(
        require_role(UserRole.OFFICER, UserRole.REVIEWER, UserRole.ADMIN)
    ),
) -> DocumentUploadResponse:
    if file is None and text is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide a PDF/text file or a text form field",
        )

    if file is not None:
        file_bytes = await file.read()
        is_pdf = (
            file.content_type == "application/pdf"
            or (file.filename or "").lower().endswith(".pdf")
        )
        if is_pdf:
            try:
                parsed_text = parse_pdf(file_bytes)
            except (fitz.FileDataError, RuntimeError, ValueError) as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unable to parse PDF",
                ) from exc
        else:
            try:
                parsed_text = parse_plain_text(file_bytes.decode("utf-8"))
            except UnicodeDecodeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Text files must be UTF-8 encoded",
                ) from exc
    else:
        parsed_text = parse_plain_text(text or "")

    if not parsed_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded document contains no readable text",
        )

    document_id = str(uuid4())
    store_temporary_document(document_id, parsed_text)
    return DocumentUploadResponse(
        document_id=document_id,
        parsed_text=parsed_text,
        detected_language=detect_language_hint(parsed_text),
    )
