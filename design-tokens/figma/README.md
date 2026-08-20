# WEREAL → Figma Variables

Design tokens xuất từ `prototype/src/config/designTokens.ts` (v2.1).

## Regenerate

```bash
cd WEREAL/scripts && python3 export_figma_tokens.py
```

## Cách import vào Figma

### Cách 1 — Variables Import / Export (khuyến nghị)

Plugin mẫu chính thức của Figma, hỗ trợ [W3C Design Tokens](https://design-tokens.github.io/community-group/format/).

1. Mở file Figma WEREAL (hoặc tạo file mới).
2. **Plugins → Development → Import plugin from manifest…**  
   Hoặc cài [Variables Import Export sample](https://github.com/figma/plugin-samples/tree/master/variables-import-export).
3. Chạy plugin → **Import**.
4. Import **lần lượt** từng file trong thư mục này (mỗi file = 1 collection):

| File | Collection Figma |
|------|------------------|
| `01-brand.tokens.json` | Brand |
| `02-semantic.tokens.json` | Semantic |
| `03-portal.tokens.json` | Portal |
| `04-spacing.tokens.json` | Spacing |
| `05-radius.tokens.json` | Radius |
| `06-layout.tokens.json` | Layout |
| `07-typography.tokens.json` | Typography |
| `08-elevation.tokens.json` | Elevation |

5. Sau import, đặt tên collection trong Figma trùng bảng trên (tuỳ chọn).
6. Publish library nếu dùng chung team.

**Lưu ý:**

- Plugin W3C hiện import **1 mode** mỗi lần — phù hợp với WEREAL (single light theme).
- Spacing / radius / layout / font-size xuất dạng **number (px)** vì plugin chỉ hỗ trợ `color` + `number`.
- Collection **Elevation** dùng `string` (CSS shadow) — gán thủ công Effect style hoặc dùng Tokens Studio.

### Cách 2 — Tokens Studio for Figma

1. Cài plugin **Tokens Studio for Figma**.
2. **Settings → Import** → chọn `tokens-studio.json`.
3. **Create variables** hoặc **Apply to selection** theo workflow team.

File `tokens-studio-flat.json` dùng cho tooling/script khác (flat key path).

## Mapping code ↔ Figma

| Code (CSS / Tailwind) | Figma variable path |
|------------------------|---------------------|
| `--color-primary` | `color/primary` |
| `brand.accent` | `color/accent` |
| `semantic.verified.bg` | `color/verified/bg` |
| `portalThemes.developer.accent` | `portal/developer/accent` |
| `spacing.4` | `spacing/4` |
| `--radius-lg` | `radius/lg` |

## Đồng bộ

Khi đổi token trong code:

1. Sửa `prototype/src/config/designTokens.ts` (+ `index.css` nếu CSS vars).
2. Cập nhật `scripts/wereal_design_tokens_data.py` (catalog export).
3. Chạy lại `export_figma_tokens.py`.
4. Re-import hoặc sync qua Tokens Studio.

## Liên kết

- `docs/specs/WEREAL-Design-System-Spec.md`
- `Ke-hoach-du-an.md` §13 — roadmap vận hành
- Prototype preview: `/design-system`
