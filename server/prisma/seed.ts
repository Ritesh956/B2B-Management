import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from '../src/config/prisma';

const DEMO_PASSWORDS = {
  admin: 'Admin123',
  procurement: 'Proc123',
  finance: 'Fin123',
  manager: 'Mgr123',
  vendor: 'Vend123',
} as const;

async function main() {
  const [adminPassword, procurementPassword, financePassword, managerPassword, vendorPassword] = await Promise.all([
    bcrypt.hash(DEMO_PASSWORDS.admin, 10),
    bcrypt.hash(DEMO_PASSWORDS.procurement, 10),
    bcrypt.hash(DEMO_PASSWORDS.finance, 10),
    bcrypt.hash(DEMO_PASSWORDS.manager, 10),
    bcrypt.hash(DEMO_PASSWORDS.vendor, 10),
  ]);

  console.log('Cleaning up old data...');
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});
  console.log('Database cleared.');

  console.log('Seeding demo data...');
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
      where: { email: 'admin@demo.com' },
      update: { name: 'Demo Admin', password: adminPassword, role: Role.ADMIN, companyId: company.id },
      create: { name: 'Demo Admin', email: 'admin@demo.com', password: adminPassword, role: Role.ADMIN, companyId: company.id },
    }),
    prisma.user.upsert({
      where: { email: 'finance@demo.com' },
      update: { name: 'Demo Finance', password: financePassword, role: Role.FINANCE, companyId: company.id },
      create: { name: 'Demo Finance', email: 'finance@demo.com', password: financePassword, role: Role.FINANCE, companyId: company.id },
    }),
    prisma.user.upsert({
      where: { email: 'procure@demo.com' },
      update: { name: 'Demo Procurement', password: procurementPassword, role: Role.PROCUREMENT, companyId: company.id },
      create: { name: 'Demo Procurement', email: 'procure@demo.com', password: procurementPassword, role: Role.PROCUREMENT, companyId: company.id },
    }),
    prisma.user.upsert({
      where: { email: 'manager@demo.com' },
      update: { name: 'Demo Manager', password: managerPassword, role: Role.MANAGER, companyId: company.id },
      create: { name: 'Demo Manager', email: 'manager@demo.com', password: managerPassword, role: Role.MANAGER, companyId: company.id },
    }),
    prisma.user.upsert({
      where: { email: 'vendor@demo.com' },
      update: { name: 'Vendor One User', password: vendorPassword, role: Role.VENDOR, companyId: null },
      create: { name: 'Vendor One User', email: 'vendor@demo.com', password: vendorPassword, role: Role.VENDOR, companyId: null },
    }),
    prisma.user.upsert({
      where: { email: 'vendor2@demo.com' },
      update: { name: 'Vendor Two User', password: vendorPassword, role: Role.VENDOR, companyId: null },
      create: { name: 'Vendor Two User', email: 'vendor2@demo.com', password: vendorPassword, role: Role.VENDOR, companyId: null },
    }),
  ]);

  const [adminUser, financeUser, procurementUser, managerUser, vendorUser1] = users;

  const vendor1 = await prisma.vendor.upsert({
    where: { email: 'vendor@demo.com' },
    update: {
      companyName: 'Alpha Industrial Supplies',
      contactName: 'Ravi Sharma',
      email: 'vendor@demo.com',
      phone: '+919900000101',
      status: 'VERIFIED',
      performanceScore: 4.6,
    },
    create: {
      companyName: 'Alpha Industrial Supplies',
      contactName: 'Ravi Sharma',
      email: 'vendor@demo.com',
      phone: '+919900000101',
      status: 'VERIFIED',
      performanceScore: 4.6,
      documents: [{ name: 'KYC.pdf', url: 'https://example.com/kyc.pdf' }],
    },
  });

  const vendor2 = await prisma.vendor.upsert({
    where: { email: 'vendor2@demo.com' },
    update: {
      companyName: 'Beta Logistics Partners',
      contactName: 'Sneha Patel',
      email: 'vendor2@demo.com',
      phone: '+919900000202',
      status: 'VERIFIED',
      performanceScore: 4.2,
    },
    create: {
      companyName: 'Beta Logistics Partners',
      contactName: 'Sneha Patel',
      email: 'vendor2@demo.com',
      phone: '+919900000202',
      status: 'VERIFIED',
      performanceScore: 4.2,
      documents: [{ name: 'MSME.pdf', url: 'https://example.com/msme.pdf' }],
    },
  });



  const today = new Date();
  const in20Days = new Date(today);
  in20Days.setDate(today.getDate() + 20);
  const in120Days = new Date(today);
  in120Days.setDate(today.getDate() + 120);
  const past15Days = new Date(today);
  past15Days.setDate(today.getDate() - 15);

  await prisma.contract.createMany({
    data: [
      {
        vendorId: vendor1.id,
        title: 'Demo Contract - Alpha Annual Supply',
        startDate: today,
        endDate: in120Days,
        fileUrl: 'https://example.com/contracts/alpha-annual.pdf',
        status: 'ACTIVE',
      },
      {
        vendorId: vendor2.id,
        title: 'Demo Contract - Beta Logistics Support',
        startDate: today,
        endDate: in20Days,
        fileUrl: 'https://example.com/contracts/beta-logistics.pdf',
        status: 'ACTIVE',
      },
      {
        vendorId: vendor1.id,
        title: 'Demo Contract - Alpha Legacy',
        startDate: new Date(today.getFullYear(), today.getMonth() - 4, 1),
        endDate: past15Days,
        fileUrl: 'https://example.com/contracts/alpha-legacy.pdf',
        status: 'EXPIRED',
      },
    ],
  });

  const poApproved = await prisma.purchaseOrder.upsert({
    where: { poNumber: 'DEMO-PO-0001' },
    update: {
      vendorId: vendor1.id,
      createdById: procurementUser.id,
      status: 'APPROVED',
      items: [
        { description: 'Industrial Lubricant', quantity: 40, unitPrice: 2500, lineTotal: 100000 },
      ],
      totalAmount: 100000,
      currentApproverIndex: 2,
      approvalChain: {
        steps: [
          { role: 'MANAGER', approved: true, approvedById: managerUser.id, approvedAt: today.toISOString() },
          { role: 'FINANCE', approved: true, approvedById: financeUser.id, approvedAt: today.toISOString() },
          { role: 'ADMIN', approved: true, approvedById: adminUser.id, approvedAt: today.toISOString() },
        ],
      } as any,
    },
    create: {
      poNumber: 'DEMO-PO-0001',
      vendorId: vendor1.id,
      createdById: procurementUser.id,
      status: 'APPROVED',
      items: [
        { description: 'Industrial Lubricant', quantity: 40, unitPrice: 2500, lineTotal: 100000 },
      ] as any,
      totalAmount: 100000,
      currentApproverIndex: 2,
      approvalChain: {
        steps: [
          { role: 'MANAGER', approved: true, approvedById: managerUser.id, approvedAt: today.toISOString() },
          { role: 'FINANCE', approved: true, approvedById: financeUser.id, approvedAt: today.toISOString() },
          { role: 'ADMIN', approved: true, approvedById: adminUser.id, approvedAt: today.toISOString() },
        ],
      } as any,
    },
  });

  const poPending = await prisma.purchaseOrder.upsert({
    where: { poNumber: 'DEMO-PO-0002' },
    update: {
      vendorId: vendor2.id,
      createdById: procurementUser.id,
      status: 'PENDING_APPROVAL',
      items: [
        { description: 'Freight Charges Q2', quantity: 1, unitPrice: 650000, lineTotal: 650000 },
      ],
      totalAmount: 650000,
      currentApproverIndex: 1,
      approvalChain: {
        steps: [
          { role: 'MANAGER', approved: true, approvedById: managerUser.id, approvedAt: today.toISOString() },
          { role: 'FINANCE', approved: false, approvedById: null, approvedAt: null },
          { role: 'ADMIN', approved: false, approvedById: null, approvedAt: null },
        ],
      } as any,
    },
    create: {
      poNumber: 'DEMO-PO-0002',
      vendorId: vendor2.id,
      createdById: procurementUser.id,
      status: 'PENDING_APPROVAL',
      items: [
        { description: 'Freight Charges Q2', quantity: 1, unitPrice: 650000, lineTotal: 650000 },
      ] as any,
      totalAmount: 650000,
      currentApproverIndex: 1,
      approvalChain: {
        steps: [
          { role: 'MANAGER', approved: true, approvedById: managerUser.id, approvedAt: today.toISOString() },
          { role: 'FINANCE', approved: false, approvedById: null, approvedAt: null },
          { role: 'ADMIN', approved: false, approvedById: null, approvedAt: null },
        ],
      } as any,
    },
  });

  const poRejected = await prisma.purchaseOrder.upsert({
    where: { poNumber: 'DEMO-PO-0003' },
    update: {
      vendorId: vendor1.id,
      createdById: procurementUser.id,
      status: 'REJECTED',
      items: [
        { description: 'Safety Gear Batch', quantity: 25, unitPrice: 1800, lineTotal: 45000 },
      ],
      totalAmount: 45000,
      currentApproverIndex: 0,
      approvalChain: {
        steps: [{ role: 'MANAGER', approved: false, approvedById: null, approvedAt: null }],
        rejectedReason: 'Budget not aligned with current quarter plan',
        rejectedById: managerUser.id,
        rejectedByRole: 'MANAGER',
        rejectedAt: today.toISOString(),
      } as any,
    },
    create: {
      poNumber: 'DEMO-PO-0003',
      vendorId: vendor1.id,
      createdById: procurementUser.id,
      status: 'REJECTED',
      items: [
        { description: 'Safety Gear Batch', quantity: 25, unitPrice: 1800, lineTotal: 45000 },
      ] as any,
      totalAmount: 45000,
      currentApproverIndex: 0,
      approvalChain: {
        steps: [{ role: 'MANAGER', approved: false, approvedById: null, approvedAt: null }],
        rejectedReason: 'Budget not aligned with current quarter plan',
        rejectedById: managerUser.id,
        rejectedByRole: 'MANAGER',
        rejectedAt: today.toISOString(),
      } as any,
    },
  });

  await Promise.all([
    prisma.invoice.upsert({
      where: { invoiceNumber: 'DEMO-INV-0001' },
      update: {
        poId: poApproved.id,
        vendorId: vendor1.id,
        amount: poApproved.totalAmount,
        status: 'PAID',
        fileUrl: 'https://example.com/invoices/demo-inv-0001.pdf',
      },
      create: {
        invoiceNumber: 'DEMO-INV-0001',
        poId: poApproved.id,
        vendorId: vendor1.id,
        amount: poApproved.totalAmount,
        status: 'PAID',
        fileUrl: 'https://example.com/invoices/demo-inv-0001.pdf',
      },
    }),
    prisma.invoice.upsert({
      where: { invoiceNumber: 'DEMO-INV-0002' },
      update: {
        poId: poPending.id,
        vendorId: vendor2.id,
        amount: 640000,
        status: 'MISMATCHED',
        fileUrl: 'https://example.com/invoices/demo-inv-0002.pdf',
      },
      create: {
        invoiceNumber: 'DEMO-INV-0002',
        poId: poPending.id,
        vendorId: vendor2.id,
        amount: 640000,
        status: 'MISMATCHED',
        fileUrl: 'https://example.com/invoices/demo-inv-0002.pdf',
      },
    }),
    prisma.invoice.upsert({
      where: { invoiceNumber: 'DEMO-INV-0003' },
      update: {
        poId: poApproved.id,
        vendorId: vendor1.id,
        amount: poApproved.totalAmount,
        status: 'APPROVED',
        fileUrl: 'https://example.com/invoices/demo-inv-0003.pdf',
      },
      create: {
        invoiceNumber: 'DEMO-INV-0003',
        poId: poApproved.id,
        vendorId: vendor1.id,
        amount: poApproved.totalAmount,
        status: 'APPROVED',
        fileUrl: 'https://example.com/invoices/demo-inv-0003.pdf',
      },
    }),
  ]);

  await prisma.notification.createMany({
    data: [
      { userId: procurementUser.id, message: 'Demo: PO DEMO-PO-0001 approved and closed in approval workflow' },
      { userId: financeUser.id, message: 'Demo: Invoice DEMO-INV-0002 marked as MISMATCHED and pending review' },
      { userId: vendorUser1.id, message: 'Demo: Invoice DEMO-INV-0001 marked as PAID' },
      { userId: adminUser.id, message: 'Demo: Contract Beta Logistics Support expiring soon' },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: procurementUser.id,
        action: 'CREATE',
        entity: 'PurchaseOrder',
        entityId: poApproved.id,
        metadata: { poNumber: poApproved.poNumber, totalAmount: poApproved.totalAmount },
      },
      {
        userId: managerUser.id,
        action: 'APPROVE',
        entity: 'PurchaseOrder',
        entityId: poPending.id,
        metadata: { poNumber: poPending.poNumber, stage: 'MANAGER' },
      },
      {
        userId: managerUser.id,
        action: 'REJECT',
        entity: 'PurchaseOrder',
        entityId: poRejected.id,
        metadata: { poNumber: poRejected.poNumber, reason: 'Budget not aligned with current quarter plan' },
      },
      {
        userId: vendorUser1.id,
        action: 'SUBMIT',
        entity: 'Invoice',
        entityId: poApproved.id,
        metadata: { invoiceNumber: 'DEMO-INV-0001' },
      },
    ],
  });

  console.log('Demo data seeded successfully');
  console.log('Login credentials:');
  console.log(`admin@demo.com / ${DEMO_PASSWORDS.admin}`);
  console.log(`procure@demo.com / ${DEMO_PASSWORDS.procurement}`);
  console.log(`finance@demo.com / ${DEMO_PASSWORDS.finance}`);
  console.log(`manager@demo.com / ${DEMO_PASSWORDS.manager}`);
  console.log(`vendor@demo.com / ${DEMO_PASSWORDS.vendor}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });