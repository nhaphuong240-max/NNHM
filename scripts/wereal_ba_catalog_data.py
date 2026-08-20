"""WEREAL REOS BA catalog — màn hình, UC, BR, traceability cho Excel template PTTCOM."""
from __future__ import annotations

import re
from datetime import date
from pathlib import Path

VERSION = "1.4"
TODAY = date.today().isoformat()
ROOT = Path(__file__).resolve().parents[1]
USE_CASES_TS = ROOT / "prototype" / "src" / "config" / "useCases.ts"
UC_DOC = "Danh-sach-use-case-user-story.md"

PRIORITY_MAP = {"M": "High", "S": "Medium", "C": "Low", "W": "Low"}
PRIORITY_REV = {v: k for k, v in PRIORITY_MAP.items()}

PORTAL_APP = {
    "public": "Public Portal (Next.js 14)",
    "agent": "Agent Portal",
    "admin": "Admin / Ops Portal",
    "developer": "Portal Chủ đầu tư (Developer)",
    "finance": "Finance Portal",
    "buyer": "Buyer Portal",
    "auth": "Auth — đăng nhập đa portal",
    "system": "System / API / Worker (NestJS)",
}

PORTAL_ROLES = {
    "public": "Buyer, Guest",
    "agent": "Agent, Agency Admin",
    "admin": "Platform Admin, Ops Admin",
    "developer": "Developer Admin",
    "finance": "Finance Admin",
    "buyer": "Buyer",
    "auth": "All users",
    "system": "System, Background worker",
}

MODULE_TAB = {
    "GR": "0F4C81",
    "ID": "44546A",
    "LS": "2E75B6",
    "CRM": "548235",
    "BK": "BF8F00",
    "PAY": "7030A0",
    "COM": "C9A227",
    "AI": "C00000",
    "TR": "375623",
    "AN": "00B0F0",
    "MKT": "0070C0",
    "UX": "7F7F7F",
    "NW": "44546A",
    "PUBLIC": "2E75B6",
    "AGENT": "548235",
    "ADMIN": "44546A",
    "DEV": "0F4C81",
    "FIN": "7030A0",
    "BUYER": "BF8F00",
    "AUTH": "7F7F7F",
    "SYS": "375623",
}

# ── Modules (18 bounded contexts — SDD v1.0) ─────────────────────────────────
MODULES: list[tuple[str, str, str]] = [
    ("MOD-GR", "Golden Record", "Unit gốc, Product Graph, anti-drift, SSE"),
    ("MOD-ID", "Identity & Tenant", "Multi-tenant, RBAC/ABAC, MFA, KYC/KYB"),
    ("MOD-LS", "Listing & Search", "Listing marketing, OpenSearch, moderation"),
    ("MOD-CRM", "CRM & Lead", "Lead capture, routing, pipeline, SLA"),
    ("MOD-BK", "Booking & Deal", "Giữ chỗ, state machine, contract, e-sign"),
    ("MOD-PAY", "Payment & Ledger", "Cọc online, reconcile, refund, settlement"),
    ("MOD-COM", "Commission", "Policy, snapshot, split, holdback"),
    ("MOD-AI", "AI Copilot", "Listing copy, lead score, RAG, anomaly"),
    ("MOD-TR", "Trust & Compliance", "Audit trail, document vault, dispute"),
    ("MOD-AN", "Analytics", "Funnel, GMV, absorption, attribution"),
    ("MOD-MKT", "Distribution", "Project policy, agency apply, leaderboard"),
    ("MOD-UX", "Experience", "Mobile PWA, buyer track, white-label, 3D map"),
    ("MOD-NW", "Network & Integration", "Zalo, Meta, SMS, webhooks"),
    ("MOD-PUBLIC", "Public Portal", "Search, compare, unit detail, recommendations"),
    ("MOD-AGENT", "Agent Portal", "Listing wizard, pipeline, booking, inbox"),
    ("MOD-ADMIN", "Platform Admin", "Tenant, moderation, audit, integrations"),
    ("MOD-DEV", "Developer Portal", "GR grid, import, absorption, commission"),
    ("MOD-FIN", "Finance Portal", "Reconcile, refund, settlement, export"),
]

MODULE_BR: dict[str, str] = {
    "GR": "BR-01",
    "BK": "BR-03",
    "PAY": "BR-04",
    "CRM": "BR-07",
    "AI": "BR-06",
    "TR": "BR-08",
    "LS": "BR-09",
    "COM": "BR-13",
    "MKT": "BR-19",
    "ID": "BR-14",
    "AN": "BR-11",
    "NW": "BR-05",
    "UX": "BR-12",
}

