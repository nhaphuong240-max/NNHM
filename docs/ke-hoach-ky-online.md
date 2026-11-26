# Kế hoạch triển khai ký online đa bên — NNHM

**Tài liệu:** kế hoạch triển khai kỹ thuật, không phải ý kiến pháp lý và không phải quyết định nghiệp vụ đã chốt.  
**Repo:** `/workspace/nnhm-repo` · nhánh đối chiếu `spec-v1-complete` (commit `ef3f339`). Tài liệu này chỉ đọc repo, không push.  
**Ngày soạn:** 26/11/2026 (Asia/Saigon).  
**Phạm vi người dùng:** khách hàng (buyer), đối tác (chủ đầu tư / agency / sàn), sales / agent, và người duyệt nội bộ.

Các số TTL, hạn mức thử OTP, nhà cung cấp, vai trò duyệt và danh sách tài liệu bắt buộc **để trống** khi chưa có quyết định của người sở hữu. Giá trị đang có trong code được nêu rõ là *hiện trạng kỹ thuật*, không được hiểu là đã chốt nghiệp vụ.

---

## 1. Mục tiêu và phạm vi

### 1.1. Mục tiêu

Xây dựng một luồng ký tài liệu online thống nhất, dùng được cho mọi bên liên quan:

1. Tạo tài liệu (từ mẫu hoặc bản soạn).
2. Chọn người ký, thứ tự (tuần tự hoặc song song).
3. Gửi **link một lần** (token) kèm **OTP** tới đúng kênh đã đăng ký: email, SMS, và tùy chọn Zalo ZNS.
4. Người ký xem, đồng ý điều khoản, nhập OTP, ký.
5. Hệ thống băm tài liệu, ghi audit trail, lưu bản đã ký vào document vault, gửi bản sao.
6. Khi nghiệp vụ yêu cầu: **admin duyệt sau khi ký**, rồi cập nhật trạng thái booking / hợp đồng.
7. Fail-closed: không mở cửa quyết định D08 / D09 / D10; không coi OTP sandbox là chữ ký pháp lý.

### 1.2. Hiện trạng repo (điểm tựa)

Hệ thống **đã có một luồng ký OTP cho buyer** trên hợp đồng booking, nhưng chưa phải nền tảng ký đa bên:

| Thành phần | Hiện trạng | Chỗ trong repo |
| --- | --- | --- |
| Mẫu hợp đồng | Ba mẫu: đặt cọc, mua bán, giấy ủy quyền. Trạng thái hợp đồng chỉ `DRAFT` \| `SIGNED`. | `booking-contract.types.ts:51`; `booking-contract.util.ts:3–25` |
| Vé vào trang ký | Token HMAC `v1s.{body}.{sig}`, TTL **15 phút**, gắn `tenantId` + `contractId` + `buyerId`. Comment trong code: *không phải chữ ký pháp lý; D08 vẫn chưa ký*. | `contract-sign-token.ts:3–56` |
| Cấp token | Portal cấp sau khi buyer đã đăng nhập và **sở hữu booking theo SĐT** (`phonesMatch` trên lead). | `portal.controller.ts:133–148`; `portal.service.ts:437–468` |
| OTP ký | Gửi SMS template `sms_otp_v1`, nguồn `ESIGN_OTP`. Sandbox cố định `123456`. OTP **lưu plain text** trong `sms_delivery.params`. | `sms.service.ts:17–20, 116–126, 163–164`; `booking-contract-esign-sms.service.ts:47–96` |
| Ký | `POST /contracts/:id/sign` — yêu cầu `consent`, `signerName`, OTP. Token chỉ là vé vào route. Lưu file **text/plain** (`*_signed.txt`) vào vault, `docType: SIGNED_CONTRACT`, `retentionClass: '10Y'`. Audit `SIGNED` **không ghi IP/UA**. Không đổi trạng thái booking. | `booking-contract.controller.ts:136–150`; `booking-contract.service.ts:185–285` |
| Provider CA | Interface `EsignProviderAdapter` + stub `VNPT_SMARTCA`. Registry trả về VNPT kể cả khi `ESIGN_PROVIDER` khác. | `esign-provider.adapter.ts`; `vnpt-esign.adapter.ts:13–151`; `booking-contract-esign-provider.service.ts` |
| Artifact pháp lý | Đăng ký artifact cần role `DEVELOPER_ADMIN`. `markProviderSigned` **luôn 422** (D08 đóng). | `contract-artifact.service.ts:14, 31–32, 52, 58–67` |
| SMS / Zalo / notify | SMS brandname + binding; ZNS có sẵn template `zns_otp_v1`; notify CRM chỉ SMS, **không có module email/SMTP/SES**. | `sms.types.ts`; `zalo.types.ts:38–41`; `notify.service.ts:10–14, 63` |
| Vai trò | `ADMIN`, `OPS_ADMIN`, `DEVELOPER_ADMIN` (CĐT), `AGENT` (sales), `FINANCE_ADMIN`. Chưa có permission `contracts.sign` / `contracts.approve`. | `role-catalog.ts:2–8, 52–88, 116–137` |
| eKYC / KYC | eKYC adapter (mặc định `VNPT_EKYC`, sandbox). Duyệt KYC: `POST .../approve` **không kiểm tra role**; service còn **tạo hồ sơ đã APPROVED** nếu chưa có bản ghi. | `ekyc.service.ts:29–30`; `kyc.controller.ts:33–47`; `kyc.service.ts:138–174` |
| Workflow booking | Định nghĩa có `DEPOSITED → CONTRACTED` (nhãn «Ký HĐ»). **Nhưng** kiểu `BookingStatus` **không gồm** `CONTRACTED` / `CLOSED`. Thanh toán webhook chỉ `RESERVED → DEPOSITED`. `signContract` không chuyển booking. | `booking-workflow.util.ts:32–40`; `booking.types.ts:11`; `booking.entity.ts:9`; `payment-webhook.service.ts:162–163` |
| Bàn giao / công nợ | Checklist handover tồn tại; `postReceivable()` luôn 422 (D09). | `handover-checklist.service.ts:81–83` |

**Thiếu so với mục tiêu:** gửi token qua email/SMS/Zalo (hiện token chỉ cấp trong portal đã login); token dùng lại được đến khi hết hạn, không gắn kênh; OTP không băm, không TTL/lockout/rate-limit rõ; không đa người ký / thứ tự; không PDF đã ký + chứng thư hoàn tất; không bước admin duyệt đưa booking sang `CONTRACTED`; lỗ hổng role khi duyệt KYC; không chống chuyển tiếp link.

### 1.3. Phạm vi vào / ra

**Trong phạm vi**

- Nền tảng ký dùng chung cho buyer, đối tác (CĐT, agency/sàn), sales/agent, người duyệt nội bộ.
- Token một lần + OTP gửi email hoặc SMS; Zalo ZNS là kênh tùy chọn (repo đã có module).
- Ma trận loại tài liệu (mục 1.4): tận dụng mẫu đã có, thêm loại còn thiếu theo batch sau khi người sở hữu chốt danh sách.
- Bước duyệt sau khi ký (role-gated) và vá lỗ kiểm tra role KYC.
- Audit, băm tài liệu, bản sao, UAT theo từng bên.
- Chuẩn bị interface provider CA — **không mở D08**.

**Ngoài phạm vi (trừ khi người sở hữu chốt và luật sư xác nhận)**

- Kết luận tính pháp lý của chữ ký OTP đối với từng loại hợp đồng BĐS.
- Bật chữ ký số CA / ghi artifact `SIGNED`/`EXECUTED` (cửa D08).
- Ghi sổ phải thu / ERP / BNPL (cửa D09).
- Chi trả hoa hồng (cửa D10, nếu bị phụ thuộc).
- Định giá, chọn và ký hợp đồng với nhà cung cấp email/SMS/ZNS/CA (chỉ liệt kê lựa chọn, không giá).

