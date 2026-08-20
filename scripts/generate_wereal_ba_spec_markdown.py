#!/usr/bin/env python3
"""Generate WEREAL-BA-Master-Spec.md from catalog data (mirror of Excel inventory)."""
from __future__ import annotations

from pathlib import Path

from wereal_ba_catalog_data import (
    AI_FEDERATION_RULES,
    AI_FEDERATION_SURFACES,
    API_SHIPPED_VS_TARGET,
    AS_IS_APPS,
    AS_IS_SCR_BY_PORTAL,
    AS_IS_SNAPSHOT,
    AS_IS_UC_COVERAGE,
    BASELINE_KPI,
    BUSINESS_RULES,
    MODULES,
    OP_WIN_BASELINE,
    SCREENS,
    TEST_CASES,
    TODAY,
    TRACEABILITY,
    USE_CASES,
    VERSION,
    manual_screen_count,
    manual_use_case_count,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "specs" / "WEREAL-BA-Master-Spec.md"
EXCEL = ROOT / "docs" / "samples" / "WEREAL_BA_Spec.xlsx"


def main() -> None:
    lines = [
        "# WEREAL REOS — Business Analysis Master Specification",
        "",
        f"> **Version:** {VERSION} · **Generated:** {TODAY}",
        "",
        "## Document control",
        "",
        "| Field | Value |",
        "| --- | --- |",
        "| Document ID | WEREAL-BA-MASTER |",
        "| Title | WEREAL BA Master Spec — Screens & Use Cases |",
        f"| Version | {VERSION} |",
        "| Status | Draft — engineering reference |",
        "| Source of truth | `scripts/wereal_ba_catalog_data.py` |",
        f"| Excel mirror | [`WEREAL_BA_Spec.xlsx`](../samples/WEREAL_BA_Spec.xlsx) |",
        "| Prototype | `prototype/` — `/uc/:id` · `/developer` |",
        "",
        "### Lịch sử (delta v1.1 → v1.4)",
        "",
        "| Version | Ngày | Thay đổi |",
        "| --- | --- | --- |",
        f"| 1.4 | {TODAY} | **As-Is inventory** · **AI federation** · **API shipped vs target** · **baseline KPI** |",
        "| 1.3 | 2026-07-28 | Module catalog · SCR/UC top-20 · deep-spec backlog |",
        "| 1.1 | 2026-07-20 | Skeleton inventory từ prototype catalog |",
        "",
        "## Executive summary",
        "",
        f"| Metric | Count |",
        "| --- | --- |",
        f"| Màn hình (SCR) | {len(SCREENS)} |",
        f"| Use case (UC) | {len(USE_CASES)} |",
        f"| Manual deep-spec UC (P0) | {manual_use_case_count()} | GR · BK · PAY · CRM · LS · ID · COM · TR |",
        f"| Manual deep-spec SCR (P0) | {manual_screen_count()} | go-live + commission + trust screens |",
        f"| Business rules (BR) | {len(BUSINESS_RULES)} |",
        f"| Test cases (TC) | {len(TEST_CASES)} |",
        f"| Traceability links | {len(TRACEABILITY)} |",
        "",
        "Cấu trúc bám template [`RNOSAI_BA_Spec.xlsx`](../../RNOSAI/docs/samples/RNOSAI_BA_Spec.xlsx):",
        "",
        "1. **Master Spec** (file này) — inventory, traceability",
        "2. **Excel Workbook** — sprint filter, validation, hyperlink SCR/UC → sheet chi tiết",
        "3. **Prototype** — interactive UI 78 UC",
        "",
        "## Module catalog",
        "",
        "| Mã | Tên | Phạm vi |",
        "| --- | --- | --- |",
    ]
    for mid, name, scope in MODULES:
        lines.append(f"| {mid} | {name} | {scope} |")

    lines += [
        "",
        "## Screen inventory (top 20 — full list in Excel `01_DanhSach_ManHinh`)",
        "",
        "| SCR | Tên | Module | Route | Status | UC |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for row in SCREENS[:20]:
        lines.append(f"| {row[0]} | {row[1]} | {row[2]} | {row[3]} | {row[5]} | {row[6]} |")
    if len(SCREENS) > 20:
        lines.append(f"| … | +{len(SCREENS) - 20} màn hình | | | | |")

    lines += [
        "",
        "## Use case inventory (top 20 — full list in Excel `03_DanhSach_UseCase`)",
        "",
        "| UC | Tên | SCR | Actor | Priority | Phase |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for row in USE_CASES[:20]:
        lines.append(f"| {row[0]} | {row[1]} | {row[2]} | {row[3]} | {row[4]} | {row[10]} |")
    if len(USE_CASES) > 20:
        lines.append(f"| … | +{len(USE_CASES) - 20} UC | | | | |")

    lines += [
        "",
        "## Lợi thế chuyên nghiệp & backlog vận hành",
        "",
        "> Tham chiếu `Ke-hoach-du-an.md` §13 · `Tieu-chi-chap-nhan.md` §14",
        "",
        "### Deep-spec modules (manual P0/P1)",
        "",
        "| Module | UC deep-spec | SCR deep-spec |",
        "| --- | --- | --- |",
        "| GR · BK · PAY | 12 UC | 12 SCR (batch-1) |",
        "| CRM · LS · ID | 12 UC | 11 SCR (batch-2) |",
        "| **COM · TR** | **9 UC** | **9 SCR (batch-3)** |",
        f"| **Tổng manual** | **{manual_use_case_count()} UC** | **{manual_screen_count()} SCR** |",
        "",
        "### Deep-spec còn thiếu (đề xuất sprint tiếp)",
        "",
        "| Module | UC | Lý do |",
        "| --- | --- | --- |",
        "| AN | UC-AN-01→02 | GMV dashboard pilot |",
        "| NW | UC-NW-01→02 | Zalo/Meta go-live Phase 2 |",
        "| AI | UC-AI-05 | Anomaly ops gate |",
        "",
        "## As-Is inventory (engineering snapshot)",
        "",
        f"> Snapshot **{AS_IS_SNAPSHOT['date']}** · {AS_IS_SNAPSHOT['repo']} · demo tenant `{AS_IS_SNAPSHOT['tenant_demo']}` · {AS_IS_SNAPSHOT['waves_shipped']}",
        "",
        "### Ứng dụng đã triển khai",
        "",
        "| App | Stack | As-Is | Trạng thái |",
        "| --- | --- | --- | --- |",
    ]
    for app, stack, detail, status in AS_IS_APPS:
        lines.append(f"| `{app}` | {stack} | {detail} | {status} |")

    lines += [
        "",
        "### UC coverage (78 catalog)",
        "",
        "| Kênh | UC | Coverage | Ghi chú |",
        "| --- | --- | --- | --- |",
    ]
    for channel, count, cov, note in AS_IS_UC_COVERAGE:
        lines.append(f"| {channel} | {count} | {cov} | {note} |")

    lines += [
        "",
        "### SCR theo portal (`apps/web`)",
        "",
        "| Portal | SCR (approx) | Phạm vi chính |",
        "| --- | --- | --- |",
    ]
    for portal, count, scope in AS_IS_SCR_BY_PORTAL:
        lines.append(f"| {portal} | {count} | {scope} |")

    lines += [
        "",
        "## AI federation (MOD-AI)",
        "",
        "> Kiến trúc **AI Workforce** — nhiều surface dùng chung guardrails, provider routing, human-in-the-loop. Tham chiếu `Ke-hoach-du-an.md` §5 · `apps/api/src/modules/ai-*`",
        "",
        "### Surfaces",
        "",
        "| Agent surface | Module | UC | Provider mode | API / behavior |",
        "| --- | --- | --- | --- | --- |",
    ]
    for surface, mod, uc, mode, api in AI_FEDERATION_SURFACES:
        lines.append(f"| {surface} | `{mod}` | {uc} | {mode} | {api} |")

    lines += [
        "",
        "### Federation rules",
        "",
        "| Rule | Mô tả |",
        "| --- | --- |",
    ]
    for rule, desc in AI_FEDERATION_RULES:
        lines.append(f"| {rule} | {desc} |")

    lines += [
        "",
        "## API — shipped vs target",
        "",
        "> **Target:** OpenAPI 3.1 Phase 1 — 71 operations (`Thiet-ke-API.md` · `openapi.yaml`) · **Shipped:** NestJS `apps/api` handlers (auto-count từ controllers)",
        "",
        "| Domain | Target P1 ops | Shipped handlers | Δ | Ghi chú |",
        "| --- | --- | --- | --- | --- |",
    ]
    for domain, target, shipped, delta, note in API_SHIPPED_VS_TARGET:
        lines.append(f"| {domain} | {target} | {shipped} | {delta} | {note} |")

    lines += [
        "",
        "**Env keys (AI + integrations):** `OPENAI_API_KEY` · `SSO_OIDC_*` · `BNPL_PARTNER_*` · `ZALO_*` · `SMS_*` — xem `apps/api/.env.example`",
        "",
        "## Baseline KPI & operational gates",
        "",
        "> North Star từ `Ke-hoach-du-an.md` §7 · OP-WIN từ `Tieu-chi-chap-nhan.md` §14 · cột **As-Is** = trạng thái repo hiện tại",
        "",
        "### KPI matrix",
        "",
        "| KPI | As-Is (Jul 2026) | Phase 1 target | Phase 3 | Phase 6 |",
        "| --- | --- | --- | --- | --- |",
    ]
    for kpi, as_is, p1, p3, p6 in BASELINE_KPI:
        lines.append(f"| {kpi} | {as_is} | {p1} | {p3} | {p6} |")

    lines += [
        "",
        "### OP-WIN baseline (pilot)",
        "",
        "| ID | Tiêu chí | As-Is evidence | Gate |",
        "| --- | --- | --- | --- |",
    ]
    for op_id, title, evidence, gate in OP_WIN_BASELINE:
        lines.append(f"| {op_id} | {title} | {evidence} | {gate} |")

    lines += [
        "",
        "## Regenerate",
        "",
        "```bash",
        "cd WEREAL/scripts",
        "python3 build_ba_spec_workbook.py",
        "python3 generate_wereal_ba_spec_markdown.py",
        "```",
        "",
    ]

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