UC_PARSE_RE = re.compile(
    r"\{\s*id:\s*'([^']+)',\s*title:\s*'([^']+)',\s*module:\s*'([^']+)',\s*phase:\s*(\d+),"
    r"\s*priority:\s*'([^']+)',\s*actors:\s*'([^']+)',\s*portal:\s*'([^']+)',\s*route:\s*'([^']+)',"
    r"\s*screenType:\s*'([^']+)'(?:,\s*fr:\s*'([^']*)')?,\s*flow:\s*\[([^\]]+)\]\s*\}",
    re.DOTALL,
)


def _parse_prototype_use_cases() -> list[dict]:
    text = USE_CASES_TS.read_text(encoding="utf-8")
    out: list[dict] = []
    for m in UC_PARSE_RE.finditer(text):
        flow_raw = m.group(11)
        steps = [s.strip().strip("'") for s in flow_raw.split(",") if s.strip()]
        out.append(
            {
                "id": m.group(1),
                "title": m.group(2),
                "module": m.group(3),
                "phase": int(m.group(4)),
                "priority": m.group(5),
                "actors": m.group(6),
                "portal": m.group(7),
                "route": m.group(8),
                "screenType": m.group(9),
                "fr": m.group(10) or "",
                "flow": steps,
            }
        )
    return out


_PROTOTYPE_UCS = _parse_prototype_use_cases()


def _scr_prefix(module: str, portal: str) -> str:
    if portal == "system":
        return "SYS"
    portal_map = {
        "public": "PUBLIC",
        "agent": "AGENT",
        "admin": "ADMIN",
        "developer": "DEV",
        "finance": "FIN",
        "buyer": "BUYER",
        "auth": "AUTH",
    }
    return portal_map.get(portal, module)


def _build_screens_and_uc_rows() -> tuple[list[list], list[list], dict[str, list[str]], dict[str, dict]]:
    route_map: dict[str, list[dict]] = {}
    for uc in _PROTOTYPE_UCS:
        route_map.setdefault(uc["route"], []).append(uc)

    scr_counters: dict[str, int] = {}
    route_to_scr: dict[str, str] = {}
    screens: list[list] = []
    uc_rows: list[list] = []
    uc_meta: dict[str, dict] = {}

    for route in sorted(route_map.keys()):
        ucs = route_map[route]
        primary = ucs[0]
        mod = primary["module"]
        prefix = _scr_prefix(mod, primary["portal"])
        scr_counters[prefix] = scr_counters.get(prefix, 0) + 1
        scr_id = f"SCR-{prefix}-{scr_counters[prefix]:03d}"
        route_to_scr[route] = scr_id

        linked = ", ".join(u["id"] for u in ucs)
        title = primary["title"] if len(ucs) == 1 else f"{primary['portal'].title()} — {route}"
        if len(ucs) > 1:
            title = ucs[0]["title"] + (" (+ shared route)" if len(ucs) > 1 else "")

        phase_min = min(u["phase"] for u in ucs)
        status = "Draft" if phase_min <= 1 else "Pending"
        trace = primary["fr"] or f"Phase {phase_min}"

        pri_key = min((u["priority"] for u in ucs), key=lambda p: "MSCW".index(p))
        screens.append(
            [
                scr_id,
                title,
                mod,
                route,
                PORTAL_ROLES.get(primary["portal"], primary["actors"]),
                status,
                linked,
                "1.0",
                "Product",
                PRIORITY_MAP.get(pri_key, "Medium"),
                trace,
                TODAY,
                f"Portal: {primary['portal']} · screenType: {primary['screenType']}",
            ]
        )

    for uc in _PROTOTYPE_UCS:
        scr_id = route_to_scr[uc["route"]]
        pri = PRIORITY_MAP.get(uc["priority"], "Medium")
        status = "Draft" if uc["phase"] == 1 else "Pending"
        br = MODULE_BR.get(uc["module"], "—")
        pre = f"Phase {uc['phase']} · Portal {uc['portal']}"
        post = uc["flow"][-1] if uc["flow"] else "Hoàn tất luồng nghiệp vụ"
        uc_rows.append(
            [
                uc["id"],
                uc["title"],
                scr_id,
                uc["actors"],
                pri,
                status,
                pre,
                post,
                br,
                "Product",
                f"Phase {uc['phase']}",
                uc["fr"] or "—",
            ]
        )
        uc_meta[uc["id"]] = uc

    return screens, uc_rows, route_to_scr, uc_meta


SCREENS, USE_CASES, _ROUTE_SCR, UC_META = _build_screens_and_uc_rows()

