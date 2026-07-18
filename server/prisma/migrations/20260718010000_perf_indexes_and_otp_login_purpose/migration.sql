-- Add OTP_LOGIN purpose so 2FA login codes can live in AuthToken instead of
-- an in-memory Map (which Render's free-tier sleep wiped mid-login).
ALTER TYPE "AuthTokenPurpose" ADD VALUE 'OTP_LOGIN';

-- Indexes for the columns every list/dashboard/report actually filters and
-- sorts on. Without these each of those queries is a sequential scan.
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

CREATE INDEX "Contract_status_endDate_idx" ON "Contract"("status", "endDate");

CREATE INDEX "Contract_endDate_idx" ON "Contract"("endDate");

CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

CREATE INDEX "PurchaseOrder_createdAt_idx" ON "PurchaseOrder"("createdAt");

CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

CREATE INDEX "Invoice_submittedAt_idx" ON "Invoice"("submittedAt");

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
