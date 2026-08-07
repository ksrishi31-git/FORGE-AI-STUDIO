"""Deterministic engine (dual-mode fallback, Phase 3.5 / Phase 4.0).

When no LLM API key is configured the agents run on this rule-based engine.
Every generator derives its output strictly from the input context — it is
not mock data. The artifacts are structurally real (requirements, schemas,
test plans, deployment plans) so the pipeline, review loop, memory, and UI
all function end-to-end in any environment. Outputs are validated against the
same Pydantic schemas as the LLM path.

Phase 4.0 makes every artifact project-specific: the architecture is derived
from the user's idea, requirements, and preferred stack (an AI product gets an
AI/LLM layer; a payments product gets a payment service), the preferred stack
actually drives the backend/frontend/database/deployment plans, and the
Reviewer produces a real scored verdict (APPROVED / NEEDS_REVISION / REJECTED)
with consistency checking and targeted feedback routing.
"""

from __future__ import annotations

import re

# --- Small helpers ----------------------------------------------------------------


def _sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [part.strip().rstrip(".") for part in parts if part.strip()]


def _title_case(value: str) -> str:
    return " ".join(word.capitalize() for word in value.split())


def _entities(features: list[str]) -> list[str]:
    """Candidate domain entities: capitalized nouns inside feature text."""
    seen: list[str] = []
    for feature in features:
        for match in re.finditer(r"\b([A-Z][a-z]{2,}s?)\b", feature):
            word = match.group(1)
            singular = re.sub(r"ies$", "y", re.sub(r"s$", "", word))
            if singular not in seen:
                seen.append(singular)
    return seen[:6] or ["Account"]


def _md_section(title: str, lines: list[str] | None = None) -> str:
    body = "\n".join(f"- {line}" for line in lines) if lines else ""
    return f"## {title}\n\n{body}".rstrip() + "\n\n"


def _stack_lower(stack: list[str]) -> list[str]:
    return [item.strip().lower() for item in stack if item and item.strip()]


def _mermaid_label(value: object) -> str:
    """Sanitize a label for a Mermaid quoted node label."""
    return str(value or "").replace('"', "'").replace("\n", " ").strip()


def _detect_domains(features: list[str], requirements: str, stack: list[str]) -> dict[str, bool]:
    """Flags describing what this project actually needs, from its inputs.

    This is what makes the architecture project-specific instead of a generic
    layered-web template: the components and services only appear when the
    user's idea, requirements, or preferred stack calls for them.
    """
    text = " ".join(features + [requirements]).lower()
    stack_text = " ".join(_stack_lower(stack))
    return {
        "ai": any(
            key in text
            for key in (
                "ai",
                "llm",
                "machine learning",
                "intelligence",
                "neural",
                "gpt",
                "assistant",
                "chatbot",
                "recommend",
            )
        )
        or any(key in stack_text for key in ("openai", "langchain", "llm", "anthropic")),
        "auth": any(
            key in text
            for key in (
                "login",
                "sign in",
                "sign up",
                "authentication",
                "auth",
                "account",
                "profile",
                "session",
                "secure access",
            )
        ),
        "payments": any(
            key in text
            for key in ("payment", "billing", "invoice", "checkout", "subscription", "stripe")
        ),
        "realtime": any(
            key in text for key in ("chat", "realtime", "real-time", "live ", "websocket")
        ),
        "storage": any(
            key in text for key in ("file", "upload", "document", "media", "image", "attachment")
        ),
        "notifications": any(
            key in text for key in ("email", "notification", "reminder", "alert", "sms")
        ),
        "caching": any(key in stack_text for key in ("redis", "memcached"))
        or "performance" in text
        or "cache" in text,
    }


def _backend_tech(stack: list[str]) -> dict[str, str]:
    text = " ".join(_stack_lower(stack))
    if "django" in text:
        return {"language": "Python", "framework": "Django", "ext": "py"}
    if any(key in text for key in ("express", "node", "nestjs")):
        return {"language": "TypeScript", "framework": "Express", "ext": "ts"}
    if "spring" in text or "java" in text:
        return {"language": "Java", "framework": "Spring Boot", "ext": "java"}
    if any(key in text for key in ("go", "golang")):
        return {"language": "Go", "framework": "Go", "ext": "go"}
    if any(key in text for key in ("laravel", "php")):
        return {"language": "PHP", "framework": "Laravel", "ext": "php"}
    return {"language": "Python", "framework": "FastAPI", "ext": "py"}


def _frontend_tech(stack: list[str]) -> dict[str, str]:
    text = " ".join(_stack_lower(stack))
    if "next.js" in text or "nextjs" in text:
        tech = "Next.js (React)"
    elif "vue" in text:
        tech = "Vue"
    elif "svelte" in text:
        tech = "Svelte"
    elif "angular" in text:
        tech = "Angular"
    else:
        tech = "React"
    return {"framework": tech, "tailwind": "tailwind" in text}


def _db_tech(stack: list[str]) -> str:
    text = " ".join(_stack_lower(stack))
    if "mongo" in text:
        return "MongoDB (document store)"
    if "mysql" in text:
        return "MySQL (relational)"
    if "sqlite" in text:
        return "SQLite (embedded)"
    if "mariadb" in text:
        return "MariaDB (relational)"
    return "PostgreSQL (relational)"


# --- Agents -----------------------------------------------------------------------


def run_product_manager(ctx: dict) -> dict:
    """Turn plain-English requirements into a structured product brief."""
    requirements = (ctx.get("requirements") or "").strip()
    feedback = ctx.get("revision_feedback") or []
    name = (ctx.get("project_name") or "").strip() or "New Product"
    sentences = _sentences(requirements)
    overview = sentences[0] if sentences else "No requirements were provided in detail."

    features: list[str] = []
    for sentence in sentences[1:]:
        candidate = sentence.strip()
        if candidate and len(candidate) < 120 and candidate not in features:
            features.append(candidate)
    if not features and sentences:
        features.append(sentences[0])

    stories = [
        f"As a user, I want to {feature[0].lower() + feature[1:]}, so the product "
        "meets the stated business need."
        for feature in features
    ]
    criteria = [f"The {feature.lower()} works end to end without errors." for feature in features]

    functional = [f"The system must support {feature.lower()}." for feature in features] or [
        "The system must fulfill the stated business purpose."
    ]
    nfr = [
        "The application must be responsive and load core views in under two seconds.",
        "User data must be protected in transit and at rest.",
        "The system must fail gracefully with clear error messages.",
        "Access to administrative functions must be role-restricted.",
    ]
    if "fast" in requirements.lower() or "performance" in requirements.lower():
        nfr.insert(0, "Performance is a first-class requirement: plan for caching and indexing.")

    roles: list[str] = ["End User"]
    lowered = requirements.lower()
    if any(key in lowered for key in ("admin", "manage user", "moderator")):
        roles.append("Administrator")
    if "accountant" in lowered or "finance" in lowered:
        roles.append("Accountant")
    if "accountant" in lowered:
        roles.insert(0, "Accountant")
    if "client" in lowered or "customer" in lowered:
        roles.insert(0, "Client")
    roles = list(dict.fromkeys(roles))[:4]

    constraints = [
        "The solution must align with the preferred technology stack.",
        "Scope is limited to the stated features for the first release.",
        "No new internal dependencies outside the declared stack.",
    ]
    if any(key in lowered for key in ("budget", "cost")):
        constraints.append("Cost is a constraint: prefer managed services over custom infra.")
    if any(key in lowered for key in ("gdpr", "hipaa", "compliance", "regulation")):
        constraints.append("Compliance obligations apply to personal data handling.")

    md = [
        f"# Product Requirements — {name}",
        "",
        "## Overview",
        "",
        overview,
        "",
        "## Functional requirements",
        "",
    ]
    md += [f"- {item}" for item in functional]
    md += ["", "## Features", ""]
    md += [f"- {feature}" for feature in features]
    md += ["", "## User roles", ""]
    md += [f"- {role}" for role in roles]
    md += ["", "## Non-functional requirements", ""]
    md += [f"- {item}" for item in nfr]
    md += ["", "## Constraints", ""]
    md += [f"- {constraint}" for constraint in constraints]
    md += ["", "## Acceptance criteria", ""]
    md += [f"- {criterion}" for criterion in criteria]
    if feedback:
        md += ["", "## Revision feedback addressed", ""]
        md += [f"- {item}" for item in feedback]

    return {
        "product_name": name,
        "overview": overview,
        "user_stories": stories,
        "features": features,
        "functional_requirements": functional,
        "non_functional_requirements": nfr,
        "user_roles": roles,
        "constraints": constraints,
        "acceptance_criteria": criteria,
        "markdown": "\n".join(md).rstrip(),
    }