# ── Business Rules BR-01 → BR-25 ───────────────────────────────────────────
BUSINESS_RULES: list[list] = [
    ["BR-01", "Golden Record do Developer quản lý — Agency không sửa giá gốc"],
    ["BR-02", "Mọi giao dịch giữ chỗ/cọc phải qua platform — không giữ miệng"],
    ["BR-03", "Hệ thống phải chống double booking tuyệt đối"],
    ["BR-04", "Đối soát thanh toán tự động hàng ngày — không Excel"],
    ["BR-05", "Lead Facebook/Zalo phải vào CRM tự động (Phase 2)"],
    ["BR-06", "AI hỗ trợ viết tin — agent phải duyệt trước publish"],
    ["BR-07", "Lead scoring ưu tiên lead nóng trên dashboard"],
    ["BR-08", "Audit trail đầy đủ khi tranh chấp giá/giữ chỗ"],
    ["BR-09", "Listing phải Ops/Developer duyệt trước public"],
    ["BR-10", "Buyer phải thấy trạng thái tin cậy (Verified badge)"],
    ["BR-11", "GMV đi qua platform là north star — không đếm listing"],
    ["BR-12", "Agent adoption: workflow platform phải nhanh hơn Zalo"],
    ["BR-13", "Commission policy snapshot tại thời điểm chốt deal (Phase 2)"],
    ["BR-14", "Payment action yêu cầu MFA/OTP"],
    ["BR-15", "Lead form bắt buộc consent PDPA/GDPR-ready"],
    ["BR-16", "Mọi AI output phải có disclaimer pháp lý"],
    ["BR-17", "Booking có expiry — auto release lock khi hết hạn"],
    ["BR-18", "Ledger double-entry — mọi payment có debit/credit cân bằng"],
    ["BR-19", "Distribution policy: Developer kiểm soát quyền bán Agency (P2)"],
    ["BR-20", "Search index sync từ Golden Record ≤ 5s lag"],
    ["BR-21", "Webhook payment idempotent — duplicate không tạo ledger trùng"],
    ["BR-22", "Cancel booking → refund → ledger reversal → unit available"],
    ["BR-23", "KYC/KYB bắt buộc trước commission payout (Phase 2)"],
    ["BR-24", "Event store retention ≥ 5 năm cho audit pháp lý"],
    ["BR-25", "Pilot tenant commit UAT trước go-live"],
]

BR_UC_MAP: dict[str, list[str]] = {
    "BR-01": ["UC-GR-01", "UC-GR-02", "UC-GR-03", "UC-GR-04"],
    "BR-02": ["UC-BK-01", "UC-PAY-01"],
    "BR-03": ["UC-BK-01", "UC-BK-05"],
    "BR-04": ["UC-PAY-02", "UC-PAY-03"],
    "BR-05": ["UC-CRM-05", "UC-NW-01", "UC-NW-02"],
    "BR-06": ["UC-AI-01", "UC-GR-02"],
    "BR-07": ["UC-AI-02", "UC-CRM-02", "UC-CRM-03"],
    "BR-08": ["UC-TR-01", "UC-TR-02", "UC-TR-03", "UC-BK-03", "UC-BK-04"],
    "BR-09": ["UC-LS-02", "UC-GR-03"],
    "BR-10": ["UC-LS-05", "UC-GR-03"],
    "BR-11": ["UC-AN-02", "UC-PAY-02"],
    "BR-12": ["UC-BK-01", "UC-UX-01"],
    "BR-13": ["UC-COM-01", "UC-COM-02", "UC-COM-03", "UC-COM-04", "UC-COM-05"],
    "BR-14": ["UC-ID-03", "UC-PAY-01"],
    "BR-15": ["UC-CRM-01"],
    "BR-16": ["UC-AI-01", "UC-AI-03"],
    "BR-17": ["UC-BK-01"],
    "BR-18": ["UC-PAY-02", "UC-PAY-03"],
    "BR-19": ["UC-MKT-01", "UC-MKT-02"],
    "BR-20": ["UC-LS-07", "UC-GR-07"],
    "BR-21": ["UC-PAY-01", "UC-PAY-02"],
    "BR-22": ["UC-BK-05", "UC-PAY-03"],
    "BR-23": ["UC-ID-05", "UC-PAY-04"],
    "BR-24": ["UC-BK-03", "UC-BK-04", "UC-TR-01", "UC-TR-03", "UC-TR-04"],
    "BR-25": ["UC-ID-01", "UC-UX-03"],
}

SCR_BY_ID = {str(r[0]): r for r in SCREENS}
UC_BY_ID = {str(r[0]): r for r in USE_CASES}


def _scr_for_uc(uc_id: str) -> str:
    row = UC_BY_ID.get(uc_id)
    return str(row[2]) if row else ""


TRACEABILITY: list[list] = []
for br_id, uc_ids in BR_UC_MAP.items():
    scr_ids: list[str] = []
    for uid in uc_ids:
        s = _scr_for_uc(uid)
        if s and s not in scr_ids:
            scr_ids.append(s)
    tc_id = f"TC-{br_id.split('-')[1]}"
    TRACEABILITY.append(
        [
            br_id,
            ", ".join(scr_ids) or "—",
            ", ".join(uc_ids),
            tc_id,
            "Pending",
        ]
    )

