import { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

type MonthlySummary = {
  totalSpend: number;
  totalPOs: number;
  approvedInvoicesCount: number;
  paidInvoicesCount: number;
  newVendorsCount: number;
};
type VendorSpendRow = { vendorName: string; totalSpend: number };
type InvoiceAgingRow = { bucket: string; amount: number; count: number };

export default function ReportsPage() {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [vendorSpend, setVendorSpend] = useState<VendorSpendRow[]>([]);
  const [invoiceAging, setInvoiceAging] = useState<InvoiceAgingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get(`/reports/monthly-summary?month=${month}&year=${year}`);
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [month, year]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      await fetchSummary();
      const vsRes = await api.get('/reports/vendor-spend');
      setVendorSpend(vsRes.data.data);
      const iaRes = await api.get('/reports/invoice-aging');
      setInvoiceAging(iaRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchSummary]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExportPDF = async () => {
    try {
      const res = await api.get(`/reports/export/monthly-pdf?month=${month}&year=${year}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `VendorHub_Report_${year}_${month}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download PDF', err);
    }
  };

  const handleExportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + '\n' + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border-subtle)', borderTopColor: '#06b6d4', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="page-root animate-in">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Financial and operational insights</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="input-base"
            style={{ width: '150px' }}
          >
            {Array.from({length: 12}).map((_, i) => (
              <option key={i+1} value={i+1} style={{ background: '#0f172a' }}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(e.target.value)}
            className="input-base"
            style={{ width: '100px' }}
          >
            {Array.from({ length: new Date().getFullYear() - 2024 + 1 }).map((_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y} style={{ background: '#0f172a' }}>{y}</option>;
            })}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Monthly Summary */}
        <section className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Monthly Summary</h2>
            <button onClick={handleExportPDF} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              <Download size={16} /> Export PDF
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            <div className="stat-card" style={{ borderColor: 'rgba(6,182,212,0.25)', background: 'rgba(6,182,212,0.08)' }}>
              <p className="stat-label" style={{ color: '#06b6d4' }}>Total Spend</p>
              <p className="stat-value">{formatCurrency(summary?.totalSpend)}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Total POs</p>
              <p className="stat-value">{summary?.totalPOs}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Approved Invoices</p>
              <p className="stat-value">{summary?.approvedInvoicesCount}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Paid Invoices</p>
              <p className="stat-value">{summary?.paidInvoicesCount}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">New Vendors</p>
              <p className="stat-value">{summary?.newVendorsCount}</p>
            </div>
          </div>
        </section>

        {/* Vendor Spend Breakdown */}
        <section className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Vendor Spend Breakdown</h2>
            <button onClick={() => handleExportCSV(vendorSpend, 'vendor_spend.csv')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              <Download size={16} /> Export CSV
            </button>
          </div>
          <div style={{ height: '320px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={vendorSpend.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" tick={{ fill: 'var(--text-secondary)' }} />
                <YAxis dataKey="vendorName" type="category" stroke="var(--text-muted)" width={150} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <Tooltip 
                  cursor={{ fill: 'var(--bg-hover)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Bar dataKey="totalSpend" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Invoice Aging */}
        <section className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Invoice Aging</h2>
            <button onClick={() => handleExportCSV(invoiceAging, 'invoice_aging.csv')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              <Download size={16} /> Export CSV
            </button>
          </div>
          <div style={{ height: '320px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={invoiceAging} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="bucket" stroke="var(--text-muted)" tick={{ fill: 'var(--text-secondary)' }} />
                <YAxis stroke="var(--text-muted)" yAxisId="left" tick={{ fill: 'var(--text-secondary)' }} />
                <YAxis stroke="var(--text-muted)" yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)' }} />
                <Tooltip 
                  cursor={{ fill: 'var(--bg-hover)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar yAxisId="left" dataKey="amount" fill="#f59e0b" name="Total Amount (₹)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="count" fill="#8b5cf6" name="Invoice Count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