### 1.4. Ma trận loại tài liệu × bên ký

Cột «Trong repo» chỉ việc **đã có mẫu hoặc module**, không có nghĩa đã đủ pháp lý hay đủ luồng đa bên.

| Loại tài liệu | Bên ký điển hình | Thứ tự gợi ý (chưa chốt) | Trong repo? | Ghi chú |
| --- | --- | --- | --- | --- |
| Hợp đồng đặt cọc | Buyer; có thể thêm CĐT / agency | ____ | **Có** — `tpl_deposit_agreement`, category `DEPOSIT` (`booking-contract.util.ts:5–10`) | Gắn booking `RESERVED`/`DEPOSITED`. Sau khi đủ chữ ký: xem xét duyệt → `CONTRACTED` (hiện chưa có). |
| Hợp đồng mua bán | Buyer + CĐT (đối tác); có thể thêm agency | ____ | **Có** — `tpl_sale_agreement`, category `SALE` (`booking-contract.util.ts:12–17`) | Đây là *khung* trong repo. Một số HĐMB BĐS có thể cần công chứng / chữ ký số CA — **cần luật sư xác nhận**, không kết luận trong tài liệu này. |
| Giấy ủy quyền giao dịch | Buyer ủy quyền agency / sales | ____ | **Có** — `tpl_agency_authorization`, category `AUTHORIZATION` (`booking-contract.util.ts:19–24`) | Phạm vi ủy quyền do pháp lý chốt. |
| Hợp đồng hợp tác phân phối (agency / sàn) | CĐT + đại diện pháp luật agency | ____ | **Mới** | Chưa có template category tương ứng. |
| Hợp đồng sale / CTV | Agency hoặc CĐT + sales/agent | ____ | **Mới** | Role `AGENT` đã có; chưa có mẫu HĐ. |
| Biên bản bàn giao | Buyer + CĐT / ops | ____ | **Một phần** — checklist handover, không phải luồng ký online | `handover-checklist.service.ts`. `postReceivable` bị D09 chặn. |
| Hồ sơ KYC / KYB | Chủ thể nộp; admin duyệt | Không phải e-sign OTP | **Có module riêng** (`kyc`, `ekyc`) | Không dùng token ký hợp đồng. Phải vá kiểm tra role khi approve (`kyc.controller.ts:33–47`). |
| Hợp đồng công nợ / phải thu | ____ | ____ | **Chưa** (D09 đóng) | `handover-checklist.service.ts:81–83` luôn 422. |
| Chứng thư hoàn tất (certificate of completion) | Hệ thống xuất sau khi đủ chữ ký | — | **Mới** | Bổ sung sau khi có audit trail đủ trường. |

Danh sách bắt buộc cho pha 1 do người sở hữu điền ở mục 9.

---

## 2. Luồng chung và máy trạng thái

### 2.1. Luồng nghiệp vụ

```
[1] Tạo tài liệu (mẫu + merge context, hoặc tải lên)
        ↓
[2] Chọn người ký + kênh (email / SMS / Zalo) + thứ tự
    (tuần tự: chỉ mở signer kế tiếp khi người trước đã ký;
     song song: cùng nhóm được mở cùng lúc)
        ↓
[3] Gửi link một lần (token) tới kênh đã đăng ký của từng signer đang tới lượt
        ↓
[4] Xác thực: mở link (token còn hạn, chưa dùng, đúng người / đúng tài liệu / đúng kênh)
    → hệ thống gửi OTP 6 số tới đúng kênh đã đăng ký (không gửi OTP trong cùng tin với link, trừ khi pháp lý/nghiệp vụ chốt khác)
    → giới hạn lần thử, hết hạn, không dùng lại, chống chuyển tiếp (mục 3)
        ↓
[5] Xem toàn văn + checkbox đồng ý (consent) — bắt buộc như `signContract` hiện tại (`booking-contract.service.ts:194–196`)
        ↓
[6] Ký (nhập OTP + họ tên / tư cách đại diện)
        ↓
[7] Băm tài liệu (hash nội dung đã chốt), ghi audit: IP, User-Agent, thời điểm, kênh OTP, signerId, documentId
    (hiện audit `SIGNED` chưa có IP/UA — `booking-contract.service.ts:250–267`)
        ↓
[8] Sinh PDF đã ký + chứng thư hoàn tất; lưu vault (`SIGNED_CONTRACT` hoặc loại tương ứng)
        ↓
[9] Gửi bản sao cho các bên (kênh do người sở hữu chốt — mục 9)
        ↓
[10] Nếu tài liệu thuộc loại cần duyệt: admin (role ____) duyệt hoặc từ chối
        ↓
[11] Cập nhật trạng thái hợp đồng / booking (ví dụ `DEPOSITED → CONTRACTED` khi đã chốt quy tắc)
```

OTP phải gửi tới **đúng địa chỉ/SĐT đã đăng ký của signer đó**, không cho người tạo yêu cầu tự điền số «tạm» trừ khi có quy trình xác minh lại (để trống — mục 9).

### 2.2. Máy trạng thái — yêu cầu ký (`signature_requests`)

Đề xuất kỹ thuật (chưa phải quyết định nghiệp vụ):

| Trạng thái | Ý nghĩa |
| --- | --- |
| `DRAFT` | Tài liệu và danh sách signer chưa gửi. |
| `SENT` | Đã gửi link cho nhóm/signer đang tới lượt. |
| `IN_PROGRESS` | Ít nhất một signer đã mở / đang ký. |
| `COMPLETED` | Đủ chữ ký theo quy tắc. |
| `PENDING_REVIEW` | Đủ chữ ký, chờ admin duyệt (nếu loại tài liệu yêu cầu). |
| `APPROVED` | Admin đã duyệt; được phép cập nhật booking/hợp đồng theo quy tắc. |
| `REJECTED` | Admin từ chối; không chuyển booking; lý do ghi audit. |
| `DECLINED` | Một signer từ chối (quy tắc hủy / dừng do người sở hữu chốt). |
| `EXPIRED` | Hết hạn yêu cầu. |
| `CANCELLED` | Bị hủy trước khi hoàn tất. |

Chuyển trạng thái không hợp lệ phải trả lỗi fail-closed (4xx), không im lặng bỏ qua.

### 2.3. Máy trạng thái — từng người ký (`signers`)

| Trạng thái | Ý nghĩa |
| --- | --- |
| `PENDING` | Chưa tới lượt (ký tuần tự) hoặc chưa gửi. |
| `LINK_SENT` | Đã gửi token tới kênh đăng ký. |
| `VIEWED` | Mở tài liệu thành công (token hợp lệ). |
| `OTP_SENT` | Đã phát hành OTP (chỉ lưu hash). |
| `SIGNED` | Ký thành công. |
| `DECLINED` | Từ chối ký. |
| `EXPIRED` | Token/OTP/yêu cầu hết hạn. |
| `LOCKED` | Vượt số lần thử / bị khóa tạm. |

### 2.4. Máy trạng thái — hợp đồng booking và booking

**Hợp đồng hiện tại** chỉ có `DRAFT | SIGNED` (`booking-contract.types.ts:51`). Đề xuất mở rộng (không tự ý bật trên production):

`DRAFT → AWAITING_SIGNATURES → SIGNED → (PENDING_REVIEW) → APPROVED`  
các nhánh: `CANCELLED`, `EXPIRED`, `REJECTED`.