TEST_CASES: list[list] = [
    ["TC-01", "UC-GR-01", "Developer quản lý bảng hàng GR", "1. Login Developer Admin\n2. Mở /developer/units\n3. Cập nhật giá unit\n4. Xem audit trail", "Giá version mới · Agency read-only giá gốc", "", "Pending", "P0", "prototype /developer"],
    ["TC-02", "UC-GR-02", "Agent tạo listing từ GR", "1. Chọn unit GR\n2. Nhập marketing copy\n3. Anti-drift pass\n4. Gửi duyệt", "Listing draft · không drift giá/diện tích", "", "Pending", "P0", "prototype /agent/listings/new"],
    ["TC-03", "UC-GR-03", "Ops block listing drift", "1. Listing drift vs GR\n2. Ops mở moderation\n3. Block/Reject", "Listing không publish · flag hiển thị", "", "Pending", "P0", "prototype /admin/moderation"],
    ["TC-04", "UC-LS-01", "Buyer search facet", "1. Mở public search\n2. Filter quận/giá\n3. Sort kết quả", "Kết quả ≤2s · facet đúng OpenSearch", "", "Pending", "P0", "prototype /public/search"],
    ["TC-05", "UC-CRM-01", "Lead form PDPA", "1. Mở unit detail\n2. Submit lead + consent\n3. Thank you", "Lead CRM · consent logged", "", "Pending", "P0", "prototype /public/units/un_01"],
    ["TC-06", "UC-CRM-03", "Agent pipeline kanban", "1. Mở pipeline\n2. Drag stage\n3. Log activity", "Stage cập nhật · timeline sync", "", "Pending", "P0", "prototype /agent/pipeline"],
    ["TC-07", "UC-BK-01", "Booking atomic lock", "1. Agent chọn unit+lead\n2. Tạo booking 48h\n3. Thử book trùng", "Unit RESERVED · booking thứ 2 fail BR-03", "", "Pending", "P0", "E2E booking"],
    ["TC-08", "UC-PAY-01", "Thanh toán cọc MFA", "1. Buyer payment intent\n2. OTP MFA\n3. Webhook success", "Ledger cân · booking DEPOSITED", "", "Pending", "P0", "VNPay sandbox"],
    ["TC-09", "UC-PAY-02", "Đối soát ngày", "1. Finance reconcile\n2. So gateway vs ledger", "100% match hoặc discrepancy report", "", "Pending", "P0", "Finance portal"],
    ["TC-10", "UC-ID-03", "Login MFA refresh", "1. Email/password\n2. JWT + refresh\n3. Tenant context", "Session hợp lệ · RLS tenant", "", "Pending", "P0", "prototype /auth/login"],
    ["TC-11", "UC-AI-01", "AI listing copilot", "1. Generate copy\n2. Agent approve\n3. Disclaimer visible", "Không auto-publish · BR-06", "", "Pending", "P0", "Agent listing wizard"],
    ["TC-12", "UC-AI-02", "Lead score HOT", "1. Lead mới\n2. Score 0-100\n3. Dashboard highlight", "HOT lead nổi bật BR-07", "", "Pending", "P0", "Agent dashboard"],
    ["TC-13", "UC-TR-01", "Audit trail export", "1. Filter entity\n2. Xem event\n3. Export", "Audit immutable · BR-08", "", "Pending", "P1", "Admin audit"],
    ["TC-14", "UC-UX-04", "Portal Chủ đầu tư dashboard", "1. Login Developer\n2. Mở /developer\n3. KPI + GR preview", "13 UC developer visible", "", "Pending", "P0", "prototype /developer"],
    ["TC-15", "UC-AN-01", "Admin funnel KPI", "1. Admin dashboard\n2. Funnel leads→deposit", "Conversion rate hiển thị", "", "Pending", "P1", "prototype /admin"],
    ["TC-16", "UC-BK-05", "Cancel + refund chain", "1. Cancel booking\n2. Refund trigger\n3. Unit available", "BR-22 end-to-end", "", "Pending", "P0", "Booking + Finance"],
    ["TC-17", "UC-LS-07", "Search sync CDC", "1. GR status change\n2. Wait ≤5s\n3. Search result", "Index updated BR-20", "", "Pending", "P1", "Integration test"],
    ["TC-18", "UC-ID-01", "Onboard tenant", "1. Platform Admin wizard\n2. Invite admin\n3. Activate", "Tenant RLS active", "", "Pending", "P0", "Admin onboard"],
    ["TC-19", "UC-MKT-02", "Agency apply project P2", "1. Browse marketplace\n2. Submit apply\n3. Dev approve", "Agency enabled listing", "", "Pending", "P2", "Phase 2 gate"],
    ["TC-20", "UC-COM-01", "Commission policy P2", "1. Dev set rate\n2. Publish policy", "Policy versioned BR-13", "", "Pending", "P2", "Developer commission"],
    ["TC-21", "UC-NW-02", "Meta lead webhook P2", "1. Connect page\n2. Webhook lead\n3. CRM create", "Dedup + route BR-05", "", "Pending", "P2", "Integration sandbox"],
    ["TC-22", "UC-GR-06", "Bulk import bảng hàng P2", "1. Upload Excel\n2. Preview diff\n3. Commit", "GR updated · audit", "", "Pending", "P2", "Developer import"],
    ["TC-23", "UC-UX-03", "Platform moderation", "1. Admin queue\n2. Approve listing\n3. Publish index", "Public visible BR-09", "", "Pending", "P0", "Admin moderation"],
    ["TC-24", "UC-BK-02", "Buyer deal tracker", "1. Buyer login\n2. View booking stepper", "15-state timeline", "", "Pending", "P1", "Buyer portal"],
    ["TC-25", "UC-GR-04", "Product Graph navigation", "1. Open graph\n2. Navigate buildings", "Units linked correctly", "", "Pending", "P1", "Developer product-graph"],
]

