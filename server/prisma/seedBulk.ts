import 'dotenv/config';
import bcrypt from 'bcrypt';
import { ContractStatus, InvoiceStatus, POStatus, Role, VendorStatus } from '@prisma/client';
import { prisma } from '../src/config/prisma';

const ADMIN_EMAIL = 'admin@demo.com';
const PROCUREMENT_EMAIL = 'procure@demo.com';
const FINANCE_EMAIL = 'finance@demo.com';
const MANAGER_EMAIL = 'manager@demo.com';
const VENDOR_EMAIL = 'vendor@demo.com';

const PASSWORDS = {
  admin: 'Admin123',
  procurement: 'Proc123',
  finance: 'Fin123',
  manager: 'Mgr123',
  vendor: 'Vend123',
} as const;

const VENDOR_COUNT = 90;
const PO_COUNT = 280;
const NOTIFICATION_COUNT = 900;
const AUDIT_LOG_COUNT = 1200;

function pick<T>(items: T[], index: number): T {
  return items[index % items.length] as T;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function buildItems(seed: number) {
  const lineCount = (seed % 4) + 1;
  const items: Array<{ description: string; quantity: number; unitPrice: number; lineTotal: number }> = [];

  for (let i = 0; i < lineCount; i += 1) {
    const quantity = ((seed + i) % 8) + 2;
    const unitPrice = ((seed * 137 + i * 97) % 18000) + 500;
    items.push({
      description: `Line Item ${seed}-${i + 1}`,
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice,
    });
  }

  return items;
}

async function ensureBaseUsers() {
  const [adminPassword, procurementPassword, financePassword, managerPassword, vendorPassword] = await Promise.all([
    bcrypt.hash(PASSWORDS.admin, 10),
    bcrypt.hash(PASSWORDS.procurement, 10),
    bcrypt.hash(PASSWORDS.finance, 10),
    bcrypt.hash(PASSWORDS.manager, 10),
    bcrypt.hash(PASSWORDS.vendor, 10),
  ]);

  const company = await prisma.company.upsert({
    where: { id: 'demo-company-main' },
    update: {
      name: 'Demo Operations Pvt Ltd',
      address: 'Andheri East, Mumbai',
      gstin: '27ABCDE1234F1Z5',
    },
    create: {
      id: 'demo-company-main',
      name: 'Demo Operations Pvt Ltd',
      address: 'Andheri East, Mumbai',
      gstin: '27ABCDE1234F1Z5',
    },
  });

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: { name: 'Demo Admin', password: adminPassword, role: Role.ADMIN, companyId: company.id },
      create: { name: 'Demo Admin', email: ADMIN_EMAIL, password: adminPassword, role: Role.ADMIN, companyId: company.id },
    }),
    prisma.user.upsert({
      where: { email: PROCUREMENT_EMAIL },
      update: { name: 'Demo Procurement', password: procurementPassword, role: Role.PROCUREMENT, companyId: company.id },
      create: { name: 'Demo Procurement', email: PROCUREMENT_EMAIL, password: procurementPassword, role: Role.PROCUREMENT, companyId: company.id },
    }),
    prisma.user.upsert({
      where: { email: FINANCE_EMAIL },
      update: { name: 'Demo Finance', password: financePassword, role: Role.FINANCE, companyId: company.id },
      create: { name: 'Demo Finance', email: FINANCE_EMAIL, password: financePassword, role: Role.FINANCE, companyId: company.id },
    }),
    prisma.user.upsert({
      where: { email: MANAGER_EMAIL },
      update: { name: 'Demo Manager', password: managerPassword, role: Role.MANAGER, companyId: company.id },
      create: { name: 'Demo Manager', email: MANAGER_EMAIL, password: managerPassword, role: Role.MANAGER, companyId: company.id },
    }),
    prisma.user.upsert({
      where: { email: VENDOR_EMAIL },
      update: { name: 'Vendor One User', password: vendorPassword, role: Role.VENDOR, companyId: null },
      create: { name: 'Vendor One User', email: VENDOR_EMAIL, password: vendorPassword, role: Role.VENDOR, companyId: null },
    }),
  ]);

  return {
    admin: users[0],
    procurement: users[1],
    finance: users[2],
    manager: users[3],
  };
}