def _architecture_mermaid(components: list[dict], services: list[dict]) -> str:
    """Build a project-specific system diagram from the architecture artifact.

    User → frontend → API backend → services → database, with the AI/LLM
    provider attached when the project actually needs one. Every node is
    derived from the artifact — nothing is hardcoded.
    """
    names = [str(component.get("name", "")).lower() for component in components]

    def _index(*keys: str) -> int | None:
        for index, name in enumerate(names):
            if any(key in name for key in keys):
                return index
        return None

    frontend = _index("frontend", "web", "client", "ui")
    backend = _index("api", "backend", "server", "gateway", "service")
    database = _index("database", "data store", "persistence")

    lines: list[str] = ["flowchart TD"]
    if frontend is None and backend is None and database is None:
        ids: list[str] = []
        for index, component in enumerate(components):
            node_id = f"C{index + 1}"
            ids.append(node_id)
            lines.append(
                f'  {node_id}["{_mermaid_label(component.get("name", f"Component {index + 1}"))}"]'
            )
        if ids:
            lines.insert(1, f'  User(["User"]) --> {ids[0]}')
            for current, following in zip(ids, ids[1:], strict=False):
                lines.append(f"  {current} --> {following}")
        return "\n".join(lines)

    frontend_id = f"C{frontend + 1}" if frontend is not None else None
    backend_id = f"C{backend + 1}" if backend is not None else None
    if frontend_id is not None and backend_id is not None:
        frontend_name = _mermaid_label(components[frontend].get("name"))
        backend_name = _mermaid_label(components[backend].get("name"))
        lines.append(f'  User(["User"]) --> {frontend_id}["{frontend_name}"]')
        lines.append(f'  {frontend_id} --> {backend_id}["{backend_name}"]')
    elif backend_id is not None:
        backend_name = _mermaid_label(components[backend].get("name"))
        lines.append(f'  User(["User"]) --> {backend_id}["{backend_name}"]')

    service_ids: list[str] = []
    for index, service in enumerate(services):
        service_id = f"S{index + 1}"
        service_ids.append(service_id)
        lines.append(f'  {service_id}["{_mermaid_label(service.get("name"))}"]')
        if backend_id is not None:
            lines.append(f"  {backend_id} --> {service_id}")

    if database is not None:
        database_id = f"C{database + 1}"
        lines.append(f'  {database_id}[("{_mermaid_label(components[database].get("name"))}")]')
        anchor = backend_id or (service_ids[0] if service_ids else None)
        if anchor is not None:
            lines.append(f"  {anchor} --> {database_id}")
        for service_id in service_ids:
            lines.append(f"  {service_id} --> {database_id}")
    else:
        for index, component in enumerate(components):
            if index in (frontend, backend):
                continue
            node_id = f"C{index + 1}"
            lines.append(f'  {node_id}["{_mermaid_label(component.get("name"))}"]')
            if backend_id is not None:
                lines.append(f"  {backend_id} --> {node_id}")

    def _is_ai_service(service: dict) -> bool:
        name = str(service.get("name", "")).lower()
        return "ai" in name or "llm" in name

    if any(_is_ai_service(service) for service in services):
        ai_index = next(
            (index for index, service in enumerate(services) if _is_ai_service(service)),
            None,
        )
        lines.append('  LLM(("LLM Provider"))')
        if ai_index is not None and ai_index < len(service_ids):
            lines.append(f"  {service_ids[ai_index]} --> LLM")
    return "\n".join(lines)


def run_architect(ctx: dict) -> dict:
    """Derive a project-specific architecture from the product brief and stack."""
    product = ctx.get("product_requirements") or {}
    stack = ctx.get("preferred_stack") or []
    feedback = ctx.get("revision_feedback") or []
    features = product.get("features") or []
    requirements = ctx.get("requirements") or ""
    domains = _detect_domains(features, requirements, stack)

    frontend_tech = _frontend_tech(stack)["framework"]
    backend_tech = _backend_tech(stack)
    db_tech = _db_tech(stack)

    components: list[dict] = [
        {
            "name": f"Web Frontend ({frontend_tech})",
            "responsibility": "User interface, client-side state, and API consumption.",
        },
        {
            "name": f"API Backend ({backend_tech['framework']})",
            "responsibility": "Business logic, validation, and external integrations.",
        },
    ]
    services: list[dict] = []
    if domains["auth"]:
        components.append(
            {"name": "Authentication Service", "responsibility": "Login, sessions, and tokens."}
        )
        services.append(
            {"name": "Authentication Service", "purpose": "AuthN/AuthZ and token issuance."}
        )
    if domains["payments"]:
        components.append(
            {
                "name": "Payment Service",
                "responsibility": "Payment processing and billing workflows.",
            }
        )
        services.append({"name": "Payment Service", "purpose": "Charge, refund, and reconcile."})
    if domains["notifications"]:
        components.append(
            {
                "name": "Notification Service",
                "responsibility": "Email/SMS/reminder delivery.",
            }
        )
        services.append(
            {"name": "Notification Service", "purpose": "Transactional outbound messaging."}
        )
    if domains["realtime"]:
        components.append(
            {"name": "Realtime Gateway", "responsibility": "WebSocket / live event streaming."}
        )
        services.append({"name": "Realtime Gateway", "purpose": "Live push to clients."})
    if domains["storage"]:
        components.append(
            {"name": "Storage Service", "responsibility": "File and media object handling."}
        )
        services.append({"name": "Storage Service", "purpose": "Upload and serve media."})
    if domains["ai"]:
        components.append(
            {
                "name": "AI/LLM Service",
                "responsibility": "Model inference, prompts, and agent orchestration.",
            }
        )
        services.append(
            {"name": "AI/LLM Service", "purpose": "LLM calls, prompt templates, agent loop."}
        )
    if domains["caching"]:
        components.append(
            {"name": "Cache Layer", "responsibility": "Hot-path caching and session storage."}
        )
        services.append({"name": "Cache Layer", "purpose": "Read-through cache for hot data."})
    components.append(
        {"name": f"{db_tech}", "responsibility": "Authoritative persistence for domain entities."}
    )
    services.append({"name": "Observability", "purpose": "Logs, metrics, and tracing."})

    flow = [
        "The browser loads the frontend and authenticates the user.",
        "The frontend calls the backend API with short-lived bearer tokens.",
        "The API validates requests, applies business rules, and coordinates services.",
        "Services read and write the database through a typed data layer.",
    ]
    if domains["ai"]:
        flow.append("The AI/LLM Service invokes the model provider and streams results back.")
    if domains["payments"]:
        flow.append("Payment flows call the payment provider and persist the transaction state.")
    flow.append("Responses are returned as structured JSON and rendered by the frontend.")

    decisions = [
        f"Adopt the preferred stack: {', '.join(stack) or 'open standards'}.",
        f"Backend framework: {backend_tech['framework']} ({backend_tech['language']}).",
        f"Frontend framework: {frontend_tech}.",
        f"Persistence: {db_tech}.",
    ]
    if domains["ai"]:
        decisions.append("Route model access through an AI/LLM service to keep keys server-side.")
    if domains["caching"]:
        decisions.append("Cache hot reads; invalidate on write.")
    if domains["realtime"]:
        decisions.append("Use a gateway for live updates instead of client polling.")
    decisions.append("Keep the API layer separate from business logic to stay testable.")

    security_considerations = [
        "Authenticate every protected endpoint with short-lived tokens.",
        "Validate all request payloads with typed schemas.",
        "Load secrets from environment variables only.",
    ]
    if domains["payments"]:
        security_considerations.append("Keep PCI-relevant data out of the application database.")
    if domains["ai"]:
        security_considerations.append("Sanitize prompts and cap model usage to prevent abuse.")

    risks = [
        "Scope creep from loosely defined requirements.",
        "AuthN/AuthZ must be designed before the first release.",
        "Missing integration tests increase regression risk.",
    ]
    if domains["payments"]:
        risks.append("Payment provider outages must not block non-payment features.")
    if domains["ai"]:
        risks.append("LLM latency and cost require caching and timeouts.")
    if feedback:
        risks.append("Revision feedback pending: " + "; ".join(feedback))

    md = [
        "# System Architecture",
        "",
        "## Overview",
        "",
        f"{overview_text(product, features)}",
        "",
        "## Components",
        "",
    ]
    for component in components:
        md.append(f"- **{component['name']}** — {component['responsibility']}")
    md += ["", "## Services", ""]
    md += [f"- **{service['name']}** — {service['purpose']}" for service in services]
    md += ["", "## Data flow", ""]
    md += [f"{index}. {step}" for index, step in enumerate(flow, start=1)]
    md += ["", "## Technology decisions", ""]
    md += [f"- {decision}" for decision in decisions]
    md += ["", "## Security considerations", ""]
    md += [f"- {item}" for item in security_considerations]
    md += ["", "## Risks", ""]
    md += [f"- {risk}" for risk in risks]
    md += ["", "## Feature coverage", ""]
    md += [f"- {feature}" for feature in features] or ["- (no features parsed)"]
    if feedback:
        md += ["", "## Revision feedback addressed", ""]
        md += [f"- {item}" for item in feedback]

    return {
        "architecture_overview": overview_text(product, features),
        "components": components,
        "services": services,
        "data_flow": flow,
        "technology_decisions": decisions,
        "security_considerations": security_considerations,
        "risks": risks,
        "mermaid": _architecture_mermaid(components, services),
        "markdown": "\n".join(md).rstrip(),
    }