CODE_REGISTRY: list[tuple[str, str, str, str]] = [
    ("Màn hình", "SCR", "SCR-GR-001", "Route UI — 1 sheet Excel / màn hình"),
    ("Use case", "UC", "UC-GR-01", "Luồng nghiệp vụ end-to-end theo module prefix"),
    ("Test case", "TC", "TC-01", "UAT / E2E / acceptance gate"),
    ("Yêu cầu nghiệp vụ", "BR", "BR-01", "Business rule — traceability matrix"),
    ("Functional req", "FR", "FR-GR-01", "SRS Tai-lieu-yeu-cau-phan-mem.md"),
    ("API endpoint", "API", "GET /api/v1/units", "OpenAPI openapi.yaml — 71 endpoints"),
    ("Constraint", "CON", "CON-09", "Golden Record ownership — Developer sở hữu"),
    ("ADR", "ADR", "ADR-001", "Architecture Decision Record — adr/"),
    ("Baseline", "BL", "WEREAL-BL-2026-002", "Yeu-cau-da-xac-nhan.md baseline"),
    ("Non-functional", "NFR", "NFR-P04", "Performance / security NFR SRS §6"),
]

USE_CASE_DETAILS: dict[str, dict] = {}
SCREEN_DETAILS: dict[str, dict] = {}

from wereal_ba_scr_details_p0 import P0_SCREEN_DETAILS  # noqa: E402
from wereal_ba_scr_details_p0_crm_ls_id import P0_CRM_LS_ID_SCREEN_DETAILS  # noqa: E402
from wereal_ba_uc_details_bk import BK_USE_CASE_DETAILS  # noqa: E402
from wereal_ba_uc_details_crm import CRM_USE_CASE_DETAILS  # noqa: E402
from wereal_ba_uc_details_gr import GR_USE_CASE_DETAILS  # noqa: E402
from wereal_ba_uc_details_id import ID_USE_CASE_DETAILS  # noqa: E402
from wereal_ba_uc_details_ls import LS_USE_CASE_DETAILS  # noqa: E402
from wereal_ba_uc_details_pay import PAY_USE_CASE_DETAILS  # noqa: E402
from wereal_ba_uc_details_com import COM_USE_CASE_DETAILS  # noqa: E402
from wereal_ba_uc_details_tr import TR_USE_CASE_DETAILS  # noqa: E402

USE_CASE_DETAILS.update(GR_USE_CASE_DETAILS)
USE_CASE_DETAILS.update(BK_USE_CASE_DETAILS)
USE_CASE_DETAILS.update(PAY_USE_CASE_DETAILS)
USE_CASE_DETAILS.update(CRM_USE_CASE_DETAILS)
USE_CASE_DETAILS.update(LS_USE_CASE_DETAILS)
USE_CASE_DETAILS.update(ID_USE_CASE_DETAILS)
USE_CASE_DETAILS.update(COM_USE_CASE_DETAILS)
USE_CASE_DETAILS.update(TR_USE_CASE_DETAILS)
from wereal_ba_scr_details_p0_com_tr import P0_COM_TR_SCREEN_DETAILS  # noqa: E402

SCREEN_DETAILS.update(P0_SCREEN_DETAILS)
SCREEN_DETAILS.update(P0_CRM_LS_ID_SCREEN_DETAILS)
SCREEN_DETAILS.update(P0_COM_TR_SCREEN_DETAILS)


def _index_use_cases_by_screen() -> dict[str, list[list]]:
    idx: dict[str, list[list]] = {}
    for row in USE_CASES:
        scr = str(row[2])
        idx.setdefault(scr, []).append(row)
    return idx