**Booking hiện tại:** kiểu dữ liệu là `RESERVED | DEPOSITED | EXPIRED | CANCELLED | REFUNDED` (`booking.types.ts:11`). Workflow *định nghĩa* thêm `CONTRACTED` và `CLOSED` (`booking-workflow.util.ts:32–40`) nhưng **không có code chuyển** `DEPOSITED → CONTRACTED`.

Đề xuất sau khi đủ chữ ký và (nếu cần) admin duyệt:

```
RESERVED  --(thanh toán thành công, đã có)--  DEPOSITED
DEPOSITED --(đủ chữ ký + duyệt nếu bắt buộc)--  CONTRACTED
CONTRACTED --(chốt deal, quy tắc ____)--  CLOSED
```

Không chuyển `CONTRACTED` chỉ vì một bên đã ký. Không chuyển nếu D-gate liên quan (D08 khi yêu cầu artifact CA, D09 khi đụng công nợ) vẫn đóng — giữ fail-closed.

### 2.5. Lỗ hổng «sau khi ký, admin duyệt khách»

Đúng như hiện trạng: `signContract` đổi hợp đồng sang `SIGNED` rồi dừng, không có API/UI admin duyệt để đưa booking sang `CONTRACTED`. Việc gần nhất là **duyệt hồ sơ KYC** (`AdminKycPage`, `kyc.controller.ts:33–47`), phục vụ điều kiện chi trả / định danh, **không** phải bước chốt hợp đồng. Kế hoạch này bổ sung đúng bước còn thiếu ở Batch 4, kèm vá kiểm tra role KYC (không mở rộng quyền).

---

## 3. Thiết kế token / OTP, mô hình dữ liệu và API

### 3.1. Token link ký (vé vào tài liệu — không phải chữ ký)

Kế thừa format hiện tại `v1s` + HMAC-SHA256 + `timingSafeEqual` (`contract-sign-token.ts:1–56`), và **siết** các điểm còn thiếu:

| Thuộc tính | Hiện trạng | Đích |
| --- | --- | --- |
| Thuật toán | HMAC-SHA256, prefix `v1s` | Giữ; secret chỉ `CONTRACT_SIGN_SECRET`, độ dài ≥ 16; thiếu secret thì từ chối, không fallback `JWT_SECRET` (đã đúng). |
| Ràng buộc | `tenantId`, `contractId`, `buyerId`, `exp` | Thêm `signerId`, `requestId`, `jti` (id một lần), `channel` + fingerprint kênh (email/SĐT/Zalo user đã đăng ký, **băm** — không nhét PII thô vào token nếu có thể tránh). |
| Một lần dùng | **Chưa** — token không được lưu / thu hồi, dùng lại được đến khi hết hạn | Lưu `jti`, đánh dấu consumed khi hoàn tất xác thực (hoặc khi ký — người sở hữu chốt ở mục 9). Replay → 401. |
| TTL | 15 phút (`contract-sign-token.ts:4`) | Giữ 15 phút như hiện trạng cho đến khi người sở hữu chốt giá trị mới: ____ |
| Chống chuyển tiếp | Chưa | OTP gửi tới kênh đăng ký (link một mình không đủ để ký). Không tiết lộ OTP trên UI (`otpHint` sandbox hiện lộ `123456` — `booking-contract.service.ts:174`). Tùy chọn (chốt sau): khóa `jti` theo lần mở đầu / UA — cân nhắc UX điện thoại khác nhau. |
| Phát hành | Chỉ portal, buyer đã login | Thêm phát hành khi gửi link qua email/SMS/Zalo, không bắt buộc login portal đối với buyer (mục 4.1). |

Token **không** được coi là chữ ký. Comment hiện tại phải giữ: *Access ticket … Not a legal signature. D08 stays unsigned.* (`contract-sign-token.ts:3`).

### 3.2. OTP

| Thuộc tính | Hiện trạng | Đích |
| --- | --- | --- |
| Độ dài | 6 số (`randomInt(100000, 999999)`) | Giữ 6 số. |
| Lưu trữ | Plain text trong `sms_delivery.params.otp`; `getEsignOtp` so sánh chuỗi | Chỉ lưu **hash** (ví dụ SHA-256 + salt / pepper từ secret riêng). So sánh timing-safe. Xóa/invalidate sau khi dùng đúng hoặc hết hạn. |
| Sandbox | `generateOtp` trả `123456` khi sandbox; `assertNotDemoOtp` từ chối `123456` khi `smsSandbox=false` | Production (và tenant `smsSandbox=false`) **cấm** OTP demo. Không trả `otp` trong API, không `otpHint`, không ghi OTP vào log/audit. Hằng `ESIGN_DEMO_OTP` trong `booking-contract.util.ts:79` cần loại khỏi đường production. |
| TTL OTP | Chưa thấy TTL riêng (phụ thuộc delivery record + idempotent replay cùng OTP) | Giá trị do người sở hữu chốt: ____ (không tự bịa). Chưa chốt thì fail-closed: OTP hết hạn theo token hoặc từ chối resend vô hạn — ghi rõ trong PR, không chọn số «im lặng». |
| Rate limit / cooldown / lockout | Chưa thấy trên luồng e-sign | Số lần thử tối đa: ____ · cooldown gửi lại: ____ · thời gian khóa: ____. Implement dưới dạng config, chưa có giá trị thì giữ fail-closed (không gửi tràn, không cho thử vô hạn) và để TODO gắn mục 9. |
| Kênh | Chỉ SMS, SĐT lấy từ lead của booking; thiếu SĐT → 422 | OTP tới đúng kênh đăng ký của signer (email / SMS / Zalo). Fallback email ↔ SMS: ____ (chốt mục 9). |
| Idempotent gửi | `sendSms` replay delivery cùng `sourceType+sourceId` | Cần tách «idempotent tránh gửi kép do retry» khỏi «không bao giờ cho gửi lại OTP». Resend phải phát hành OTP mới (hash mới), vô hiệu OTP cũ, tôn trọng cooldown. |
| Audit gửi OTP | `ESIGN_OTP_SENT` đang đưa **SĐT thô** vào payload (`booking-contract-esign-sms.service.ts:80–86`) | Che một phần / băm; không log nội dung OTP; không log token đầy đủ. |

### 3.3. Phác thảo mô hình dữ liệu

Bảng mới (tên có thể chỉnh cho khớp convention TypeORM của repo). Không tái sử dụng `sms_delivery.params` làm kho OTP.

**`signature_requests`**

- `id`, `tenant_id`, `document_type`, `template_id` (nullable), `source_entity_type` / `source_entity_id` (ví dụ `BOOKING` + bookingId)
- `status` (mục 2.2), `signing_mode` (`SEQUENTIAL` \| `PARALLEL` \| hỗn hợp theo nhóm)
- `document_hash` (hash bản chốt trước khi gửi; mọi chữ ký phải đối chiếu cùng hash)
- `signed_pdf_document_id`, `certificate_document_id` (vault)
- `expires_at`, `created_by`, `created_at`, `updated_at`
- `requires_admin_review` (bool — quy tắc theo loại tài liệu, do người sở hữu chốt)
- `reviewed_by`, `reviewed_at`, `review_decision`, `review_notes`

**`signature_signers`**

- `id`, `request_id`, `tenant_id`
- `party_type` (`BUYER` \| `DEVELOPER` \| `AGENCY` \| `SALES` \| `INTERNAL_APPROVER` \| …)
- `subject_id` (user / org member), `display_name`, `title` (đại diện pháp luật / CTV / …)
- `channel` (`EMAIL` \| `SMS` \| `ZALO`), `channel_dest_hash`, `channel_dest_masked`
- `sign_order` (số thứ tự), `group_id` (cùng nhóm = song song)
- `status`, `signed_at`, `consent_at`, `signature_ref`
- `delegate` / ủy quyền: chỉ khi loại tài liệu cho phép (giấy ủy quyền — mục 1.4)

