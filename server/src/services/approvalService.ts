import { Role } from '@prisma/client';

export const APPROVAL_STEP_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type ApprovalStepStatus = typeof APPROVAL_STEP_STATUS[keyof typeof APPROVAL_STEP_STATUS];

export interface ApprovalStep {
  step: number;
  role: Role;
  status: ApprovalStepStatus;
  approvedById: string | null;
  approvedAt: string | null;
  // Set when an ADMIN acted on this step in place of its assigned role
  // (e.g. the MANAGER or FINANCE approver is unavailable).
  overriddenBy?: { userId: string; reason: string } | null;
}

export interface ApprovalChain {
  steps: ApprovalStep[];
  rejectedReason: string | null;
  rejectedById: string | null;
  rejectedByRole: Role | null;
  rejectedAt: string | null;
}

export function getApprovalRoles(totalAmount: number): Role[] {
  if (totalAmount > 500000) {
    return [Role.MANAGER, Role.FINANCE, Role.ADMIN];
  }
  if (totalAmount > 50000) {
    return [Role.MANAGER, Role.FINANCE];
  }
  return [Role.MANAGER];
}

export function createApprovalChain(totalAmount: number): ApprovalChain {
  const roles = getApprovalRoles(totalAmount);
  return {
    steps: roles.map((role, index) => ({
      step: index + 1,
      role,
      status: APPROVAL_STEP_STATUS.PENDING,
      approvedById: null,
      approvedAt: null,
    })),
    rejectedReason: null,
    rejectedById: null,
    rejectedByRole: null,
    rejectedAt: null,
  };
}

export function getCurrentApproverRole(chain: ApprovalChain | null, currentApproverIndex: number): Role | null {
  return chain?.steps?.[currentApproverIndex]?.role ?? null;
}

export function isCurrentApprover(chain: ApprovalChain | null, currentApproverIndex: number, actorRole: Role): boolean {
  return getCurrentApproverRole(chain, currentApproverIndex) === actorRole;
}

interface ApproveStateParams {
  approvalChain: ApprovalChain;
  currentApproverIndex: number;
  status: string;
  actorRole: Role;
  actorUserId: string;
  reason?: string;
}

export function approveState({ approvalChain, currentApproverIndex, status, actorRole, actorUserId, reason }: ApproveStateParams) {
  if (status !== 'PENDING_APPROVAL') {
    throw new Error('Purchase order is not pending approval');
  }

  const currentRole = getCurrentApproverRole(approvalChain, currentApproverIndex);
  // ADMIN can step in for the assigned approver (e.g. they're unavailable),
  // but has to leave a reason since it's bypassing the normal chain.
  const isOverride = actorRole === Role.ADMIN && currentRole !== Role.ADMIN;

  if (!isOverride && !isCurrentApprover(approvalChain, currentApproverIndex, actorRole)) {
    throw new Error('You are not the current approver');
  }

  if (isOverride && (!reason || !reason.trim())) {
    throw new Error('A reason is required to approve on behalf of the assigned approver');
  }

  const nextChain: ApprovalChain = {
    ...approvalChain,
    steps: approvalChain.steps.map((step, idx) => {
      if (idx !== currentApproverIndex) {
        return step;
      }
      return {
        ...step,
        status: APPROVAL_STEP_STATUS.APPROVED,
        approvedById: actorUserId,
        approvedAt: new Date().toISOString(),
        overriddenBy: isOverride ? { userId: actorUserId, reason: reason!.trim() } : null,
      };
    }),
  };

  const isLastStep = currentApproverIndex >= nextChain.steps.length - 1;

  return {
    approvalChain: nextChain,
    currentApproverIndex: isLastStep ? currentApproverIndex : currentApproverIndex + 1,
    status: isLastStep ? 'APPROVED' : 'PENDING_APPROVAL',
    completed: isLastStep,
    isOverride,
    overriddenRole: isOverride ? currentRole : null,
  };
}

interface RejectStateParams {
  approvalChain: ApprovalChain;
  currentApproverIndex: number;
  status: string;
  actorRole: Role;
  actorUserId: string;
  reason: string;
}

export function rejectState({ approvalChain, currentApproverIndex, status, actorRole, actorUserId, reason }: RejectStateParams) {
  if (status !== 'PENDING_APPROVAL') {
    throw new Error('Purchase order is not pending approval');
  }

  if (!reason || !reason.trim()) {
    throw new Error('Rejection reason is required');
  }

  const currentRole = getCurrentApproverRole(approvalChain, currentApproverIndex);
  let approverIndex: number;
  let isOverride = false;

  if (actorRole === currentRole) {
    approverIndex = currentApproverIndex;
  } else if (actorRole === Role.ADMIN) {
    // ADMIN can reject on behalf of whichever role is currently pending.
    approverIndex = currentApproverIndex;
    isOverride = true;
  } else {
    approverIndex = approvalChain.steps.findIndex((step) => step.role === actorRole);
    if (approverIndex === -1) {
      throw new Error('You are not in the approval chain');
    }
  }

  const nextChain: ApprovalChain = {
    ...approvalChain,
    steps: approvalChain.steps.map((step, idx) => {
      if (idx !== approverIndex) {
        return step;
      }
      return {
        ...step,
        status: APPROVAL_STEP_STATUS.REJECTED,
        approvedById: actorUserId,
        approvedAt: new Date().toISOString(),
        overriddenBy: isOverride ? { userId: actorUserId, reason: reason.trim() } : null,
      };
    }),
    rejectedReason: reason.trim(),
    rejectedById: actorUserId,
    rejectedByRole: actorRole,
    rejectedAt: new Date().toISOString(),
  };

  return {
    approvalChain: nextChain,
    status: 'REJECTED',
    isOverride,
    overriddenRole: isOverride ? currentRole : null,
  };
}

export function toApprovalProgress(approvalChain: any, currentApproverIndex: number, poStatus: string) {
  if (!approvalChain || !Array.isArray(approvalChain.steps)) {
    return [];
  }

  return approvalChain.steps.map((step: any, idx: number) => {
    const pending = poStatus === 'PENDING_APPROVAL' && idx === currentApproverIndex;
    
    const stepNumber = typeof step.step === 'number' ? step.step : (idx + 1);
    let mappedStatus = step.status;
    if (!mappedStatus) {
      if (step.approved === true) mappedStatus = APPROVAL_STEP_STATUS.APPROVED;
      else if (poStatus === 'REJECTED' && idx === currentApproverIndex) mappedStatus = APPROVAL_STEP_STATUS.REJECTED;
      else mappedStatus = APPROVAL_STEP_STATUS.PENDING;
    }

    return {
      ...step,
      step: stepNumber,
      status: mappedStatus,
      isCurrent: pending,
    };
  });
}