def _rules_for_screen(scr_id: str) -> list[str]:
    rules: set[str] = set()
    for uc in _index_use_cases_by_screen().get(scr_id, []):
        if uc[8] and uc[8] != "—":
            rules.add(str(uc[8]))
    for row in TRACEABILITY:
        if scr_id in str(row[1]):
            rules.add(str(row[0]))
    return sorted(rules) or ["—"]


def _rules_for_uc(uc_id: str, rules_field: str) -> list[str]:
    if rules_field and rules_field != "—":
        return [rules_field]
    for row in TRACEABILITY:
        if uc_id in str(row[2]):
            return [str(row[0])]
    return ["—"]


def _uc_doc_link(uc_id: str) -> str:
    return f"{UC_DOC} · prototype /uc/{uc_id}"


def _mod_label(module: str) -> str:
    for mid, mname, _ in MODULES:
        if module in (mid.replace("MOD-", ""), mname):
            return f"{mid} — {mname}"
    return module


def auto_screen_detail(row: list) -> dict:
    scr_id, name, module, route, roles, status, linked_ucs, version, owner, _priority, trace_ref, _updated, notes = row
    uc0 = linked_ucs.split(",")[0].strip()
    portal = UC_META.get(uc0, {}).get("portal", "admin")
    app = PORTAL_APP.get(portal, "WEREAL Portal")
    rules = _rules_for_screen(scr_id)
    screen_type = UC_META.get(uc0, {}).get("screenType", "dashboard")
    return {
        "meta": [
            ("Mã màn hình", scr_id),
            ("Tên màn hình", name),
            ("Route", route),
            ("Module", _mod_label(module)),
            ("Portal / Ứng dụng", app),
            ("Screen type", screen_type),
            ("Mục đích", f"Thực hiện nghiệp vụ «{name}» trên route {route}"),
            ("Vai trò", roles),
            ("Điều kiện trước", f"Đã xác thực + quyền portal {portal} (RLS tenant)"),
            ("Điều kiện sau", "Trạng thái nghiệp vụ phản ánh trên GR/CRM/Booking API"),
            ("Use case liên quan", linked_ucs),
            ("FR / Trace", trace_ref),
            ("Trạng thái triển khai", f"{status} (v{version})"),
            ("Owner", owner),
            ("Ghi chú", notes or "—"),
        ],
        "ui": [
            [1, "PremiumShell / Portal layout", "Layout", "Có", f"Header + sidebar portal {portal}"],
            [2, "PageHeader + KPI strip", "Header", "Có", f"Tiêu đề: {name}"],
            [3, "MainContent", "Panel", "Có", notes or f"Nội dung chính — template {screen_type}"],
            [4, "DataTable / Form / Chart", "Content", "Có", "Component theo ScreenTemplates.tsx"],
            [5, "ActionBar / FAB", "Toolbar", "Không", "CTA theo UC liên quan"],
            [6, "Toast / Modal confirm", "Feedback", "Có", "Success/error theo API NestJS BFF"],
        ],
        "rules": rules,
        "_auto": True,
    }


def auto_use_case_detail(row: list) -> dict:
    uc_id, name, screens, actor, priority, status, pre, post, rules_field, owner, wave, trace = row
    pri = {"High": "P0 Must", "Medium": "P1 Should", "Low": "P2 Could"}.get(str(priority), str(priority))
    rules = _rules_for_uc(uc_id, str(rules_field))
    meta_uc = UC_META.get(uc_id, {})
    flow_steps = meta_uc.get("flow") or [
        f"Actor «{actor}» mở {screens}",
        name,
        "API xử lý + audit",
        post or "Hoàn tất",
    ]
    main_flow = [[i + 1, step] for i, step in enumerate(flow_steps)]
    return {
        "meta": [
            ("Mã use case", uc_id),
            ("Tên use case", name),
            ("Màn hình", screens),
            ("Actor chính", actor),
            ("Portal", meta_uc.get("portal", "—")),
            ("Module", meta_uc.get("module", "—")),
            ("Mục tiêu", name),
            ("Trigger", f"Người dùng hoặc hệ thống khởi phát «{name}»"),
            ("Pre-condition", pre or "Quyền và dữ liệu đầu vào hợp lệ"),
            ("Post-condition", post or "Trạng thái nghiệp vụ cập nhật và audit"),
            ("Ưu tiên MoSCoW", pri),
            ("Trạng thái", status),
            ("Owner", owner),
            ("Phase / Wave", wave),
            ("FR link", trace),
            ("Prototype", f"/uc/{uc_id} · {meta_uc.get('route', '—')}"),
            ("Tham chiếu", _uc_doc_link(uc_id)),
        ],
        "main_flow": main_flow,
        "alt_flow": [
            ["E1", "Thiếu quyền / tenant scope → HTTP 403"],
            ["E2", "Validate fail (anti-drift, double-book) → 422 + message"],
            ["E3", "Gateway/webhook lỗi → retry idempotent BR-21"],
        ],
        "io": [
            ["Input", pre or f"Payload thao tác {uc_id}"],
            ["Output", post or f"Domain event + audit {uc_id}"],
        ],
        "rules": rules,
        "_auto": True,
    }