**`otp_challenges`**

- `id`, `tenant_id`, `request_id`, `signer_id`, `jti` (khớp token)
- `otp_hash`, `expires_at`, `attempts`, `max_attempts` (đọc config, không hard-code nghiệp vụ)
- `locked_until`, `consumed_at`, `channel`, `created_at`

**`signature_events`** (append-only; có thể bọc `AuditService` hiện có)

- `id`, `tenant_id`, `request_id`, `signer_id`, `action`
- (`REQUEST_CREATED`, `LINK_SENT`, `LINK_OPENED`, `OTP_SENT`, `OTP_FAILED`, `OTP_LOCKED`, `VIEWED`, `CONSENT_GRANTED`, `SIGNED`, `DECLINED`, `REVIEW_APPROVED`, `REVIEW_REJECTED`, …)
- `ip`, `user_agent`, `occurred_at`, `channel`, `metadata` (không PII thô, không OTP, không secret)

Tận dụng: `DocumentsService.uploadFromBuffer`, `AuditService.append`, `ConsentLedgerService.record` (đã gọi trong `signContract`, purpose `ESIGN`).

### 3.4. Phác thảo API

Prefix gợi ý: `/api/v1/signature-requests` (không phá route cũ `/contracts` trong batch đầu; có thể facade sang nền tảng mới).

| Method | Đường dẫn | Ai gọi | Mô tả |
| --- | --- | --- | --- |
| `POST` | `/signature-requests` | Role được phép tạo: ____ | Tạo DRAFT: tài liệu + signer + thứ tự. |
| `POST` | `/signature-requests/:id/send` | Người tạo / ops | Mint token, gửi link, chuyển `SENT`. Fail-closed nếu thiếu kênh đăng ký. |
| `GET` | `/public/sign/:token` hoặc header kiểu `x-contract-sign-token` hiện tại | Signer (không bắt buộc JWT) | Mở phiên xem. Đánh dấu `VIEWED`. Không lộ PII thừa. |
| `POST` | `/public/sign/:token/otp` | Signer | Gửi / gửi lại OTP tới kênh đăng ký; tôn trọng cooldown. |
| `POST` | `/public/sign/:token/complete` | Signer | `consent` + OTP + họ tên / tư cách. Ký, consume token & OTP, ghi hash + audit. |
| `POST` | `/public/sign/:token/decline` | Signer | Từ chối, ghi lý do. |
| `POST` | `/signature-requests/:id/review` | Role duyệt: ____ | `APPROVED` / `REJECTED`. Đây là bước đưa booking `DEPOSITED → CONTRACTED` khi quy tắc khớp. |
| `GET` | `/signature-requests/:id` | Bên có quyền | Trạng thái, ẩn PII. |
| `GET` | `/signature-requests/:id/audit` | Role `audit.read` hoặc ____ | Trail phục vụ chứng thư hoàn tất. |

Giữ webhook `POST /contracts/webhooks/esign` (`booking-contract.controller.ts:91–106`) cho pha CA sau này; không dùng webhook stub để «giả» chữ ký pháp lý khi D08 còn đóng.

---

## 4. Đặc thù từng bên

### 4.1. Khách hàng (buyer)

- **Login portal không bắt buộc** để ký: mở link + OTP trên kênh đã đăng ký là đủ cho phiên ký. Portal login vẫn dùng được (luồng hiện tại `POST /portal/buyer/contracts/:contractId/sign-token`).
- **Sở hữu giao dịch:** tiếp tục bám SĐT lead (`requireOwnedBuyerBooking`, `phonesMatch`, `portal.service.ts:420–468`). Bổ sung email đăng ký nếu người sở hữu chốt email là kênh chính. Không cấp token cho booking không thuộc buyer.
- UI hiện có: `BuyerEsignPage.tsx` (OTP, consent, `otpHint` demo). Cần bỏ gợi ý OTP demo trên môi trường không sandbox; hỗ trợ nhiều signer / chờ bên khác ký.
- eKYC trước khi ký: ____ (chốt mục 9). Module `ekyc` đã có (`EKYC_PROVIDER` mặc định `VNPT_EKYC`).

### 4.2. Đối tác — CĐT / agency / sàn

- Người ký là **đại diện hợp pháp** của pháp nhân (họ tên, chức danh, giấy ủy quyền nội bộ — không bịa mẫu). Một bên doanh nghiệp có thể cần **nhiều người ký** (ví dụ kế toán + đại diện pháp luật): dùng `sign_order` / `group_id`.
- Role sẵn có: `DEVELOPER_ADMIN` = «Chủ đầu tư (CĐT)» (`role-catalog.ts:132`). Agency/sàn **chưa** có role riêng trong `TENANT_ROLES` — cần người sở hữu chốt: dùng user intra-tenant, tenant khác, hay role mới: ____.
- Đăng ký artifact hợp đồng hiện chỉ `DEVELOPER_ADMIN` (`contract-artifact.service.ts:14, 31–32`). Không biến đăng ký artifact thành «đã ký CA» — D08 vẫn đóng.
- Kênh gửi: email doanh nghiệp / SMS người đại diện / Zalo — theo liên hệ đã xác minh, không theo số «của sales».

### 4.3. Sales / agent

- Role `AGENT` («Môi giới / Sales») — quyền hiện tại: listing, giữ chỗ, CRM (`role-catalog.ts:78–83, 135`).
- Ký **trong app agent** (session đã login) *vẫn* phải nhập OTP gửi tới kênh đăng ký của chính agent — tránh ký hộ trên máy chung.
- KYC/KYB của agent/agency: dùng module `kyc` + `ekyc`; chỉ nên cho ký HĐ CTV / nhận hoa hồng khi hồ sơ `APPROVED` — quy tắc ____ (chốt). Sửa lỗ role trước khi dựa vào duyệt KYC (mục 4.5).
- Sales **không** tự duyệt hợp đồng buyer trừ khi được gán role duyệt (mặc định: không).

### 4.4. Người duyệt nội bộ (approver)

- Không phải «người ký nội dung» trừ khi họ nằm trong danh sách signer.
- Bước duyệt sau khi đủ chữ ký (Batch 4): chỉ role được chốt (mục 9). Mọi quyết định ghi `signature_events` + `AuditService`.
- Tách quyền «tạo yêu cầu ký», «ký», «duyệt», «xem audit».

### 4.5. Lỗ hổng duyệt KYC (vá trong cùng chương trình, Batch 4)

`POST /kyc/profiles/:subjectType/:subjectId/approve` (`kyc.controller.ts:33–47`) chỉ cần user đã đăng nhập (JWT), **không** kiểm `FINANCE_ADMIN` / `ADMIN` / permission. Comment service viết «platform/finance approve» (`kyc.service.ts:138`) nhưng không enforce. `approveProfile` còn **tạo mới hồ sơ ở trạng thái APPROVED** nếu chưa có bản ghi (`kyc.service.ts:147–156`).

Vá fail-closed: bắt buộc role/permission (giá trị role cụ thể: ____); không tự tạo hồ sơ đã duyệt; reject/resubmit cùng một hàng rào. Không mở rộng ai được duyệt.

---

## 5. Pháp lý Việt Nam (không kết luận)

Tài liệu này **không phải tư vấn pháp lý**. Mọi câu khẳng định hiệu lực của chữ ký đối với từng loại hợp đồng phải do **luật sư / cố vấn pháp lý của chủ sở hữu** xác nhận (mục 9).

### 5.1. Chữ ký điện tử và OTP

Luật Giao dịch điện tử 2023 (Luật số 20/2023/QH15) thừa nhận **chữ ký điện tử**. Luồng OTP + đồng ý + nhật ký (họ tên, thời điểm, kênh, hash tài liệu) có thể được thiết kế nhằm đáp ứng hình thức chữ ký điện tử theo luật này.