def overview_text(product: dict, features: list[str]) -> str:
    """A one-paragraph architecture overview derived from the actual product."""
    domain = ", ".join(features[:4]) or "the stated business needs"
    stack_hint = "The system is built as a modular set of cooperating services."
    return (
        f"A purpose-built system serving: {domain}. "
        f"{stack_hint} The frontend talks to an API backend that coordinates "
        "domain services over a typed persistence layer."
    )


def _api_contract(features: list[str]) -> list[str]:
    """REST endpoints derived from the parsed features (shared by backend/QA)."""
    endpoints: list[str] = []
    for feature in features:
        entity = _entities([feature])[0]
        base = entity.lower()
        endpoints.extend(
            [
                f"GET /api/v1/{base}s — list {entity.lower()}s",
                f"POST /api/v1/{base}s — create a {entity.lower()}",
                f"GET /api/v1/{base}s/{{id}} — fetch a {entity.lower()}",
                f"PATCH /api/v1/{base}s/{{id}} — update a {entity.lower()}",
                f"DELETE /api/v1/{base}s/{{id}} — soft-delete a {entity.lower()}",
            ]
        )
    return endpoints or ["GET /api/v1/health — service readiness"]


def run_backend(ctx: dict) -> dict:
    """Derive a stack-aware backend design from the architecture."""
    product = ctx.get("product_requirements") or {}
    stack = ctx.get("preferred_stack") or []
    feedback = ctx.get("revision_feedback") or []
    features = product.get("features") or []
    tech = _backend_tech(stack)
    requirements = ctx.get("requirements") or ""
    domains = _detect_domains(features, requirements, stack)

    folder = [
        f"app/main.py — application factory and middleware ({tech['framework']})",
        "app/api/ — versioned REST routes",
        "app/core/ — configuration, security, error handling",
        "app/models/ — ORM models",
        "app/schemas/ — typed request/response contracts",
        "app/services/ — business logic",
        "app/database/ — engine and session management",
        "tests/ — contract and unit tests",
    ]
    endpoints = _api_contract(features)

    authentication: list[str] = []
    authorization: list[str] = []
    if domains["auth"]:
        authentication = [
            "Issue short-lived JWT access tokens on login.",
            "Refresh tokens rotated on a sliding window.",
            "Hash credentials with a strong KDF (bcrypt/argon2).",
        ]
        authorization = [
            "Role-based access control on admin endpoints.",
            "Ownership checks on resource-scoped routes.",
            "Deny-by-default middleware with an allowlist.",
        ]
    else:
        authentication = ["Public endpoints require no authentication for the first release."]
        authorization = ["No role restrictions on public-only endpoints."]

    validation = [
        "Validate every request payload with typed schemas.",
        "Return structured 422 responses for invalid input.",
        "Enforce max-length and format rules on user input.",
    ]
    error_handling = [
        "Central exception handler mapping errors to consistent JSON.",
        "Log correlation ids across services.",
        "Never leak stack traces to clients.",
    ]
    integrations: list[str] = []
    if domains["payments"]:
        integrations.append("Payment provider (Stripe-style) with idempotency keys.")
    if domains["notifications"]:
        integrations.append("Transactional email/SMS provider.")
    if domains["ai"]:
        integrations.append("LLM provider client with retries, timeouts, and usage tracking.")
    if domains["storage"]:
        integrations.append("Object storage for media uploads.")

    dependencies = list(dict.fromkeys(stack)) or ["FastAPI", "SQLAlchemy", "Pydantic"]
    if tech["framework"] == "FastAPI" and not any(
        "fastapi" in item.lower() for item in dependencies
    ):
        dependencies.insert(0, "FastAPI")
        dependencies.append("PostgreSQL")
    services = [
        "API layer",
        "Domain services",
        f"Data access ({_db_tech(stack)})",
        "Configuration",
    ]
    if domains["auth"]:
        services.append("Auth service")
    if domains["ai"]:
        services.append("AI/LLM service")
    if domains["payments"]:
        services.append("Payment service")

    snippet = (
        "# app/main.py\n"
        "from fastapi import FastAPI\n"
        "from app.config.settings import get_settings\n"
        "\n"
        "settings = get_settings()\n"
        "app = FastAPI(title=settings.app_name)\n"
        "\n"
        '@app.get("/api/v1/health")\n'
        "def health() -> dict:\n"
        '    return {"status": "healthy"}\n'
    )

    md = [
        "# Backend Design",
        "",
        "## Framework",
        "",
        f"{tech['framework']} ({tech['language']}) aligned with the preferred stack.",
        "",
        "## Folder structure",
        "",
    ]
    md += [f"- `{line}`" for line in folder]
    md += ["", "## API endpoints", ""]
    md += [f"- `{endpoint}`" for endpoint in endpoints]
    md += ["", "## Authentication", ""]
    md += [f"- {item}" for item in authentication]
    md += ["", "## Authorization", ""]
    md += [f"- {item}" for item in authorization]
    md += ["", "## Validation", ""]
    md += [f"- {item}" for item in validation]
    md += ["", "## Error handling", ""]
    md += [f"- {item}" for item in error_handling]
    md += ["", "## Integrations", ""]
    md += [f"- {item}" for item in integrations] or ["- (none required)"]
    md += ["", "## Dependencies", ""]
    md += [f"- {dependency}" for dependency in dependencies]
    if feedback:
        md += ["", "## Revision feedback addressed", ""]
        md += [f"- {item}" for item in feedback]

    return {
        "folder_structure": folder,
        "key_modules": ["API layer", "Domain services", "Persistence", "Configuration"],
        "api_endpoints": endpoints,
        "services": services,
        "authentication": authentication,
        "authorization": authorization,
        "validation": validation,
        "error_handling": error_handling,
        "integrations": integrations,
        "dependencies": dependencies,
        "code_snippets": [{"file": "app/main.py", "language": "python", "content": snippet}],
        "markdown": "\n".join(md).rstrip(),
    }


