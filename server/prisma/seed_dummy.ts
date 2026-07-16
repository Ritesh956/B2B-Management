import 'dotenv/config';
import { VendorStatus, ContractStatus, POStatus } from '@prisma/client';
import { prisma } from '../src/config/prisma';

async function main() {
  console.log('Fetching an admin/procurement user...');
  let user = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'PROCUREMENT'] } }
  });

  if (!user) {
    console.log('No user found, creating a dummy admin user...');
    user = await prisma.user.create({
      data: {
        name: 'Dummy Admin',
        email: 'dummyadmin@demo.com',
        password: 'hashedpassword',
        role: 'ADMIN',
      }
    });
  }

  console.log('Creating 5 dummy vendors...');
  const vendors = [];
  for (let i = 1; i <= 5; i++) {
    const vendor = await prisma.vendor.create({
      data: {
        companyName: `Global Supplies Partner ${i}`,
        contactName: `John Doe ${i}`,
        email: `partner${i}@globalsupplies.com`,
        phone: `+91 98000 0000${i}`,
        status: i % 2 === 0 ? VendorStatus.VERIFIED : VendorStatus.PENDING,
        performanceScore: 50 + i * 10,
      }
    });
    vendors.push(vendor);
  }

  console.log('Creating 5 dummy contracts...');
  for (let i = 0; i < 5; i++) {
    const vendor = vendors[i];
    await prisma.contract.create({
      data: {
        vendorId: vendor.id,
        title: `Annual Master Service Agreement 2026 - ${vendor.companyName}`,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        status: ContractStatus.ACTIVE,
      }
    });
  }

  console.log('Creating 5 dummy purchase orders...');
  for (let i = 0; i < 5; i++) {
    const vendor = vendors[i];
    const items = [
      { description: `High Grade Material A`, quantity: 10 * (i + 1), unitPrice: 150.5, lineTotal: 10 * (i + 1) * 150.5 },
      { description: `Logistics Fees`, quantity: 1, unitPrice: 500, lineTotal: 500 }
    ];
    const totalAmount = items.reduce((acc, item) => acc + item.lineTotal, 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-2026-${1000 + i}`,
        vendorId: vendor.id,
        createdById: user.id,
        status: i === 0 ? POStatus.APPROVED : POStatus.PENDING_APPROVAL,
        items,
        totalAmount,
      }
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-${1000 + i}`,
        po: { connect: { id: po.id } },
        vendor: { connect: { id: vendor.id } },
        amount: totalAmount,
        status: i === 0 ? 'MATCHED' : 'SUBMITTED',
        submittedAt: new Date(),
      }
    });
  }

  console.log('Dummy data successfully seeded.');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