**Không** khẳng định rằng luồng OTP của NNHM đủ điều kiện cho mọi hợp đồng bất động sản, cũng không khẳng định đây là chữ ký số hay chữ ký điện tử đủ điều kiện theo nghị định hướng dẫn.

Code hiện tại tự ghi nhận giới hạn này: token là vé vào route, «OTP stub», «Not a legal signature», D08 chưa ký (`contract-sign-token.ts:3`; `booking-contract.controller.ts:136`).

### 5.2. Hợp đồng BĐS, công chứng, chữ ký số CA

Một số giao dịch BĐS tại Việt Nam (đặc biệt hợp đồng mua bán nhà ở / tài sản phải đăng bộ, công chứng hoặc chứng thực) **có thể** đòi hỏi hình thức nghiêm hơn OTP (công chứng, chữ ký số dựa trên chứng thư số của tổ chức cung cấp dịch vụ chứng thực chữ ký số — CA).

- HĐ đặt cọc, giấy ủy quyền, HĐ CTV, HĐ phân phối: có thể khác HĐMB — **cần luật sư phân loại từng loại trong ma trận mục 1.4**.
- Không đưa HĐMB «khung» trong repo ra dùng thật chỉ vì đã có `tpl_sale_agreement`.

Ô trống xác nhận pháp lý: ____ (luật sư, ngày, phạm vi loại tài liệu được phép ký OTP / bắt buộc CA / bắt buộc công chứng).

### 5.3. Pha sau: tích hợp CA — cửa D08 vẫn đóng

Repo đã có `EsignProviderAdapter` (`createEnvelope`, `getSigningUrl`, `parseWebhook`, `downloadSignedPdf`) và stub `VnptEsignAdapter` (`providerId = 'VNPT_SMARTCA'`). `ESIGN_PROVIDER` mặc định trong code là `VNPT_SMARTCA`; registry hiện **luôn** trả về adapter VNPT (`vnpt-esign.adapter.ts:143–148`).

Pha sau (không nằm trong 4 batch đầu, **không làm khi D08 chưa được người có thẩm quyền ký**):

- Adapter thật cho nhà cung cấp CA (lựa chọn, không chốt, không kèm giá): VNPT SmartCA, Viettel MySign, FPT CA, hoặc đơn vị khác ____.
- Webhook đã có `POST /contracts/webhooks/esign`.
- Chỉ khi D08 đã ký *và* giá trị «có bắt buộc artifact nhà cung cấp trước khi ghi `SIGNED`» được chốt (file `D08.md` trong thư mục `nnhm-signoff`): mới được nới `markProviderSigned` / ghi artifact executed. Trước đó, mọi PR phải giữ 422 như hiện tại (`contract-artifact.service.ts:58–67`).

---

## 6. Nhà cung cấp kênh gửi

Chỉ liệt kê lựa chọn kỹ thuật. **Không nêu giá.** Người sở hữu chọn và ký hợp đồng vận hành riêng (mục 9).

| Kênh | Hiện trạng trong repo | Lựa chọn triển khai (chưa chốt) | Ghi chú |
| --- | --- | --- | --- |
| Email (gửi link / OTP / bản sao) | **Chưa có** module SMTP/SES/nodemailer trong `apps/api/src/modules` | SMTP riêng / Amazon SES / nhà cung cấp thư VN khác: ____ | Cần adapter `MailProvider`, sandbox fail-closed (không gửi nhầm thư thật nếu chưa cấu hình), không log OTP. |
| SMS brandname | **Có** — `SmsService`, `SmsProviderClient`, binding `brandName` / `senderId` / `apiKey`, template `sms_otp_v1` | Nhà mạng / cổng SMS hiện tại hoặc ____ | Template mới cho *link ký* (khác OTP). Brandname do người sở hữu đăng ký. |
| Zalo ZNS | **Có** — `ZALO_ZNS_TEMPLATES.OTP = 'zns_otp_v1'`, `sendZns`, sandbox `ZALO_ZNS_SANDBOX` | Dùng cho OTP và/hoặc link?: ____ · Template ZNS phải được duyệt trên Zalo | Không mặc định bật trên production. Thiếu Zalo ID đã liên kết thì bỏ qua hoặc fallback theo mục 9, không fail mở (không đổi kênh im lặng nếu policy cấm). |

`NotifyService` hiện chỉ gửi SMS cho template CRM (`HOT_SLA_ESCALATE`, …) — có thể mở rộng kênh nhưng **không** nhồi OTP vào log CRM (`notify.service.ts` đang mask SĐT khi liệt kê, trong khi audit e-sign thì chưa).

Cờ sandbox theo tenant (`smsSandbox`, `ZALO_ZNS_SANDBOX`, tương lai `emailSandbox`) phải fail-closed: thiếu cấu hình live → không gửi, không bịa provider.

---

## 7. Lộ trình theo batch

Nguyên tắc chung cho mọi batch: **cỡ một PR**; khám phá repo trước khi sửa; fail-closed; **không mở cửa D-gate**; mở **draft PR**, **không merge** trong prompt. Nhánh gốc: `spec-v1-complete`.

### 7.1. Các cửa D-gate liên quan (đang đóng thì giữ đóng)

| Cửa | Liên quan tới ký online | Ảnh hưởng |
| --- | --- | --- |
| **D08** — nhà cung cấp chữ ký hợp đồng | `markProviderSigned` luôn 422; token/OTP không phải chữ ký pháp lý | Không ghi artifact `SIGNED`/`EXECUTED`. Không tích hợp CA live. OTP sandbox không đổi ý nghĩa pháp lý. |
| **D09** — hợp đồng công nợ | `postReceivable()` luôn 422 | Bàn giao / phải thu không nằm trong 4 batch đầu. |
| **D10** | Chi trả (nếu phụ thuộc KYC/hợp đồng) | Không bật payout. Vá role KYC là hàng rào, không phải mở chi. |
| D06 / D07 | Cổng thanh toán live | Không đụng trong chương trình ký, trừ khi đọc webhook `RESERVED → DEPOSITED` như điều kiện đầu vào. |

### 7.2. Batch 1 — Nền tảng token / OTP / mô hình dữ liệu (cỡ **M**)

**Phụ thuộc:** không (dựa trên module booking-contract, sms, audit, documents hiện có).

**Làm:** bảng `signature_requests`, `signature_signers`, `otp_challenges`, `signature_events` (hoặc tương đương); siết token (jti một lần, gắn signer + document + channel); OTP chỉ lưu hash; cấm OTP demo khi không sandbox; không log OTP/token/PII thô; rate-limit/cooldown/lockout đọc từ config (giá trị nghiệp vụ để trống / chưa bật số mới); kiểm thử đơn vị cho mint/read/replay/hết hạn/secret thiếu.

**Không làm:** gửi email/Zalo thật; đa bên UI; mở D08; đổi TTL 15 phút trừ khi đã chốt.

**Tiêu chí chấp nhận:**

- Replay token đã consume → 401.
- OTP trong DB không phải 6 số thô; so sánh hash.
- Tenant `smsSandbox=false` hoặc production: `123456` bị từ chối; không `otpHint`.
- Thiếu `CONTRACT_SIGN_SECRET` → từ chối.
- Audit không chứa OTP; SĐT/email được mask hoặc băm.
- `markProviderSigned` vẫn 422.
- Test đỏ/xanh rõ cho từng hàng rào trên.

### 7.3. Batch 2 — Gửi link qua email / SMS / Zalo (cỡ **M**)

**Phụ thuộc:** Batch 1.