def run_frontend(ctx: dict) -> dict:
    """Derive a stack-aware frontend design from the product brief."""
    product = ctx.get("product_requirements") or {}
    stack = ctx.get("preferred_stack") or []
    feedback = ctx.get("revision_feedback") or []
    features = product.get("features") or []
    tech = _frontend_tech(stack)

    pages = ["/ — landing and overview"]
    for feature in features:
        entity = _entities([feature])[0].lower()
        pages.append(f"/{entity}s — browse {entity}s")
        pages.append(f"/{entity}s/new — create a {entity}")
        pages.append(f"/{entity}s/{{id}} — {entity} detail")
    if not pages:
        pages = ["/ — landing"]

    components = [
        "AppShell — navigation and layout",
        "PageHeader — breadcrumbs and actions",
        "EntityTable / EntityCard — list rendering",
        "EntityForm — validated create/update forms",
        "StatusBadge — lifecycle indicators",
        "EmptyState / ErrorState — resilient UI",
    ]
    if tech["tailwind"]:
        components.append("Tailwind-styled primitives consistent with the design tokens")
    if any("auth" in feature.lower() or "login" in feature.lower() for feature in features):
        components.append("AuthGuard — route protection and session handling")

    user_flows = [
        "Onboarding: register/sign in, land on the overview.",
        "Browse: list entities with search and pagination.",
        "Create/update: validated forms with inline errors.",
        "Inspect: detail views with related data.",
    ]
    state_management = [
        "Server state via a query cache (React Query style).",
        "Client state split by domain slice.",
        "Optimistic updates for fast, honest feedback.",
    ]
    api_integration = [
        "Typed API client generated from the backend contracts.",
        "Bearer token injection on every request.",
        "401 handling that redirects to re-authentication.",
    ]
    accessibility = [
        "Semantic landmarks and keyboard navigation.",
        "WCAG AA contrast and focus-visible states.",
        "ARIA labels on interactive controls.",
    ]
    data_layer = [
        "services/ — typed API client with Zod schemas",
        "hooks/ — data hooks",
        "providers/ — session and theme context",
    ]

    md = [
        "# Frontend Design",
        "",
        "## Framework",
        "",
        f"{tech['framework']}{' + Tailwind CSS' if tech['tailwind'] else ''}.",
        "",
        "## Pages",
        "",
    ]
    md += [f"- {page}" for page in pages]
    md += ["", "## Component library", ""]
    md += [f"- {component}" for component in components]
    md += ["", "## User flows", ""]
    md += [f"- {flow}" for flow in user_flows]
    md += ["", "## State management", ""]
    md += [f"- {item}" for item in state_management]
    md += ["", "## API integration", ""]
    md += [f"- {item}" for item in api_integration]
    md += ["", "## Accessibility", ""]
    md += [f"- {item}" for item in accessibility]
    md += ["", "## Data layer", ""]
    md += [f"- {item}" for item in data_layer]
    if feedback:
        md += ["", "## Revision feedback addressed", ""]
        md += [f"- {item}" for item in feedback]

    return {
        "app_structure": pages,
        "pages": pages,
        "components": components,
        "user_flows": user_flows,
        "state_management": state_management,
        "api_integration": api_integration,
        "accessibility": accessibility,
        "data_layer": data_layer,
        "markdown": "\n".join(md).rstrip(),
    }


def run_database(ctx: dict) -> dict:
    """Derive a stack-aware schema from the parsed features."""
    product = ctx.get("product_requirements") or {}
    stack = ctx.get("preferred_stack") or []
    feedback = ctx.get("revision_feedback") or []
    features = product.get("features") or []
    entities = _entities(features)
    db = _db_tech(stack)

    tables: list[dict] = []
    relationships: list[str] = []
    for index, entity in enumerate(entities):
        columns = [
            {"name": "id", "type": "UUID", "constraints": "PRIMARY KEY"},
            {"name": "name", "type": "VARCHAR(200)", "constraints": "NOT NULL"},
            {"name": "created_at", "type": "TIMESTAMPTZ", "constraints": "DEFAULT now()"},
            {"name": "updated_at", "type": "TIMESTAMPTZ", "constraints": "DEFAULT now()"},
        ]
        fks: list[str] = []
        if index > 0:
            parent = entities[0].lower()
            fks.append(f"{parent}_id → {parent}s.id")
            columns.append(
                {
                    "name": f"{parent}_id",
                    "type": "UUID",
                    "constraints": f"REFERENCES {parent}s(id)",
                }
            )
            relationships.append(
                f"{entity} belongs to one {entities[0]}; a {entities[0]} has "
                f"many {entity.lower()}s."
            )
        tables.append(
            {
                "name": f"{entity.lower()}s",
                "purpose": f"Stores {entity.lower()} records.",
                "columns": columns,
                "primary_key": "id",
                "foreign_keys": fks,
                "indexes": [f"ix_{entity.lower()}s_created_at"],
            }
        )

    notes = [
        f"Target database: {db}.",
        "Use UUID primary keys to avoid enumeration and merge conflicts.",
        "Apply soft-delete flags on core entities.",
        "Add composite indexes for the most common filter paths.",
        "Run migrations with Alembic; keep the schema under version control.",
    ]

    md = ["# Database Schema", ""]
    md.append(f"## Target database\n\n{db}\n")
    for table in tables:
        md.append(f"## `{table['name']}`")
        md.append("")
        md.append(table["purpose"])
        md.append("")
        md.append("| Column | Type | Constraints |")
        md.append("| --- | --- | --- |")
        for column in table["columns"]:
            md.append(f"| {column['name']} | {column['type']} | {column['constraints']} |")
        md.append("")
    md.append("## Relationships")
    md.append("")
    md += [f"- {relationship}" for relationship in relationships] or ["- (none)"]
    md.append("")
    md.append("## Migration notes")
    md.append("")
    md += [f"- {note}" for note in notes]
    if feedback:
        md.append("")
        md.append("## Revision feedback addressed")
        md.append("")
        md += [f"- {item}" for item in feedback]

    return {
        "tables": tables,
        "relationships": relationships,
        "migration_notes": notes,
        "markdown": "\n".join(md).rstrip(),
    }


