export type Portal = 'public' | 'agent' | 'admin' | 'developer' | 'finance' | 'buyer' | 'auth' | 'system';
export type Priority = 'M' | 'S' | 'C' | 'W';
export type ScreenType =
  | 'search'
  | 'detail'
  | 'compare'
  | 'dashboard'
  | 'kanban'
  | 'wizard'
  | 'moderation'
  | 'audit'
  | 'booking'
  | 'payment'
  | 'pipeline'
  | 'lead'
  | 'listing'
  | 'golden-record'
  | 'product-graph'
  | 'import'
  | 'time-travel'
  | 'users'
  | 'login'
  | 'routing'
  | 'integration'
  | 'finance'
  | 'commission'
  | 'ai'
  | 'analytics'
  | 'marketing'
  | 'dispute'
  | 'documents'
  | 'mobile'
  | 'buyer-track'
  | 'contract'
  | 'workflow'
  | 'whitelabel'
  | 'map3d'
  | 'inbox'
  | 'system';

export interface UseCase {
  id: string;
  title: string;
  module: string;
  phase: number;
  priority: Priority;
  actors: string;
  portal: Portal;
  route: string;
  screenType: ScreenType;
  fr?: string;
  flow: string[];
}

export const USE_CASES: UseCase[] = [
  { id: 'UC-GR-01', title: 'Quản lý Golden Record (Unit gốc)', module: 'GR', phase: 1, priority: 'M', actors: 'Developer Admin', portal: 'developer', route: '/developer/units', screenType: 'golden-record', fr: 'FR-GR-01', flow: ['Chọn project', 'Quản lý unit grid', 'Cập nhật giá/version', 'Audit trail'] },
  { id: 'UC-GR-02', title: 'Tạo listing marketing từ unit gốc', module: 'GR', phase: 1, priority: 'M', actors: 'Agent', portal: 'agent', route: '/agent/listings/new', screenType: 'listing', fr: 'FR-GR-03', flow: ['Chọn unit GR', 'Nhập marketing copy', 'Anti-drift check', 'Gửi duyệt'] },
  { id: 'UC-GR-03', title: 'Kiểm tra anti-drift listing', module: 'GR', phase: 1, priority: 'M', actors: 'Ops Admin', portal: 'admin', route: '/admin/moderation', screenType: 'moderation', fr: 'FR-GR-04', flow: ['Scan listing vs GR', 'Flag/Block drift', 'Ops review', 'Approve/Reject'] },
  { id: 'UC-GR-04', title: 'Xem Product Graph & quan hệ unit', module: 'GR', phase: 1, priority: 'M', actors: 'Developer Admin', portal: 'developer', route: '/developer/product-graph', screenType: 'product-graph', fr: 'FR-GR-01', flow: ['Project root', 'Buildings', 'Units linked', 'Navigate graph'] },
  { id: 'UC-GR-05', title: 'Lịch sử giá/tồn kho (time-travel)', module: 'GR', phase: 2, priority: 'S', actors: 'Developer Admin', portal: 'developer', route: '/developer/time-travel', screenType: 'time-travel', fr: 'FR-GR-06', flow: ['Chọn unit', 'Chọn thời điểm T', 'Snapshot giá/status', 'Export báo cáo'] },
  { id: 'UC-GR-06', title: 'Import bảng hàng bulk Excel/CSV', module: 'GR', phase: 2, priority: 'S', actors: 'Developer Admin', portal: 'developer', route: '/developer/import', screenType: 'import', fr: 'FR-GR-07', flow: ['Upload file', 'Validate', 'Preview diff', 'Commit import'] },
  { id: 'UC-GR-07', title: 'Real-time push trạng thái unit (SSE)', module: 'GR', phase: 1, priority: 'M', actors: 'All portals', portal: 'system', route: '/uc/UC-GR-07', screenType: 'system', fr: 'FR-GR-08', flow: ['Unit status change', 'SSE broadcast', 'Portal update ≤5s', 'Cache invalidate'] },

  { id: 'UC-ID-01', title: 'Onboarding tenant Developer/Agency', module: 'ID', phase: 1, priority: 'M', actors: 'Platform Admin', portal: 'admin', route: '/admin/tenants/onboard', screenType: 'wizard', fr: 'FR-ID-01', flow: ['Tạo tenant', 'Default roles', 'Admin invite', 'Activate tenant'] },
  { id: 'UC-ID-02', title: 'Phân quyền user theo role/project', module: 'ID', phase: 1, priority: 'M', actors: 'Agency/Developer Admin', portal: 'admin', route: '/admin/users/roles', screenType: 'users', fr: 'FR-ID-02', flow: ['Chọn role', 'Gán permissions', 'ABAC project scope', 'Save policy'] },
  { id: 'UC-ID-03', title: 'Đăng nhập, refresh token & MFA', module: 'ID', phase: 1, priority: 'M', actors: 'All users', portal: 'auth', route: '/auth/login', screenType: 'login', fr: 'FR-ID-04', flow: ['Email/password', 'MFA OTP (payment)', 'JWT + refresh', 'Tenant context'] },
  { id: 'UC-ID-04', title: 'Quản lý user trong tenant', module: 'ID', phase: 1, priority: 'M', actors: 'Agency/Developer Admin', portal: 'admin', route: '/admin/users', screenType: 'users', fr: 'FR-ID-02', flow: ['Invite user', 'Assign role', 'Deactivate', 'Audit log'] },
  { id: 'UC-ID-05', title: 'KYC/KYB Agency và Developer', module: 'ID', phase: 2, priority: 'S', actors: 'Platform Admin', portal: 'admin', route: '/admin/kyc', screenType: 'moderation', fr: 'FR-ID-05', flow: ['Submit documents', 'Verify', 'Approve/Reject', 'Verified badge'] },
  { id: 'UC-ID-06', title: 'SSO Enterprise SAML/OIDC', module: 'ID', phase: 4, priority: 'C', actors: 'Enterprise User', portal: 'auth', route: '/auth/sso', screenType: 'login', fr: 'FR-ID-06', flow: ['Configure IdP', 'SSO login', 'Map roles', 'Audit'] },

  { id: 'UC-LS-01', title: 'Tìm kiếm & lọc sản phẩm', module: 'LS', phase: 1, priority: 'M', actors: 'Buyer, Guest', portal: 'public', route: '/public/search', screenType: 'search', fr: 'FR-LS-02', flow: ['Query + facet', 'OpenSearch', 'Sort/filter', 'Results grid'] },
  { id: 'UC-LS-02', title: 'Duyệt listing trước publish', module: 'LS', phase: 1, priority: 'M', actors: 'Ops Admin', portal: 'admin', route: '/admin/moderation', screenType: 'moderation', fr: 'FR-LS-01', flow: ['Review queue', 'Preview listing', 'Anti-drift final', 'Publish index'] },
  { id: 'UC-LS-03', title: 'So sánh sản phẩm (2–3 unit)', module: 'LS', phase: 1, priority: 'S', actors: 'Buyer', portal: 'public', route: '/public/compare', screenType: 'compare', fr: 'FR-LS-04', flow: ['Select units', 'Compare table', 'CTA tư vấn', 'Lead capture'] },
  { id: 'UC-LS-04', title: 'Upload media listing (ảnh/video)', module: 'LS', phase: 1, priority: 'M', actors: 'Agent', portal: 'agent', route: '/agent/listings/media', screenType: 'wizard', fr: 'FR-LS-03', flow: ['Presigned upload', 'Virus scan', 'Attach to listing', 'Preview gallery'] },
  { id: 'UC-LS-05', title: 'Xem trang chi tiết project/unit', module: 'LS', phase: 1, priority: 'M', actors: 'Buyer, Guest', portal: 'public', route: '/public/units/un_01', screenType: 'detail', fr: 'FR-UX-01', flow: ['Gallery + specs', 'Verified badge', 'Lead form sticky', 'SSE status'] },
  { id: 'UC-LS-06', title: 'Phát hiện listing trùng lặp', module: 'LS', phase: 2, priority: 'S', actors: 'Ops Admin', portal: 'admin', route: '/admin/duplicates', screenType: 'moderation', fr: 'FR-LS-05', flow: ['Detect duplicate', 'Ops queue', 'Merge/reject', 'Audit'] },
  { id: 'UC-LS-07', title: 'Đồng bộ search index từ GR', module: 'LS', phase: 1, priority: 'M', actors: 'System', portal: 'system', route: '/uc/UC-LS-07', screenType: 'system', fr: 'FR-LS-06', flow: ['CDC event', 'Outbox worker', 'OpenSearch index', '≤5s lag'] },

  { id: 'UC-CRM-01', title: 'Gửi yêu cầu tư vấn (lead form)', module: 'CRM', phase: 1, priority: 'M', actors: 'Buyer, Guest', portal: 'public', route: '/public/units/un_01', screenType: 'lead', fr: 'FR-CRM-01', flow: ['Fill form', 'PDPA consent', 'Submit lead', 'Thank you'] },
  { id: 'UC-CRM-02', title: 'Phân công lead cho agent (routing)', module: 'CRM', phase: 1, priority: 'M', actors: 'Agency Admin', portal: 'agent', route: '/agent/settings/routing', screenType: 'routing', fr: 'FR-CRM-03', flow: ['Round-robin rules', 'Hot priority', 'Assign agent', 'Notify'] },
  { id: 'UC-CRM-03', title: 'Quản lý pipeline & CRM activities', module: 'CRM', phase: 1, priority: 'M', actors: 'Agent', portal: 'agent', route: '/agent/pipeline', screenType: 'kanban', fr: 'FR-CRM-05', flow: ['Kanban stages', 'Log activity', 'Update stage', 'Timeline sync'] },
  { id: 'UC-CRM-04', title: 'Import lead thủ công (CSV/walk-in)', module: 'CRM', phase: 1, priority: 'S', actors: 'Agent', portal: 'agent', route: '/agent/leads/import', screenType: 'import', fr: 'FR-CRM-01', flow: ['Upload CSV', 'Validate', 'Create leads', 'Assign'] },
  { id: 'UC-CRM-05', title: 'Sync lead từ Zalo OA / Meta Lead Ads', module: 'CRM', phase: 2, priority: 'M', actors: 'System', portal: 'admin', route: '/admin/integrations/leads', screenType: 'integration', fr: 'FR-CRM-06', flow: ['Webhook inbound', 'Normalize', 'Dedup', 'Score + route'] },
  { id: 'UC-CRM-06', title: 'Nhắc SLA follow-up & escalation', module: 'CRM', phase: 2, priority: 'S', actors: 'System', portal: 'agent', route: '/agent/tasks/sla', screenType: 'dashboard', fr: 'FR-CRM-08', flow: ['SLA timer', 'Reminder', 'Escalate manager', 'Log event'] },
  { id: 'UC-CRM-07', title: 'Unified inbox đa kênh', module: 'CRM', phase: 3, priority: 'C', actors: 'Agent', portal: 'agent', route: '/agent/inbox', screenType: 'inbox', fr: 'FR-CRM-09', flow: ['Aggregate channels', 'Single thread', 'Reply', 'CRM sync'] },

  { id: 'UC-BK-01', title: 'Tạo booking/giữ chỗ với expiry', module: 'BK', phase: 1, priority: 'M', actors: 'Agent', portal: 'agent', route: '/agent/bookings/new', screenType: 'booking', fr: 'FR-BK-01', flow: ['Select unit+lead', 'Atomic lock', 'Set expiry 48h', 'RESERVED state'] },
  { id: 'UC-BK-02', title: 'Theo dõi trạng thái giao dịch', module: 'BK', phase: 1, priority: 'M', actors: 'Agent, Buyer', portal: 'buyer', route: '/buyer/deals', screenType: 'buyer-track', fr: 'FR-BK-03', flow: ['View booking', '15-state stepper', 'Allowed transitions', 'Notifications'] },
  { id: 'UC-BK-03', title: 'Xem domain event timeline giao dịch', module: 'BK', phase: 1, priority: 'M', actors: 'Ops, Agent', portal: 'agent', route: '/agent/bookings/bk_018', screenType: 'booking', fr: 'FR-BK-04', flow: ['Booking events', 'Human timeline', 'Actor + timestamp', 'State changes'] },
  { id: 'UC-BK-04', title: 'Replay timeline (dispute evidence)', module: 'BK', phase: 2, priority: 'S', actors: 'Ops Admin', portal: 'admin', route: '/admin/bookings/replay', screenType: 'audit', fr: 'FR-BK-04', flow: ['Query event store', 'Reconstruct state', 'Export PDF', 'Attach dispute'] },
  { id: 'UC-BK-05', title: 'Hủy booking & hoàn tiền', module: 'BK', phase: 1, priority: 'M', actors: 'Agent', portal: 'agent', route: '/agent/bookings/cancel', screenType: 'booking', fr: 'FR-BK-07', flow: ['Cancel reason', 'Release lock', 'Refund trigger', 'Ledger reversal'] },
  { id: 'UC-BK-06', title: 'Tạo hợp đồng từ template', module: 'BK', phase: 2, priority: 'S', actors: 'Agent', portal: 'agent', route: '/agent/contracts/new', screenType: 'contract', fr: 'FR-BK-05', flow: ['Select template', 'Merge data', 'Preview PDF', 'Contract Drafted'] },
  { id: 'UC-BK-07', title: 'Ký hợp đồng điện tử', module: 'BK', phase: 2, priority: 'S', actors: 'Buyer', portal: 'buyer', route: '/buyer/esign', screenType: 'contract', fr: 'FR-BK-06', flow: ['Sign link', 'E-sign provider', 'Webhook signed', 'Vault doc'] },
  { id: 'UC-BK-08', title: 'Custom workflow giao dịch theo tenant', module: 'BK', phase: 4, priority: 'C', actors: 'Platform Admin', portal: 'admin', route: '/admin/workflows', screenType: 'workflow', fr: 'FR-BK-08', flow: ['Define states', 'Transitions', 'Publish workflow', 'Apply tenant'] },

  { id: 'UC-PAY-01', title: 'Tạo & thanh toán cọc online', module: 'PAY', phase: 1, priority: 'M', actors: 'Buyer', portal: 'buyer', route: '/buyer/payment', screenType: 'payment', fr: 'FR-PAY-01', flow: ['Payment intent', 'VNPay/QR', 'MFA OTP', 'Webhook success'] },
  { id: 'UC-PAY-02', title: 'Đối soát thanh toán hàng ngày', module: 'PAY', phase: 1, priority: 'M', actors: 'Finance Admin', portal: 'finance', route: '/finance/reconciliation', screenType: 'finance', fr: 'FR-PAY-04', flow: ['Gateway total', 'Ledger total', 'Match 100%', 'Discrepancy report'] },
  { id: 'UC-PAY-03', title: 'Xử lý refund & ledger reversal', module: 'PAY', phase: 1, priority: 'M', actors: 'Finance Admin', portal: 'finance', route: '/finance/refunds', screenType: 'finance', fr: 'FR-PAY-02', flow: ['Refund request', 'Gateway refund', 'Double-entry reversal', 'Booking REFUNDED'] },
  { id: 'UC-PAY-04', title: 'Chi hoa hồng batch settlement', module: 'PAY', phase: 2, priority: 'M', actors: 'Finance Admin', portal: 'finance', route: '/finance/settlement', screenType: 'finance', fr: 'FR-PAY-07', flow: ['Close period', 'Calc commission', 'Approval', 'Batch payout'] },
  { id: 'UC-PAY-05', title: 'Multi-gateway routing & fallback', module: 'PAY', phase: 3, priority: 'S', actors: 'System', portal: 'admin', route: '/admin/payment-gateways', screenType: 'integration', fr: 'FR-PAY-06', flow: ['Route rules', 'Primary fail', 'Fallback gateway', 'Log route'] },
  { id: 'UC-PAY-06', title: 'Escrow thông minh conditional release', module: 'PAY', phase: 5, priority: 'C', actors: 'Buyer', portal: 'finance', route: '/finance/escrow', screenType: 'finance', fr: 'FR-PAY-08', flow: ['Deposit escrow', 'Milestones', 'Condition met', 'Release funds'] },
  { id: 'UC-PAY-07', title: 'BNPL / trả góp theo đợt', module: 'PAY', phase: 5, priority: 'C', actors: 'Buyer', portal: 'buyer', route: '/buyer/bnpl', screenType: 'payment', fr: 'FR-PAY-09', flow: ['Select BNPL', 'Partner approve', 'Installments', 'Reconcile'] },

  { id: 'UC-COM-01', title: 'Cấu hình commission policy theo project', module: 'COM', phase: 2, priority: 'M', actors: 'Developer Admin', portal: 'developer', route: '/developer/commission', screenType: 'commission', fr: 'FR-COM-01', flow: ['Set rate rules', 'Split config', 'Publish policy', 'Audit'] },
  { id: 'UC-COM-02', title: 'Snapshot policy tại thời điểm chốt deal', module: 'COM', phase: 2, priority: 'M', actors: 'System', portal: 'system', route: '/uc/UC-COM-02', screenType: 'system', fr: 'FR-COM-02', flow: ['Deal closed', 'Lock policy version', 'Immutable store', 'Notify finance'] },
  { id: 'UC-COM-03', title: 'Split commission nhiều agent/agency', module: 'COM', phase: 2, priority: 'S', actors: 'Finance Admin', portal: 'finance', route: '/finance/commission/split', screenType: 'commission', fr: 'FR-COM-03', flow: ['Identify agents', 'Apply split %', 'Validate 100%', 'Settlement queue'] },
  { id: 'UC-COM-04', title: 'Holdback khi tranh chấp', module: 'COM', phase: 2, priority: 'S', actors: 'Ops Admin', portal: 'admin', route: '/admin/commission/holdback', screenType: 'commission', fr: 'FR-COM-04', flow: ['Dispute open', 'Hold commission', 'Resolve', 'Release holdback'] },
  { id: 'UC-COM-05', title: 'Export báo cáo hoa hồng kế toán', module: 'COM', phase: 2, priority: 'M', actors: 'Finance Admin', portal: 'finance', route: '/finance/commission/export', screenType: 'finance', fr: 'FR-COM-05', flow: ['Select period', 'Generate report', 'Export Excel', 'Audit trail'] },

  { id: 'UC-AI-01', title: 'Tạo nội dung listing bằng AI copilot', module: 'AI', phase: 1, priority: 'M', actors: 'Agent', portal: 'agent', route: '/agent/listings/new', screenType: 'ai', fr: 'FR-AI-01', flow: ['Select tone', 'Generate copy', 'Human approve', 'Disclaimer shown'] },
  { id: 'UC-AI-02', title: 'Chấm điểm & ưu tiên lead', module: 'AI', phase: 1, priority: 'M', actors: 'System, Agent', portal: 'agent', route: '/agent/leads/ld_01', screenType: 'lead', fr: 'FR-AI-02', flow: ['Lead captured', 'Score 0-100', 'Tier HOT/WARM', 'Route if HOT'] },
  { id: 'UC-AI-03', title: 'Tra cứu tài liệu pháp lý (RAG)', module: 'AI', phase: 2, priority: 'S', actors: 'Agent', portal: 'agent', route: '/agent/ai/legal', screenType: 'ai', fr: 'FR-AI-05', flow: ['Query legal docs', 'Retrieve + cite', 'LLM answer', 'Log query'] },
  { id: 'UC-AI-04', title: 'AI Sales Agent draft reply', module: 'AI', phase: 3, priority: 'S', actors: 'Agent', portal: 'agent', route: '/agent/ai/reply', screenType: 'ai', fr: 'FR-AI-07', flow: ['Inbound message', 'AI draft', 'Agent review', 'Approve send'] },
  { id: 'UC-AI-05', title: 'AI phát hiện listing bất thường', module: 'AI', phase: 3, priority: 'S', actors: 'Ops Admin', portal: 'admin', route: '/admin/ai/anomaly', screenType: 'moderation', fr: 'FR-AI-08', flow: ['ML flag', 'Ops queue', 'Investigate', 'Resolve'] },
  { id: 'UC-AI-06', title: 'Buyer-product matching gợi ý', module: 'AI', phase: 2, priority: 'S', actors: 'Buyer', portal: 'public', route: '/public/recommendations', screenType: 'search', fr: 'FR-AI-06', flow: ['Buyer profile', 'Rank units', 'Show recommendations', 'Track click'] },
  { id: 'UC-AI-07', title: 'Buyer conversational discovery', module: 'AI', phase: 3, priority: 'C', actors: 'Buyer', portal: 'public', route: '/public/chat', screenType: 'ai', fr: 'FR-AI-09', flow: ['Chat intent', 'Recommend units', 'Capture lead', 'Handoff agent'] },

  { id: 'UC-TR-01', title: 'Xem audit trail toàn hệ thống', module: 'TR', phase: 1, priority: 'M', actors: 'Ops Admin', portal: 'admin', route: '/admin/audit', screenType: 'audit', fr: 'FR-TR-01', flow: ['Filter entity/actor', 'Event list', 'Detail drawer', 'Export'] },
  { id: 'UC-TR-02', title: 'Quản lý kho tài liệu (Document Vault)', module: 'TR', phase: 2, priority: 'S', actors: 'Developer Admin', portal: 'developer', route: '/developer/documents', screenType: 'documents', fr: 'FR-TR-02', flow: ['Upload doc', 'Watermark', 'Access control', 'Download log'] },
  { id: 'UC-TR-03', title: 'Quản lý tranh chấp (Dispute Center)', module: 'TR', phase: 3, priority: 'S', actors: 'Ops Admin', portal: 'admin', route: '/admin/disputes', screenType: 'dispute', fr: 'FR-TR-03', flow: ['Open dispute', 'Attach evidence', 'Mediate', 'Resolution'] },
  { id: 'UC-TR-04', title: 'Regulatory Export Pack', module: 'TR', phase: 4, priority: 'C', actors: 'Platform Admin', portal: 'admin', route: '/admin/regulatory-export', screenType: 'audit', fr: 'FR-TR-04', flow: ['Select scope', 'Compile pack', 'Encrypt', 'Download + log'] },

  { id: 'UC-AN-01', title: 'Dashboard funnel & KPI', module: 'AN', phase: 1, priority: 'M', actors: 'Agency Admin', portal: 'admin', route: '/admin', screenType: 'analytics', fr: 'FR-AN-01', flow: ['Leads funnel', 'Bookings', 'Deposits', 'Conversion rate'] },
  { id: 'UC-AN-02', title: 'Báo cáo GMV & doanh thu platform', module: 'AN', phase: 2, priority: 'M', actors: 'Platform Admin', portal: 'admin', route: '/admin/analytics/gmv', screenType: 'analytics', fr: 'FR-AN-02', flow: ['Select period', 'GMV aggregate', 'Tenant breakdown', 'Export chart'] },
  { id: 'UC-AN-03', title: 'Báo cáo absorption & tồn kho', module: 'AN', phase: 2, priority: 'S', actors: 'Developer Admin', portal: 'developer', route: '/developer/absorption', screenType: 'analytics', fr: 'FR-AN-03', flow: ['Sold/available ratio', 'Trend chart', 'Compare phase', 'Export'] },
  { id: 'UC-AN-04', title: 'Campaign attribution đa kênh', module: 'AN', phase: 3, priority: 'S', actors: 'Developer Admin', portal: 'developer', route: '/developer/attribution', screenType: 'analytics', fr: 'FR-AN-04', flow: ['UTM tracking', 'Lead→booking', 'Channel ROI', 'Report'] },
  { id: 'UC-AN-05', title: 'Dự báo absorption 30/60/90 ngày', module: 'AN', phase: 3, priority: 'C', actors: 'Developer Admin', portal: 'developer', route: '/developer/forecast', screenType: 'analytics', fr: 'FR-AN-05', flow: ['Historical data', 'ML forecast', 'Confidence band', 'Export'] },

  { id: 'UC-MKT-01', title: 'Publish policy phân phối project', module: 'MKT', phase: 2, priority: 'S', actors: 'Developer Admin', portal: 'developer', route: '/developer/distribution', screenType: 'marketing', fr: 'FR-MKT-01', flow: ['Set eligibility', 'Commission terms', 'Publish', 'Notify agencies'] },
  { id: 'UC-MKT-02', title: 'Agency apply/approve quyền bán project', module: 'MKT', phase: 2, priority: 'S', actors: 'Agency Admin', portal: 'agent', route: '/agent/marketplace/apply', screenType: 'marketing', fr: 'FR-MKT-02', flow: ['Browse projects', 'Submit apply', 'Dev review', 'Enable listing'] },
  { id: 'UC-MKT-03', title: 'Leaderboard & compliance score agency', module: 'MKT', phase: 3, priority: 'C', actors: 'Developer Admin', portal: 'developer', route: '/developer/leaderboard', screenType: 'marketing', fr: 'FR-MKT-03', flow: ['Calc score', 'Rank agencies', 'Penalty flag', 'Dev action'] },
  { id: 'UC-MKT-04', title: 'Marketplace ranking & SLA penalty', module: 'MKT', phase: 6, priority: 'C', actors: 'Platform Admin', portal: 'admin', route: '/admin/marketplace', screenType: 'marketing', fr: 'FR-MKT-03', flow: ['Monitor SLA', 'Auto penalty', 'Notify agency', 'Appeal'] },

  { id: 'UC-UX-01', title: 'Agent làm việc hiện trường (Mobile/PWA)', module: 'UX', phase: 2, priority: 'S', actors: 'Agent', portal: 'agent', route: '/agent/mobile', screenType: 'mobile', fr: 'FR-UX-05', flow: ['Mobile login', 'Offline cache', 'Geo activity', 'Sync booking'] },
  { id: 'UC-UX-02', title: 'Buyer theo dõi deal & notification', module: 'UX', phase: 3, priority: 'C', actors: 'Buyer', portal: 'buyer', route: '/buyer/deals', screenType: 'buyer-track', fr: 'FR-UX-06', flow: ['View bookings', 'Status timeline', 'Push notify', 'Support'] },
  { id: 'UC-UX-03', title: 'Admin quản lý tenant & moderation', module: 'UX', phase: 1, priority: 'M', actors: 'Platform Admin', portal: 'admin', route: '/admin', screenType: 'dashboard', fr: 'FR-UX-03', flow: ['Tenant mgmt', 'Moderation queue', 'Audit', 'KPI'] },
  { id: 'UC-UX-04', title: 'Developer Portal quản lý project', module: 'UX', phase: 2, priority: 'M', actors: 'Developer Admin', portal: 'developer', route: '/developer', screenType: 'golden-record', fr: 'FR-UX-04', flow: ['GR grid', 'Import', 'Absorption', 'Agency mgmt'] },
  { id: 'UC-UX-05', title: 'White-label portal theo tenant', module: 'UX', phase: 4, priority: 'C', actors: 'Platform Admin', portal: 'admin', route: '/admin/whitelabel', screenType: 'whitelabel', fr: 'FR-UX-07', flow: ['Brand config', 'Subdomain', 'Theme preview', 'Go-live'] },
  { id: 'UC-UX-06', title: 'Immersive discovery 3D/Map', module: 'UX', phase: 6, priority: 'C', actors: 'Buyer', portal: 'public', route: '/public/map', screenType: 'map3d', fr: 'FR-UX-01', flow: ['3D model', 'Map intelligence', 'Link GR', 'Book CTA'] },

  { id: 'UC-NW-01', title: 'Tích hợp Zalo OA/ZNS notification', module: 'NW', phase: 2, priority: 'M', actors: 'System', portal: 'admin', route: '/admin/integrations/zalo', screenType: 'integration', fr: 'FR-CRM-06', flow: ['Configure OA', 'Map templates', 'Send notify', 'Track delivery'] },
  { id: 'UC-NW-02', title: 'Tích hợp Meta Lead Ads webhook', module: 'NW', phase: 2, priority: 'M', actors: 'System', portal: 'admin', route: '/admin/integrations/meta', screenType: 'integration', fr: 'FR-CRM-07', flow: ['Connect page', 'Webhook subscribe', 'Receive lead', 'CRM create'] },
  { id: 'UC-NW-03', title: 'SMS gateway thông báo giao dịch', module: 'NW', phase: 2, priority: 'S', actors: 'System', portal: 'admin', route: '/admin/integrations/sms', screenType: 'integration', fr: 'FR-CRM-06', flow: ['Configure SMS', 'OTP template', 'Send on event', 'Delivery report'] },
  { id: 'UC-NW-04', title: 'API Marketplace partner webhook', module: 'NW', phase: 4, priority: 'C', actors: 'Platform Admin', portal: 'admin', route: '/admin/api-marketplace', screenType: 'integration', fr: '—', flow: ['Partner register', 'API key', 'Consume webhook', 'Billing'] },
  { id: 'UC-NW-05', title: 'Webhook platform cho tenant', module: 'NW', phase: 4, priority: 'C', actors: 'Developer Admin', portal: 'developer', route: '/developer/webhooks', screenType: 'integration', fr: '—', flow: ['Configure URL', 'Select events', 'Retry delivery', 'Monitor'] },
];

export const UC_MAP = Object.fromEntries(USE_CASES.map((uc) => [uc.id, uc])) as Record<string, UseCase>;

export const MODULES = [...new Set(USE_CASES.map((u) => u.module))].sort();

export function getUseCase(id: string): UseCase | undefined {
  return UC_MAP[id];
}

export function getUseCasesByPortal(portal: Portal): UseCase[] {
  return USE_CASES.filter((u) => u.portal === portal);
}

export function getUseCasesByPhase(phase: number): UseCase[] {
  return USE_CASES.filter((u) => u.phase === phase);
}
