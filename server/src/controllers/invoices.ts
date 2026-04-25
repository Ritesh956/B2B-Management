import { Response } from 'express';
import { InvoiceStatus, POStatus, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';
import { enqueueEmail, enqueueNotification } from '../queues';
import { buildLocalFileUrl } from '../config/s3';

const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  const lastSequence = last?.invoiceNumber ? parseInt(last.invoiceNumber.split('-')[2] || '0', 10) : 0;
  const nextSequence = Number.isNaN(lastSequence) ? 1 : lastSequence + 1;

  return `${prefix}${String(nextSequence).padStart(4, '0')}`;
};

const mapInvoice = (invoice: any) => {
  const poTotal = invoice.po?.totalAmount ?? 0;
  const amountDiff = Number((invoice.amount - poTotal).toFixed(2));
  return {
    ...invoice,
    amountDiff,
  };
};

export const submitInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { poId, amount } = req.body as { poId: string; amount: string | number };
    const file = req.file as Express.Multer.File | undefined;

    if (!poId || amount === undefined || amount === null) {
      res.status(400).json({ error: 'poId and amount are required' });
      return;
    }

    if (!file) {
      res.status(400).json({ error: 'Invoice PDF is required' });
      return;
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: 'amount must be a positive number' });
      return;
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { vendor: true },
    });

    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    if (po.status !== POStatus.APPROVED) {
      res.status(400).json({ error: 'Invoice can be submitted only against an approved PO' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true, role: true },
    });

    if (!user || user.role !== Role.VENDOR) {
      res.status(403).json({ error: 'Only vendors can submit invoices' });
      return;
    }

    if (user.email !== po.vendor.email) {
      res.status(403).json({ error: 'You can submit invoices only for your own vendor purchase orders' });
      return;
    }

    const status = numericAmount === po.totalAmount ? InvoiceStatus.MATCHED : InvoiceStatus.MISMATCHED;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: await generateInvoiceNumber(),
        poId: po.id,
        vendorId: po.vendorId,
        amount: numericAmount,
        status,
        fileUrl: buildLocalFileUrl(file.path),
      },
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'SUBMIT',
        entity: 'Invoice',
        entityId: invoice.id,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          poId: po.id,
          amount: numericAmount,
          status,
        },
      },
    });

    const financeUsers = await prisma.user.findMany({
      where: { role: Role.FINANCE },
      select: { id: true, email: true },
    });

    if (financeUsers.length > 0) {
      await Promise.allSettled([
        enqueueEmail({
          to: financeUsers.map((u) => u.email).join(','),
          subject: `Invoice ${invoice.invoiceNumber} ${status.toLowerCase()}`,
          html: `<p>Invoice <strong>${invoice.invoiceNumber}</strong> for PO <strong>${invoice.po.poNumber}</strong> was submitted and marked as <strong>${status}</strong>.</p>`,
        }),
        ...financeUsers.map((financeUser) =>
          enqueueNotification({
            userId: financeUser.id,
            message: `Invoice ${invoice.invoiceNumber} is ${status}`,
          })
        ),
      ]);
    }

    res.status(201).json({ invoice: mapInvoice(invoice) });
  } catch (err) {
    console.error('[submitInvoice]', err);
    res.status(500).json({ error: 'Failed to submit invoice' });
  }
};

export const listInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const where: any = {};

    if (req.user.role === Role.VENDOR) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
      where.vendor = { email: user?.email ?? '__none__' };
    }

    if (req.user.role !== Role.VENDOR && req.user.role !== Role.FINANCE && req.user.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Only vendors, finance and admin can view invoices' });
      return;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.status(200).json({ invoices: invoices.map(mapInvoice), total: invoices.length });
  } catch (err) {
    console.error('[listInvoices]', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

export const getInvoiceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const id = req.params.id as string;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            items: true,
          },
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (req.user.role === Role.VENDOR) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
      if (!user || user.email !== invoice.vendor.email) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    } else if (req.user.role !== Role.FINANCE && req.user.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Only vendors, finance and admin can view invoice details' });
      return;
    }

    res.status(200).json({ invoice: mapInvoice(invoice) });
  } catch (err) {
    console.error('[getInvoiceById]', err);
    res.status(500).json({ error: 'Failed to fetch invoice detail' });
  }
};

export const approveInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.FINANCE) {
      res.status(403).json({ error: 'Only finance can approve invoices' });
      return;
    }

    const id = req.params.id as string;
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            items: true,
          },
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (existing.status !== InvoiceStatus.MATCHED) {
      res.status(400).json({ error: 'Only matched invoices can be approved' });
      return;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.APPROVED },
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            items: true,
          },
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'APPROVE',
        entity: 'Invoice',
        entityId: invoice.id,
        metadata: { invoiceNumber: invoice.invoiceNumber },
      },
    });

    res.status(200).json({ invoice: mapInvoice(invoice) });
  } catch (err) {
    console.error('[approveInvoice]', err);
    res.status(500).json({ error: 'Failed to approve invoice' });
  }
};

export const payInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.FINANCE) {
      res.status(403).json({ error: 'Only finance can mark invoice as paid' });
      return;
    }

    const id = req.params.id as string;
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            items: true,
          },
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (existing.status !== InvoiceStatus.APPROVED) {
      res.status(400).json({ error: 'Only approved invoices can be marked as paid' });
      return;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.PAID },
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            items: true,
          },
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PAY',
        entity: 'Invoice',
        entityId: invoice.id,
        metadata: { invoiceNumber: invoice.invoiceNumber },
      },
    });

    const vendorUser = await prisma.user.findFirst({
      where: {
        role: Role.VENDOR,
        email: invoice.vendor.email,
      },
      select: { id: true },
    });

    if (vendorUser) {
      await Promise.allSettled([
        enqueueNotification({
          userId: vendorUser.id,
          message: `Invoice ${invoice.invoiceNumber} has been marked as PAID`,
        }),
        enqueueEmail({
          to: invoice.vendor.email,
          subject: `Invoice ${invoice.invoiceNumber} paid`,
          html: `<p>Your invoice <strong>${invoice.invoiceNumber}</strong> has been marked as PAID.</p>`,
        }),
      ]);
    }

    res.status(200).json({ invoice: mapInvoice(invoice) });
  } catch (err) {
    console.error('[payInvoice]', err);
    res.status(500).json({ error: 'Failed to mark invoice as paid' });
  }
};
