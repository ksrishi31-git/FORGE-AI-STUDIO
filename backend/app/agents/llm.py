"""LangChain LLM client (Phase 3.5 — dual-mode execution, Phase 4.0 hardening).

Used only when an LLM API key is configured; otherwise agents run on the
deterministic engine. Outputs are validated against the agent's Pydantic
output schema. A malformed or schema-invalid response is retried with a repair
prompt (bounded retries) before the node falls back to the deterministic
engine — malformed LLM output can never poison downstream agents.
"""

from __future__ import annotations

import json
import re

from app.agents.base import Agent
from app.config.settings import Settings
from app.core.logging import get_logger

logger = get_logger(__name__)

MAX_LLM_RETRIES = 2


class LlmClient:
    """Thin wrapper over a LangChain chat model with schema-validated output."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model = None
        self.model_name: str | None = None
        if settings.llm_api_key:
            try:
                from langchain_openai import ChatOpenAI

                self.model_name = settings.llm_model or "gpt-4o-mini"
                self._model = ChatOpenAI(
                    model=self.model_name,
                    api_key=settings.llm_api_key,
                    temperature=0.2,
                    max_retries=2,
                    timeout=60,
                )
            except Exception as exc:  # pragma: no cover - import/environment failure
                logger.warning("LLM client unavailable: {error}", error=exc)
                self._model = None

    def is_available(self) -> bool:
        return self._model is not None

    def generate(self, agent: Agent, context: dict) -> tuple[dict, int | None]:
        """Ask the model for a JSON artifact matching the agent's output schema.

        Returns `(validated_artifact, total_tokens)` when usage is reported.
        Raises `ValueError` when the model cannot produce valid output after the
        retry budget — the caller then degrades this node to the deterministic
        engine.
        """
        assert self._model is not None, "generate() called while the LLM is unavailable"

        schema = json.dumps(agent.output_schema.model_json_schema(), indent=2)
        prompt = (
            "You are acting as the following agent.\n\n"
            f"SYSTEM PROMPT:\n{agent.system_prompt}\n\n"
            f"CONTEXT (JSON):\n{json.dumps(context, indent=2, default=str)}\n\n"
            "Produce your artifact as a single JSON object that conforms exactly to "
            f"this JSON Schema. The schema also defines the required fields.\n\n"
            f"JSON SCHEMA:\n{schema}\n\n"
            "Reply with only the JSON object. Do not wrap it in markdown fences."
        )

        last_error: Exception | None = None
        for attempt in range(MAX_LLM_RETRIES + 1):
            messages = [
                {"role": "system", "content": agent.system_prompt},
                {"role": "user", "content": prompt},
            ]
            if attempt > 0:
                messages.append(
                    {
                        "role": "user",
                        "content": (
                            "Your previous response was rejected: "
                            f"{last_error}. Return a corrected JSON object matching "
                            "the schema exactly, with no markdown fences."
                        ),
                    }
                )
            response = self._model.invoke(messages)
            raw = (
                response.content
                if isinstance(response.content, str)
                else json.dumps(response.content)
            )
            try:
                payload = self._extract_json(raw)
                validated = agent.output_schema.model_validate(payload).model_dump()
                return validated, self._usage_tokens(response)
            except (ValueError, json.JSONDecodeError, TypeError) as exc:
                last_error = exc
                logger.warning(
                    "LLM output invalid for {agent} (attempt {attempt}): {error}",
                    agent=agent.key,
                    attempt=attempt + 1,
                    error=exc,
                )
        raise ValueError(
            f"LLM produced invalid output after {MAX_LLM_RETRIES + 1} attempts"
        ) from last_error

    @staticmethod
    def _usage_tokens(response) -> int | None:
        """Best-effort total token count from the provider response metadata."""
        metadata = getattr(response, "response_metadata", None) or {}
        usage = metadata.get("token_usage") or metadata.get("usage")
        if isinstance(usage, dict):
            return usage.get("total_tokens") or usage.get("completion_tokens")
        usage_metadata = getattr(response, "usage_metadata", None)
        if isinstance(usage_metadata, dict):
            return usage_metadata.get("total_tokens")
        return None

    @staticmethod
    def _extract_json(raw: str) -> dict:
        """Extract the JSON object from a model response (fence-tolerant)."""
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if match is None:
            raise ValueError("LLM response contained no JSON object")
        payload = json.loads(match.group(0))
        if not isinstance(payload, dict):
            raise ValueError("LLM response JSON was not an object")
        return payload
