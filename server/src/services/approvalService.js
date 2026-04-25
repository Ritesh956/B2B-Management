const APPROVAL_STEP_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

function getApprovalRoles(totalAmount) {
  if (totalAmount > 500000) {
    return ['MANAGER', 'FINANCE', 'ADMIN'];
  }
  if (totalAmount > 50000) {
    return ['MANAGER', 'FINANCE'];
  }
  return ['MANAGER'];
}

function createApprovalChain(totalAmount) {
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

function getCurrentApproverRole(chain, currentApproverIndex) {
  return chain?.steps?.[currentApproverIndex]?.role ?? null;
}

function isCurrentApprover(chain, currentApproverIndex, actorRole) {
  return getCurrentApproverRole(chain, currentApproverIndex) === actorRole;
}

function approveState({ approvalChain, currentApproverIndex, status, actorRole, actorUserId }) {
  if (status !== 'PENDING_APPROVAL') {
    throw new Error('Purchase order is not pending approval');
  }

  if (!isCurrentApprover(approvalChain, currentApproverIndex, actorRole)) {
    throw new Error('You are not the current approver');
  }

  const nextChain = {
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
      };
    }),
  };

  const isLastStep = currentApproverIndex >= nextChain.steps.length - 1;

  return {
    approvalChain: nextChain,
    currentApproverIndex: isLastStep ? currentApproverIndex : currentApproverIndex + 1,
    status: isLastStep ? 'APPROVED' : 'PENDING_APPROVAL',
    completed: isLastStep,
  };
}

function rejectState({ approvalChain, status, actorRole, actorUserId, reason }) {
  if (status !== 'PENDING_APPROVAL') {
    throw new Error('Purchase order is not pending approval');
  }

  if (!reason || !reason.trim()) {
    throw new Error('Rejection reason is required');
  }

  const approverIndex = approvalChain.steps.findIndex((step) => step.role === actorRole);
  if (approverIndex === -1) {
    throw new Error('You are not in the approval chain');
  }

  const nextChain = {
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
  };
}

function toApprovalProgress(approvalChain, currentApproverIndex, poStatus) {
  if (!approvalChain || !Array.isArray(approvalChain.steps)) {
    return [];
  }

  return approvalChain.steps.map((step, idx) => {
    const pending = poStatus === 'PENDING_APPROVAL' && idx === currentApproverIndex;
    return {
      ...step,
      isCurrent: pending,
    };
  });
}

module.exports = {
  APPROVAL_STEP_STATUS,
  getApprovalRoles,
  createApprovalChain,
  getCurrentApproverRole,
  isCurrentApprover,
  approveState,
  rejectState,
  toApprovalProgress,
};
