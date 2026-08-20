import type { KycStatus, KycSubjectType } from '../../database/entities/kyc-profile.entity';

export type KycWorkflowStep = {
  id: string;
  label: string;
  done: boolean;
  required: boolean;
};

export type KycWorkflowEvent = {
  id: string;
  action: string;
  label: string;
  actorId?: string | null;
  createdAt: string;
  payload?: Record<string, unknown>;
};

export function buildKycChecklist(
  subjectType: KycSubjectType,
  status: KycStatus,
): KycWorkflowStep[] {
  const base: KycWorkflowStep[] = [
    { id: 'identity', label: 'Giấy tờ định danh / GPKD', done: status !== 'PENDING', required: true },
    { id: 'bank', label: 'Tài khoản nhận HH', done: status === 'APPROVED', required: true },
    { id: 'review', label: 'Ops review', done: status === 'APPROVED' || status === 'REJECTED', required: true },
  ];

  if (subjectType === 'AGENCY') {
    base.splice(1, 0, {
      id: 'agency_license',
      label: 'Giấy phép môi giới / BR-23',
      done: status === 'APPROVED',
      required: true,
    });
  }

  return base;
}

export function mapKycAuditLabel(action: string): string {
  switch (action) {
    case 'KYC_APPROVED':
      return 'Đã duyệt KYC';
    case 'KYC_REJECTED':
      return 'Từ chối KYC';
    case 'KYC_RESUBMIT_REQUESTED':
      return 'Yêu cầu bổ sung hồ sơ';
    case 'KYC_DOCUMENT_SUBMITTED':
      return 'Nộp tài liệu KYC';
    default:
      return action;
  }
}