def get_all_screen_details() -> dict[str, dict]:
    merged: dict[str, dict] = {}
    for row in SCREENS:
        scr_id = str(row[0])
        if scr_id in SCREEN_DETAILS:
            merged[scr_id] = SCREEN_DETAILS[scr_id]
        else:
            merged[scr_id] = auto_screen_detail(row)
    return merged


def get_all_use_case_details() -> dict[str, dict]:
    merged: dict[str, dict] = {}
    for row in USE_CASES:
        uc_id = str(row[0])
        if uc_id in USE_CASE_DETAILS:
            merged[uc_id] = USE_CASE_DETAILS[uc_id]
        else:
            merged[uc_id] = auto_use_case_detail(row)
    return merged


def manual_use_case_count() -> int:
    return sum(1 for u in USE_CASES if USE_CASE_DETAILS.get(str(u[0]), {}).get("_manual"))


def manual_screen_count() -> int:
    return sum(1 for s in SCREENS if not get_all_screen_details().get(str(s[0]), {}).get("_auto"))


# ── Spec delta v1.1 — As-Is inventory · AI federation · API · KPI ────────────

AS_IS_SNAPSHOT = {
    "date": TODAY,
    "repo": "WEREAL monorepo",
    "tenant_demo": "ten_dev_01",
    "waves_shipped": "G → L (P0 vertical + Phase 2–5 pilot + production-harden)",
}

AS_IS_APPS: list[tuple[str, str, str, str]] = [
    ("apps/api", "NestJS API", "55 controllers · 225 HTTP handlers · 82 test suites / 227 tests", "Production pilot"),
    ("apps/web", "React Vite portals", "~80 routes · 7 portals · Waves I–L UI", "Production pilot"),
    ("apps/mobile", "Expo agent app", "UC-UX-01 · GPS · offline sync · push · EAS config G2.4", "Preview build ready"),
    ("prototype", "UC catalog UI", "78 UC · `/uc/:id` interactive flows", "BA reference"),
]

AS_IS_UC_COVERAGE: list[tuple[str, str, str, str]] = [
    ("Web UI (`apps/web`)", "70", "90%", "Shared routes cover demo IDs (`/public/units/:id`, `/agent/leads/:id`)"),
    ("Mobile (`apps/mobile`)", "1", "100%", "UC-UX-01 — thay web PWA `/agent/mobile`"),
    ("System / API-only", "3", "100%", "UC-GR-07 SSE · UC-LS-07 search worker · UC-COM-02 snapshot"),
    ("Prototype-only reference", "4", "—", "Demo path aliases trong `useCases.ts` — đã map dynamic route web"),
    ("Tổng catalog", "78", "≥97% pilot", "74+ màn hình wired · 3 system · 1 mobile"),
]

AS_IS_SCR_BY_PORTAL: list[tuple[str, str, str]] = [
    ("Public + Buyer", "14", "Search · compare · chat · map 3D · payment · BNPL · e-sign"),
    ("Agent", "18", "Pipeline · inbox · AI reply/legal · booking · listings · SLA"),
    ("Admin", "22", "Moderation · KYC · integrations · GMV · disputes · workflows"),
    ("Developer", "11", "GR · import · absorption · attribution · webhooks"),
    ("Finance", "7", "Reconcile · refund · settlement · escrow · commission"),
    ("Auth", "3", "Login · SSO OIDC · callback JWT"),
]

AI_FEDERATION_SURFACES: list[tuple[str, str, str, str, str]] = [
    ("Sales Copilot", "ai-copilot", "UC-AI-01", "Template + guardrails", "`POST /ai/copilot/generate` · block price/inventory mutation"),
    ("Lead Scoring", "ai-scoring", "UC-AI-02", "Rules + async queue", "`GET /ai/scoring/leads/:id` · explain factors · HOT/WARM tier"),
    ("Legal RAG", "ai-legal", "UC-AI-03", "Corpus + retrieve", "`POST /ai/legal/query` · cite sources · tenant corpus"),
    ("Sales Reply", "ai-reply", "UC-AI-04", "OpenAI-compatible LLM", "`AiReplyLlmClient` · template fallback · send → CRM inbox"),
    ("Buyer Chat", "ai-chat", "UC-AI-07", "Session + recommend", "`POST /ai/chat/messages` · unit recommendations · lead capture"),
    ("Ops Anomaly", "ai-anomaly", "UC-AI-05", "Queue stub → ops", "`GET /ai/anomalies` · moderation handoff"),
]

