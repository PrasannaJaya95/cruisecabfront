import React, { useMemo, useState, useEffect } from 'react';
import { Search, Plus, Filter, FileText, Download, MoreVertical, ExternalLink, Mail, AlertCircle, CheckCircle2, Printer, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import api, { resolveServerUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const Invoices = () => {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, LAST_7, LAST_30, CUSTOM
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selected, setSelected] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const response = await api.get('/invoices');
            const mapped = (response.data || []).map(inv => ({
                id: inv.invoiceNo,
                invoiceId: inv.id,
                contractId: inv.contractId,
                contractNo: inv.contract?.contractNo || '',
                customer: inv.customer?.name || inv.customer?.email || 'Unknown Customer',
                vehicle: `${inv.vehicle?.vehicleModel?.brand?.name || ''} ${inv.vehicle?.vehicleModel?.name || ''}`.trim(),
                plate: inv.vehicle?.licensePlate,
                vendor: inv.vehicle?.vendor?.name || inv.vehicle?.vendor?.email || '',
                amount: inv.total || 0,
                date: inv.createdAt,
                dueDate: inv.createdAt, // No terms logic yet
                status: inv.status || 'ISSUED',
                raw: inv
            }));
            setInvoices(mapped);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredInvoices = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let rangeStart = null;
        let rangeEnd = null;
        if (dateFilter === 'TODAY') {
            rangeStart = startOfToday;
            rangeEnd = new Date(startOfToday);
            rangeEnd.setDate(rangeEnd.getDate() + 1);
        } else if (dateFilter === 'LAST_7') {
            rangeStart = new Date(startOfToday);
            rangeStart.setDate(rangeStart.getDate() - 6);
            rangeEnd = new Date(startOfToday);
            rangeEnd.setDate(rangeEnd.getDate() + 1);
        } else if (dateFilter === 'LAST_30') {
            rangeStart = new Date(startOfToday);
            rangeStart.setDate(rangeStart.getDate() - 29);
            rangeEnd = new Date(startOfToday);
            rangeEnd.setDate(rangeEnd.getDate() + 1);
        } else if (dateFilter === 'CUSTOM' && fromDate && toDate) {
            rangeStart = new Date(fromDate);
            rangeEnd = new Date(toDate);
            rangeEnd.setDate(rangeEnd.getDate() + 1); // inclusive
        }

        return invoices.filter(inv => {
            const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
            if (!matchesStatus) return false;

            const invDate = inv.date ? new Date(inv.date) : null;
            if (rangeStart && rangeEnd && invDate) {
                if (!(invDate >= rangeStart && invDate < rangeEnd)) return false;
            }

            if (!q) return true;

            const hay = [
                inv.id,
                inv.contractNo,
                inv.customer,
                inv.vehicle,
                inv.plate,
                inv.vendor,
                String(inv.amount ?? ''),
            ].filter(Boolean).join(' ').toLowerCase();

            return hay.includes(q);
        });
    }, [invoices, searchTerm, statusFilter, dateFilter, fromDate, toDate]);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'PAID':
                return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'ISSUED':
                return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            case 'VOID':
                return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
            default:
                return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
        }
    };

    const canCredit = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    const getSettlementLabel = (invoiceLike) => {
        const type = (invoiceLike?.type || invoiceLike?.raw?.type || '').toUpperCase();
        if (type !== 'RETURN') return null;
        const total = Number(invoiceLike?.total ?? invoiceLike?.amount ?? 0);
        return total < 0 ? 'Customer Need to Pay' : 'Company Have to Refund';
    };

    const getDisplayTotal = (invoiceLike) => {
        const type = (invoiceLike?.type || invoiceLike?.raw?.type || '').toUpperCase();
        const total = Number(invoiceLike?.total ?? invoiceLike?.amount ?? 0);
        return type === 'RETURN' ? Math.abs(total) : total;
    };

    const openInvoice = async (invoiceId) => {
        try {
            setDetailOpen(true);
            setDetailLoading(true);
            const { data } = await api.get(`/invoices/${invoiceId}`);
            setSelected(data);
        } catch (e) {
            console.error(e);
            setDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const markPaid = async () => {
        if (!selected) return;
        try {
            setActionLoading(true);
            const { data } = await api.put(`/invoices/${selected.id}/mark-paid`, { method: 'CASH' });
            setSelected(data);
            setInvoices(prev => prev.map(i => i.invoiceId === selected.id ? { ...i, status: data.status, raw: data } : i));
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || 'Failed to mark as paid');
        } finally {
            setActionLoading(false);
        }
    };

    const createCreditNote = async () => {
        if (!selected) return;
        try {
            setActionLoading(true);
            await api.post(`/invoices/${selected.id}/credit-note`, { reason: 'Reversal' });
            const { data } = await api.get(`/invoices/${selected.id}`);
            setSelected(data);
            setInvoices(prev => prev.map(i => i.invoiceId === selected.id ? { ...i, status: data.status, raw: data } : i));
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || 'Failed to create credit note');
        } finally {
            setActionLoading(false);
        }
    };

    const printInvoice = async () => {
        if (!selected) return;

        const escapeHtml = (str) => String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        const formatAddressHtml = (addr) => {
            const safe = escapeHtml(addr ?? '');
            return safe.replace(/\n/g, '<br/>');
        };

        let companyName = '';
        let companyAddress = '';
        let companyLogo = null;
        let companyContactNumber = '';
        let companyWhatsAppNumber = '';
        try {
            const [nameRes, addressRes, logoRes, contactRes, whatsappRes] = await Promise.all([
                api.get('/settings/company_name'),
                api.get('/settings/company_address'),
                api.get('/settings/company_logo'),
                api.get('/settings/company_contact_number'),
                api.get('/settings/company_whatsapp_number'),
            ]);

            companyName = nameRes.data.value !== 'false' ? (nameRes.data.value || '') : '';
            companyAddress = addressRes.data.value !== 'false' ? (addressRes.data.value || '') : '';
            const rawLogo = logoRes.data.value !== 'false' ? (logoRes.data.value || null) : null;
            companyLogo = rawLogo ? resolveServerUrl(rawLogo) : null;
            companyContactNumber = contactRes.data.value !== 'false' ? (contactRes.data.value || '') : '';
            companyWhatsAppNumber = whatsappRes.data.value !== 'false' ? (whatsappRes.data.value || '') : '';
        } catch (e) {
            // Printing should still work even if company settings fail.
            console.error('Failed to load company profile for print:', e);
        }

        const isReturn = String(selected.type || '').toUpperCase() === 'RETURN';
        const settlementLabel = isReturn ? (Number(selected.total || 0) < 0 ? 'Customer Need to Pay' : 'Company Have to Refund') : '';
        const displayTotal = isReturn ? Math.abs(Number(selected.total || 0)) : Number(selected.total || 0);

        const showCompanyBrand = !!companyName.trim();
        const brandAddressHtml = showCompanyBrand && companyAddress.trim() ? formatAddressHtml(companyAddress) : '';
        const brandLogoHtml = showCompanyBrand && companyLogo
            ? `<img src="${escapeHtml(companyLogo)}" alt="Company Logo" style="height:52px; width:52px; object-fit:contain; border-radius:10px; background:rgba(255,255,255,0.6);" />`
            : '';
        const companyNameHtml = showCompanyBrand
            ? `<div class="company-name">${escapeHtml(companyName.trim())}</div>`
            : '';

        const contactHtml = showCompanyBrand && companyContactNumber.trim()
            ? `<div class="muted" style="margin-top:6px;">Contact: <b>${escapeHtml(companyContactNumber.trim())}</b></div>`
            : '';
        const whatsappHtml = showCompanyBrand && companyWhatsAppNumber.trim()
            ? `<div class="muted" style="margin-top:4px;">WhatsApp: <b>${escapeHtml(companyWhatsAppNumber.trim())}</b></div>`
            : '';

        const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(selected.invoiceNo)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    .row { display:flex; justify-content:space-between; gap:16px; }
    .muted { color:#555; font-size:12px; }
    table { width:100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border-bottom: 1px solid #ddd; padding: 10px 6px; text-align:left; font-size: 13px; }
    th { font-size: 11px; text-transform: uppercase; color:#444; }
    .right { text-align:right; }
    .total { font-weight: 800; font-size: 16px; }
    .brand-top { margin-bottom:18px; }
    .brand-left { display:flex; align-items:flex-start; gap:14px; }
    .company-name { font-weight:900; font-size:22px; line-height:1.1; }
  </style>
</head>
<body>
  <div class="brand-top">
    <div class="brand-left">
      ${brandLogoHtml}
      <div>
        ${companyNameHtml}
        ${brandAddressHtml ? `<div class="muted" style="margin-top:6px;">${brandAddressHtml}</div>` : ''}
        ${contactHtml}
        ${whatsappHtml}
      </div>
    </div>
  </div>
  <div class="row">
    <div>
      <div style="font-weight:900; font-size:22px;">INVOICE</div>
      <div class="muted">Invoice No: <b>${escapeHtml(selected.invoiceNo)}</b></div>
      <div class="muted">Contract No: <b>${escapeHtml(selected.contract?.contractNo || '-')}</b></div>
      <div class="muted">Date: <b>${selected.createdAt ? escapeHtml(new Date(selected.createdAt).toLocaleString()) : ''}</b></div>
    </div>
    <div style="text-align:right;">
      <div class="muted">Status</div>
      <div style="font-weight:900;">${escapeHtml(selected.status)}</div>
    </div>
  </div>

  <div style="margin-top:18px;" class="row">
    <div>
      <div class="muted">Customer</div>
      <div style="font-weight:700;">${escapeHtml(selected.customer?.name || selected.customer?.email || '')}</div>
      <div class="muted">${escapeHtml(selected.customer?.email || '')}</div>
    </div>
    <div style="text-align:right;">
      <div class="muted">Vehicle</div>
      <div style="font-weight:700;">${escapeHtml(selected.vehicle?.licensePlate || '')}</div>
      <div class="muted">${escapeHtml((selected.vehicle?.vehicleModel?.brand?.name || '') + ' ' + (selected.vehicle?.vehicleModel?.name || '')).trim()}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Description</th><th class="right">Amount (LKR)</th></tr>
    </thead>
    <tbody>
      ${(Array.isArray(selected.lines) ? selected.lines : []).map(l => `
        <tr><td>${escapeHtml(l.description || '')}</td><td class="right">${Number(l.amount||0).toLocaleString()}</td></tr>
      `).join('')}
      <tr><td class="total">Total${settlementLabel ? ` (${settlementLabel})` : ''}</td><td class="right total">${Number(displayTotal||0).toLocaleString()}</td></tr>
    </tbody>
  </table>

  <div class="muted" style="margin-top:18px;">Print tip: choose "Save as PDF" in the print dialog.</div>
</body>
</html>`;
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Header Section */}
            <div className="relative">
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-5xl font-black tracking-tighter text-foreground mb-2 uppercase">
                            INVOICES
                        </h1>
                        <p className="text-muted-foreground text-lg font-medium italic">
                            Generated billing statements and payment requests.
                        </p>
                    </div>
                    <Button
                        className="px-8 h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all gap-3"
                    >
                        <Plus className="h-5 w-5" /> Generate New
                    </Button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-6 bg-card/50 backdrop-blur-xl border border-border rounded-[2rem] shadow-2xl shadow-black/[0.02]">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Search invoice #, contract #, customer, vehicle, vendor, amount..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-14 bg-background/50 border-border rounded-2xl text-base focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                    />
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-14 bg-background/50 border-border rounded-2xl px-6 font-black text-[10px] uppercase tracking-widest focus:ring-primary/20 transition-all min-w-[160px]">
                            <Filter className="mr-2 h-4 w-4 text-primary" />
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border bg-card/95 backdrop-blur-xl">
                            <SelectItem value="ALL" className="font-bold">ALL INVOICES</SelectItem>
                            <SelectItem value="PAID" className="font-bold">PAID ONLY</SelectItem>
                            <SelectItem value="ISSUED" className="font-bold">ISSUED</SelectItem>
                            <SelectItem value="VOID" className="font-bold">VOID</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={dateFilter} onValueChange={(v) => {
                        setDateFilter(v);
                        if (v !== 'CUSTOM') {
                            setFromDate('');
                            setToDate('');
                        }
                    }}>
                        <SelectTrigger className="h-14 bg-background/50 border-border rounded-2xl px-6 font-black text-[10px] uppercase tracking-widest focus:ring-primary/20 transition-all min-w-[190px]">
                            <SelectValue placeholder="Date Range" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border bg-card/95 backdrop-blur-xl">
                            <SelectItem value="ALL" className="font-bold">ALL TIME</SelectItem>
                            <SelectItem value="TODAY" className="font-bold">TODAY</SelectItem>
                            <SelectItem value="LAST_7" className="font-bold">LAST 7 DAYS</SelectItem>
                            <SelectItem value="LAST_30" className="font-bold">LAST 30 DAYS</SelectItem>
                            <SelectItem value="CUSTOM" className="font-bold">CUSTOM RANGE</SelectItem>
                        </SelectContent>
                    </Select>

                    {dateFilter === 'CUSTOM' && (
                        <div className="flex gap-3">
                            <Input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="h-14 bg-background/50 border-border rounded-2xl text-xs font-black uppercase tracking-widest"
                            />
                            <Input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="h-14 bg-background/50 border-border rounded-2xl text-xs font-black uppercase tracking-widest"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-card/30 backdrop-blur-sm border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
                            <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Invoice ID</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Contract No</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Customer / Vehicle</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Amount</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Due Date</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</TableHead>
                            <TableHead className="py-6 px-8 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-20">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                        <span className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground">Generating View...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2 opacity-40">
                                        <FileText className="h-12 w-12 mb-2" />
                                        <span className="text-sm font-black uppercase tracking-widest">No invoice records found</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((inv) => (
                                <TableRow
                                    key={inv.id}
                                    className="group border-border hover:bg-primary/[0.01] transition-colors cursor-pointer"
                                    onClick={() => openInvoice(inv.invoiceId)}
                                >
                                    <TableCell className="py-6 px-8">
                                        <div className="font-black text-foreground tracking-tight flex items-center gap-2">
                                            <div className="p-2 bg-primary/5 rounded-lg border border-primary/10">
                                                <FileText className="h-4 w-4 text-primary" />
                                            </div>
                                            {inv.id}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="font-mono text-xs font-bold text-muted-foreground">
                                            {inv.contractNo || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground">{inv.customer}</span>
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                {inv.vehicle} — {inv.plate}{inv.vendor ? ` — ${inv.vendor}` : ''}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="flex flex-col">
                                            <span className="text-base font-black text-foreground">
                                                LKR {getDisplayTotal(inv).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                            {getSettlementLabel(inv) && (
                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                    {getSettlementLabel(inv)}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-muted-foreground">
                                                {format(new Date(inv.dueDate), 'MMM dd, yyyy')}
                                            </span>
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-50">7 days terms</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                            <span className={cn("inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-sm border", getStatusStyle(inv.status))}>
                                            <span className={cn("mr-2 h-1.5 w-1.5 rounded-full",
                                                inv.status === 'PAID' ? 'bg-emerald-500' :
                                                    inv.status === 'ISSUED' ? 'bg-amber-500' : 'bg-rose-500'
                                            )}></span>
                                            {inv.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-6 px-8 text-right">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all">
                                                    <MoreVertical className="h-5 w-5" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent align="end" className="w-56 p-2 rounded-2xl border-border bg-card/95 backdrop-blur-xl shadow-2xl">
                                                <div className="grid gap-1">
                                                    <button className="w-full text-left p-3 rounded-xl font-bold flex gap-3 text-xs uppercase tracking-widest cursor-pointer hover:bg-secondary transition-all">
                                                        <ExternalLink className="h-4 w-4 text-primary" /> View Details
                                                    </button>
                                                    <button className="w-full text-left p-3 rounded-xl font-bold flex gap-3 text-xs uppercase tracking-widest cursor-pointer hover:bg-secondary transition-all">
                                                        <Download className="h-4 w-4 text-primary" /> Download PDF
                                                    </button>
                                                    <button className="w-full text-left p-3 rounded-xl font-bold flex gap-3 text-xs uppercase tracking-widest cursor-pointer hover:bg-secondary transition-all">
                                                        <Mail className="h-4 w-4 text-primary" /> Send to Email
                                                    </button>
                                                    <div className="h-[1px] bg-border my-2" />
                                                    <button className="w-full text-left p-3 rounded-xl font-bold flex gap-3 text-xs uppercase tracking-widest cursor-pointer text-rose-500 hover:bg-rose-50 transition-all">
                                                        <AlertCircle className="h-4 w-4" /> Void Invoice
                                                    </button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Invoice Preview</span>
                        </DialogTitle>
                        <DialogDescription>
                            {detailLoading ? 'Loading invoice...' : (selected ? `${selected.invoiceNo} • ${selected.contract?.contractNo || '-'}` : '')}
                        </DialogDescription>
                    </DialogHeader>

                    {selected && !detailLoading && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="border rounded-xl p-4">
                                    <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">Customer</div>
                                    <div className="font-bold mt-1">{selected.customer?.name || selected.customer?.email}</div>
                                    <div className="text-xs text-muted-foreground">{selected.customer?.email}</div>
                                </div>
                                <div className="border rounded-xl p-4">
                                    <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">Vehicle</div>
                                    <div className="font-bold mt-1">{selected.vehicle?.licensePlate}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {selected.vehicle?.vehicleModel?.brand?.name} {selected.vehicle?.vehicleModel?.name}
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Amount (LKR)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(Array.isArray(selected.lines) ? selected.lines : []).map((l, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{l.description}</TableCell>
                                                <TableCell className="text-right">{Number(l.amount || 0).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow>
                                            <TableCell className="font-black">Total</TableCell>
                                            <TableCell className="text-right font-black">
                                                {Number(getDisplayTotal(selected) || 0).toLocaleString()}
                                                {getSettlementLabel(selected) ? ` (${getSettlementLabel(selected)})` : ''}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                        <Button variant="secondary" onClick={printInvoice} disabled={!selected || detailLoading}>
                            <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
                        </Button>
                        {selected?.status !== 'PAID' && (
                            <Button onClick={markPaid} disabled={actionLoading || detailLoading}>
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Paid
                            </Button>
                        )}
                        {canCredit && selected?.status === 'PAID' && (
                            <Button variant="destructive" onClick={createCreditNote} disabled={actionLoading || detailLoading}>
                                <CreditCard className="w-4 h-4 mr-2" /> Create Credit Note
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Invoices;
