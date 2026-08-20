# Sprint Backlog — OPS-90 (Nâng cấp vận hành)

> 20/08–16/11/2026 · 6 sprint × 2 tuần · **1 tenant live**, không T7 theater  
> Phân tích hiện trạng: canvas `wereal-ops-upgrade` · Kế hoạch tương tác: canvas `wereal-upgrade-plan`  
> Tenant mục tiêu: `ten_pilot_cdt_01` · dự án `prj_thanglong_01` (`config/gtm/pilot-cdt-v1.json`)

## North star

Một CĐT + hai đại lý chạy **giữ chỗ → cọc → sổ cái → 1 dòng hoa hồng** trên URL staging/prod, có người ký. GMV đi qua platform.

**Cấm:** apply `config/tier-t7/production-trust.env` toàn cục (bật cùng lúc VNPay prod, eKYC, e-sign, payout, escrow NHNN, SSO). Rail bật **theo tenant** qua `LIVE_RAILS`.

## Gates

| Cổng | Ngày | Pass | Người ký |
|------|------|------|----------|
| **G-OPS-0** | 24/08 | 1 CĐT + 2 agency + freeze PR `ops-90` | Product + Tech lead |
| **G-OPS-1** | 05/10 | 1 cọc người thật, ledger MATCHED, 0 `mock/complete` | PO + Finance + CĐT |
| **G-OPS-3** | 19/10 | Lead Zalo/web vào inbox; ZNS hoặc SMS tới máy thật | Agency lead + Product |
| **G-OPS-2** | 02/11 | 7 ngày reconcile + 1 payout khớp sao kê | Finance |
| **G-OPS-4** | 16/11 | On-call 1 incident thử; không OTP `123456` trên staging | Eng + Security |

Script `scripts/uat-t7-*.sh` vẫn chạy CI. Cổng OPS chỉ pass khi có **tên + ngày** trên checklist người thật.

## Out of scope (reject PR)

BNPL · escrow NHNN · mortgage · AI copilot/forecast mới · mobile buyer store · API marketplace công khai · CĐT LIVE thứ 2/3 · SSO bắt buộc trước G-OPS-1 · OpenSearch / Temporal / Kafka.

---

## S0 — Freeze (20–24/08) · G-OPS-0

| Task ID | Owner | Mô tả | Done when |
|---------|-------|-------|-----------|
| OPS-S0-01 | Product | Ký 1 CĐT + 2 agency; freeze dự án `prj_thanglong_01` | Danh sách user seed |
| OPS-S0-02 | Tech lead | PR label `ops-90`; từ chối module mới / AI / BNPL | Template PR + rule review |
| OPS-S0-03 | BE | `WAU_PILOT_SIM_ENABLED=false` mọi URL ≠ local | Health network không đếm simulate |
| OPS-S0-04 | Product | Secret backlog: VNPay TMN, Zalo OA, SMS, VNPT (S5) | Owner từng secret |

**Demo S0:** freeze signed. Không merge code domain.

---

## S1 — Rail theo tenant + cắt IA (25/08–07/09)

| Task ID | Module | Mô tả | File / artifact | Done when |
|---------|--------|-------|-----------------|-----------|
| OPS-S1-01 | tenant-config | Domain `LIVE_RAILS` trên `tenant_config_versions` | `tenant-config-version.entity.ts` + migration | Payload JSON versioned |
| OPS-S1-02 | tenant-config | `RailResolver`: tenant overlay > process env | `rail-resolver.service.ts` (mới) | Pilot VNPAY, demo MOCK |
| OPS-S1-03 | web | Nav P0: 5 link / portal; còn lại Advanced | `*Shell.tsx` | Sale không lạc 12 link |
| OPS-S1-04 | payment + NW | Simulate + `GET /payments/mock/complete` → 403/404 khi tenant LIVE | `mock-payment-complete.controller.ts` | Tenant LIVE không mock |
| OPS-S1-05 | config | Profile `config/ops-90/pilot-live.env` (subset, không copy T7) | `config/ops-90/` | Documented flags |
| OPS-S1-06 | contract | OpenAPI: LIVE_RAILS + ghi chú simulate prod | `openapi.yaml` | Contract gate |

**LIVE_RAILS payload (S1 seed)**

| Key | `ten_dev_01` | `ten_pilot_cdt_01` |
|-----|--------------|---------------------|
| `paymentMethod` | MOCK | VNPAY (sandbox URL) |
| `mfaSandbox` | true | false (S2) |
| `smsSandbox` / `znsSandbox` | true | true đến S4 |
| `esignSandbox` / `payoutStub` | true | true đến S5 |
| `escrow` / `bnpl` | false | **false — cấm** |
| `simulateEndpoints` | allow | 403 |

**Demo S1:** đổi LIVE_RAILS → payment VNPAY chỉ tenant pilot. Nav agent 5 mục P0.

**P0 nav**

| Portal | 5 màn P0 |
|--------|----------|
| Agent | Home, Leads, Inbox, Giữ chỗ, Listing wizard |
| CĐT | Units, Import, Moderation (qua admin), GMV, Commission |
| Finance | Reconciliation, Refunds, Settlement |
| Admin | Ops (S3), Moderation, Users, Audit |
| Buyer | Payment, Deals (e-sign từ S5) |

---

## S2 — VNPay tenant + MFA (08–21/09)