AI_FEDERATION_RULES: list[tuple[str, str]] = [
    ("Gateway pattern", "Mỗi surface gọi service layer — không direct DB / không mutate GR"),
    ("Provider routing", "`OPENAI_API_KEY` → live LLM · thiếu key → template/sandbox (dev default)"),
    ("Human-in-the-loop", "Copilot + AI reply + chat handoff — agent approve trước outbound"),
    ("Tenant isolation", "`X-Tenant-Id` + JWT · vector/RAG corpus theo tenant"),
    ("Audit", "Prompt/response metadata → `audit_events` · AI action trace (FR-AI guardrails)"),
    ("Delivery federation", "AI reply send → `CrmInboxDeliveryService` (Zalo ZNS · SMS · web stub)"),
]

# Target = OpenAPI 3.1 Phase 1 (`Thiet-ke-API.md` §2.1 · 71 ops)
API_SHIPPED_VS_TARGET: list[tuple[str, str, str, str, str]] = [
    ("Identity / Auth / Tenant", "13", "23", "+10", "SSO OIDC · branding · expanded user/role"),
    ("Golden Record + Projects", "17", "11", "−6", "P1 core · bulk import P2 partial"),
    ("Listing + Media", "8", "18", "+10", "Wizard · moderation · virus scan pilot"),
    ("Search + Index", "2", "4", "+2", "UC-LS-07 worker · index status"),
    ("CRM + Inbox + SLA", "12", "15", "+3", "Unified inbox · routing · activities"),
    ("Booking + Contracts + Workflow", "7", "19", "+12", "15-state · e-sign · custom workflow P4"),
    ("Payment + Refund + Webhook", "3", "17", "+14", "VNPay · orchestrator · escrow · BNPL partner"),
    ("Ledger + Commission", "2", "28", "+26", "P2 settlement · split · export · holdback"),
    ("AI (copilot + scoring)", "2", "13", "+11", "6 federation surfaces (see above)"),
    ("Analytics", "1", "5", "+4", "Funnel · GMV · absorption · forecast · attribution"),
    ("Trust + Audit + Export", "1", "11", "+10", "Disputes · regulatory export · document vault"),
    ("Integrations (NW)", "0", "22", "+22", "Zalo · Meta · SMS · API marketplace · tenant webhooks"),
    ("Portal BFF + Mobile", "0", "11", "+11", "Public map 3D · dev dashboard · mobile-agent"),
    ("Stream (SSE)", "1", "1", "0", "`GET /stream/units` · UC-GR-07"),
    ("Health / Ops", "0", "1", "+1", "`GET /health`"),
    ("Tổng OpenAPI P1 contract", "71", "~71 core + ~154 extended", "+154 extended", "225 handlers total · Waves G–L"),
]

BASELINE_KPI: list[tuple[str, str, str, str, str]] = [
    ("GMV qua platform", "—", "Baseline pilot", "+50% YoY", "+200% YoY"),
    ("Lead response (hot)", "Manual / spreadsheet", "< 15 phút", "< 5 phút", "< 2 phút"),
    ("Booking → deposit rate", "N/A offline", "+10%", "+25%", "+40%"),
    ("Payment reconcile match", "Pilot stub verified", "100% daily", "100% realtime", "100% realtime"),
    ("Inventory sync lag (search)", "Worker 2s poll", "< 5s", "< 1s", "< 500ms"),
    ("Agent platform adoption", "Mobile preview", "70%", "85%", "95%"),
    ("API P95 latency", "Dev localhost", "< 500ms", "< 200ms", "< 150ms"),
    ("Uptime SLA", "Dev only", "99.5%", "99.9%", "99.95%"),
    ("UC catalog coverage", "78 UC spec", "≥97% wired", "100% P0 vertical", "100% Must FR"),
    ("API contract (OpenAPI P1)", "71 ops documented", "71 core shipped", "Contract test CI", "Partner SDK"),
    ("Automated tests (API)", "0 → 227", "227 pass / 82 suites", "Regression gate", "Load + chaos"),
    ("OP-WIN pilot gates", "OP-WIN-01→05 spec", "Smoke + UAT checklist", "OP-WIN-06→09", "OP-WIN-10→15"),
]

OP_WIN_BASELINE: list[tuple[str, str, str, str]] = [
    ("OP-WIN-01", "Không double-book", "Redis lock + booking tests", "☐ pilot load test"),
    ("OP-WIN-02", "Không lệch sổ", "Reconcile dashboard live", "☐ 7-day streak"),
    ("OP-WIN-03", "Timeline tranh chấp", "Booking replay API", "☐ ≤3 min demo"),
    ("OP-WIN-04", "Anti-drift block", "Moderation + GR patch gate", "☐ 100% drift block"),
    ("OP-WIN-05", "Vertical slice E2E", "GR→book→pay→ledger→COM stub", "☐ 1 real deal"),
    ("OP-WIN-09", "Mobile beta WAU", "apps/mobile + EAS G2.4", "☐ ≥70% pilot agents"),
]