**Làm:** use-case «gửi link ký» tới signer buyer (ít nhất 1 kênh SMS *hoặc* email). Adapter email mới (SMTP/SES đứng sau interface — chưa chọn vendor). Template SMS *link* tách khỏi OTP. Zalo ZNS tùy chọn, tắt mặc định. Fallback email ↔ SMS chỉ khi config/policy được khai (chưa chốt thì không tự fallback). Resend tôn trọng cooldown.

**Tiêu chí chấp nhận:**

- Gửi link thành công trên sandbox không lộ token đầy đủ trong log.
- Thiếu SĐT/email đăng ký → 422, không gửi nhầm kênh.
- OTP vẫn chỉ tới kênh đăng ký sau khi mở link.
- ZNS tắt: luồng email/SMS vẫn xanh.
- Không gọi API nhà cung cấp live khi cờ sandbox / thiếu key.

### 7.4. Batch 3 — Đa bên, thứ tự ký, PDF đã ký, audit đủ trường (cỡ **L**)

**Phụ thuộc:** Batch 1–2.

**Làm:** nhiều signer, tuần tự / song song; party types buyer / developer / agency / sales; consent + hash tài liệu bất biến trong suốt vòng đời; PDF đã ký (không chỉ `.txt`) + bản chứng thư hoàn tất (danh sách signer, thời điểm, kênh, hash, id vault); gửi bản sao (kênh theo config); UI buyer + điểm vào agent app; IP + UA trong `signature_events` (nhớ `TRUST_PROXY` — `apps/api/src/main.ts:30` — để IP không phải địa chỉ proxy).

**Tiêu chí chấp nhận:**

- Tuần tự: signer 2 không nhận link / không ký trước signer 1.
- Song song: hai signer cùng nhóm ký độc lập, thứ tự hoàn thành không phá hash.
- Ký khi hash tài liệu đã đổi → từ chối.
- PDF + chứng thư nằm trong vault; audit có IP, UA, thời điểm, kênh, signer.
- Sales ký trong session app vẫn cần OTP kênh của họ.
- D08/D09 vẫn đóng.

### 7.5. Batch 4 — Duyệt sau ký, `CONTRACTED`, vá role KYC (cỡ **M**)

**Phụ thuộc:** Batch 3 (đủ chữ ký); vá KYC có thể tách PR nhỏ hơn nếu cần, vẫn cùng pha.

**Làm:**

- API review role-gated (role để trống trong code config / matrix — chưa chốt thì **fail-closed: chưa ai duyệt được**, không mặc định mở cho mọi user đăng nhập).
- Mở rộng `BookingStatus` có `CONTRACTED` (và chỉ chuyển `CLOSED` nếu người sở hữu đã chốt quy tắc; nếu chưa, đừng thêm chuyển `CLOSED`).
- Chỉ `DEPOSITED → CONTRACTED` khi: đủ chữ ký loại tài liệu đã chốt (mặc định pha 1: ____) **và** review `APPROVED` nếu `requires_admin_review`.
- Vá `kyc.controller.ts:33–47` + không tự tạo profile `APPROVED`; cùng hàng rào cho reject/resubmit.
- Thêm permission vào catalog (`contracts.approve`, `kyc.approve`, …) — **không** gán vào role cho đến khi mục 9 được điền; matrix có thể để rỗng / chưa gán.

**Tiêu chí chấp nhận:**

- User thiếu role gọi review / approve KYC → 403.
- `signContract` / hoàn tất chữ ký **không** tự chuyển `CONTRACTED`.
- Happy path kiểm thử: đủ ký + duyệt đúng role → `CONTRACTED`.
- `approveProfile` không tạo hồ sơ mới đã duyệt.
- D08/D09/D10 không đổi hành vi fail-closed.

### 7.6. Các pha sau (không nằm trong 4 prompt đầu)

| Pha | Cỡ ước lượng | Nội dung | Phụ thuộc |
| --- | --- | --- | --- |
| 5 | M | Thêm template: HĐ phân phối agency, HĐ sale/CTV, biên bản bàn giao (ký online), khi danh sách mục 9 đã chốt | Batch 3, danh sách tài liệu |
| 6 | L | Adapter CA thật (VNPT / Viettel / FPT / ____) | **D08 đã ký**, chọn provider, không làm trước |
| 7 | M | UAT đầy đủ, chứng từ hoàn tất, runbook vận hành, chỉnh TTL sau khi chốt | Pha 1–4, câu trả lời mục 9 |

### 7.7. Kiểm thử bảo mật (bắt buộc, gắn batch tương ứng)

1. Replay token / OTP đã dùng.
2. Đổi `contractId` / `signerId` trong body token (tamper) → reject (`timingSafeEqual` đã có cho chữ ký HMAC).
3. Dùng token của hợp đồng A trên hợp đồng B.
4. Buyer A không mở / ký tài liệu của buyer B (phone/email mismatch).
5. Sales không duyệt hợp đồng (thiếu role).
6. Brute-force OTP → lockout; không tiết lộ «còn bao nhiêu lần» nếu policy chưa cho.
7. Resend spam → cooldown.
8. OTP/token không xuất hiện trong log, audit, response (trừ token một lần được đưa vào link, không log lại).
9. Sandbox OTP bị từ chối ngoài sandbox.
10. Thiếu secret / thiếu binding kênh → 422, không fallback secret khác.
11. Webhook esign giả chữ ký khi D08 đóng: không ghi artifact executed.
12. KYC approve bằng tài khoản AGENT (hoặc role không được phép) → 403, kể cả khi hồ sơ chưa tồn tại.

### 7.8. Kịch bản UAT theo bên

Giá trị môi trường UAT, SĐT, email để trống cho người sở hữu cung cấp.

**Buyer**

- UAT-B1: nhận link qua SMS, mở, nhận OTP cùng SĐT, đồng ý, ký, nhận bản sao. Booking chưa `CONTRACTED`.
- UAT-B2: nhận link qua email (nếu đã chốt kênh).
- UAT-B3: chuyển tiếp link cho người khác; người đó không nhận được OTP trên máy mình / không ký được.
- UAT-B4: OTP sai hết số lần → khóa; gửi lại sau cooldown.
- UAT-B5: hết hạn token → phải xin link mới, OTP cũ vô hiệu.
- UAT-B6: đã login portal, cấp token như luồng cũ, ký thành công.
- UAT-B7 (nếu eKYC bắt buộc được chốt): chưa KYC thì không ký.

**Đối tác (CĐT / agency)**

- UAT-P1: hai signer công ty, tuần tự — người 2 chưa tới lượt thì không ký được.
- UAT-P2: song song hai đại diện cùng nhóm.
- UAT-P3: đại diện ký bằng tư cách (chức danh) hiển thị trên chứng thư.
- UAT-P4: thiếu liên hệ đăng ký → ops không gửi được (422), không «nhập số tay» nếu policy cấm.

**Sales / agent**

- UAT-S1: ký HĐ CTV (khi mẫu đã có) trong app, OTP về SĐT/email của agent.
- UAT-S2: agent không duyệt HĐ đặt cọc của khách.
- UAT-S3: KYC agent chưa duyệt → không ký / không kích hoạt (nếu quy tắc được chốt).

**Admin / approver**

- UAT-A1: đủ chữ ký HĐ đặt cọc, đúng role duyệt → booking `DEPOSITED → CONTRACTED`.
- UAT-A2: sai role → 403, booking không đổi.
- UAT-A3: từ chối duyệt, lý do lưu audit, không `CONTRACTED`.
- UAT-A4: vá KYC — chỉ role được phép approve; không tự tạo hồ sơ đã duyệt.

**Hệ thống / pháp lý vận hành**

- UAT-X1: chứng thư có hash khớp file vault.
- UAT-X2: D08 vẫn 422 khi gọi `markProviderSigned`.
- UAT-X3: không dùng OTP `123456` trên tenant live.