def run_qa(ctx: dict) -> dict:
    """Derive a tiered test plan from the user stories and artifacts."""
    product = ctx.get("product_requirements") or {}
    backend = ctx.get("backend_output") or {}
    feedback = ctx.get("revision_feedback") or []
    stories = product.get("user_stories") or []
    endpoints = backend.get("api_endpoints") or []

    test_cases: list[dict] = []
    for index, story in enumerate(stories, start=1):
        title = story.replace("As a user, I want to ", "").split(", so")[0][:60]
        test_cases.append(
            {
                "id": f"TC-{index:03d}",
                "title": f"Verify: {_title_case(title)}",
                "steps": [
                    "Navigate to the relevant view",
                    "Perform the primary action",
                    "Confirm the success state is shown",
                    "Repeat the action to confirm idempotency",
                ],
                "expected": "The behavior described in the story works end to end without errors.",
            }
        )
    test_cases.append(
        {
            "id": f"TC-{len(test_cases) + 1:03d}",
            "title": "Verify API error handling",
            "steps": [
                "Call an endpoint with invalid payload",
                "Call an endpoint without authentication",
            ],
            "expected": (
                "Structured error responses with correct status codes; no internal details leaked."
            ),
        }
    )

    unit_tests = [
        "Validation: each typed schema rejects malformed payloads.",
        "Services: business rules return correct results for representative inputs.",
        "Helpers: formatting and transformation utilities.",
    ]
    integration_tests = []
    if endpoints:
        integration_tests = [
            f"Contract test: `{endpoint.split(' — ')[0]}`." for endpoint in endpoints[:6]
        ]
    else:
        integration_tests = ["Contract tests for every public endpoint."]
    edge_cases = [
        "Empty collections and missing resources.",
        "Concurrent writes to the same record.",
        "Unicode and oversized input values.",
        "Idempotent retries on payment-style operations.",
    ]
    criteria = product.get("acceptance_criteria") or []
    acceptance_tests = [f"Scenario: {criterion}" for criterion in criteria]

    matrix = [
        "Backend — contract tests for every endpoint",
        "Frontend — component and form validation tests",
        "Database — migration and constraint tests",
        "E2E — one happy path per user story",
    ]
    risks = [
        "Third-party integrations are not covered by unit tests.",
        "Accessibility needs a dedicated pass.",
    ]

    md = [
        "# QA Test Plan",
        "",
        "## Summary",
        "",
        f"{len(test_cases)} test cases derived from {len(stories)} user stories.",
        "",
        "## Test cases",
        "",
    ]
    for case in test_cases:
        md.append(f"### {case['id']} — {case['title']}")
        md.append("")
        md += [f"{index}. {step}" for index, step in enumerate(case["steps"], start=1)]
        md.append("")
        md.append(f"**Expected:** {case['expected']}")
        md.append("")
    md.append("## Unit tests")
    md.append("")
    md += [f"- {item}" for item in unit_tests]
    md.append("")
    md.append("## Integration tests")
    md.append("")
    md += [f"- {item}" for item in integration_tests]
    md.append("")
    md.append("## Edge cases")
    md.append("")
    md += [f"- {item}" for item in edge_cases]
    md.append("")
    md.append("## Acceptance tests")
    md.append("")
    md += [f"- {item}" for item in acceptance_tests] or ["- (none)"]
    md.append("")
    md.append("## Test matrix")
    md.append("")
    md += [f"- {row}" for row in matrix]
    if feedback:
        md.append("")
        md.append("## Revision feedback addressed")
        md.append("")
        md += [f"- {item}" for item in feedback]

    return {
        "summary": f"{len(test_cases)} test cases derived from {len(stories)} user stories.",
        "test_cases": test_cases,
        "unit_tests": unit_tests,
        "integration_tests": integration_tests,
        "edge_cases": edge_cases,
        "acceptance_tests": acceptance_tests,
        "test_matrix": matrix,
        "risks": risks,
        "markdown": "\n".join(md).rstrip(),
    }


def run_security(ctx: dict) -> dict:
    """Derive a security assessment from the architecture, backend, and schema."""
    architecture = ctx.get("architecture") or {}
    components = architecture.get("components") or []
    backend = ctx.get("backend_output") or {}
    endpoints = backend.get("api_endpoints") or []
    authentication = backend.get("authentication") or []
    feedback = ctx.get("revision_feedback") or []
    requirements = ctx.get("requirements") or ""
    domains = _detect_domains([], requirements, [])
    needs_auth = domains["auth"]

    has_auth = any("token" in item.lower() or "jwt" in item.lower() for item in authentication)
    findings: list[dict] = []
    if needs_auth and not has_auth:
        findings.append(
            {
                "severity": "high",
                "title": "Authentication coverage",
                "recommendation": (
                    "The product requires user accounts, but the backend design implements "
                    "no token authentication. Add login, JWT issuance, and protected routes."
                ),
            }
        )
    elif needs_auth:
        findings.append(
            {
                "severity": "medium",
                "title": "Token lifecycle",
                "recommendation": (
                    "Keep access tokens short-lived and rotate refresh tokens on reuse."
                ),
            }
        )
    findings.extend(
        [
            {
                "severity": "medium",
                "title": "Input validation",
                "recommendation": (
                    "Validate all request payloads with typed schemas; reject malformed data."
                ),
            },
            {
                "severity": "medium",
                "title": "Secrets management",
                "recommendation": (
                    "Load credentials from environment variables; never commit secrets."
                ),
            },
            {
                "severity": "medium",
                "title": "Rate limiting",
                "recommendation": "Throttle public endpoints to mitigate abuse.",
            },
        ]
    )

    # A high risk level is reserved for genuinely critical gaps: the product
    # needs authentication but the backend does not implement it.
    risk_level = "high" if (needs_auth and not has_auth) else "medium"
    threats = [
        "Credential theft via phishing or leaked secrets.",
        "Injection and malformed-input attacks on public endpoints.",
        "Privilege escalation through missing authorization checks.",
        "Abuse of third-party integrations (payments, email, LLM).",
    ]
    vulnerabilities = [f"{finding['severity']}: {finding['title']}" for finding in findings]
    mitigations = [
        "Enable HTTPS everywhere and set secure, httpOnly cookies.",
        "Sanitize user-generated content before rendering.",
        "Pin and audit third-party dependencies.",
        "Log access and failures with correlation ids.",
    ]
    security_recommendations = [
        "Run dependency scanning in CI.",
        "Add rate limiting and an allowlist firewall at the edge.",
        "Encrypt sensitive columns at rest.",
        "Conduct a manual review before the first production release.",
    ]
    checklist = [
        "Enable HTTPS everywhere",
        "Set secure, httpOnly cookies for sessions",
        "Sanitize user-generated content before rendering",
        "Pin and audit third-party dependencies",
        "Log access and failures with correlation ids",
    ]

    md = [
        "# Security Audit",
        "",
        "## Summary",
        "",
        f"Risk level: **{risk_level.upper()}** — assessment of {len(components)} components "
        f"and {len(endpoints)} endpoints.",
        "",
        "## Threats",
        "",
    ]
    md += [f"- {threat}" for threat in threats]
    md += ["", "## Vulnerabilities", ""]
    md += [f"- {vulnerability}" for vulnerability in vulnerabilities]
    md += ["", "## Findings", ""]
    for finding in findings:
        md.append(f"### [{finding['severity'].upper()}] {finding['title']}")
        md.append("")
        md.append(f"{finding['recommendation']}")
        md.append("")
    md.append("## Mitigations")
    md.append("")
    md += [f"- {item}" for item in mitigations]
    md.append("")
    md.append("## Security recommendations")
    md.append("")
    md += [f"- {item}" for item in security_recommendations]
    md.append("")
    md.append("## Checklist")
    md.append("")
    md += [f"- [ ] {item}" for item in checklist]
    if feedback:
        md.append("")
        md.append("## Revision feedback addressed")
        md.append("")
        md += [f"- {item}" for item in feedback]

    return {
        "summary": (
            f"Risk level: {risk_level.upper()} — assessment of {len(components)} components "
            f"and {len(endpoints)} endpoints."
        ),
        "risk_level": risk_level,
        "threats": threats,
        "vulnerabilities": vulnerabilities,
        "mitigations": mitigations,
        "findings": findings,
        "checklist": checklist,
        "security_recommendations": security_recommendations,
        "markdown": "\n".join(md).rstrip(),
    }