| Task ID | Module | Mô tả | Done when |
|---------|--------|-------|-----------|
| OPS-S2-01 | payment | Pilot `PAYMENT_DEFAULT_METHOD=VNPAY`, `VNPAY_SANDBOX=true` đến G-OPS-1 | Redirect sandbox |
| OPS-S2-02 | payment | Staging/prod: không register `mock/complete` | 404 |
| OPS-S2-03 | security | `WEBHOOK_SKIP_VERIFY` fail trên staging (`C-01`) | Strict trên URL thật |
| OPS-S2-04 | identity | MFA TOTP bắt buộc `DEVELOPER_ADMIN` + finance; OTP `123456` reject | Login step-up |
| OPS-S2-05 | web e2e | Playwright: book → VNPay sandbox IPN → ledger 2 line | CI green |
| OPS-S2-06 | ops | Owner finance chạy reconcile 06:00 ICT | Tên trong runbook |

**Demo S2:** buyer cọc sandbox trên tenant pilot; admin không login bằng `123456`.

---

## S3 — Pilot người thật (22/09–05/10) · G-OPS-1

| Task ID | Module | Mô tả | Done when |
|---------|--------|-------|-----------|
| OPS-S3-01 | web + health | `/admin/ops`: stuck payment, lock TTL, drift BLOCK, reconcile mismatch | 4 widget + deep link runbook |
| OPS-S3-02 | gtm | SOP CĐT: import CSV tuần; chỉ admin CĐT PATCH giá | SOP 1 trang |
| OPS-S3-03 | mobile | Book 30 giây từ lead (bỏ bước thừa) | Sale làm được tại nhà mẫu |
| OPS-S3-04 | uat | UAT người: CĐT + 2 sale + 1 finance trên staging | `docs/uat/UAT-OPS-pilot-human.md` |
| OPS-S3-05 | gate | G-OPS-1: 1 cọc người thật, ledger MATCHED | PO + Finance + CĐT ký |

**Điểm dừng Wave 1:** G-OPS-1 fail → không mở S4. Sửa đường cọc trước.

---

## S4 — Kênh VN (06–19/10) · G-OPS-3

| Task ID | Module | Mô tả | Done when |
|---------|--------|-------|-----------|
| OPS-S4-01 | zalo | `znsSandbox=false` tenant pilot | Graph/ZNS live |
| OPS-S4-02 | zalo + sms | ZNS `payment.success` + fallback SMS | Máy thật nhận tin |
| OPS-S4-03 | crm + web | Inbox = nguồn lead; CSV import ra Advanced | Sale mở inbox mỗi sáng |
| OPS-S4-04 | sms | OTP live; `123456` reject trên tenant LIVE | Provider HTTP |
| OPS-S4-05 | mobile-agent | Lead mới dưới 5 phút → inbox + push (`PUSH_LIVE_ENABLED` tenant) | SLA đo được |

**Demo S4:** lead Zalo/web vào inbox; cọc xong có ZNS hoặc SMS. **G-OPS-3.**

---

## S5 — Hoa hồng + phiếu cọc (20/10–02/11) · G-OPS-2

| Task ID | Module | Mô tả | Done when |
|---------|--------|-------|-----------|
| OPS-S5-01 | integrations | `payoutStub=false` tenant pilot | Bank connector live webhook |
| OPS-S5-02 | commission + kyc | 1 settlement run; BR-23 chặn chưa KYC | Batch SUBMITTED/PAID |
| OPS-S5-03 | booking + web | E-sign phiếu cọc VNPT trên `/buyer/esign` | Hợp đồng gắn booking |
| OPS-S5-04 | booking | Tắt `WEREAL_ESIGN_STUB` / OTP demo trên tenant LIVE | Adapter VNPT |
| OPS-S5-05 | finance | Đối chiếu 1 batch với sao kê | **G-OPS-2** ký |

Phụ thuộc: 7 ngày reconcile sau G-OPS-1 trước khi payout live.

---

## S6 — Chuyên nghiệp (03–16/11) · G-OPS-4

| Task ID | Module | Mô tả | Done when |
|---------|--------|-------|-----------|
| OPS-S6-01 | ops | Grafana import staging URL + on-call roster | 1 incident drill |
| OPS-S6-02 | enterprise | White-label 1 domain CĐT (5 public + 5 dev) | CĐT đưa link khách |
| OPS-S6-03 | identity | SSO OIDC **chỉ nếu IT CĐT đòi** — không chặn GTM | Optional |
| OPS-S6-04 | contract | `openapi.yaml` khớp route đang serve (~200) | Contract gate |
| OPS-S6-05 | gtm | `docs/dev/OP-WIN-OPS-signoff.md` human rows | **G-OPS-4** |

---

## Squad

| Vai trò | Focus | Thời gian |
|---------|-------|-----------|
| Tech lead / BE | RailResolver, money, flags | 100% |
| BE 2 | Zalo/SMS, payout, e-sign | 100% từ S4 |
| FE (web + mobile) | IA P0, ops console, agent book | 100% |
| Product / BA | Pilot CĐT, UAT người, SOP | 80% |
| Finance ops | Reconcile, settlement | 30% từ S2 |

## Verification

```bash
# Sau S1
curl -s -H "X-Tenant-Id: ten_pilot_cdt_01" "$API/health/money" | jq .

# G-OPS-1 — người thật, không chỉ script
# docs/uat/UAT-OPS-pilot-human.md
```

Không dùng `./scripts/apply-tier-t7-money.sh` lên process global. Dùng overlay tenant `LIVE_RAILS`.