---

## 8. Prompt Cursor sẵn dán (4 batch đầu)

Dán từng prompt một, theo thứ tự. Không merge. Không mở gate.

### 8.1. Batch 1

```
Repo: NNHM, nhánh gốc spec-v1-complete. Chỉ đọc trước khi sửa. Không push lên main, không merge. Mở draft PR khi xong.

Nhiệm vụ: Batch 1 kế hoạch ký online — nền tảng token/OTP và mô hình dữ liệu (cỡ M).

Bắt buộc khám phá trước, cite file:line:
- apps/api/src/modules/booking/contract-sign-token.ts (v1s, TTL 15 phút, CONTRACT_SIGN_SECRET)
- apps/api/src/modules/booking/booking-contract.service.ts (getSignSession, signContract)
- apps/api/src/modules/booking/booking-contract-esign-sms.service.ts
- apps/api/src/modules/sms/sms.service.ts (generateOtp 123456, getEsignOtp, params.otp plain text, assertNotDemoOtp)
- apps/api/src/modules/booking/contract-artifact.service.ts (markProviderSigned luôn 422 — D08, giữ nguyên)
- audit + documents vault hiện có

Làm:
1. Thêm mô hình signature_requests, signature_signers, otp_challenges, signature_events (hoặc tên khớp convention repo) + migration.
2. Siết token: HMAC giữ v1s; thêm jti một lần, gắn signerId + request/document + channel; consume chống replay; thiếu/ngắn CONTRACT_SIGN_SECRET thì từ chối, không fallback JWT_SECRET.
3. OTP 6 số, chỉ lưu hash, so sánh timing-safe, invalidate sau dùng/hết hạn. Cấm OTP demo 123456 khi smsSandbox=false hoặc production. Xóa otpHint / không trả OTP trong API. Không log OTP, không log token đầy đủ, mask PII trong audit (hiện ESIGN_OTP_SENT đang ghi phone thô).
4. Rate limit / resend cooldown / lockout đọc từ config/env. KHÔNG bịa số nghiệp vụ (TTL OTP, số lần thử, cooldown). Token TTL giữ 15 phút hiện tại trừ khi đã có quyết định khác trong repo/docs đã ký. Nếu thiếu config cho hạn mức thử: fail-closed (không cho thử vô hạn), ghi rõ trong mô tả PR và để hằng/config tên rõ, không gán «số đẹp» như là đã chốt.
5. Test đơn vị/integration: replay, tamper, hết hạn, secret thiếu, sandbox/live OTP, hash at rest.

Cấm: mở D08/D09/D10; tích hợp CA live; đổi hành vi markProviderSigned; gửi email/ZNS; UI đa bên; tự chuyển booking sang CONTRACTED; merge PR.

Fail-closed. Draft PR, tiêu đề rõ Batch 1 ký online, mô tả test đã chạy.
```

### 8.2. Batch 2

```
Repo: NNHM, nhánh gốc là nhánh đã merge/đứng trên Batch 1 (hoặc PR Batch 1). Gốc lịch sử: spec-v1-complete. Khám phá repo trước. Không merge, không push main. Draft PR.

Nhiệm vụ: Batch 2 — gửi link ký (token một lần) qua email hoặc SMS; Zalo ZNS tùy chọn.

Khám phá trước:
- Nền tảng Batch 1 (signature_requests, token jti, otp hash)
- apps/api/src/modules/sms/* (SmsService, SMS_TEMPLATES, brandname binding)
- apps/api/src/modules/zalo/* (ZALO_ZNS_TEMPLATES.OTP, sendZns, ZALO_ZNS_SANDBOX)
- apps/api/src/modules/notify/* (hiện chỉ SMS CRM, chưa email)
- portal issueContractSignToken (luồng login vẫn giữ)

Làm:
1. Use-case gửi link ký tới signer (bắt đầu với buyer) trên kênh đã đăng ký.
2. Adapter email mới (interface; SMTP hoặc SES là option cấu hình — không chốt vendor, không hard-code giá/provider thật). Sandbox/fail-closed khi thiếu cấu hình: không gửi thư lẫn, không ném secret ra log.
3. Template SMS riêng cho link ký, tách khỏi SMS OTP. OTP vẫn gửi sau khi mở link, đúng kênh đăng ký.
4. Zalo ZNS: tùy chọn, mặc định tắt; dùng template đã có chỉ khi bật và đã liên kết Zalo ID. Thiếu liên kết: không im lặng đổi kênh trừ khi có config fallback đã được khai. Fallback email ↔ SMS: chỉ khi có config; chưa có thì không tự fallback.
5. Resend link/OTP tôn trọng cooldown config (không bịa số). Idempotent retry không phát OTP cũ.
6. Test: thiếu SĐT/email → 422; sandbox không gọi live API; tắt ZNS thì SMS/email vẫn xanh; log không chứa OTP/token đầy đủ.

Cấm: mở D-gate; chọn/mua nhà cung cấp; production key giả; merge.

Draft PR Batch 2.
```

### 8.3. Batch 3

```
Repo: NNHM, đứng trên Batch 1–2. Khám phá trước. Không merge. Draft PR. Fail-closed, không mở D08/D09.

Nhiệm vụ: Batch 3 — ký đa bên (buyer, đối tác CĐT/agency, sales), thứ tự tuần tự/song song, PDF đã ký + chứng thư hoàn tất, audit đủ trường.

Khám phá trước:
- Máy trạng thái Batch 1
- booking-contract.util.ts templates (chỉ 3 mẫu — đừng bịa thêm loại tài liệu nghiệp vụ mới trừ scaffold kỹ thuật)
- BuyerEsignPage.tsx, role-catalog.ts (AGENT, DEVELOPER_ADMIN, …)
- DocumentsService.uploadFromBuffer (hiện signContract lưu text/plain)
- AuditService; TRUST_PROXY / request.ip trong apps/api/src/main.ts:30
- ConsentLedgerService purpose ESIGN

Làm:
1. Nhiều signer; party_type BUYER / DEVELOPER / AGENCY / SALES / INTERNAL_APPROVER; sign_order + group (tuần tự/song song).
2. Sequential: chưa tới lượt thì không gửi link / không nhận sign session / không ký.
3. Chốt document_hash khi gửi; nếu nội dung đổi thì hủy/chặn ký.
4. Sau khi đủ chữ ký: sinh PDF đã ký (không chỉ .txt) + chứng thư hoàn tất (signer, tư cách, thời điểm, kênh OTP, hash, document vault id). Lưu vault. Gửi bản sao qua kênh đã có ở Batch 2 (config; không bịa nhà cung cấp).
5. Audit/signature_events: IP, UA, thời điểm, kênh, signerId. Không OTP, không PII thô.
6. Buyer: ký bằng link+OTP, portal login tùy chọn. Sales: điểm vào trong app agent, vẫn bắt OTP kênh của chính họ. Đối tác: hỗ trợ nhiều người ký cùng pháp nhân.
7. Test chấp nhận: tuần tự, song song, hash lệch, sales không duyệt hộ, D08 vẫn 422.

Cấm: tự thêm HĐ phân phối / HĐ CTV như mẫu pháp lý đã duyệt (chưa chốt ở kế hoạch mục 9); tự chuyển booking CONTRACTED (thuộc Batch 4); mở CA live; merge.

Draft PR Batch 3, liệt kê test.
```

### 8.4. Batch 4