def run_devops(ctx: dict) -> dict:
    """Derive a stack-aware deployment plan from the architecture."""
    stack = ctx.get("preferred_stack") or []
    feedback = ctx.get("revision_feedback") or []
    stack_text = " ".join(_stack_lower(stack))
    if "mongo" in stack_text:
        db_service: dict = {"name": "db", "image": "mongo:7", "port": "27017"}
    elif "mysql" in stack_text:
        db_service = {"name": "db", "image": "mysql:8", "port": "3306"}
    else:
        db_service = {"name": "db", "image": "postgres:16", "port": "5432"}
    services: list[dict] = [
        {"name": "web", "image": "forgeai-web", "port": "3000"},
        {"name": "api", "image": "forgeai-api", "port": "8000"},
        db_service,
    ]
    if "redis" in stack_text:
        services.append({"name": "cache", "image": "redis:7", "port": "6379"})

    environment = [
        "development — local hot-reload services",
        "staging — mirrored production config",
        "production — health-gated rollout",
    ]
    docker = [
        "Multi-stage Dockerfiles for web and api images",
        "docker-compose.yml wiring services, volumes, and networks",
        "Read-only root filesystem and non-root runtime user",
    ]
    ci_cd = [
        "Install dependencies and run linters",
        "Run unit and contract tests",
        "Build container images and push to the registry",
        "Apply database migrations on deploy",
        "Deploy behind a reverse proxy with health checks",
    ]
    infrastructure = [
        "Reverse proxy / load balancer terminating TLS",
        "Managed database with automated backups",
    ]
    if "redis" in stack_text:
        infrastructure.append("Managed cache instance")
    monitoring = [
        "Health checks wired into the load balancer",
        "Structured logs with correlation ids",
        "Error-rate and latency dashboards",
        "Alerting on failed deploys and 5xx spikes",
    ]
    deployment_steps = [
        "Tag the release and run CI/CD",
        "Run backward-compatible migrations",
        "Roll the new images out behind health gates",
        "Verify synthetic checks and watch dashboards",
    ]
    env_vars = [
        "DATABASE_URL — connection string",
        "SECRET_KEY — token signing secret",
        "LLM_API_KEY — model provider key (if configured)",
        "NEXT_PUBLIC_API_URL — browser-facing API origin",
    ]
    rollback = [
        "Keep the previous image tagged for one-click rollback",
        "Run migrations in a backward-compatible order",
        "Enable a kill switch to disable new releases",
    ]

    md = [
        "# Deployment Plan",
        "",
        "## Overview",
        "",
        "Containerized deployment with Docker Compose; roll forward with health-gated deploys.",
        "",
        "## Environments",
        "",
    ]
    md += [f"- {env}" for env in environment]
    md += ["", "## Services", "", "| Service | Image | Port |", "| --- | --- | --- |"]
    md += [f"| {s['name']} | {s['image']} | {s['port']} |" for s in services]
    md += ["", "## Docker", ""]
    md += [f"- {item}" for item in docker]
    md += ["", "## CI/CD", ""]
    md += [f"{index}. {step}" for index, step in enumerate(ci_cd, start=1)]
    md += ["", "## Infrastructure", ""]
    md += [f"- {item}" for item in infrastructure]
    md += ["", "## Monitoring", ""]
    md += [f"- {item}" for item in monitoring]
    md += ["", "## Deployment steps", ""]
    md += [f"{index}. {step}" for index, step in enumerate(deployment_steps, start=1)]
    md += ["", "## Rollback", ""]
    md += [f"- {step}" for step in rollback]
    if feedback:
        md += ["", "## Revision feedback addressed", ""]
        md += [f"- {item}" for item in feedback]

    return {
        "overview": "Containerized deployment with Docker Compose.",
        "environment": environment,
        "services": services,
        "docker": docker,
        "ci_cd_steps": ci_cd,
        "infrastructure": infrastructure,
        "monitoring": monitoring,
        "deployment_steps": deployment_steps,
        "environment_variables": env_vars,
        "rollback": rollback,
        "markdown": "\n".join(md).rstrip(),
    }


def run_writer(ctx: dict) -> dict:
    """Assemble project documentation from the completed artifacts."""
    project_name = ctx.get("project_name") or "The Project"
    product = ctx.get("product_requirements") or {}
    architecture = ctx.get("architecture") or {}
    backend = ctx.get("backend_output") or {}
    frontend = ctx.get("frontend_output") or {}
    deployment = ctx.get("deployment_plan") or {}
    feedback = ctx.get("revision_feedback") or []

    overview = product.get("overview") or "A software product built by ForgeAI Studio agents."
    endpoints = backend.get("api_endpoints") or []
    services = deployment.get("services") or []
    pages = frontend.get("pages") or []

    readme = (
        f"# {project_name}\n\n{overview}\n\n"
        "Built by the ForgeAI Studio autonomous engineering pipeline: requirements, "
        "architecture, implementation, testing, security review, and deployment planning "
        "are produced by specialist agents.\n"
    )
    quickstart = [
        "Clone the repository and install backend dependencies.",
        "Set environment variables from the provided example file.",
        "Run database migrations.",
        "Start the API and web services.",
        "Open the application in a browser.",
    ]
    setup = [
        "Backend: create a virtual environment and install requirements.",
        "Frontend: install npm dependencies.",
        "Copy `.env.example` to `.env` and fill in secrets.",
        "Run `alembic upgrade head` to migrate the database.",
    ]
    api_reference = endpoints or ["See /api/v1/docs for the interactive OpenAPI reference."]
    architecture_doc = architecture.get("architecture_overview") or "Layered web application."
    guide = [f"Run `docker compose up -d` to start {len(services)} services."] if services else []
    development = [
        "Run backend tests with the project test runner.",
        "Lint and typecheck the frontend before opening a PR.",
        "Add a migration for every schema change.",
    ]

    md = [
        f"# {project_name}",
        "",
        "## Overview",
        "",
        overview,
        "",
        "## Architecture",
        "",
        architecture_doc,
        "",
        "## Setup",
        "",
    ]
    md += [f"{index}. {step}" for index, step in enumerate(setup, start=1)]
    md += ["", "## Quickstart", ""]
    md += [f"{index}. {step}" for index, step in enumerate(quickstart, start=1)]
    md += ["", "## API documentation", ""]
    md += [f"- `{endpoint}`" for endpoint in api_reference]
    md += ["", "## Development", ""]
    md += [f"- {item}" for item in development]
    md += ["", "## Pages", ""]
    md += [f"- {page}" for page in pages[:8]]
    md += ["", "## Deployment", ""]
    md += [f"- {step}" for step in guide]
    if feedback:
        md += ["", "## Revision feedback addressed", ""]
        md += [f"- {item}" for item in feedback]

    return {
        "overview": overview,
        "setup": setup,
        "architecture": architecture_doc,
        "api_documentation": api_reference,
        "development": development,
        "deployment": guide,
        "readme": readme,
        "quickstart": quickstart,
        "api_reference": api_reference,
        "deployment_guide": guide,
        "markdown": "\n".join(md).rstrip(),
    }


# --- Reviewer: the quality gate ----------------------------------------------------


# Dimension → responsible agent, used to route feedback to the right specialist.
_DIMENSION_AGENT: dict[str, str] = {
    "requirement_coverage": "product_manager",
    "architecture_quality": "solution_architect",
    "database_quality": "database_architect",
    "backend_quality": "backend_engineer",
    "frontend_quality": "frontend_engineer",
    "qa_coverage": "qa_engineer",
    "security_score": "security_auditor",
    "deployment_readiness": "devops_engineer",
    "documentation_quality": "technical_writer",
}

APPROVAL_THRESHOLD = 90
REVISION_THRESHOLD = 75


def _pct(present: int, total: int) -> int:
    if total <= 0:
        return 100
    return max(0, min(100, round(present / total * 100)))


def _req_coverage(requirements: str, product: dict) -> tuple[int, list[str]]:
    issues: list[str] = []
    score = 0
    if len(requirements.strip()) >= 20:
        score += 15
    else:
        issues.append("The source requirements are too brief to validate the generated artifacts.")
    if product.get("features"):
        score += 30
    else:
        issues.append("No features were derived from the requirements.")
    if product.get("functional_requirements"):
        score += 20
    else:
        issues.append("Functional requirements are missing.")
    if product.get("acceptance_criteria"):
        score += 15
    else:
        issues.append("Acceptance criteria are missing.")
    if product.get("user_roles"):
        score += 10
    else:
        issues.append("User roles are not defined.")
    if product.get("non_functional_requirements"):
        score += 10
    else:
        issues.append("Non-functional requirements are not defined.")
    return min(score, 100), issues


