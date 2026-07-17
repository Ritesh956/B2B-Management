import { describe, it, expect } from 'vitest';
import { Role } from '@prisma/client';
import { createApprovalChain, approveState, rejectState } from '../src/services/approvalService';

describe('approvalService', () => {
  describe('approveState', () => {
    it('lets the current approver approve and advances the chain', () => {
      const chain = createApprovalChain(600000); // MANAGER -> FINANCE -> ADMIN
      const result = approveState({
        approvalChain: chain,
        currentApproverIndex: 0,
        status: 'PENDING_APPROVAL',
        actorRole: Role.MANAGER,
        actorUserId: 'manager-1',
      });
      expect(result.status).toBe('PENDING_APPROVAL');
      expect(result.currentApproverIndex).toBe(1);
      expect(result.isOverride).toBe(false);
      expect(result.approvalChain.steps[0].status).toBe('APPROVED');
      expect(result.approvalChain.steps[0].overriddenBy).toBeNull();
    });

    it('rejects an approve attempt from a role that is not the current approver', () => {
      const chain = createApprovalChain(600000);
      expect(() =>
        approveState({
          approvalChain: chain,
          currentApproverIndex: 0,
          status: 'PENDING_APPROVAL',
          actorRole: Role.FINANCE,
          actorUserId: 'finance-1',
        })
      ).toThrow('You are not the current approver');
    });

    it('requires a reason when ADMIN approves on behalf of a different assigned role', () => {
      const chain = createApprovalChain(600000); // current step is MANAGER
      expect(() =>
        approveState({
          approvalChain: chain,
          currentApproverIndex: 0,
          status: 'PENDING_APPROVAL',
          actorRole: Role.ADMIN,
          actorUserId: 'admin-1',
        })
      ).toThrow('A reason is required to approve on behalf of the assigned approver');
    });

    it('lets ADMIN override the current MANAGER step with a reason', () => {
      const chain = createApprovalChain(600000);
      const result = approveState({
        approvalChain: chain,
        currentApproverIndex: 0,
        status: 'PENDING_APPROVAL',
        actorRole: Role.ADMIN,
        actorUserId: 'admin-1',
        reason: 'Manager is on leave',
      });
      expect(result.isOverride).toBe(true);
      expect(result.overriddenRole).toBe(Role.MANAGER);
      expect(result.currentApproverIndex).toBe(1);
      expect(result.approvalChain.steps[0]).toMatchObject({
        status: 'APPROVED',
        approvedById: 'admin-1',
        overriddenBy: { userId: 'admin-1', reason: 'Manager is on leave' },
      });
    });

    it('does not treat ADMIN as an override when it is naturally their turn (last step of the high tier)', () => {
      const chain = createApprovalChain(600000); // MANAGER -> FINANCE -> ADMIN
      const result = approveState({
        approvalChain: chain,
        currentApproverIndex: 2,
        status: 'PENDING_APPROVAL',
        actorRole: Role.ADMIN,
        actorUserId: 'admin-1',
      });
      expect(result.isOverride).toBe(false);
      expect(result.completed).toBe(true);
      expect(result.status).toBe('APPROVED');
      expect(result.approvalChain.steps[2].overriddenBy).toBeNull();
    });
  });

  describe('rejectState', () => {
    it('lets the current approver reject with a reason', () => {
      const chain = createApprovalChain(600000);
      const result = rejectState({
        approvalChain: chain,
        currentApproverIndex: 0,
        status: 'PENDING_APPROVAL',
        actorRole: Role.MANAGER,
        actorUserId: 'manager-1',
        reason: 'Budget mismatch',
      });
      expect(result.status).toBe('REJECTED');
      expect(result.isOverride).toBe(false);
      expect(result.approvalChain.steps[0].status).toBe('REJECTED');
    });

    it('requires a reason regardless of who is rejecting', () => {
      const chain = createApprovalChain(600000);
      expect(() =>
        rejectState({
          approvalChain: chain,
          currentApproverIndex: 0,
          status: 'PENDING_APPROVAL',
          actorRole: Role.MANAGER,
          actorUserId: 'manager-1',
          reason: '   ',
        })
      ).toThrow('Rejection reason is required');
    });

    it('lets ADMIN reject on behalf of the currently pending role', () => {
      const chain = createApprovalChain(600000); // current step is MANAGER
      const result = rejectState({
        approvalChain: chain,
        currentApproverIndex: 0,
        status: 'PENDING_APPROVAL',
        actorRole: Role.ADMIN,
        actorUserId: 'admin-1',
        reason: 'Vendor flagged for compliance review',
      });
      expect(result.status).toBe('REJECTED');
      expect(result.isOverride).toBe(true);
      expect(result.overriddenRole).toBe(Role.MANAGER);
      expect(result.approvalChain.steps[0]).toMatchObject({
        status: 'REJECTED',
        approvedById: 'admin-1',
        overriddenBy: { userId: 'admin-1', reason: 'Vendor flagged for compliance review' },
      });
    });

    it('rejects a role with no step in the chain and no admin override', () => {
      const chain = createApprovalChain(30000); // MANAGER only tier
      expect(() =>
        rejectState({
          approvalChain: chain,
          currentApproverIndex: 0,
          status: 'PENDING_APPROVAL',
          actorRole: Role.FINANCE,
          actorUserId: 'finance-1',
          reason: 'Not applicable',
        })
      ).toThrow('You are not in the approval chain');
    });
  });
});
