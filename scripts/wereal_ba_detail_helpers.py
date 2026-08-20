"""Helper builders for WEREAL REOS BA use-case & screen detail blocks."""
from __future__ import annotations


def uc_detail(
    uc_id: str,
    name: str,
    *,
    screens: str,
    actor: str,
    actor_secondary: str = "",
    goal: str = "",
    trigger: str = "",
    pre: str = "",
    post: str = "",
    priority: str = "P0 Must",
    phase: str = "Phase 1",
    trace: str = "—",
    api: str = "",
    prototype: str = "",
    main: list[list],
    alt: list[list] | None = None,
    io_in: str = "",
    io_out: str = "",
    rules: list[str],
) -> dict:
    meta: list[tuple[str, str]] = [
        ("Mã use case", uc_id),
        ("Tên use case", name),
        ("Màn hình", screens),
        ("Actor chính", actor),
    ]
    if actor_secondary:
        meta.append(("Actor phụ", actor_secondary))
    meta.extend([
        ("Mục tiêu", goal or name),
        ("Trigger", trigger or f"Khởi phát luồng «{name}»"),
        ("Pre-condition", pre or "Quyền và dữ liệu đầu vào hợp lệ"),
        ("Post-condition", post or "Trạng thái nghiệp vụ cập nhật và audit"),
        ("Ưu tiên MoSCoW", priority),
        ("Phase / Wave", phase),
        ("FR / Trace", trace),
    ])
    if api:
        meta.append(("API / Integration", api))
    if prototype:
        meta.append(("Prototype", prototype))
    meta.append(("Loại spec", "Deep-spec thủ công P0"))
    return {
        "meta": meta,
        "main_flow": main,
        "alt_flow": alt
        or [
            ["E1", "Thiếu quyền / tenant scope → HTTP 403"],
            ["E2", "Validate fail → 422 + message; không persist"],
        ],
        "io": [
            ["Input", io_in or f"Payload {uc_id}"],
            ["Output", io_out or f"Kết quả {uc_id}"],
        ],
        "rules": rules,
        "_manual": True,
    }


def scr_detail(
    scr_id: str,
    name: str,
    *,
    route: str,
    module: str,
    purpose: str,
    roles: str,
    linked_ucs: str,
    ui: list[list],
    rules: list[str],
    pre: str = "",
    post: str = "",
    api: str = "",
    app: str = "WEREAL Portal (Next.js 14 BFF)",
    trace: str = "—",
    status_note: str = "Draft — P0 deep-spec",
    notes: str = "",
) -> dict:
    meta: list[tuple[str, str]] = [
        ("Mã màn hình", scr_id),
        ("Tên màn hình", name),
        ("Route", route),
        ("Module", module),
        ("Portal / Ứng dụng", app),
        ("Mục đích", purpose),
        ("Vai trò", roles),
        ("Điều kiện trước", pre or f"JWT tenant context + RBAC/ABAC scope"),
        ("Điều kiện sau", post or "API NestJS phản ánh đúng GR/Booking/Ledger state"),
        ("Use case liên quan", linked_ucs),
    ]
    if api:
        meta.append(("API liên quan", api))
    meta.extend([
        ("FR / Trace", trace),
        ("Trạng thái triển khai", status_note),
        ("Ghi chú", notes or "—"),
        ("Loại spec", "Deep-spec thủ công P0"),
    ])
    return {
        "meta": meta,
        "ui": ui,
        "rules": rules,
        "_manual": True,
        "_deep": True,
    }