def _arch_quality(architecture: dict) -> tuple[int, list[str]]:
    issues: list[str] = []
    score = round(_pct(len(architecture.get("components") or []), 3) * 0.25)  # 25 pts
    score += 15 if architecture.get("services") else 0
    score += 15 if architecture.get("technology_decisions") else 0
    score += 15 if architecture.get("data_flow") else 0
    score += 15 if architecture.get("security_considerations") else 0
    score += 15 if architecture.get("mermaid") else 0
    if not architecture.get("components"):
        issues.append("The architecture does not define any components.")
    if not architecture.get("technology_decisions"):
        issues.append("The architecture lacks explicit technology decisions.")
    return min(score, 100), issues


def _backend_quality(backend: dict) -> tuple[int, list[str]]:
    issues: list[str] = []
    score = round(_pct(len(backend.get("api_endpoints") or []), 1) * 0.30)  # 30 pts
    score += 15 if backend.get("services") else 0
    score += 15 if backend.get("authentication") else 0
    score += 10 if backend.get("validation") else 0
    score += 10 if backend.get("error_handling") else 0
    score += 10 if backend.get("integrations") else 0
    score += 10 if backend.get("dependencies") else 0
    if not backend.get("api_endpoints"):
        issues.append("The backend design defines no API endpoints.")
    return min(score, 100), issues


def _frontend_quality(frontend: dict) -> tuple[int, list[str]]:
    issues: list[str] = []
    score = round(_pct(len(frontend.get("pages") or []), 1) * 0.30)  # 30 pts
    score += 15 if frontend.get("components") else 0
    score += 15 if frontend.get("user_flows") else 0
    score += 10 if frontend.get("state_management") else 0
    score += 10 if frontend.get("api_integration") else 0
    score += 10 if frontend.get("accessibility") else 0
    score += 10 if frontend.get("data_layer") else 0
    if not frontend.get("pages"):
        issues.append("The frontend design defines no pages.")
    return min(score, 100), issues


def _database_quality(database: dict) -> tuple[int, list[str]]:
    issues: list[str] = []
    score = round(_pct(len(database.get("tables") or []), 1) * 0.40)  # 40 pts
    score += 20 if database.get("relationships") else 0
    score += 20 if database.get("migration_notes") else 0
    score += 20 if any(table.get("indexes") for table in database.get("tables") or []) else 0
    if not database.get("tables"):
        issues.append("The database design defines no tables.")
    return min(score, 100), issues


def _qa_quality(qa: dict) -> tuple[int, list[str]]:
    issues: list[str] = []
    score = round(_pct(len(qa.get("test_cases") or []), 1) * 0.35)  # 35 pts
    score += 15 if qa.get("unit_tests") else 0
    score += 15 if qa.get("integration_tests") else 0
    score += 10 if qa.get("edge_cases") else 0
    score += 15 if qa.get("acceptance_tests") else 0
    score += 10 if qa.get("test_matrix") else 0
    if not qa.get("test_cases"):
        issues.append("The QA plan defines no test cases.")
    return min(score, 100), issues


def _security_quality(security: dict) -> tuple[int, list[str]]:
    issues: list[str] = []
    score = round(_pct(len(security.get("findings") or []), 1) * 0.25)  # 25 pts
    score += 15 if security.get("threats") else 0
    score += 15 if security.get("vulnerabilities") else 0
    score += 15 if security.get("mitigations") else 0
    score += 15 if security.get("security_recommendations") else 0
    score += 10 if security.get("checklist") else 0
    if security.get("risk_level") == "high":
        score = min(score, 65)
        issues.append("The security audit reports a high residual risk level.")
    return min(score, 100), issues


def _devops_quality(deployment: dict) -> tuple[int, list[str]]:
    issues: list[str] = []
    score = round(_pct(len(deployment.get("services") or []), 1) * 0.25)  # 25 pts
    score += 15 if deployment.get("ci_cd_steps") else 0
    score += 15 if deployment.get("docker") else 0
    score += 15 if deployment.get("infrastructure") else 0
    score += 15 if deployment.get("monitoring") else 0
    score += 15 if deployment.get("deployment_steps") else 0
    if not deployment.get("services"):
        issues.append("The deployment plan defines no services.")
    return min(score, 100), issues


def _doc_quality(documentation: dict) -> tuple[int, list[str]]:
    issues: list[str] = []
    score = round(_pct(len(documentation.get("readme") or ""), 40) * 0.25)  # 25 pts
    score += 15 if documentation.get("overview") else 0
    score += 15 if documentation.get("setup") else 0
    score += 10 if documentation.get("architecture") else 0
    score += 15 if documentation.get("api_documentation") else 0
    score += 10 if documentation.get("development") else 0
    score += 10 if documentation.get("deployment") else 0
    if not documentation.get("readme"):
        issues.append("The documentation lacks a README.")
    return min(score, 100), issues


def _consistency_checks(
    product: dict,
    architecture: dict,
    backend: dict,
    frontend: dict,
    database: dict,
    security: dict,
    preferred_stack: list[str],
) -> tuple[list[str], dict[str, str]]:
    """Cross-artifact consistency audit.

    Returns (issue_texts, responsible_agent_by_issue) so the Reviewer can route
    each contradiction to the agent that must fix it.
    """
    issues: list[str] = []
    owners: dict[str, str] = {}
    stack = _stack_lower(preferred_stack)

    # 1. Database mismatch: the database plan vs the backend's dependencies.
    db_name = _db_tech(stack).lower()
    backend_deps = " ".join(str(item).lower() for item in backend.get("dependencies") or [])
    if any(name in backend_deps for name in ("mongodb", "mongo")) and "mongo" not in db_name:
        issues.append(
            "Database mismatch: the database plan targets a relational store while "
            "the backend depends on MongoDB."
        )
        owners["Database mismatch"] = "database_architect"
    relational = ("postgres" in backend_deps, "mysql" in backend_deps)
    relational_ok = any(name in db_name for name in ("postgres", "mysql", "sqlite", "mariadb"))
    if any(relational) and not relational_ok:
        issues.append(
            "Database mismatch: the backend assumes a relational database not "
            "covered by the database plan."
        )
        owners["Database mismatch"] = "database_architect"

    # 2. Frontend API integration vs the backend endpoint contract.
    frontend_apis = " ".join(str(item).lower() for item in frontend.get("api_integration") or [])
    backend_endpoints = [str(item).lower() for item in backend.get("api_endpoints") or []]
    for method in ("get", "post", "patch", "delete"):
        pattern = "/api/v1/"
        if pattern in frontend_apis and not any(
            method in endpoint for endpoint in backend_endpoints
        ):
            issues.append(
                f"The frontend expects {method.upper()} API calls but the backend "
                f"defines no {method.upper()} endpoints."
            )
            owners["Missing backend endpoint"] = "backend_engineer"
            break

    # 3. Authentication consistency: security demands auth the backend never implemented.
    security_findings = " ".join(
        str(item.get("title", "")).lower() for item in security.get("findings") or []
    )
    backend_auth = " ".join(str(item).lower() for item in backend.get("authentication") or [])
    security_wants_auth = any(
        key in security_findings for key in ("token", "jwt", "authentication")
    )
    backend_has_auth = any(key in backend_auth for key in ("token", "jwt", "auth"))
    if security_wants_auth and not backend_has_auth:
        issues.append(
            "Authentication implementation incomplete: security requires token auth "
            "that the backend design does not implement."
        )
        owners["Authentication implementation incomplete"] = "backend_engineer"

    return issues, owners


