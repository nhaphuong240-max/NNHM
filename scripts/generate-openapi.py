#!/usr/bin/env python3
"""Generate OpenAPI 3.1 spec from WEREAL Thiet-ke-API.md catalog."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("Installing PyYAML...", file=sys.stderr)
    import subprocess

    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyyaml", "-q"])
    import yaml

ROOT = Path(__file__).resolve().parents[1]
API_DOC = ROOT / "Thiet-ke-API.md"
OUTPUT = ROOT / "openapi.yaml"

MODULE_TO_TAG = {
    "Identity": "Identity",
    "Golden Record": "GoldenRecord",
    "Listing": "Listing",
    "Search": "Search",
    "CRM": "CRM",
    "Booking": "Booking",
    "Payment": "Payment",
    "Ledger": "Ledger",
    "AI": "AI",
    "Analytics": "Analytics",
    "Audit": "Audit",
    "SSE": "Stream",
    "Stream": "Stream",
}

PUBLIC_PATHS = {
    "/auth/login",
    "/auth/refresh",
    "/search/units",
    "/search/suggest",
    "/leads",
    "/stream/units",
}

PUBLIC_POST_ONLY = {"/leads"}

METHOD_DEFAULT_STATUS = {
    "GET": "200",
    "POST": "201",
    "PATCH": "200",
    "DELETE": "204",
}


def parse_endpoints(content: str) -> list[dict]:
    sections = re.split(r"\n---\n", content)
    endpoints: list[dict] = []

    for section in sections:
        header = re.search(r"#### (API-\d+): `(\w+) ([^`]+)`", section)
        if not header:
            continue

        api_id = header.group(1)
        method = header.group(2).lower()
        short_path = header.group(3).strip()

        module_match = re.search(r"\*\*Module:\*\* (.+)", section)
        module = module_match.group(1).strip() if module_match else "Unknown"

        table = re.search(
            r"\| \*\*Method\*\* \| `(\w+)` \|\n"
            r"\| \*\*Path\*\* \| `([^`]+)` \|\n"
            r"\| \*\*Auth\*\* \| ([^|]+) \|\n"
            r"\| \*\*FR link\*\* \| ([^|]+) \|\n"
            r"\| \*\*Idempotency\*\* \| ([^|]+) \|",
            section,
        )
        if table:
            method = table.group(1).lower()
            full_path = table.group(2)
            auth = table.group(3).strip()
            fr_link = table.group(4).strip()
            idempotency = table.group(5).strip()
        else:
            full_path = f"/api/v1{short_path if short_path.startswith('/') else '/' + short_path}"
            auth = ""
            fr_link = ""
            idempotency = ""

        path = re.sub(r"^/api/v1", "", full_path)
        if not path.startswith("/"):
            path = "/" + path

        req_match = re.search(
            r"\*\*Request body schema:\*\*\n\n```json\n([\s\S]*?)```", section
        )
        request_example = None
        request_is_query = False
        if req_match:
            raw = req_match.group(1).strip()
            if raw.startswith("(") or raw.startswith("?"):
                request_is_query = True
            elif raw not in {"(empty)", "(empty body — 204 No Content)"}:
                try:
                    request_example = json.loads(raw)
                except json.JSONDecodeError:
                    request_example = {"description": raw}

        resp_match = re.search(
            r"\*\*Response schema:\*\*\n\n```json\n([\s\S]*?)```", section
        )
        response_example = None
        no_content = False
        if resp_match:
            raw = resp_match.group(1).strip()
            if raw in {"(empty)", "(empty body — 204 No Content)"}:
                no_content = True
            else:
                try:
                    response_example = json.loads(raw)
                except json.JSONDecodeError:
                    response_example = {"description": raw}

        status_codes = re.findall(r"- (\d{3}) ", section)
        if not status_codes:
            status_codes = [METHOD_DEFAULT_STATUS.get(method.upper(), "200")]

        endpoints.append(
            {
                "api_id": api_id,
                "method": method,
                "path": path,
                "module": module,
                "auth": auth,
                "fr_link": fr_link,
                "idempotency": idempotency,
                "request_example": request_example,
                "request_is_query": request_is_query,
                "response_example": response_example,
                "no_content": no_content,
                "status_codes": status_codes,
                "summary": f"{api_id}: {method.upper()} {path}",
            }
        )

    return endpoints


def path_to_openapi(path: str) -> str:
    return re.sub(r"\{(\w+)\}", r"{\1}", path)


def extract_path_params(path: str) -> list[dict]:
    params = []
    for name in re.findall(r"\{(\w+)\}", path):
        params.append(
            {
                "name": name,
                "in": "path",
                "required": True,
                "schema": {"type": "string"},
                "description": f"Resource identifier ({name})",
            }
        )
    return params


def is_public_endpoint(ep: dict) -> bool:
    path = ep["path"]
    method = ep["method"]
    auth = ep["auth"].lower()
    if "public" in auth and "authenticated" not in auth:
        return True
    if path in PUBLIC_PATHS:
        if method == "post" and path in PUBLIC_POST_ONLY:
            return True
        if method == "get":
            return True
    if path.startswith("/auth/") and method in {"login", "refresh"}:
        return True
    if path.startswith("/auth/login") or path == "/auth/refresh":
        return True
    return False


def needs_tenant_header(ep: dict) -> bool:
    if is_public_endpoint(ep):
        if ep["path"] in {"/auth/login", "/auth/refresh"}:
            return False
        if ep["path"].startswith("/search/"):
            return False
        if ep["method"] == "post" and ep["path"] == "/leads":
            return False
    auth = ep["auth"].lower()
    if "public" in auth and "bearer" not in auth and "admin" not in auth:
        if ep["path"] == "/webhooks/payment":
            return False
        if ep["path"].startswith("/search/"):
            return False
    if ep["path"] == "/webhooks/payment":
        return False
    return "public" not in auth or "authenticated" in auth or "bearer" in auth


def needs_idempotency(ep: dict) -> bool:
    idem = ep["idempotency"].lower()
    return "có" in idem or "bắt buộc" in idem or "provider" in idem


def operation_id(ep: dict) -> str:
    path = ep["path"].strip("/").replace("/", "_").replace("{", "").replace("}", "")
    return f"{ep['method']}_{path}"


def build_spec(endpoints: list[dict]) -> dict:
    paths: dict = {}

    for ep in endpoints:
        oas_path = path_to_openapi(ep["path"])
        if oas_path not in paths:
            paths[oas_path] = {}

        op: dict = {
            "tags": [MODULE_TO_TAG.get(ep["module"], ep["module"])],
            "operationId": operation_id(ep),
            "summary": ep["summary"],
            "description": f"**{ep['api_id']}** | Module: {ep['module']} | FR: {ep['fr_link']} | Auth: {ep['auth']}",
            "parameters": [],
            "responses": {},
            "x-wereal-api-id": ep["api_id"],
            "x-wereal-fr-link": ep["fr_link"],
        }

        op["parameters"].extend(extract_path_params(oas_path))

        if needs_tenant_header(ep):
            op["parameters"].append({"$ref": "#/components/parameters/XTenantId"})
        op["parameters"].append({"$ref": "#/components/parameters/XRequestId"})
        if ep["method"] == "get" and ep["request_is_query"]:
            op["parameters"].append({"$ref": "#/components/parameters/Cursor"})
            op["parameters"].append({"$ref": "#/components/parameters/Limit"})

        if needs_idempotency(ep):
            op["parameters"].append({"$ref": "#/components/parameters/XIdempotencyKey"})

        if not is_public_endpoint(ep):
            if ep["path"] == "/webhooks/payment":
                op["security"] = [{"WebhookHmac": []}]
            elif ep["path"] == "/auth/refresh":
                op["security"] = [{"RefreshToken": []}]
            else:
                op["security"] = [{"BearerAuth": []}]

        if ep["method"] in {"post", "patch", "put", "delete"} and ep["request_example"]:
            op["requestBody"] = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/GenericObject"},
                        "example": ep["request_example"],
                    }
                },
            }
        elif ep["method"] == "post" and ep["path"] == "/auth/logout":
            op["requestBody"] = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/RefreshTokenRequest"},
                    }
                },
            }
        elif ep["method"] == "post" and ep["path"] == "/auth/login":
            op["requestBody"] = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/LoginRequest"},
                    }
                },
            }
        elif ep["method"] == "post" and ep["path"] == "/auth/refresh":
            op["requestBody"] = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/RefreshTokenRequest"},
                    }
                },
            }

        for code in sorted(set(ep["status_codes"])):
            if code == "204" or ep["no_content"]:
                op["responses"]["204"] = {"description": "No Content"}
            elif code.startswith("4") or code.startswith("5"):
                op["responses"][code] = {"$ref": "#/components/responses/ProblemDetails"}
            else:
                content = {}
                if ep["response_example"] is not None:
                    content = {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/ApiResponse"},
                            "example": ep["response_example"],
                        }
                    }
                elif ep["path"] == "/webhooks/payment":
                    content = {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/WebhookAckResponse"},
                        }
                    }
                else:
                    content = {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/ApiResponse"},
                        }
                    }
                op["responses"][code] = {"description": "Successful response", "content": content}

        if "200" not in op["responses"] and "201" not in op["responses"] and "204" not in op["responses"]:
            default = METHOD_DEFAULT_STATUS.get(ep["method"].upper(), "200")
            if default == "204":
                op["responses"]["204"] = {"description": "No Content"}
            else:
                op["responses"][default] = {
                    "description": "Successful response",
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/ApiResponse"},
                        }
                    },
                }

        paths[oas_path][ep["method"]] = op

    spec = {
        "openapi": "3.1.0",
        "info": {
            "title": "WEREAL REOS API",
            "version": "1.0.0",
            "description": (
                "REST API contract for WEREAL Real Estate Operating System — Phase 1 MVP.\n\n"
                "Generated from `Thiet-ke-API.md` (WEREAL-API-2026-v1.0).\n"
                "Baseline: WEREAL-BL-2026-002.\n\n"
                "71 endpoints across Identity, Golden Record, Listing, Search, CRM, "
                "Booking, Payment, Ledger, AI, Analytics, Audit, and Stream modules."
            ),
            "contact": {"name": "WEREAL Platform Team", "email": "platform@wereal.vn"},
            "license": {"name": "Proprietary"},
            "x-document-id": "WEREAL-API-2026-v1.0",
        },
        "jsonSchemaDialect": "https://json-schema.org/draft/2020-12/schema",
        "servers": [
            {"url": "https://api.wereal.vn/api/v1", "description": "Production"},
            {"url": "https://api.staging.wereal.vn/api/v1", "description": "Staging"},
            {"url": "http://localhost:3000/api/v1", "description": "Local development"},
        ],
        "tags": [
            {"name": "Identity", "description": "Auth, tenant, user, role — FR-ID-01→04"},
            {"name": "GoldenRecord", "description": "Project, building, unit GR — FR-GR-01→04"},
            {"name": "Listing", "description": "Marketing listing + moderation — FR-LS-01"},
            {"name": "Search", "description": "Public search + suggest — FR-LS-02"},
            {"name": "CRM", "description": "Lead, activity, pipeline — FR-CRM-01→05"},
            {"name": "Booking", "description": "Transaction state machine — FR-BK-01→04"},
            {"name": "Payment", "description": "PaymentIntent, webhook — FR-PAY-01→05"},
            {"name": "Ledger", "description": "Double-entry, reconciliation — FR-PAY-03,04"},
            {"name": "AI", "description": "Copilot, lead scoring — FR-AI-01→04"},
            {"name": "Analytics", "description": "KPI dashboard — FR-AN-01"},
            {"name": "Audit", "description": "Audit trail — FR-TR-01"},
            {"name": "Stream", "description": "SSE real-time — FR-GR-08"},
        ],
        "paths": dict(sorted(paths.items())),
        "components": {
            "securitySchemes": {
                "BearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                    "description": "JWT access token (TTL 15 minutes). Requires X-Tenant-Id header.",
                },
                "RefreshToken": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "X-Refresh-Token",
                    "description": "Refresh token (also accepted in request body or httpOnly cookie).",
                },
                "WebhookHmac": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "X-Signature",
                    "description": "HMAC-SHA256 signature + gateway IP allowlist.",
                },
            },
            "parameters": {
                "XTenantId": {
                    "name": "X-Tenant-Id",
                    "in": "header",
                    "required": True,
                    "schema": {"type": "string", "format": "uuid"},
                    "description": "Tenant context for RLS isolation (FR-ID-03).",
                },
                "XRequestId": {
                    "name": "X-Request-Id",
                    "in": "header",
                    "required": False,
                    "schema": {"type": "string", "format": "uuid"},
                    "description": "Trace correlation ID (NFR-O01).",
                },
                "XIdempotencyKey": {
                    "name": "X-Idempotency-Key",
                    "in": "header",
                    "required": True,
                    "schema": {"type": "string", "format": "uuid"},
                    "description": "Idempotency key for safe retries (TTL 24h).",
                },
                "Cursor": {
                    "name": "cursor",
                    "in": "query",
                    "required": False,
                    "schema": {"type": "string"},
                    "description": "Cursor for pagination.",
                },
                "Limit": {
                    "name": "limit",
                    "in": "query",
                    "required": False,
                    "schema": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20},
                    "description": "Page size (max 100).",
                },
            },
            "schemas": {
                "ApiResponse": {
                    "type": "object",
                    "required": ["data"],
                    "properties": {
                        "data": {
                            "oneOf": [
                                {"$ref": "#/components/schemas/Resource"},
                                {"type": "array", "items": {"$ref": "#/components/schemas/Resource"}},
                                {"type": "object"},
                            ]
                        },
                        "meta": {"$ref": "#/components/schemas/ResponseMeta"},
                    },
                },
                "Resource": {
                    "type": "object",
                    "required": ["id", "type"],
                    "properties": {
                        "id": {"type": "string", "description": "Prefixed ULID (un_, ls_, bk_, ld_)"},
                        "type": {"type": "string"},
                        "attributes": {"type": "object", "additionalProperties": True},
                        "relationships": {"type": "object", "additionalProperties": True},
                    },
                },
                "ResponseMeta": {
                    "type": "object",
                    "properties": {
                        "requestId": {"type": "string"},
                        "timestamp": {"type": "string", "format": "date-time"},
                        "page": {"$ref": "#/components/schemas/PageMeta"},
                    },
                },
                "PageMeta": {
                    "type": "object",
                    "properties": {
                        "cursor": {"type": ["string", "null"]},
                        "nextCursor": {"type": ["string", "null"]},
                        "hasMore": {"type": "boolean"},
                        "limit": {"type": "integer"},
                        "number": {"type": "integer"},
                        "size": {"type": "integer"},
                        "totalElements": {"type": "integer"},
                        "totalPages": {"type": "integer"},
                    },
                },
                "ProblemDetails": {
                    "type": "object",
                    "description": "RFC 7807 Problem Details",
                    "properties": {
                        "type": {"type": "string", "format": "uri"},
                        "title": {"type": "string"},
                        "status": {"type": "integer"},
                        "detail": {"type": "string"},
                        "instance": {"type": "string"},
                        "traceId": {"type": "string", "format": "uuid"},
                        "errors": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "field": {"type": "string"},
                                    "code": {"type": "string"},
                                    "message": {"type": "string"},
                                },
                            },
                        },
                    },
                },
                "LoginRequest": {
                    "type": "object",
                    "required": ["email", "password"],
                    "properties": {
                        "email": {"type": "string", "format": "email"},
                        "password": {"type": "string", "format": "password"},
                        "tenantId": {"type": "string"},
                    },
                },
                "RefreshTokenRequest": {
                    "type": "object",
                    "required": ["refreshToken"],
                    "properties": {
                        "refreshToken": {"type": "string"},
                    },
                },
                "WebhookAckResponse": {
                    "type": "object",
                    "properties": {
                        "received": {"type": "boolean"},
                        "processed": {"type": "boolean"},
                        "ledgerEntryId": {"type": "string"},
                    },
                },
                "GenericObject": {
                    "type": "object",
                    "additionalProperties": True,
                },
            },
            "responses": {
                "ProblemDetails": {
                    "description": "Error response (RFC 7807)",
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/ProblemDetails"},
                        }
                    },
                },
            },
        },
        "x-endpoint-count": len(endpoints),
        "x-generated-from": "Thiet-ke-API.md",
    }

    return spec


def main() -> None:
    content = API_DOC.read_text(encoding="utf-8")
    endpoints = parse_endpoints(content)
    if len(endpoints) != 71:
        print(f"Warning: expected 71 endpoints, parsed {len(endpoints)}", file=sys.stderr)

    spec = build_spec(endpoints)

    yaml_text = yaml.dump(
        spec,
        sort_keys=False,
        allow_unicode=True,
        default_flow_style=False,
        width=120,
    )

    header = (
        "# WEREAL REOS OpenAPI 3.1 Specification\n"
        "# Document: WEREAL-OPENAPI-2026-v1.0\n"
        "# Source: Thiet-ke-API.md (WEREAL-API-2026-v1.0)\n"
        "# Baseline: WEREAL-BL-2026-002\n"
        "# Endpoints: 71 (Phase 1 MVP)\n"
        "# Generated by scripts/generate-openapi.py — do not edit manually\n\n"
    )

    OUTPUT.write_text(header + yaml_text, encoding="utf-8")
    print(f"Generated {OUTPUT} with {len(endpoints)} endpoints")


if __name__ == "__main__":
    main()
