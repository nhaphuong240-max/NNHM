# WEREAL REOS — Design System Specification

> **Document ID:** WEREAL-DS-2026-v2.1  
> **Trạng thái:** Draft — chuẩn hóa prototype & production FE  
> **Liên kết:** `Mockup-UI-mau.md` · `prototype/src/config/designTokens.ts` · `/design-system` · `Ke-hoach-du-an.md` §13

---

## 1. Mục đích

Tài liệu này là **chuẩn UI duy nhất** cho WEREAL REOS — màu sắc, typography, layout, component và theme theo portal. Trước đây prototype dùng palette lẻ (indigo/emerald/slate đen) giữa các portal; v2.1 thống nhất **một brand core** + accent nhẹ theo portal.

| Deliverable | Path |
|-------------|------|
| Tokens (code) | `prototype/src/config/designTokens.ts` |
| CSS variables | `prototype/src/index.css` |
| Tailwind | `prototype/tailwind.config.js` |
| **Figma Variables** | `design-tokens/figma/*.tokens.json` — `scripts/export_figma_tokens.py` |
| Live style guide | `http://localhost:5173/design-system` |
| Interactive UI | `prototype/` — Next.js 14 + shadcn (production target) |

---

## 2. Nguyên tắc thiết kế

| # | Nguyên tắc | UI manifestation |
|---|------------|------------------|
| 1 | **Trust-first** | Verified badge xanh, giá tabular-nums, nguồn GR minh bạch |
| 2 | **Speed for agents** | Data-dense tables, kanban, ≤3 click lead |
| 3 | **Buyer simplicity** | Public sáng, ít chrome, sticky CTA |
| 4 | **One brand** | Primary `#0F4C81` trên mọi portal — không palette riêng |
| 5 | **Semantic color** | Success/warning/destructive chỉ cho trạng thái nghiệp vụ |

---

## 3. Bảng màu (Color Tokens)

### 3.1 Brand core

| Token | Hex | Tailwind | Dùng cho |
|-------|-----|----------|----------|
| `primary` | `#0F4C81` | `bg-primary` | CTA, header nội bộ, link, active nav |
| `primary-light` | `#1a6bb5` | — | Gradient, hover |
| `primary-dark` | `#0a3d6b` | — | Gradient end, Admin accent |
| `accent` | `#C9A227` | `bg-accent` | Giá VIP, KPI gold, premium CTA |
| `secondary` | `#E8F1F8` | `bg-secondary` | Section bg, hover nhẹ |
| `background` | `#FAFBFC` | `bg-background` | Canvas card |
| `page` | `#F4F7FA` | body | Nền trang |
| `border` | `#E2E8F0` | `border-border` | Divider, input |
| `muted` | `#64748B` | `text-muted` | Caption, placeholder |

### 3.2 Semantic (trạng thái BĐS)

| Token | Màu | Ví dụ |
|-------|-----|-------|
| `verified` | Green | Badge Verified Listing |
| `hotLead` | Orange | Lead score ≥80 |
| `reserved` | Amber | Unit đang giữ chỗ |
| `available` | Green | Còn hàng |
| `sold` | Slate | Đã bán |
| `pending` | Blue | Chờ duyệt |
| `driftBlock` | Red | Anti-drift BLOCK |

### 3.3 Portal accent (không đổi brand header)

| Portal | Accent | Header |
|--------|--------|--------|
| Public | `#0F4C81` | **Light** (trắng) — marketing |
| Agent | `#0F4C81` | Brand gradient |
| Admin | `#0a3d6b` | Brand gradient |
| Developer | `#0F4C81` | Brand gradient + gold KPI |
| Finance | `#0F766E` | Brand gradient (teal KPI tiền) |
| Buyer | `#1a6bb5` | Brand gradient |
| Auth | `#0F4C81` | Light |

---

## 4. Typography

**Font stack:** Inter · Be Vietnam Pro (Tiếng Việt) · JetBrains Mono (ID)

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| Display | 36px | 700 | Hero Public |
| H1 | 28–32px | 700 | Page title |
| H2 | 22–24px | 600 | Section |
| H3 | 18px | 600 | Card title |
| Body | 16px | 400 | Nội dung |
| Small | 14px | 400 | Meta, caption |
| Label | 12px | 500 uppercase | Table header, badge |
| Price | 24px | 700 tabular-nums | Giá BĐS |
| Mono | 13px | 400 | UC-ID, booking ref, audit |

---

## 5. Layout & Grid

