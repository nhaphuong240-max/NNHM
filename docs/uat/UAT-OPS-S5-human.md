# UAT OPS S5 — hoa hồng + phiếu cọc (G-OPS-2)

> Tenant LIVE: `ten_pilot_cdt_01` · project `prj_thanglong_01`  
> Cổng: **G-OPS-2**. Phụ thuộc G-OPS-1 (7 ngày reconcile cọc) trước payout live.

**Rails pilot (seed / verify):**

```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: ten_pilot_cdt_01" \
  "$API/admin/config/rails/resolved" | jq '.data | {payoutStub,payoutEnabled,esignSandbox}'
```

Kỳ vọng: `payoutStub: false`, `payoutEnabled: true`, `esignSandbox: false`.

## UAT-S5-01 — Payout live + bank webhook

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | Finance chạy settlement trên pilot → run `SUBMITTED`, batch `pay_<runId>` | | | |
| 2 | Bank webhook `payout.submitted` + `SUCCESS` → lines `PAID`, run `COMPLETED` | | | |
| 3 | Audit `SETTLEMENT_RUN_SUBMITTED` rồi `SETTLEMENT_RUN_COMPLETED` | | | |

## UAT-S5-02 — BR-23 KYC trước chi HH

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | Line `ce_pilot_agcy01` (agcy_thanglong) bị chặn khi KYC PENDING | | | |
| 2 | Duyệt `ce_pilot_agent01` (usr_pilot_agent KYC APPROVED) → settlement OK | | | |
| 3 | Batch status SUBMITTED → PAID qua webhook | | | |

## UAT-S5-03 — E-sign phiếu cọc VNPT

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | Mở `/buyer/esign?contractId=ctr_pilot_deposit01` (tenant pilot) | | | |
| 2 | Provider VNPT SmartCA (legal-provider), không stub OTP | | | |
| 3 | Hợp đồng gắn `bk_pilot_deposit01`, vault ref sau ký | | | |

## UAT-S5-04 — Tắt stub trên tenant LIVE

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | OTP `123456` reject trên pilot (SMS live) | | | |
| 2 | `WEREAL_ESIGN_STUB` không áp dụng khi `esignSandbox=false` | | | |
| 3 | UI không placeholder demo OTP trên pilot | | | |

## UAT-S5-05 — Đối chiếu batch vs sao kê

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | Finance → Settlement → nhập run id + batch + số tiền sao kê | | | |
| 2 | Kết quả `MATCHED` khi batch id và amount khớp | | | |
| 3 | Audit `PAYOUT_BATCH_RECONCILED` | | | |

---

## G-OPS-2 sign-off

| Role | Tiêu chí | Name | Date |
|------|----------|------|------|
| **Finance** | 7 ngày reconcile sau G-OPS-1 + 1 payout batch khớp sao kê | | |
| **Product** | Phiếu cọc e-sign VNPT trên booking pilot | | |

Automated gate (`e2e/s5-settlement.spec.ts`) không thay chữ ký trên bảng này.