def _route_feedback(
    scores: dict[str, int],
    consistency_issues: list[str],
    consistency_owners: dict[str, str],
) -> tuple[dict[str, list[str]], str | None]:
    """Distribute actionable feedback to the responsible agents.

    Returns (feedback_by_agent, target_agent). Consistency issues take
    priority; otherwise the lowest-scoring dimension routes to its owner.
    """
    feedback_by_agent: dict[str, list[str]] = {}
    for issue, agent in consistency_owners.items():
        feedback_by_agent.setdefault(agent, []).append(issue)

    weakest: list[tuple[str, int]] = []
    for dimension, score in scores.items():
        if dimension == "consistency_score":
            continue
        agent = _DIMENSION_AGENT.get(dimension)
        if agent is None:
            continue
        if score < 75:
            feedback_by_agent.setdefault(agent, []).append(
                f"{dimension.replace('_', ' ').title()} scored {score}/100 and needs improvement."
            )
            weakest.append((dimension, score))

    target: str | None = None
    if consistency_issues:
        target = next(iter(consistency_owners.values()), None)
    if target is None and weakest:
        target = _DIMENSION_AGENT.get(min(weakest, key=lambda item: item[1])[0])
    return feedback_by_agent, target


def run_reviewer(ctx: dict) -> dict:
    """Evaluate the complete artifact set and return a scored, routed verdict.

    Thresholds: 90+ APPROVED · 75–89 NEEDS_REVISION · below 75 REJECTED.
    Critical security findings override the numeric score (REJECTED).
    """
    requirements = (ctx.get("requirements") or "").strip()
    product = ctx.get("product_requirements") or {}
    architecture = ctx.get("architecture") or {}
    backend = ctx.get("backend_output") or {}
    frontend = ctx.get("frontend_output") or {}
    database = ctx.get("database_schema") or {}
    qa = ctx.get("qa_report") or {}
    security = ctx.get("security_report") or {}
    deployment = ctx.get("deployment_plan") or {}
    documentation = ctx.get("documentation") or {}
    preferred_stack = ctx.get("preferred_stack") or []
    review_count = int(ctx.get("review_count") or 0)

    req_score, req_issues = _req_coverage(requirements, product)
    arch_score, arch_issues = _arch_quality(architecture)
    backend_score, backend_issues = _backend_quality(backend)
    frontend_score, frontend_issues = _frontend_quality(frontend)
    db_score, db_issues = _database_quality(database)
    qa_score, qa_issues = _qa_quality(qa)
    security_score, security_issues = _security_quality(security)
    devops_score, devops_issues = _devops_quality(deployment)
    doc_score, doc_issues = _doc_quality(documentation)

    consistency_issues, consistency_owners = _consistency_checks(
        product, architecture, backend, frontend, database, security, preferred_stack
    )
    consistency_score = max(40, 100 - 20 * len(consistency_issues))

    scores = {
        "requirement_coverage": req_score,
        "architecture_quality": arch_score,
        "backend_quality": backend_score,
        "frontend_quality": frontend_score,
        "database_quality": db_score,
        "qa_coverage": qa_score,
        "security_score": security_score,
        "deployment_readiness": devops_score,
        "documentation_quality": doc_score,
        "consistency_score": consistency_score,
    }
    weights = {
        "requirement_coverage": 0.14,
        "architecture_quality": 0.12,
        "backend_quality": 0.11,
        "frontend_quality": 0.11,
        "database_quality": 0.10,
        "qa_coverage": 0.10,
        "security_score": 0.12,
        "deployment_readiness": 0.08,
        "documentation_quality": 0.07,
        "consistency_score": 0.05,
    }
    overall = round(sum(scores[dim] * weights[dim] for dim in scores))

    # --- Threshold verdict -----------------------------------------------------
    if overall >= APPROVAL_THRESHOLD:
        status = "APPROVED"
    elif overall >= REVISION_THRESHOLD:
        status = "NEEDS_REVISION"
    else:
        status = "REJECTED"

    # --- Security override -----------------------------------------------------
    critical_security = security.get("risk_level") == "high" or any(
        item.get("severity") == "high" for item in security.get("findings") or []
    )
    if critical_security and status != "REJECTED":
        status = "REJECTED"

    feedback_by_agent, target_agent = _route_feedback(
        scores, consistency_issues, consistency_owners
    )

    # --- Requirements brevity gate ----------------------------------------------
    # A short source brief cannot validate a full artifact set; route it back to
    # the Product Manager even when the generated artifacts score highly.
    brief = len(requirements.strip()) < 20
    if brief and status == "APPROVED":
        status = "NEEDS_REVISION"
        feedback_by_agent.setdefault("product_manager", []).append(
            "Expand the source requirements with concrete features and user goals "
            "so the generated artifacts can be validated against them."
        )
        target_agent = target_agent or "product_manager"

    all_issues = list(
        dict.fromkeys(
            req_issues
            + arch_issues
            + backend_issues
            + frontend_issues
            + db_issues
            + qa_issues
            + security_issues
            + devops_issues
            + doc_issues
            + consistency_issues
        )
    )
    feedback = [issue for issue in all_issues]
    for agent_issues in feedback_by_agent.values():
        for item in agent_issues:
            if item not in feedback:
                feedback.append(item)

    strengths = [
        "A complete artifact set was produced for every pipeline stage.",
        "Artifacts reference each other consistently (architecture → schema → endpoints).",
    ]

    # Reflection budget: never loop forever — the last pass accepts with
    # warnings. A security-critical run is never force-approved: the hard bound
    # lives in the graph (MAX_REVIEW_CYCLES), which still terminates the run
    # while preserving the REJECTED verdict.
    exhausted = not (status == "APPROVED") and review_count >= 2
    approved = status == "APPROVED"
    if critical_security:
        status = "REJECTED"
        approved = False
        verdict = "REJECTED"
        next_action = "revise"
        findings = all_issues + ["Security-critical finding overrides the numeric score."]
        target_agent = target_agent or "backend_engineer"
        feedback_by_agent.setdefault("backend_engineer", []).append(
            "Resolve the critical security findings before resubmission."
        )
    elif exhausted:
        status = "APPROVED"
        approved = True
        verdict = "APPROVED"
        next_action = "proceed"
        findings = all_issues + ["Reflection budget exhausted; proceeding with warnings."]
    else:
        verdict = status
        next_action = "proceed" if approved else "revise"
        findings = all_issues

    md = [
        f"# Review — {verdict}",
        "",
        f"**Overall score: {overall}/100** — {verdict}",
        "",
        "## Scores",
        "",
        "| Dimension | Score |",
        "| --- | --- |",
    ]
    md += [
        f"| {dimension.replace('_', ' ').title()} | {score}/100 |"
        for dimension, score in scores.items()
    ]
    md.append(f"| **Overall** | **{overall}/100** |")
    if target_agent:
        md += ["", f"**Feedback routed to:** {target_agent.replace('_', ' ').title()}", ""]
    md += ["", "## Strengths", ""]
    md += [f"- {strength}" for strength in strengths]
    md += ["", "## Consistency issues", ""]
    md += [f"- {issue}" for issue in consistency_issues] or ["- None"]
    md += ["", "## Findings", ""]
    md += [f"- {finding}" for finding in findings] or ["- None"]
    md += ["", "## Feedback", ""]
    md += [f"- {item}" for item in feedback] or ["- Proceed to the next stage."]

    return {
        "approved": approved,
        "verdict": verdict,
        "status": status,
        "overall_score": overall,
        "scores": scores,
        "strengths": strengths,
        "findings": findings,
        "consistency_issues": consistency_issues,
        "feedback": feedback,
        "feedback_by_agent": feedback_by_agent,
        "target_agent": target_agent,
        "next_action": next_action,
        "markdown": "\n".join(md).rstrip(),
    }