async function main() {
  const users = await ensureBaseUsers();

  // Cleanup previously generated BULK dataset to keep runs deterministic.
  await prisma.notification.deleteMany({
    where: { message: { startsWith: '[BULK]' } },
  });
  await prisma.auditLog.deleteMany({
    where: { action: { startsWith: 'BULK_' } },
  });
  await prisma.invoice.deleteMany({
    where: { invoiceNumber: { startsWith: 'BULK-INV-' } },
  });
  await prisma.purchaseOrder.deleteMany({
    where: { poNumber: { startsWith: 'BULK-PO-' } },
  });
  await prisma.contract.deleteMany({
    where: { title: { startsWith: 'Bulk Contract ' } },
  });
  await prisma.vendor.deleteMany({
    where: { email: { startsWith: 'bulk.vendor.' } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: 'bulk.vendor.' } },
  });

  const vendorRows = Array.from({ length: VENDOR_COUNT }).map((_, i) => {
    const index = i + 1;
    const status = pick([VendorStatus.PENDING, VendorStatus.VERIFIED, VendorStatus.REJECTED], i);
    const score = Number(((i % 5) + 0.2 * (i % 4)).toFixed(1));

    return {
      companyName: `Bulk Vendor ${String(index).padStart(3, '0')}`,
      contactName: `Contact ${String(index).padStart(3, '0')}`,
      email: `bulk.vendor.${String(index).padStart(3, '0')}@demo.com`,
      phone: `+9198${String(10000000 + index).slice(-8)}`,
      status,
      performanceScore: score,
      documents: [
        {
          name: `bulk-doc-${index}.pdf`,
          url: `http://localhost:5000/uploads/vendors/bulk-doc-${index}.pdf`,
          mimetype: 'application/pdf',
          size: 1024 + index,
        },
      ],
    };
  });

  await prisma.vendor.createMany({ data: vendorRows });

  const bulkVendors = await prisma.vendor.findMany({
    where: { email: { startsWith: 'bulk.vendor.' } },
    orderBy: { email: 'asc' },
  });

  const vendorUserPassword = await bcrypt.hash(PASSWORDS.vendor, 10);
  await prisma.user.createMany({
    data: bulkVendors.slice(0, 30).map((v) => ({
      name: `${v.companyName} User`,
      email: v.email,
      password: vendorUserPassword,
      role: Role.VENDOR,
      companyId: null,
    })),
    skipDuplicates: true,
  });

  const contractRows: Array<{
    vendorId: string;
    title: string;
    startDate: Date;
    endDate: Date;
    fileUrl: string;
    status: ContractStatus;
  }> = [];

  bulkVendors.forEach((vendor, idx) => {
    const statusCycle = idx % 4;
    if (statusCycle === 0) {
      contractRows.push({
        vendorId: vendor.id,
        title: `Bulk Contract Active ${vendor.companyName}`,
        startDate: daysFromNow(-30),
        endDate: daysFromNow(160),
        fileUrl: `http://localhost:5000/uploads/contracts/${vendor.id}-active.pdf`,
        status: ContractStatus.ACTIVE,
      });
    } else if (statusCycle === 1) {
      contractRows.push({
        vendorId: vendor.id,
        title: `Bulk Contract Expiring Soon ${vendor.companyName}`,
        startDate: daysFromNow(-180),
        endDate: daysFromNow(12),
        fileUrl: `http://localhost:5000/uploads/contracts/${vendor.id}-soon.pdf`,
        status: ContractStatus.ACTIVE,
      });
    } else if (statusCycle === 2) {
      contractRows.push({
        vendorId: vendor.id,
        title: `Bulk Contract Expired ${vendor.companyName}`,
        startDate: daysFromNow(-220),
        endDate: daysFromNow(-9),
        fileUrl: `http://localhost:5000/uploads/contracts/${vendor.id}-expired.pdf`,
        status: ContractStatus.EXPIRED,
      });
    } else {
      contractRows.push({
        vendorId: vendor.id,
        title: `Bulk Contract Terminated ${vendor.companyName}`,
        startDate: daysFromNow(-120),
        endDate: daysFromNow(70),
        fileUrl: `http://localhost:5000/uploads/contracts/${vendor.id}-terminated.pdf`,
        status: ContractStatus.TERMINATED,
      });
    }
  });

  await prisma.contract.createMany({ data: contractRows });

  const poRows: Array<{
    poNumber: string;
    vendorId: string;
    createdById: string;
    status: POStatus;
    items: unknown;
    totalAmount: number;
    approvalChain: unknown;
    currentApproverIndex: number;
    createdAt: Date;
  }> = [];

  for (let i = 0; i < PO_COUNT; i += 1) {
    const vendor = bulkVendors[i % bulkVendors.length] as (typeof bulkVendors)[number];
    const status = pick([POStatus.DRAFT, POStatus.PENDING_APPROVAL, POStatus.APPROVED, POStatus.REJECTED, POStatus.CLOSED], i);
    const items = buildItems(i + 1);
    const totalAmount = items.reduce((sum, line) => sum + line.lineTotal, 0);

    let approvalChain: unknown = {
      steps: [
        { role: 'MANAGER', approved: false, approvedById: null, approvedAt: null },
        { role: 'FINANCE', approved: false, approvedById: null, approvedAt: null },
        { role: 'ADMIN', approved: false, approvedById: null, approvedAt: null },
      ],
    };
    let currentApproverIndex = 0;

    if (status === POStatus.PENDING_APPROVAL) {
      currentApproverIndex = i % 3;
      approvalChain = {
        steps: [
          { role: 'MANAGER', approved: currentApproverIndex > 0, approvedById: currentApproverIndex > 0 ? users.manager.id : null, approvedAt: currentApproverIndex > 0 ? new Date().toISOString() : null },
          { role: 'FINANCE', approved: currentApproverIndex > 1, approvedById: currentApproverIndex > 1 ? users.finance.id : null, approvedAt: currentApproverIndex > 1 ? new Date().toISOString() : null },
          { role: 'ADMIN', approved: false, approvedById: null, approvedAt: null },
        ],
      };
    }

    if (status === POStatus.APPROVED || status === POStatus.CLOSED) {
      currentApproverIndex = 2;
      approvalChain = {
        steps: [
          { role: 'MANAGER', approved: true, approvedById: users.manager.id, approvedAt: new Date().toISOString() },
          { role: 'FINANCE', approved: true, approvedById: users.finance.id, approvedAt: new Date().toISOString() },
          { role: 'ADMIN', approved: true, approvedById: users.admin.id, approvedAt: new Date().toISOString() },
        ],
      };
    }

    if (status === POStatus.REJECTED) {
      currentApproverIndex = 1;
      approvalChain = {
        steps: [
          { role: 'MANAGER', approved: true, approvedById: users.manager.id, approvedAt: new Date().toISOString() },
          { role: 'FINANCE', approved: false, approvedById: null, approvedAt: null },
          { role: 'ADMIN', approved: false, approvedById: null, approvedAt: null },
        ],
        rejectedReason: `Auto rejection reason ${i + 1}`,
        rejectedById: users.finance.id,
        rejectedByRole: 'FINANCE',
        rejectedAt: new Date().toISOString(),
      };
    }

    poRows.push({
      poNumber: `BULK-PO-${String(i + 1).padStart(5, '0')}`,
      vendorId: vendor.id,
      createdById: users.procurement.id,
      status,
      items,
      totalAmount,
      approvalChain,
      currentApproverIndex,
      createdAt: daysFromNow(-((i % 120) + 1)),
    });
  }

  await prisma.purchaseOrder.createMany({ data: poRows });

  const createdPOs = await prisma.purchaseOrder.findMany({
    where: { poNumber: { startsWith: 'BULK-PO-' } },
    orderBy: { poNumber: 'asc' },
  });

  const invoiceRows: Array<{
    invoiceNumber: string;
    poId: string;
    vendorId: string;
    amount: number;
    status: InvoiceStatus;
    fileUrl: string;
    submittedAt: Date;
  }> = [];

  let invoiceIndex = 1;

  createdPOs.forEach((po, i) => {
    if (![POStatus.APPROVED, POStatus.CLOSED, POStatus.PENDING_APPROVAL].includes(po.status)) {
      return;
    }

    const invoiceStatus = pick([
      InvoiceStatus.SUBMITTED,
      InvoiceStatus.MATCHED,
      InvoiceStatus.MISMATCHED,
      InvoiceStatus.APPROVED,
      InvoiceStatus.PAID,
    ], invoiceIndex - 1);

    let amount = po.totalAmount;
    if (invoiceStatus === InvoiceStatus.MISMATCHED) {
      amount = Number((po.totalAmount * 0.92).toFixed(2));
    }

    invoiceRows.push({
      invoiceNumber: `BULK-INV-${String(invoiceIndex).padStart(5, '0')}`,
      poId: po.id,
      vendorId: po.vendorId,
      amount,
      status: invoiceStatus,
      fileUrl: `http://localhost:5000/uploads/invoices/bulk-invoice-${invoiceIndex}.pdf`,
      submittedAt: daysFromNow(-(i % 80)),
    });

    invoiceIndex += 1;
  });

  await prisma.invoice.createMany({ data: invoiceRows });

  const coreUsers = await prisma.user.findMany({
    where: { email: { in: [ADMIN_EMAIL, PROCUREMENT_EMAIL, FINANCE_EMAIL, MANAGER_EMAIL, VENDOR_EMAIL] } },
    select: { id: true, role: true },
  });

  await prisma.notification.createMany({
    data: Array.from({ length: NOTIFICATION_COUNT }).map((_, i) => {
      const user = coreUsers[i % coreUsers.length] as (typeof coreUsers)[number];
      return {
        userId: user.id,
        message: `[BULK] Notification ${i + 1} for ${user.role}`,
        read: i % 3 === 0,
        createdAt: daysFromNow(-(i % 45)),
      };
    }),
  });

  const entityCycle = ['Vendor', 'Contract', 'PurchaseOrder', 'Invoice'];
  const actionCycle = ['BULK_CREATE', 'BULK_UPDATE_STATUS', 'BULK_APPROVE', 'BULK_REJECT', 'BULK_PAY'];

  await prisma.auditLog.createMany({
    data: Array.from({ length: AUDIT_LOG_COUNT }).map((_, i) => {
      const actor = coreUsers[i % coreUsers.length] as (typeof coreUsers)[number];
      return {
        userId: actor.id,
        action: pick(actionCycle, i),
        entity: pick(entityCycle, i),
        entityId: `bulk-${pick(entityCycle, i).toLowerCase()}-${(i % 500) + 1}`,
        metadata: {
          scenario: `bulk-${i + 1}`,
          actorRole: actor.role,
          batch: 'BULK_SEED',
        },
        createdAt: daysFromNow(-(i % 90)),
      };
    }),
  });

  const [vendorCount, poCount, invoiceCount, contractCount, notificationCount, auditCount] = await Promise.all([
    prisma.vendor.count(),
    prisma.purchaseOrder.count(),
    prisma.invoice.count(),
    prisma.contract.count(),
    prisma.notification.count(),
    prisma.auditLog.count(),
  ]);

  console.log('Bulk scenario seed completed.');
  console.log(`Vendors: ${vendorCount}`);
  console.log(`POs: ${poCount}`);
  console.log(`Invoices: ${invoiceCount}`);
  console.log(`Contracts: ${contractCount}`);
  console.log(`Notifications: ${notificationCount}`);
  console.log(`Audit logs: ${auditCount}`);
}

main()
  .catch((error) => {
    console.error('Bulk seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
