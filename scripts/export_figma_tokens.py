#!/usr/bin/env python3
"""
Export WEREAL design tokens → Figma Variables (W3C DTCG + Tokens Studio).

Usage:
  cd WEREAL/scripts && python3 export_figma_tokens.py
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from wereal_design_tokens_data import (
    BRAND,
    FONT_WEIGHT,
    LAYOUT,
    META,
    PORTAL_THEMES,
    RADIUS,
    SEMANTIC,
    SHADOW,
    SPACING,
    TYPOGRAPHY,
)

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "design-tokens" / "figma"


def color_token(value: str, description: str | None = None) -> dict[str, Any]:
    token: dict[str, Any] = {"$value": value, "$type": "color"}
    if description:
        token["$description"] = description
    return token


def parse_px(value: str) -> float:
    return float(value.removesuffix("px"))


def figma_number_token(px_value: str, description: str | None = None) -> dict[str, Any]:
    """Figma Variables Import plugin supports color + number only (W3C sample)."""
    token: dict[str, Any] = {
        "$value": parse_px(px_value),
        "$type": "number",
        "$description": description or f"{px_value} — import as FLOAT variable",
    }
    return token


def number_token(value: int | float, description: str | None = None) -> dict[str, Any]:
    token: dict[str, Any] = {"$value": value, "$type": "number"}
    if description:
        token["$description"] = description
    return token


def string_token(value: str, description: str | None = None) -> dict[str, Any]:
    token: dict[str, Any] = {"$value": value, "$type": "string"}
    if description:
        token["$description"] = description
    return token


def build_brand_collection() -> dict[str, Any]:
    return {
        "$description": f"{META['name']} — Brand core (v{META['version']})",
        "color": {key: color_token(val) for key, val in BRAND.items()},
    }


def build_semantic_collection() -> dict[str, Any]:
    colors: dict[str, Any] = {}
    for status, parts in SEMANTIC.items():
        colors[status] = {
            part: color_token(hex_val, f"Semantic {status} — {part}")
            for part, hex_val in parts.items()
        }
    return {
        "$description": f"{META['name']} — Semantic status colors (BĐS)",
        "color": colors,
    }


def build_portal_collection() -> dict[str, Any]:
    portals: dict[str, Any] = {}
    for portal_id, theme in PORTAL_THEMES.items():
        portals[portal_id] = {
            "accent": color_token(theme["accent"], theme["label"]),
            "accent-soft": color_token(theme["accent-soft"], f"{theme['label']} — soft tint"),
        }
    return {
        "$description": f"{META['name']} — Portal accent per surface",
        "portal": portals,
    }


def build_spacing_collection() -> dict[str, Any]:
    return {
        "$description": f"{META['name']} — Spacing scale (4px base, values in px)",
        "spacing": {key: figma_number_token(val) for key, val in SPACING.items()},
    }


def build_radius_collection() -> dict[str, Any]:
    return {
        "$description": f"{META['name']} — Border radius (values in px)",
        "radius": {key: figma_number_token(val) for key, val in RADIUS.items()},
    }


def build_layout_collection() -> dict[str, Any]:
    return {
        "$description": f"{META['name']} — Layout dimensions (values in px)",
        "layout": {key: figma_number_token(val) for key, val in LAYOUT.items()},
    }


def build_typography_collection() -> dict[str, Any]:
    return {
        "$description": f"{META['name']} — Typography scale (font-size in px)",
        "font-size": {key: figma_number_token(val) for key, val in TYPOGRAPHY.items()},
        "font-weight": {key: number_token(val) for key, val in FONT_WEIGHT.items()},
    }


def build_elevation_collection() -> dict[str, Any]:
    return {
        "$description": f"{META['name']} — Box shadows (STRING — bind manually in Figma effects)",
        "shadow": {
            key: string_token(val, "CSS box-shadow — apply as effect style or Dev Mode note")
            for key, val in SHADOW.items()
        },
    }


COLLECTIONS: list[tuple[str, str, callable]] = [
    ("01-brand", "Brand", build_brand_collection),
    ("02-semantic", "Semantic", build_semantic_collection),
    ("03-portal", "Portal", build_portal_collection),
    ("04-spacing", "Spacing", build_spacing_collection),
    ("05-radius", "Radius", build_radius_collection),
    ("06-layout", "Layout", build_layout_collection),
    ("07-typography", "Typography", build_typography_collection),
    ("08-elevation", "Elevation", build_elevation_collection),
]


def flatten_for_tokens_studio(prefix: str, node: dict[str, Any], out: dict[str, Any]) -> None:
    for key, val in node.items():
        if key.startswith("$"):
            continue
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(val, dict) and "$value" in val:
            out[path] = {
                "value": val["$value"],
                "type": val["$type"].replace("dimension", "spacing" if "spacing" in path else "sizing"),
            }
            if "$description" in val:
                out[path]["description"] = val["$description"]
        elif isinstance(val, dict):
            flatten_for_tokens_studio(path, val, out)


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest_collections: list[dict[str, str]] = []
    tokens_studio: dict[str, Any] = {
        "WEREAL/global": {},
    }

    for file_slug, collection_name, builder in COLLECTIONS:
        data = builder()
        out_path = OUT_DIR / f"{file_slug}.tokens.json"
        write_json(out_path, data)
        manifest_collections.append(
            {
                "id": file_slug,
                "name": collection_name,
                "file": out_path.name,
                "importHint": "Figma → Plugins → Variables Import / Export (W3C)",
            }
        )
        flatten_for_tokens_studio("", data, tokens_studio["WEREAL/global"])

    # Tokens Studio nested format (alternative import)
    tokens_studio_nested: dict[str, Any] = {"WEREAL": {}}
    for file_slug, collection_name, builder in COLLECTIONS:
        tokens_studio_nested["WEREAL"][collection_name.lower()] = builder()

    write_json(OUT_DIR / "tokens-studio.json", tokens_studio_nested)
    write_json(OUT_DIR / "tokens-studio-flat.json", tokens_studio)

    manifest = {
        **META,
        "figmaImport": {
            "recommendedPlugin": "Variables Import / Export (Figma official sample)",
            "alternativePlugin": "Tokens Studio for Figma",
            "docs": "design-tokens/figma/README.md",
            "note": "Import từng file *.tokens.json — mỗi file = 1 Variable Collection trong Figma.",
        },
        "collections": manifest_collections,
    }
    write_json(OUT_DIR / "manifest.json", manifest)

    total = sum(len(list((OUT_DIR / c["file"]).read_text(encoding="utf-8").split('"$value"'))) - 1 for c in manifest_collections)
    print(f"Exported {len(COLLECTIONS)} collections → {OUT_DIR}")
    print(f"  W3C:  {len(COLLECTIONS)} × *.tokens.json")
    print(f"  Studio: tokens-studio.json, tokens-studio-flat.json")
    print(f"  Manifest: manifest.json (~{total} token values)")


if __name__ == "__main__":
    main()
