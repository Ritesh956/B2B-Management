import { Response } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import { prisma } from '../config/prisma';
import puppeteer from 'puppeteer';
import { InvoiceStatus, POStatus } from '@prisma/client';

export const getMonthlySummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query as { month?: string; year?: string };
    const date = new Date();
    const targetMonth = month ? parseInt(month, 10) : date.getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : date.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const pos = await prisma.purchaseOrder.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const invoices = await prisma.invoice.findMany({
      where: {
        submittedAt: { gte: startDate, lte: endDate },
      },
    });

    const newVendorsCount = await prisma.vendor.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const totalPOs = pos.length;
    const totalSpend = pos.reduce((sum, po) => sum + po.totalAmount, 0);
    const approvedInvoicesCount = invoices.filter((i) => i.status === InvoiceStatus.APPROVED || i.status === InvoiceStatus.PAID).length;
    const paidInvoicesCount = invoices.filter((i) => i.status === InvoiceStatus.PAID).length;
    
    res.json({
      totalPOs,
      totalSpend,
      approvedInvoicesCount,
      paidInvoicesCount,
      newVendorsCount,
    });
  } catch (err) {
    console.error('[getMonthlySummary]', err);
    res.status(500).json({ error: 'Failed to generate monthly summary' });
  }
};

export const getVendorSpend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };
    const where: any = {};
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const vendors = await prisma.vendor.findMany({
      include: {
        purchaseOrders: { where },
        invoices: {
          where: {
            submittedAt: where.createdAt
          }
        }
      }
    });

    const spendData = vendors.map((v) => {
      const totalSpend = v.purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
      return {
        vendorName: v.companyName,
        totalSpend,
        poCount: v.purchaseOrders.length,
        invoiceCount: v.invoices.length,
      };
    }).sort((a, b) => b.totalSpend - a.totalSpend);

    res.json({ data: spendData });
  } catch (err) {
    console.error('[getVendorSpend]', err);
    res.status(500).json({ error: 'Failed to generate vendor spend report' });
  }
};

export const getInvoiceAging = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Only fetch invoices that are not yet paid
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { not: InvoiceStatus.PAID }
      }
    });

    const now = new Date();
    const buckets = {
      '0-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 },
    };

    invoices.forEach(inv => {
      const submitted = new Date(inv.submittedAt);
      const diffTime = Math.abs(now.getTime() - submitted.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let bucket = '0-30';
      if (diffDays > 30 && diffDays <= 60) bucket = '31-60';
      else if (diffDays > 60 && diffDays <= 90) bucket = '61-90';
      else if (diffDays > 90) bucket = '90+';

      buckets[bucket as keyof typeof buckets].count += 1;
      buckets[bucket as keyof typeof buckets].amount += inv.amount;
    });

    const data = Object.entries(buckets).map(([bucket, stats]) => ({
      bucket,
      count: stats.count,
      amount: stats.amount,
    }));

    res.json({ data });
  } catch (err) {
    console.error('[getInvoiceAging]', err);
    res.status(500).json({ error: 'Failed to generate invoice aging report' });
  }
};

export const exportMonthlyPdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query as { month?: string; year?: string };
    const date = new Date();
    const targetMonth = month ? parseInt(month, 10) : date.getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : date.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const pos = await prisma.purchaseOrder.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
    });
    const invoices = await prisma.invoice.findMany({
      where: { submittedAt: { gte: startDate, lte: endDate } },
    });
    const newVendorsCount = await prisma.vendor.count({
      where: { createdAt: { gte: startDate, lte: endDate } },
    });

    const totalPOs = pos.length;
    const totalSpend = pos.reduce((sum, po) => sum + po.totalAmount, 0);
    const approvedInvoicesCount = invoices.filter((i) => i.status === InvoiceStatus.APPROVED || i.status === InvoiceStatus.PAID).length;
    const paidInvoicesCount = invoices.filter((i) => i.status === InvoiceStatus.PAID).length;

    // Get Top 5 Vendors
    const vendors = await prisma.vendor.findMany({
      include: { purchaseOrders: { where: { createdAt: { gte: startDate, lte: endDate } } } }
    });
    const topVendors = vendors.map(v => ({
      name: v.companyName,
      spend: v.purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0)
    })).sort((a, b) => b.spend - a.spend).slice(0, 5);

    const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;
    const monthName = new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Report</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; }
          .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #eaeaea; }
          .header h1 { margin: 0; color: #1e293b; font-size: 28px; }
          .header p { margin: 5px 0 0; color: #64748b; font-size: 16px; }
          .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }
          .stat-card { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .stat-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: bold; }
          .stat-value { font-size: 24px; font-weight: bold; color: #0f172a; margin-top: 8px; }
          h2 { color: #1e293b; font-size: 20px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 12px; }
          td { color: #334155; font-size: 14px; }
          .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>VendorHub Monthly Report</h1>
          <p>${monthName} ${targetYear}</p>
        </div>
        
        <h2>Monthly Summary</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Spend</div>
            <div class="stat-value">${formatCurrency(totalSpend)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Purchase Orders Issued</div>
            <div class="stat-value">${totalPOs}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Approved Invoices</div>
            <div class="stat-value">${approvedInvoicesCount}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">New Vendors Onboarded</div>
            <div class="stat-value">${newVendorsCount}</div>
          </div>
        </div>

        <h2>Top 5 Vendors by Spend</h2>
        <table>
          <thead>
            <tr>
              <th>Vendor Name</th>
              <th>Total Spend</th>
            </tr>
          </thead>
          <tbody>
            ${topVendors.map(v => `
              <tr>
                <td>${v.name}</td>
                <td>${formatCurrency(v.spend)}</td>
              </tr>
            `).join('')}
            ${topVendors.length === 0 ? '<tr><td colspan="2">No spend data for this month.</td></tr>' : ''}
          </tbody>
        </table>

        <div class="footer">
          Generated automatically by VendorHub on ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="VendorHub_Report_${monthName}_${targetYear}.pdf"`);
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('[exportMonthlyPdf]', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};