```
┌──────────────────────────────────────────────────────────────┐
│ Header 64px — max-width 1600px centered                      │
├──────────┬───────────────────────────────────────────────────┤
│ Sidebar  │ Main content                                      │
│ 256px    │ padding: 16px (mobile) / 32px (desktop)           │
│ (lg+)    │ KPI: grid 2→4 cols                                │
│          │ Cards: 1→2→3 cols                                 │
└──────────┴───────────────────────────────────────────────────┘
│ Footer — links Design System                                 │
└──────────────────────────────────────────────────────────────┘
```

| Breakpoint | Width | Hành vi |
|------------|-------|---------|
| Mobile | ≥320px | Bottom nav (Public), single column |
| `md` | 768px | Top tabs Public |
| `lg` | 1024px | Sidebar visible, 1600px max |

---

## 6. Shell patterns theo portal

### 6.1 Internal portals (Agent, Admin, Developer, Finance, Buyer)

- Header: **premium-gradient** (brand blue)
- Sidebar trái: border accent 3px, nav active = accent soft bg
- PageHero + ContentArea wrapper

### 6.2 Public Portal

- Header: **trắng**, logo primary
- Nav: top tabs (desktop) + bottom bar (mobile)
- Hero search full-width, facet sidebar

### 6.3 Auth

- Header light, form card centered max-w-md
- Minimal chrome

---

## 7. Component library

| Component | Spec |
|-----------|------|
| **Button Primary** | `bg-primary`, rounded-lg, h-10–11, font-semibold |
| **Button Accent** | Gold — CTA premium (Portal CĐT, highlight KPI) |
| **Button Destructive** | Red — hủy booking, reject |
| **Input** | h-11, border-border, focus ring primary/20 |
| **Card** | `glass-card`, rounded-2xl, p-5–6 |
| **StatCard** | KPI số lớn tabular-nums; highlight = accent ring |
| **DataTable** | Header uppercase 12px, row hover slate-50 |
| **Badge Verified** | semantic.verified |
| **FlowSteps** | Numbered primary circles — UC demo |

---

## 8. Iconography

- **Library:** Lucide React
- **Size:** 16px inline · 20px button · 24px nav
- **Stroke:** 1.5px

---

## 9. Accessibility (Phase 1)

- WCAG 2.1 Level A target
- Contrast primary on white ≥ 4.5:1
- Focus ring visible trên input/button
- Form label + error text rõ ràng

---

## 10. Áp dụng production (Next.js 14)

1. Copy `designTokens.ts` → `apps/web/src/styles/tokens.ts`
2. Map tokens vào `tailwind.config` + CSS variables (shadcn `globals.css`)
3. `PremiumShell` → `AppShell` shared layout per portal route group
4. Không hardcode hex — dùng `primary`, `accent`, `muted`

---

## 11. Kiểm tra chuẩn (Checklist)

- [ ] Mọi portal dùng cùng header brand (trừ Public/Auth light)
- [ ] Không còn `bg-indigo-*`, `bg-emerald-*` cho portal identity
- [ ] Giá luôn `tabular-nums`
- [ ] CTA chính = primary; premium = accent gold
- [ ] Sidebar active state dùng portal accent
- [ ] Style guide `/design-system` cập nhật khi đổi token

---

## 12. Design Ops — lợi thế cạnh tranh & gate production

> **Cập nhật:** v2.1 · Tham chiếu `Ke-hoach-du-an.md` §13 · `design-tokens/figma/`

### 12.1 Vì sao design system là moat UX

| Tiêu chí | WEREAL v2.1 | CRM / marketplace VN |
|----------|-------------|----------------------|
| Token pipeline | Code → CSS → Tailwind → **Figma Variables** | Hardcode màu lẻ |
| Portal consistency | 1 brand + accent theo portal | Palette khác nhau |
| Trust UI | Verified badge, tabular-nums giá, semantic status | Không chuẩn BĐS |
| Handoff | `export_figma_tokens.py` regenerate | Không sync design-dev |

### 12.2 Gate trước production FE

- [ ] Không hardcode hex — chỉ dùng token `primary`, `accent`, `semantic.*`
- [ ] Figma Variables import/sync sau mỗi đợt đổi token
- [ ] Màn mới map vào component presets (`components.*` trong `designTokens.ts`)
- [ ] Public/Auth = header light; internal = brand gradient (§6)
- [ ] Giá & KPI = `tabular-nums`; CTA premium = accent gold
- [ ] WCAG contrast pass trước merge (§9)

### 12.3 Việc ưu tiên design (30 ngày)

1. Publish Figma library từ `design-tokens/figma/*.tokens.json`
2. Component spec cho **StatCard**, **DataTable**, **FlowSteps** — dùng 100% portal production
3. Mobile Public bottom nav + Agent dense table — regression visual mỗi sprint

---

**Regenerate style guide:** `cd prototype && npm run dev` → mở `/design-system`
