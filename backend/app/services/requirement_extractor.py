import json
import re
from typing import Any

from groq import Groq
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import settings

MODEL = "llama-3.3-70b-versatile"


class TechnicalParameter(BaseModel):
    name: str
    value: str
    unit: str | None = None


class ExtractedRequirements(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product: str
    intended_use: str
    technical_parameters: list[TechnicalParameter] = Field(default_factory=list)
    safety_requirements: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    ambiguous_or_missing_fields: list[str] = Field(default_factory=list)


SYSTEM_PROMPT = """You are a procurement requirement-extraction assistant.
Extract only information stated or strongly implied by the provided text.
Do not invent numbers, units, standards, product properties, or safety claims.
If a field is ambiguous or missing, use a short entry in
"ambiguous_or_missing_fields" instead of guessing.
Return only a JSON object matching this exact schema:
{
  "product": "string",
  "intended_use": "string",
  "technical_parameters": [
    {"name": "string", "value": "string", "unit": "string or null"}
  ],
  "safety_requirements": ["string"],
  "constraints": ["string"],
  "ambiguous_or_missing_fields": ["string"]
}
"""


def _strip_json_fences(content: str) -> str:
    cleaned = content.strip()
    fenced = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", cleaned, re.DOTALL)
    return fenced.group(1).strip() if fenced else cleaned


def _parse_response(content: str) -> ExtractedRequirements:
    parsed: Any = json.loads(_strip_json_fences(content))
    return ExtractedRequirements.model_validate(parsed)


def _request_extraction(client: Groq, raw_text: str, correction: bool = False) -> str:
    prompt = (
        "Return only valid JSON. Do not use Markdown fences. "
        "Re-check every value against the source text and put uncertain or "
        "missing information in ambiguous_or_missing_fields.\n\n"
        if correction
        else ""
    )
    response = client.chat.completions.create(
        model=MODEL,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"{prompt}Source text:\n{raw_text}"},
        ],
    )
    content = response.choices[0].message.content
    if not content:
        raise ValueError("Groq returned an empty response")
    return content


def extract_requirements(raw_text: str) -> ExtractedRequirements:
    if not raw_text.strip():
        raise ValueError("Cannot extract requirements from empty text")
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    client = Groq(api_key=settings.groq_api_key)
    first_content = _request_extraction(client, raw_text)
    try:
        return _parse_response(first_content)
    except (json.JSONDecodeError, TypeError, ValidationError, ValueError) as first_error:
        try:
            return _parse_response(_request_extraction(client, raw_text, correction=True))
        except (json.JSONDecodeError, TypeError, ValidationError, ValueError) as retry_error:
            raise ValueError(
                "Groq returned invalid requirement JSON after retry"
            ) from retry_error