```
Repo: NNHM, đứng trên Batch 3. Khám phá trước. Không merge. Draft PR. Fail-closed.

Nhiệm vụ: Batch 4 — bước admin duyệt sau khi ký (booking DEPOSITED → CONTRACTED, có kiểm role) và vá lỗ duyệt KYC.

Khám phá trước:
- booking-contract.service.ts signContract (không đổi booking)
- booking-workflow.util.ts (DEPOSITED → CONTRACTED đã viết trong definition)
- booking.types.ts và booking.entity.ts: BookingStatus hiện CHỈ RESERVED | DEPOSITED | EXPIRED | CANCELLED | REFUNDED — chưa có CONTRACTED
- payment-webhook.service.ts (RESERVED → DEPOSITED)
- kyc.controller.ts:33-47 approve không kiểm role
- kyc.service.ts:138-174 approveProfile có thể TẠO hồ sơ mới đã APPROVED
- role-catalog.ts PERMISSION_MATRIX — chưa có contracts.approve / kyc.approve
- contract-artifact.service.ts markProviderSigned (D08, giữ 422)
- handover-checklist.service.ts postReceivable (D09, giữ 422)

Làm:
1. API review signature request: APPROVED / REJECTED, audit đầy đủ. Role/permission được phép: đọc từ config/matrix. CHƯA có quyết định vai trò thì fail-closed (không ai gọi được), KHÔNG mặc định cho mọi user login, KHÔNG đoán ADMIN hay FINANCE_ADMIN.
2. Mở rộng BookingStatus thêm CONTRACTED. Chỉ chuyển DEPOSITED → CONTRACTED khi đủ chữ ký theo quy tắc và (nếu requires_admin_review) đã APPROVED. sign/complete KHÔNG tự chuyển. Chưa chốt CLOSED thì đừng thêm transition CLOSED.
3. Vá KYC: endpoint approve/reject/resubmit bắt buộc role/permission (cũng fail-closed nếu chưa gán role). Cấm tạo hồ sơ mới ở trạng thái APPROVED. Test AGENT (và user thiếu quyền) bị 403.
4. Thêm permission vào catalog nếu cần, nhưng không gán vào role cụ thể trừ khi đã được người sở hữu chốt trong docs đã ký. Ghi rõ ô trống trong PR.
5. Test: happy path đúng role; 403 sai role; ký xong booking vẫn DEPOSITED cho đến khi duyệt; D08/D09 không đổi.

Cấm: mở D08/D09/D10; bật payout; merge; bịa vai trò duyệt như đã chốt.

Draft PR Batch 4.
```

---

## 9. Câu hỏi cần chốt (để trống)

Người sở hữu / pháp lý / vận hành điền. Không lấy mặc định trong code làm câu trả lời.

### 9.1. Vai trò và quyền

- Role / permission được **tạo** yêu cầu ký: ____
- Role / permission được **duyệt** sau khi ký (`DEPOSITED → CONTRACTED`): ____
- Role / permission được **duyệt KYC**: ____
- Agency / sàn nằm trong `TENANT_ROLES` hiện có, tenant riêng, hay role mới: ____
- Sales có được tạo yêu cầu ký hộ buyer không: ____

### 9.2. Token và OTP

- TTL token link (hiện *trong code* là 15 phút): giữ / đổi thành ____
- TTL OTP: ____
- Số lần thử OTP tối đa: ____
- Cooldown gửi lại: ____
- Thời gian lockout: ____
- Consume token tại thời điểm mở link hay tại thời điểm ký xong: ____
- Fallback kênh (email ↔ SMS ↔ Zalo): có / không, thứ tự: ____
- Có gửi OTP trong cùng thông điệp với link không: ____ (khuyến nghị kỹ thuật: không)

### 9.3. Kênh và nhà cung cấp (không kèm giá)

- Kênh mặc định pha 1: email / SMS / Zalo / người ký tự chọn: ____
- Nhà cung cấp email (SMTP / SES / khác): ____
- Nhà cung cấp SMS brandname: ____
- Bật Zalo ZNS cho link và/hoặc OTP: ____
- Kênh gửi bản sao đã ký: ____

### 9.4. Tài liệu và quy trình

- Danh sách tài liệu **bắt buộc pha 1**: ____
- Loại nào cần nhiều bên ký, thứ tự cụ thể: ____
- Loại nào bắt buộc admin duyệt trước khi đổi booking: ____
- Bắt buộc eKYC trước khi buyer / sales / đại diện công ty ký: ____
- Thời hạn lưu vault (hiện code dùng `10Y` cho `SIGNED_CONTRACT`): giữ / ____

### 9.5. Pháp lý và cửa D-gate

- Luật sư phụ trách và ngày nhận xác nhận: ____
- Loại tài liệu được phép ký bằng OTP e-sign: ____
- Loại bắt buộc chữ ký số CA: ____
- Loại bắt buộc công chứng / hình thức khác: ____
- D08: nhà cung cấp CA (VNPT SmartCA / Viettel MySign / FPT CA / khác): ____
- D08: có bắt buộc artifact nhà cung cấp trước khi ghi `SIGNED` không: ____
- D08 / D09 chỉ được mở sau khi có chữ ký trên mẫu cửa tương ứng — xác nhận người ký cửa: ____

### 9.6. UAT / vận hành

- Môi trường UAT, tenant, SĐT/email/Zalo test: ____
- Staging có cấm OTP sandbox như production không: ____

---

## Phụ lục A — Chỉ dẫn nhanh «đang có / cần làm»

| Việc | Đang có | Cần làm |
| --- | --- | --- |
| Buyer ký OTP | Có, portal + SMS | Link gửi chủ động qua email/SMS/Zalo; siết token/OTP |
| Đa bên / thứ tự | Không | Batch 3 |
| Admin duyệt → `CONTRACTED` | Workflow chỉ là định nghĩa; status type chưa có `CONTRACTED` | Batch 4 |
| PDF + chứng thư | File `.txt` trong vault | Batch 3 |
| Email | Không có module | Batch 2 |
| CA / artifact executed | Stub VNPT + D08 422 | Pha sau, sau khi ký D08 |
| Role KYC | Lỗ hổng | Batch 4 |
| HĐ agency / CTV / bàn giao ký online | Chưa (handover chỉ checklist) | Pha 5, sau khi chốt danh sách |

## Phụ lục B — Nguồn đối chiếu

- `apps/api/src/modules/booking/contract-sign-token.ts`
- `apps/api/src/modules/booking/booking-contract.service.ts`, `.controller.ts`, `.types.ts`, `booking-contract.util.ts`
- `apps/api/src/modules/booking/booking-contract-esign-sms.service.ts`, `booking-contract-esign-provider.service.ts`, `esign-provider.adapter.ts`, `vnpt-esign.adapter.ts`
- `apps/api/src/modules/booking/contract-artifact.service.ts`
- `apps/api/src/modules/booking/booking-workflow.util.ts`, `booking.types.ts`
- `apps/api/src/modules/booking/handover-checklist.service.ts`
- `apps/api/src/modules/portal/portal.controller.ts`, `portal.service.ts`
- `apps/api/src/modules/sms/sms.service.ts`, `sms.types.ts`
- `apps/api/src/modules/zalo/zalo.types.ts`, `zalo-lead.service.ts`, `zalo-payment-notify.service.ts`
- `apps/api/src/modules/notify/notify.service.ts`, `notify-rails.service.ts`
- `apps/api/src/modules/documents/documents.service.ts`, `documents.types.ts`
- `apps/api/src/modules/identity/role-catalog.ts`
- `apps/api/src/modules/kyc/kyc.controller.ts`, `kyc.service.ts`
- `apps/api/src/modules/ekyc/ekyc.service.ts`
- `apps/web/src/pages/buyer/BuyerEsignPage.tsx`
- `docs/spec-v1/decisions-pending.md` (D08)
- `/workspace/nnhm-signoff/D08.md`, `D09.md`

— Hết kế hoạch —
