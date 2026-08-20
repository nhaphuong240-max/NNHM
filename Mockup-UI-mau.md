# Mockup UI mẫu — WEREAL REOS Phase 1

> **Document Control:** WEREAL-UI-2026-v1.0
> **Phiên bản:** 1.0 | **Ngày phát hành:** 28/07/2026
> **Trạng thái:** Draft — Chờ UX Lead review
> **Baseline tham chiếu:** WEREAL-BL-2026-002
> **Liên kết:** `Thiet-ke-API.md` | `Tai-lieu-yeu-cau-phan-mem.md` | FR-UX-01,02,03

---

## Mục lục

1. [Kiểm soát tài liệu](#1-kiểm-soát-tài-liệu)
2. [Mục đích và phạm vi](#2-mục-đích-và-phạm-vi)
3. [Design System (PropTech Professional)](#3-design-system-proptech-professional)
4. [Information Architecture theo Portal](#4-information-architecture-theo-portal)
5. [Wireframe / Mockup mô tả](#5-wireframe--mockup-mô-tả)
6. [Component Library (shadcn-based)](#6-component-library-shadcn-based)
7. [Responsive breakpoints](#7-responsive-breakpoints)
8. [Key user flows (5 flows)](#8-key-user-flows-5-flows)
9. [Accessibility — WCAG 2.1 Level A](#9-accessibility--wcag-21-level-a)
10. [UI States](#10-ui-states)
11. [Traceability FR-UX & Personas](#11-traceability-fr-ux--personas)
12. [Phụ lục](#12-phụ-lục)
13. [Lợi thế UX & gate vận hành](#13-lợi-thế-ux--gate-vận-hành)

---

## 1. Kiểm soát tài liệu

| Thuộc tính | Giá trị |
|------------|---------|
| **Mã tài liệu** | WEREAL-UI-2026-v1.0 |
| **Tên tài liệu** | Mockup UI mẫu — WEREAL REOS Phase 1 |
| **Phiên bản** | 1.0 |
| **Trạng thái** | Draft |
| **Design tool** | Figma (reference) + ASCII wireframe (tài liệu này) |
| **Interactive prototype** | [`prototype/`](./prototype/) — React v2.1, **78 UC**, 7 portals, `/design-system` |
| **Design System Spec** | [`docs/specs/WEREAL-Design-System-Spec.md`](./docs/specs/WEREAL-Design-System-Spec.md) |
| **Figma Variables** | [`design-tokens/figma/`](./design-tokens/figma/) |
| **UI framework** | Next.js 14 + Tailwind CSS + shadcn/ui |
| **Ngôn ngữ UI** | 100% Tiếng Việt Phase 1 (NFR-U01) |

### 1.1 Lịch sử sửa đổi

| Version | Ngày | Mô tả | Author |
|---------|------|-------|--------|
| 0.1 | 22/07/2026 | Wireframe sơ bộ Public Portal | UX Team |
| **1.0** | **28/07/2026** | **Design system, 4 portals, 5 flows, WCAG, component library** | **UX + BA Team** |

### 1.2 Phê duyệt

| Vai trò | Họ tên | Trạng thái |
|---------|--------|------------|
| UX Lead | [TBD] | ☐ Pending |
| Product Owner | [TBD] | ☐ Pending |
| Tech Lead (FE) | [TBD] | ☐ Pending |

---

## 2. Mục đích và phạm vi

Tài liệu mô tả **wireframe ASCII**, **design system**, **information architecture** và **user flows** cho 3 portal Phase 1 Must (FR-UX-01,02,03) và outline Developer Portal Phase 2 (FR-UX-04).

### 2.1 Portal phạm vi

| Portal | FR | Persona chính | Phase |
|--------|-----|---------------|-------|
| Public Portal | FR-UX-01 | P4 Thu Trang (Buyer) | P1 Must |
| Agent Portal | FR-UX-02 | P3 Hoàng Nam (Agent), P2 Lan Hương (Agency Admin) | P1 Must |
| Admin Portal | FR-UX-03 | P5 Quốc Bảo (Ops), Platform Admin | P1 Must |
| Developer Portal | FR-UX-04 | P1 Minh Tuấn (Developer Admin) | P2 outline |

### 2.2 Design principles

| Nguyên tắc | Mô tả | NFR/FR |
|------------|-------|--------|
| Trust-first | Verified badge, giá minh bạch, anti-drift visible | FR-GR-05, BR-10 |
| Speed for agents | Listing ≤5 phút, booking 1-click payment link | NFR-U02, FR-UX-02 |
| Buyer simplicity | Lead form ≤3 click từ search | NFR-U03 |
| Mobile-ready | Responsive ≥320px, PWA Phase 2 | NFR-U04, FR-UX-05 |
| Professional PropTech | Clean, data-dense, không flashy | Brand guideline |

### 2.3 Personas phục vụ (SRS §3.5)

| ID | Tên | Role | Portal chính | Nhu cầu UI |
|----|-----|------|--------------|------------|
| P1 | Minh Tuấn | Developer Sales Director | Developer P2 | GR grid, import, absorption |
| P2 | Lan Hương | Agency Director | Agent | Pipeline, hot leads, routing |
| P3 | Hoàng Nam | Field Agent | Agent | Listing wizard, booking, mobile |
| P4 | Thu Trang | First-time Buyer | Public | Search, verified, compare, lead |
| P5 | Quốc Bảo | Platform Ops Admin | Admin | Moderation, audit, drift |
| P6 | Kim Anh | Platform Finance Manager | Admin | Reconcile, GMV dashboard P2 |

---

## 3. Design System (PropTech Professional)

### 3.1 Color palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#0F4C81` | CTA chính, header, link — tin cậy BĐS |
| `--primary-foreground` | `#FFFFFF` | Text trên primary |
| `--secondary` | `#E8F1F8` | Background section, card hover |
| `--accent` | `#C9A227` | Premium highlight, giá, badge VIP |
| `--success` | `#16A34A` | Verified badge, payment success, available unit |
| `--warning` | `#EA580C` | Hot lead, expiry countdown, pending review |
| `--destructive` | `#DC2626` | Error, reject, cancelled booking |
| `--muted` | `#64748B` | Secondary text, placeholder |
| `--background` | `#FAFBFC` | Page background |
| `--card` | `#FFFFFF` | Card, modal, panel |
| `--border` | `#E2E8F0` | Divider, input border |

**Dark mode:** Phase 2 — Phase 1 light only.

### 3.2 Typography

| Token | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| `display-lg` | Inter / Be Vietnam Pro | 36px | 700 | Hero headline Public Portal |
| `heading-1` | Inter | 28px | 600 | Page title |
| `heading-2` | Inter | 22px | 600 | Section title, card title |
| `heading-3` | Inter | 18px | 600 | Subsection |
| `body-lg` | Inter | 16px | 400 | Body text chính |
| `body-sm` | Inter | 14px | 400 | Caption, metadata |
| `label` | Inter | 12px | 500 | Form label, badge text |
| `price` | Inter | 24px | 700 | Giá BĐS — tabular nums |
| `mono` | JetBrains Mono | 13px | 400 | Code, audit ID, booking ref |

- **Line height:** 1.5 body, 1.2 headings
- **Font loading:** `next/font` self-hosted, fallback system-ui

### 3.3 Spacing scale (4px base)

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Icon gap, tight padding |
| `space-2` | 8px | Input padding, inline gap |
| `space-3` | 12px | Card inner gap |
| `space-4` | 16px | Standard padding |
| `space-6` | 24px | Section gap |
| `space-8` | 32px | Page section margin |
| `space-12` | 48px | Hero padding |
| `space-16` | 64px | Major section break |

### 3.4 Border radius & elevation

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Badge, tag |
| `radius-md` | 8px | Button, input, card |
| `radius-lg` | 12px | Modal, panel |
| `shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | Card default |
| `shadow-md` | 0 4px 12px rgba(0,0,0,0.08) | Dropdown, popover |
| `shadow-lg` | 0 8px 24px rgba(0,0,0,0.12) | Modal |

### 3.5 Iconography

- **Library:** Lucide React (shadcn default)
- **Size:** 16px inline, 20px button, 24px nav
- **Style:** Stroke 1.5px, rounded caps


---

## 4. Information Architecture theo Portal

### 4.1 Public Portal (FR-UX-01) — Persona P4 Thu Trang

```
Public Portal
├── Trang chủ / Tìm kiếm
│   ├── Hero search bar
│   ├── Bộ lọc nhanh (khu vực, giá, PN)
│   └── Dự án nổi bật
├── Kết quả tìm kiếm
│   ├── Facet sidebar (desktop) / drawer (mobile)
│   ├── Sort + map toggle
│   └── Unit card grid/list
├── Chi tiết căn hộ / Unit detail
│   ├── Gallery + thông số
│   ├── Verified badge + giá GR
│   ├── Lead form sticky (≤3 click)
│   └── So sánh / Yêu thích
├── So sánh sản phẩm (FR-LS-04 Should)
│   └── Bảng 2-3 unit side-by-side
└── Lead form (modal / inline)
    ├── Thông tin liên hệ
    ├── Consent PDPA checkbox
    └── Submit → cảm ơn
```

### 4.2 Agent Portal (FR-UX-02) — Persona P3 Hoàng Nam, P2 Lan Hương

```
Agent Portal
├── Dashboard
│   ├── KPI cards (lead, booking, hot leads)
│   ├── Hot lead list (score ≥80)
│   └── Tasks / follow-up hôm nay
├── CRM
│   ├── Lead list (filter, search)
│   ├── Lead detail + timeline
│   └── Pipeline kanban (FR-CRM-05)
├── Listing
│   ├── Danh sách listing
│   ├── Tạo listing (wizard + AI copilot panel)
│   └── Trạng thái duyệt
├── Booking
│   ├── Tạo booking / giữ chỗ
│   ├── Payment link generator
│   └── Booking detail + state timeline
└── Settings (profile, notification)
```

### 4.3 Admin Portal (FR-UX-03) — Persona P5 Quốc Bảo

```
Admin Portal
├── Dashboard KPI platform
│   ├── GMV funnel (P2 full)
│   └── Tenant activity summary
├── Tenant management
│   ├── Developer tenants
│   └── Agency tenants
├── Listing moderation queue
│   ├── Pending review list
│   ├── Anti-drift report panel
│   └── Approve / Reject actions
├── Audit log viewer
│   ├── Filter entity/actor/date
│   └── Event detail drawer
└── System config (approval rules, SLA)
```

### 4.4 Developer Portal (Phase 2 outline — FR-UX-04) — Persona P1 Minh Tuấn

```
Developer Portal (P2)
├── Project dashboard
├── Unit grid (Golden Record)
│   ├── Filter block/floor/status
│   └── Inline edit price (versioned)
├── Import wizard
│   ├── Upload Excel/CSV
│   ├── Validation preview
│   └── Commit / rollback
└── Absorption report (P2)
```

### 4.5 Navigation patterns

| Portal | Primary nav | Secondary nav | Mobile nav |
|--------|-------------|---------------|------------|
| Public | Header links | Footer | Hamburger + bottom CTA |
| Agent | Left sidebar | Breadcrumb | Bottom tab bar (4 items) |
| Admin | Left sidebar | Tabs trong section | Collapsed sidebar |
| Developer P2 | Top bar + sidebar | Project switcher | Responsive table scroll |

---

## 5. Wireframe / Mockup mô tả

### 5.1 Public Portal — Trang chủ / Tìm kiếm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo WEREAL]          Dự án    Khu vực    Tin tức          [Đăng nhập]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│          Tìm căn hộ mơ ước — dữ liệu chuẩn từ chủ đầu tư                   │
│   ┌─────────────────────────────────────────────────────┐  [Tìm kiếm]      │
│   │ Nhập tên dự án, quận, đường...                       │                 │
│   └─────────────────────────────────────────────────────┘                   │
│   [TP.HCM v]  [2-3 PN v]  [Giá: Tất cả v]  [Bản đồ]                          │
│                                                                             │
│   ── Dự án nổi bật ──────────────────────────────────────────────────────  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│   │ [Anh]    │  │ [Anh]    │  │ [Anh]    │  │ [Anh]    │                   │
│   │ Vinhomes │  │ Masteri  │  │ Lumiere  │  │ EcoPark  │                   │
│   │ Q9       │  │ Thao Dien│  │ Riverside│  │ HN       │                   │
│   │ 1200 can │  │ 450 can  │  │ 800 can  │  │ 2000 can │                   │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘                   │
│                                                                             │
│   ── Can ho verified moi nhat ────────────────────────────────────────────  │
│   [UnitCard Verified] [UnitCard Verified] [UnitCard Verified] ...           │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Ghi chú UX:** Hero search autocomplete goi `GET /search/suggest`. Verified badge FR-GR-05. Persona P4 can tin tuong ngay tu trang chu.

### 5.2 Public Portal — Ket qua tim kiem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ <- Trang chu    Ket qua: Vinhomes Q9 3PN (45 can)     [List | Map]           │
├──────────────┬──────────────────────────────────────────────────────────────┤
│ BO LOC       │  Sap xep: [Gia thap -> cao v]    Da chon so sanh: 2/3        │
│              │                                                              │
│ Khu vuc      │  ┌────────────────────────────────────────────────────┐     │
│ [x] Q9       │  │ [Anh]  A-12-05 · Block A · Tang 12    Verified     │     │
│ [ ] Q2       │  │ 3PN · 85m2 · View song                              │     │
│              │  │ 3.5 ty                              [+] [So sanh]    │     │
│ Gia          │  │ Con hang                            [Xem chi tiet] │     │
│ ( ) <3 ty    │  └────────────────────────────────────────────────────┘     │
│ (*) 3-4 ty   │  ┌────────────────────────────────────────────────────┐     │
│ ( ) >4 ty    │  │ [Anh]  B-08-12 · Block B              Verified     │     │
│              │  │ ...                                                 │     │
│ Phong ngu    │  └────────────────────────────────────────────────────┘     │
│ [x] 3 PN     │  [Load them v]                                               │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

**Mobile:** Facet chuyen thanh bottom drawer. Card full-width. NFR-U04 viewport 320px+.

### 5.3 Public Portal — Unit detail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ <- Ket qua tim kiem                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐  ┌───────────────────────────┐ │
│ │           [Gallery anh lon]             │  │ A-12-05 · Vinhomes Q9     │ │
│ │         o o * o o  (5 anh)             │  │ Verified Listing          │ │
│ └─────────────────────────────────────────┘  │ 3.500.000.000 VND         │ │
│                                              │ Con hang · Cap nhat 2h     │ │
│ ── Thong so ──                               │                           │ │
│ | Dien tich | 85.5 m2 | PN | 3 | WC | 2 |   │ ┌───────────────────────┐ │ │
│ | Huong | Dong Nam | Tang | 12/35 |         │ │ Dang ky tu van        │ │ │
│                                              │ │ Ho ten: [__________]  │ │ │
│ ── Mo ta ──                                  │ │ SDT:    [__________]  │ │ │
│ Can ho 3 phong ngu view song...             │ │ [x] Toi dong y PDPA   │ │ │
│                                              │ │ [Gui yeu cau ->]      │ │ │
│ [+ Them so sanh]  [Chia se]                  │ └───────────────────────┘ │ │
└─────────────────────────────────────────────────────────────────────────────┘
```

**≤3 click lead (NFR-U03):** Search → Click card → Fill form + Submit. Consent bat buoc NFR-C03.

### 5.4 Public Portal — So sanh va Lead form

```
SO SANH (FR-LS-04):                    LEAD FORM MODAL:
┌────────────────────────────────┐     ┌─────────────────────────┐
│ So sanh 3 can ho               │     │ Dang ky tu van mien phi │
├──────────┬─────────┬─────────┤     │ Can: A-12-05 Vinhomes Q9│
│          │ A-12-05 │ B-08-12 │     │ Ho ten*: [___________] │
│ Gia      │ 3.5 ty  │ 3.2 ty  │     │ SDT*:    [___________] │
│ Dien tich│ 85.5m2  │ 82m2    │     │ Email:   [___________] │
│ PN       │ 3       │ 3       │     │ Ghi chu: [___________] │
│ Verified │ co      │ co      │     │ [x] Dong y xu ly du lieu│
│ Trang thai│Con hang│ Con hang│     │ [Huy]  [Gui yeu cau]   │
│ [Tu van] │ [Tu van]│ [Tu van]│     └─────────────────────────┘
└──────────┴─────────┴─────────┘
```


### 5.5 Agent Portal — Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [=] WEREAL Agent    Tim...          (3)  Hoang Nam v                          │
├──────────┬──────────────────────────────────────────────────────────────────┤
│ Dashboard│  Xin chao, Nam — Hom nay 28/07/2026                              │
│ Leads    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ Pipeline │  │ Lead moi │ │ Hot lead │ │ Booking  │ │ Coc thang│            │
│ Listings │  │    12    │ │    5 HOT │ │    3     │ │   150M   │            │
│ Bookings │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│ Settings │  ── Lead nong uu tien (score >=80) ────────────────────────────  │
│          │  ┌────────────────────────────────────────────────────────────┐ │
│          │  │ HOT 85 Thu Trang · Vinhomes A-12-05 · 5 phut truoc  [Goi]  │ │
│          │  │ HOT 82 Nguyen A  · Masteri B-08   · 12 phut truoc [Xem]  │ │
│          │  └────────────────────────────────────────────────────────────┘ │
│          │  ── Viec can lam hom nay ─────────────────────────────────────  │
│          │  [ ] Follow-up lead #LD-042 (SLA 2h)                            │
│          │  [ ] Gui link coc booking #BK-018                               │
└──────────┴──────────────────────────────────────────────────────────────────┘
```

**Persona P3:** Hot lead noi bat BR-07. KPI goi BFF `/bff/agent/v1/dashboard`.

### 5.6 Agent Portal — Lead list va Pipeline kanban

```
LEAD LIST:                              PIPELINE KANBAN (FR-CRM-05):
┌──────────────────────────────┐        ┌────────┬────────┬────────┬────────┐
│ Leads  [+ Them] [Import]     │        │  NEW   │QUALIFIED│CONTACTED│BOOKING│
│ Filter: [Hot v] [Project v]  │        ├────────┼────────┼────────┼────────┤
├──────────────────────────────┤        │┌──────┐│┌──────┐│┌──────┐│┌──────┐│
│ HOT Thu Trang  85  A-12-05   │        ││Trang │││Minh  │││Lan   │││Hung  ││
│    5 phut · Chua goi  [->]   │        ││ 85   │││ 62   │││ 71   │││ 90   ││
│ o Nguyen A    45  B-08-12    │        │└──────┘│└──────┘│└──────┘│└──────┘│
│ o Tran B      30  Walk-in    │        │  (12)  │  (8)   │  (5)   │  (3)   │
└──────────────────────────────┘        └────────┴────────┴────────┴────────┘
```

**Persona P2 Lan Huong:** Agency Admin xem pipeline tong, filter theo agent.

### 5.7 Agent Portal — Lead detail / Timeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ <- Leads    Thu Trang · HOT (85)                    [Goi] [Tao booking]     │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ THONG TIN                            │ TIMELINE (FR-CRM-04)                 │
│ SDT: 090***4567  [Copy]              │ * 28/07 15:00 — Lead tao tu form     │
│ Email: trang@gmail.com               │ * 28/07 15:01 — AI score: 85 HOT     │
│ Nguon: Public form / Google Ads      │ * 28/07 15:05 — Assigned -> Nam      │
│ Quan tam: A-12-05 Vinhomes Q9        │ o 28/07 16:00 — Ghi chu: Goi lai     │
│ Stage: [QUALIFIED v]                 │                                      │
│                                      │ [+ Them hoat dong v] Note/Call/Meet  │
│ ── Can quan tam ──                    │                                      │
│ [UnitCard mini A-12-05 Verified]     │                                      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### 5.8 Agent Portal — Listing create + AI Copilot panel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tao listing moi — Buoc 2/3: Noi dung                                          │
├──────────────────────────────────────────────┬──────────────────────────────┤
│ Chon unit: [A-12-05 · Vinhomes Q9]          │ AI Copilot (FR-AI-01)        │
│ Gia goc GR: 3.5 ty (read-only) LOCK         │                              │
│ Anti-drift: PASS                             │ [Tao mo ta AI]               │
│                                              │ Tone: [Premium v]            │
│ Tieu de*: [Can 3PN view song Block A____]   │                              │
│                                              │ ── Preview AI ──             │
│ Mo ta*:                                     │ "Can ho cao cap tang 12..."  │
│ ┌────────────────────────────────────────┐  │ Disclaimer: Noi dung AI      │
│ │ (agent edit / paste from copilot)      │  │   can agent duyet truoc      │
│ └────────────────────────────────────────┘  │ [Dung ban nay] [Tao lai]     │
│ Diem noi bat: [+ Them]                      │                              │
│ Anh: [Upload] (FR-LS-03)                    │ Human approve: [ ] Da duyet  │
│                                              │                              │
│ [Luu nhap]              [Gui duyet ->]      │                              │
└──────────────────────────────────────────────┴──────────────────────────────┘
```

**NFR-U02:** Median ≤5 phut voi AI copilot. FR-AI-04 human approve bat buoc. BR-06, BR-16 disclaimer.

### 5.9 Agent Portal — Booking create va Payment link

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tao booking / Giu cho                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Lead: [Thu Trang v]     Unit: [A-12-05 v]     Trang thai GR: AVAILABLE      │
│ So tien coc: [50.000.000 VND]     Thoi han giu: [48 gio v]                   │
│ Ghi chu: [Khach VIP gallery____________________________________]             │
│                                                                             │
│ Atomic lock — can se chuyen RESERVED khi tao booking (FR-BK-02)             │
│                                                                             │
│ [Huy]                              [Tao booking & sinh link coc ->]         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Booking #BK-018 created — RESERVED until 30/07 15:00                        │
│ Link coc: https://pay.wereal.vn/pi/abc123  [Copy] [Gui Zalo] [QR code]      │
│ State: RESERVED -> DEPOSIT_PENDING (cho khach thanh toan)                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Persona P3 Hoang Nam:** Chot deal gallery — link coc 1 click. BR-02 moi giao dich qua platform.

### 5.10 Admin Portal — Tenant, Moderation, Audit, KPI

```
TENANT LIST:                           MODERATION QUEUE (FR-LS-01):
┌──────────────────────────────┐       ┌──────────────────────────────────────┐
│ Tenants  [+ Onboard]         │       │ Duyet listing (12 pending)           │
│ [Dev v] [Agency v] [Active]  │       ├──────────────────────────────────────┤
├──────────────────────────────┤       │ LS-042 · A-12-05 · Agent: Nam        │
│ Dev Pilot Vinhomes  ACTIVE   │       │ Anti-drift: PASS · Verified: OK      │
│ Agency ABC          ACTIVE   │       │ [Preview]  [Duyet] [Tu choi]         │
│ Agency XYZ          PENDING  │       ├──────────────────────────────────────┤
└──────────────────────────────┘       │ LS-043 · B-08-12 · DRIFT FLAG        │
                                         │ Gia listing lech GR 5% — blocked     │
AUDIT LOG VIEWER (FR-TR-01):             │ [Xem drift]  [Reject]                │
┌──────────────────────────────────────┐└──────────────────────────────────────┘
│ Audit  Filter: [Unit v] [7 ngay v]  │       KPI DASHBOARD (FR-AN-01):
│ UNIT_PRICE_CHANGED · un_01 · 10:00  │       ┌────────┐┌────────┐┌────────┐
│ usr_dev · 3.5ty -> 3.6ty            │       │ Leads  ││Booking ││ Coc    │
│ [Xem chi tiet v]                      │       │  120   ││   18   ││  12    │
└──────────────────────────────────────┘       └────────┘└────────┘└────────┘
```

**Persona P5 Quoc Bao:** Anti-drift auto-check, audit filter, moderation SLA ASM-11.

### 5.11 Developer Portal (Phase 2 outline)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Developer Portal — Vinhomes Pilot (P2 outline FR-UX-04)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Project: [Vinhomes Q9 v]    [Import bang hang]    [Export Excel]            │
│ ┌─ Unit Grid ──────────────────────────────────────────────────────────────┐│
│ │ Block v  Floor v  Status v  Search: [____]                               ││
│ │ Code    │Floor│ Area │  Price (GR)  │ Status    │ Version │ Actions     ││
│ │ A-01-01 │  1  │ 50m2 │ 2.0 ty       │ AVAILABLE │ v3      │ [Edit]      ││
│ │ A-12-05 │ 12  │ 85m2 │ 3.5 ty       │ RESERVED  │ v4      │ [History]   ││
│ └──────────────────────────────────────────────────────────────────────────┘│
│ IMPORT WIZARD: 1 Upload -> 2 Validate -> 3 Preview diff -> 4 Commit         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Persona P1 Minh Tuan:** GR control, bulk import P2 (FR-GR-07), real-time status SSE.


---

## 6. Component Library (shadcn-based)

### 6.1 Core components

| Component | shadcn base | Usage WEREAL | Portal |
|-----------|-------------|--------------|--------|
| `Button` | button | CTA, actions | All |
| `Input` | input | Form fields | All |
| `Select` | select | Dropdown filter | All |
| `Checkbox` | checkbox | Consent PDPA, facet | Public, Agent |
| `Dialog` | dialog | Lead form modal, confirm | All |
| `Sheet` | sheet | Mobile filter drawer | Public |
| `Card` | card | Unit card, KPI card | All |
| `Badge` | badge | Verified, Hot lead, status | All |
| `Tabs` | tabs | Detail page sections | Public, Agent |
| `Table` | table | Lead list, audit log, unit grid | Agent, Admin, Dev |
| `DataTable` | data-table | Sortable paginated lists | Agent, Admin |
| `Form` | form + react-hook-form + zod | All forms validation | All |
| `Toast` | toast/sonner | Success/error feedback | All |
| `Skeleton` | skeleton | Loading states | All |
| `Alert` | alert | Anti-drift warning, errors | Agent, Admin |
| `Avatar` | avatar | User menu, agent assign | Agent, Admin |
| `DropdownMenu` | dropdown-menu | Actions menu | All |
| `Command` | command | Search autocomplete | Public, Agent |
| `Calendar` | calendar | Booking date picker | Agent |
| `Progress` | progress | Import wizard, upload | Dev P2 |
| `Separator` | separator | Section divider | All |
| `ScrollArea` | scroll-area | Timeline, kanban | Agent |
| `Tooltip` | tooltip | Icon explain, truncated text | All |
| `Popover` | popover | Quick actions | Agent |
| `Switch` | switch | Notification settings | Agent |
| `Textarea` | textarea | Listing description, notes | Agent |
| `RadioGroup` | radio-group | Facet single-select | Public |
| `Slider` | slider | Price range filter | Public |
| `Breadcrumb` | breadcrumb | Navigation hierarchy | Public |
| `Pagination` | pagination | Search results | Public |
| `Accordion` | accordion | FAQ, filter groups | Public |
| `NavigationMenu` | navigation-menu | Public header nav | Public |
| `Sidebar` | sidebar | Agent/Admin nav | Agent, Admin |
| `Chart` | chart (recharts) | KPI dashboard | Agent, Admin |

### 6.2 Domain-specific components

| Component | Mô tả | FR |
|-----------|-------|-----|
| `UnitCard` | Anh, gia, verified badge, status, compare checkbox | FR-LS-02, FR-GR-05 |
| `VerifiedBadge` | Verified Listing — green badge + tooltip | FR-GR-05 |
| `HotLeadBadge` | Hot — score>=80, orange pulse | FR-AI-02, BR-07 |
| `PriceDisplay` | Format VND, tabular nums, GR read-only lock icon | FR-GR-01 |
| `AntiDriftAlert` | Warning/block banner khi listing lech GR | FR-GR-04 |
| `LeadTimeline` | Vertical timeline activities | FR-CRM-04 |
| `PipelineKanban` | Drag-drop columns by stage | FR-CRM-05 |
| `BookingStateStepper` | 15-state visual stepper | FR-BK-03 |
| `PaymentLinkCard` | Copy link, QR, send channels | FR-PAY-02,05 |
| `AICopilotPanel` | Side panel generate + disclaimer + approve | FR-AI-01,04 |
| `ModerationCard` | Listing preview + drift report + actions | FR-LS-01 |
| `AuditLogRow` | Expandable event row with diff | FR-TR-01 |
| `ConsentCheckbox` | PDPA consent with policy link | NFR-C03 |
| `CompareTable` | Side-by-side unit comparison | FR-LS-04 |
| `UnitStatusDot` | Available / Reserved / Sold indicator | FR-GR-08 |
| `KPICard` | Metric + trend sparkline | FR-AN-01 |
| `EmptyState` | Illustration + CTA | UX polish |
| `ErrorState` | Retry button + support link | UX polish |

### 6.3 Component composition examples

**UnitCard anatomy:**
```
┌─────────────────────────┐
│ [Image 16:9]            │
│ VerifiedBadge (top-right)│
├─────────────────────────┤
│ heading-2: A-12-05      │
│ body-sm: Block A · T12  │
│ price: 3.5 ty           │
│ UnitStatusDot + label   │
│ [Compare checkbox]      │
└─────────────────────────┘
```

**AICopilotPanel anatomy:**
```
┌─────────────────────────┐
│ heading-3: AI Copilot   │
│ Select: tone/template   │
│ Button: Generate        │
│ Alert: disclaimer       │
│ Textarea: preview       │
│ Checkbox: human approve │
│ Button group: Use/Retry │
└─────────────────────────┘
```

---

## 7. Responsive breakpoints

| Breakpoint | Min width | Tailwind | Layout behavior |
|------------|-----------|----------|-----------------|
| `xs` | 320px | default | Single column, bottom nav Agent PWA |
| `sm` | 640px | `sm:` | 2-col unit grid, stacked forms |
| `md` | 768px | `md:` | Sidebar collapsible, facet drawer to sidebar |
| `lg` | 1024px | `lg:` | Full sidebar + content, 3-col grid |
| `xl` | 1280px | `xl:` | Max container 1200px, compare table full |
| `2xl` | 1536px | `2xl:` | Admin dashboard 4-col KPI |

### 7.1 Portal-specific responsive notes

| Portal | Mobile (320-767) | Tablet (768-1023) | Desktop (1024+) |
|--------|------------------|-------------------|-----------------|
| Public | Bottom CTA sticky lead form; facet drawer | 2-col grid | 3-col grid + facet sidebar |
| Agent | Bottom tab nav: Dashboard/Leads/Listings/Booking | Collapsed sidebar | Full sidebar + copilot panel |
| Admin | Stack KPI cards; table horizontal scroll | 2-col layout | Full moderation split view |

### 7.2 Touch targets

- Minimum touch target: 44x44px (WCAG 2.5.5 advisory)
- Button padding mobile: min `space-4` vertical
- Kanban card drag handle: 48px width on mobile

---

## 8. Key user flows (5 flows)

### Flow 1: Buyer tìm kiếm → lead (UAT-01, FR-UX-01, Persona P4)

```
[Trang chu] -> [Nhap search Q9 3PN] -> [Ket qua 45 can]
     -> [Click UnitCard A-12-05] -> [Detail page]
     -> [Fill lead form 3 fields + consent] -> [Submit]
     -> [Thank you modal] -> (async) AI score -> Agent notified
```

| Buoc | Screen | API/BFF | AC |
|------|--------|---------|-----|
| 1 | Home/search | GET /search/suggest | NFR-U03 ≤3 click |
| 2 | Search results | GET /search/units | NFR-P03 ≤200ms |
| 3 | Unit detail | BFF unit aggregate | Verified badge visible |
| 4 | Lead submit | POST /leads | Consent required |
| 5 | Agent notify | POST /ai/leads/{id}/score | Score ≤3s |

### Flow 2: Agent tao listing + AI copilot → duyet → publish (UAT-02)

```
[Agent: Chon unit GR] -> [Wizard step 2: AI copilot generate]
     -> [Agent edit + approve AI content] -> [Upload media]
     -> [Submit review] -> [Ops: Moderation queue]
     -> [Ops approve] -> [Listing PUBLISHED + Verified badge]
     -> [Search index sync <=5s]
```

Screens: Agent Listing Wizard → Admin Moderation Queue → Public Unit Detail (verified)

### Flow 3: Agent booking → buyer coc → ledger (UAT-03)

```
[Agent: Lead detail] -> [Create booking] -> [Atomic lock unit RESERVED]
     -> [Payment link generated] -> [Send to buyer]
     -> [Buyer: pay via VNPay + MFA OTP] -> [Webhook idempotent]
     -> [Booking DEPOSITED] -> [Ledger double-entry] -> [Daily reconcile]
```

Screens: Lead Detail → Booking Create → Payment Link Card → (Buyer external pay) → Booking Timeline

### Flow 4: Ops audit tranh chap gia (UAT-07, Persona P5)

```
[Ops: Audit log filter unitId] -> [View UNIT_PRICE_CHANGED events]
     -> [Drill-down version history] -> [Export evidence pack]
     -> [Optional: Booking timeline replay for dispute]
```

Screens: Admin Audit Viewer → Event Detail Drawer → Unit Version History (API-029)

### Flow 5: Concurrent booking — anti double book (UAT-05)

```
[Agent A: POST booking unit X] --+
                                  +-- [Redis atomic lock] -- 1 success, 1 fail 409
[Agent B: POST booking unit X] --+
     -> [Winner: RESERVED] -> [Loser: INVENTORY_LOCK_FAILED + suggest alt units]
```

UI: Error toast with suggested similar units from search API.

---

## 9. Accessibility — WCAG 2.1 Level A

> Phase 1 target: **WCAG 2.1 Level A** (NFR-U05 AA cho public portal Phase 2)

### 9.1 Checklist Level A

| Tiêu chí | WCAG | Implementation |
|----------|------|----------------|
| Text alternatives | 1.1.1 | Alt text cho ảnh unit; icon buttons có aria-label |
| Info and relationships | 1.3.1 | Semantic HTML: nav, main, form labels |
| Meaningful sequence | 1.3.2 | DOM order = visual order; mobile CTA không trap |
| Sensory characteristics | 1.3.3 | Không chỉ dùng màu — status có text "Còn hàng" |
| Keyboard | 2.1.1 | Mọi interactive focusable |
| No keyboard trap | 2.1.2 | Modal/dialog Esc close |
| Bypass blocks | 2.4.1 | Skip to main content link |
| Page titled | 2.4.2 | title dynamic per page |
| Focus order | 2.4.3 | Tab order logical trong form |
| Link purpose | 2.4.4 | "Xem chi tiết căn A-12-05" không chỉ "Xem thêm" |
| Labels | 3.3.2 | Form label visible, consent checkbox labeled |
| Error identification | 3.3.1 | Inline error messages tiếng Việt |
| Contrast (minimum) | 1.4.3 | Text 4.5:1 — primary #0F4C81 on white OK |
| Resize text | 1.4.4 | 200% zoom không mất content |
| Language | 3.1.1 | html lang="vi" |

### 9.2 Component accessibility notes

| Component | A11y requirement |
|-----------|------------------|
| VerifiedBadge | aria-label="Listing da xac minh khop du lieu goc" |
| HotLeadBadge | Khong chi icon — include text "Lead nong" |
| UnitStatusDot | Color + text: "Con hang", "Da giu", "Da ban" |
| Lead form | Required fields aria-required, error aria-describedby |
| Search autocomplete | role="combobox", arrow key navigation |
| Toast | role="status" / role="alert" for errors |
| KPI charts | Text alternative table summary for screen reader |

---

## 10. UI States

### 10.1 Loading states

| Context | Pattern | Component |
|---------|---------|-----------|
| Search results | Skeleton card grid 6 items | Skeleton + UnitCard shape |
| Unit detail | Hero skeleton + spec skeleton | Shimmer animation |
| Lead list | Table row skeleton | DataTable loading prop |
| Dashboard KPI | Card skeleton with pulse | KPICard skeleton |
| AI copilot | Spinner + "Dang tao noi dung..." ≤8s | AICopilotPanel loading |
| Payment link | Button spinner "Dang tao link..." | Button disabled + spinner |
| Submit form | Button disabled + "Dang gui..." | Prevent double submit |

### 10.2 Empty states

| Context | Message | CTA |
|---------|---------|-----|
| Search no results | "Khong tim thay can phu hop" | "Xoa bo loc" / "Lien he tu van" |
| Lead list empty | "Chua co lead nao" | "Them lead thu cong" |
| Pipeline column empty | "Khong co lead o giai doan nay" | — |
| Listing list empty | "Ban chua tao listing nao" | "Tao listing dau tien" |
| Moderation queue empty | "Khong co listing cho duyet" | — |
| Audit log empty | "Khong co su kien trong khoang thoi gian nay" | "Mo rong filter" |
| Compare (<2 units) | "Chon them can de so sanh (toi da 3)" | "Quay lai tim kiem" |

### 10.3 Error states

| Context | Message | Recovery |
|---------|---------|----------|
| Network error | "Khong the ket noi. Kiem tra mang." | [Thu lai] button |
| Search timeout | "Tim kiem qua lau. Thu hep bo loc." | Retry + suggest |
| Anti-drift block | "Listing bi chan — gia lech so voi du lieu goc" | Link xem GR price |
| Double booking | "Can vua duoc giu boi agent khac" | Suggest similar units |
| Payment failed | "Thanh toan khong thanh cong" | [Thu lai] / contact agent |
| AI copilot error | "AI tam thoi khong kha dung" | Manual input fallback |
| Form validation | Inline field errors tieng Viet | Focus first error |
| 403 forbidden | "Ban khong co quyen truy cap" | Link ve dashboard |

### 10.4 Verified badge state (FR-GR-05, BR-10)

| State | Visual | Condition |
|-------|--------|-----------|
| Verified | Green badge + checkmark | Anti-drift PASS + Ops approved |
| Pending | Gray badge "Cho xac minh" | PENDING_REVIEW status |
| Unverified | No badge | Draft or rejected listing |

- Hien thi tren: UnitCard, detail page, compare table
- Persona P4 Thu Trang: tang trust — INT-04 KD-10

### 10.5 Hot lead badge state (FR-AI-02, BR-07)

| Tier | Score | Badge | Priority |
|------|-------|-------|----------|
| HOT | ≥80 | Orange pulse + "Lead nong" | Top dashboard + routing |
| WARM | 50-79 | Yellow static | Normal queue |
| COLD | <50 | Gray/muted | Low priority |
| PENDING | null | Skeleton shimmer | Scoring in progress ≤3s |

### 10.6 Booking / Unit status colors

| Status | Color token | Label VI |
|--------|-------------|----------|
| AVAILABLE | success | Con hang |
| RESERVED | warning | Dang giu cho |
| DEPOSIT_PENDING | warning | Cho coc |
| DEPOSITED | primary | Da coc |
| SOLD | muted | Da ban |
| CANCELLED | destructive | Da huy |

---

## 11. Traceability FR-UX & Personas

### 11.1 FR-UX → Screen mapping

| FR | Portal | Screens | Persona |
|----|--------|---------|---------|
| FR-UX-01 | Public | Home, Search, Detail, Compare, Lead | P4 Thu Trang |
| FR-UX-02 | Agent | Dashboard, Leads, Pipeline, Listing wizard, Booking | P3 Hoang Nam, P2 Lan Huong |
| FR-UX-03 | Admin | Tenant list, Moderation, Audit, KPI | P5 Quoc Bao, Platform Admin |
| FR-UX-04 | Developer (P2) | Unit grid, Import wizard | P1 Minh Tuan |

### 11.2 UAT scenario → UI coverage

| UAT | UI screens involved |
|-----|---------------------|
| UAT-01 | Public search → detail → lead → Agent dashboard hot lead |
| UAT-02 | Agent listing wizard + AI → Admin moderation → Public detail verified |
| UAT-03 | Agent booking → Payment link → Buyer pay → Agent booking state |
| UAT-04 | Agent listing form anti-drift block UI |
| UAT-05 | Agent booking error double-book toast |
| UAT-12 | AI copilot panel + guardrail error message |
| UAT-14 | Public portal 320px responsive check |
| UAT-15 | Full E2E all portals |

---

## 12. Phu luc

### 12.1 Figma file structure (reference)

```
WEREAL-UI-2026.fig
├── Design System
├── Public Portal
├── Agent Portal
├── Admin Portal
├── Developer Portal (P2)
└── Components
```

### 12.2 Tech stack UI Phase 1

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 App Router |
| Styling | Tailwind CSS 3.4 |
| Components | shadcn/ui + Radix |
| Forms | react-hook-form + zod |
| State | TanStack Query (server state) |
| Real-time | EventSource SSE client |
| i18n | next-intl (vi-VN default) |
| Auth | NextAuth / custom JWT |

### 12.3 Lien ket tai lieu

| ID | Tai lieu | File |
|----|----------|------|
| REF-API | Thiet ke API | `Thiet-ke-API.md` |
| REF-SRS | SRS v2.0 | `Tai-lieu-yeu-cau-phan-mem.md` |
| REF-CRQ | Yeu cau xac nhan | `Yeu-cau-da-xac-nhan.md` |
| REF-AC | Tieu chi chap nhan | `Tieu-chi-chap-nhan.md` |
| REF-DS | Design System Spec v2.1 | `docs/specs/WEREAL-Design-System-Spec.md` |
| REF-FIGMA | Figma Variables export | `design-tokens/figma/` |
| REF-OPS | Roadmap van hanh | `Ke-hoach-du-an.md` §13 |

---

## 13. Lợi thế UX & gate vận hành

> **Cập nhật:** 28/07/2026 · Liên kết `WEREAL-Design-System-Spec.md` §12

### 13.1 WEREAL chuyên nghiệp hơn đối thủ ở UX

| Tiêu chí | WEREAL | Marketplace / CRM VN |
|----------|--------|----------------------|
| Design tokens | Code ↔ Figma Variables pipeline | Màu hardcode |
| Portal shell | 7 portal thống nhất brand | UI lẻ |
| BĐS semantics | Verified, reserved, sold badges | Generic labels |
| Developer UX | Portal Chủ đầu tư + gold KPI accent | Không có |
| Style guide | `/design-system` interactive | Không có |

### 13.2 Gate trước go-live UI

- [ ] Production FE dùng tokens — không hex lẻ (DS Spec §10)
- [ ] Figma library sync sau mỗi sprint token change
- [ ] Public light header / internal brand gradient (§6 shell)
- [ ] Giá tabular-nums trên mọi màn listing/booking
- [ ] Pilot UAT pass trên UI production build — không chỉ prototype

### 13.3 Liên kết nâng cấp vận hành

Chi tiết P0→P3: `Ke-hoach-du-an.md` §13 · `Pham-vi-cong-viec.md` §13 · `Tieu-chi-chap-nhan.md` §14

*Kết thúc tài liệu Mockup UI mẫu — WEREAL-UI-2026-v1.1*

