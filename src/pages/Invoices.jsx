import React, { useMemo, useState, useEffect } from 'react';
import { Search, Plus, Filter, FileText, Download, MoreVertical, ExternalLink, Mail, AlertCircle, CheckCircle2, Printer, CreditCard, MessageCircle } from 'lucide-react';
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
import { DOCUMENT_PRINT_STYLES, hasPrintBrandContent } from '../lib/printDocumentTheme';
import {
    normalizePhoneForWhatsApp,
    pickCustomerWhatsAppPhone,
    openWhatsAppWeb,
} from '../lib/whatsappWeb';
import { useAuth } from '../context/AuthContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

function customerDisplayNameForWhatsApp(customer) {
    if (!customer) return 'there';
    if (String(customer.type || '').toUpperCase() === 'CORPORATE' && customer.companyName?.trim()) {
        return customer.companyName.trim();
    }
    return customer.name?.trim() || customer.email?.split('@')[0] || 'there';
}

function buildInvoiceWhatsAppMessage(invoice, shareUrl) {
    const name = customerDisplayNameForWhatsApp(invoice.customer);
    const no = invoice.invoiceNo || '';
    const contract = invoice.contract?.contractNo || '-';
    const total = Number(invoice.total ?? 0);
    const isReturn = String(invoice.type || '').toUpperCase() === 'RETURN';
    const display = isReturn ? Math.abs(total) : total;
    const settlement = isReturn
        ? (total < 0 ? 'Customer to pay' : 'Refund due')
        : null;
    const lines = [
        `Hello ${name},`,
        '',
        `Your invoice *${no}* is ready (contract ${contract}).`,
        `Amount (LKR): *${display.toLocaleString()}*${settlement ? ` _(${settlement})_` : ''}`,
        '',
        `View or print: ${shareUrl}`,
        '',
        'Thank you.',
    ];
    return lines.join('\n');
}

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

    const [previewCompanyName, setPreviewCompanyName] = useState('');
    const [previewCompanyAddress, setPreviewCompanyAddress] = useState('');
    const [previewCompanyLogo, setPreviewCompanyLogo] = useState(null);
    const [previewCompanyContact, setPreviewCompanyContact] = useState('');
    const [previewCompanyWhatsapp, setPreviewCompanyWhatsapp] = useState('');
    const [whatsappSending, setWhatsappSending] = useState(false);

    useEffect(() => {
        fetchInvoices();
    }, []);

    useEffect(() => {
        const loadCompany = async () => {
            try {
                const [nameRes, addressRes, logoRes, contactRes, whatsappRes] = await Promise.all([
                    api.get('/settings/company_name'),
                    api.get('/settings/company_address'),
                    api.get('/settings/company_logo'),
                    api.get('/settings/company_contact_number'),
                    api.get('/settings/company_whatsapp_number'),
                ]);
                setPreviewCompanyName(nameRes.data.value !== 'false' ? (nameRes.data.value || '') : '');
                setPreviewCompanyAddress(addressRes.data.value !== 'false' ? (addressRes.data.value || '') : '');
                const rawLogo = logoRes.data.value !== 'false' ? (logoRes.data.value || null) : null;
                setPreviewCompanyLogo(rawLogo ? resolveServerUrl(rawLogo) : null);
                setPreviewCompanyContact(contactRes.data.value !== 'false' ? (contactRes.data.value || '') : '');
                setPreviewCompanyWhatsapp(whatsappRes.data.value !== 'false' ? (whatsappRes.data.value || '') : '');
            } catch (e) {
                console.error('Failed to load company profile for invoice preview:', e);
            }
        };
        loadCompany();
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

    const sendInvoiceWhatsApp = async (invoice) => {
        if (!invoice?.id) return;
        const rawPhone = pickCustomerWhatsAppPhone(invoice.customer);
        const phone = normalizePhoneForWhatsApp(rawPhone);
        if (!phone) {
            alert(
                'No mobile number on file for this customer. Add phone or mobile on the customer record, then try again.'
            );
            return;
        }
        try {
            setWhatsappSending(true);
            const { data } = await api.get(`/invoices/${invoice.id}/share-link`);
            const shareUrl = data?.shareUrl;
            if (!shareUrl) {
                alert('Could not create invoice link. Try again.');
                return;
            }
            const message = buildInvoiceWhatsAppMessage(invoice, shareUrl);
            openWhatsAppWeb(phone, message);
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || 'Failed to open WhatsApp');
        } finally {
            setWhatsappSending(false);
        }
    };

    const sendInvoiceWhatsAppFromRow = async (e, inv) => {
        e.stopPropagation();
        try {
            const { data: full } = await api.get(`/invoices/${inv.invoiceId}`);
            await sendInvoiceWhatsApp(full);
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || 'Failed to load invoice for WhatsApp');
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
            console.error('Failed to load company profile for print:', e);
        }

        const isReturn = String(selected.type || '').toUpperCase() === 'RETURN';
        const settlementLabel = isReturn ? (Number(selected.total || 0) < 0 ? 'Customer Need to Pay' : 'Company Have to Refund') : '';
        const displayTotal = isReturn ? Math.abs(Number(selected.total || 0)) : Number(selected.total || 0);

        const showBrand = hasPrintBrandContent({
            logoUrl: companyLogo,
            name: companyName,
            address: companyAddress,
            contact: companyContactNumber,
            whatsapp: companyWhatsAppNumber,
        });
        const logoImg = companyLogo
            ? `<img class="doc-logo" src="${escapeHtml(companyLogo)}" alt="" />`
            : '';
        const nameBlock = companyName.trim()
            ? `<div class="doc-company-name">${escapeHtml(companyName.trim())}</div>`
            : companyLogo
                ? `<div class="doc-company-name" style="font-size:16px;color:var(--muted);">Your rental partner</div>`
                : '';
        const addrBlock = companyAddress.trim()
            ? `<div class="doc-company-muted">${formatAddressHtml(companyAddress)}</div>`
            : '';
        const chips = [];
        if (companyContactNumber.trim()) {
            chips.push(`<span class="doc-chip">Contact ${escapeHtml(companyContactNumber.trim())}</span>`);
        }
        if (companyWhatsAppNumber.trim()) {
            chips.push(`<span class="doc-chip">WhatsApp ${escapeHtml(companyWhatsAppNumber.trim())}</span>`);
        }
        const chipRow = chips.length ? `<div class="doc-chip-row">${chips.join('')}</div>` : '';
        const brandSection = showBrand
            ? `<div class="doc-brand-row">${logoImg}<div>${nameBlock}${addrBlock}${chipRow}</div></div>`
            : '';

        const contractNo = selected.contract?.contractNo || '-';
        const custName = selected.customer?.name || selected.customer?.email || '';
        const custEmail = selected.customer?.email || '';
        const plate = selected.vehicle?.licensePlate || '';
        const vehLabel = `${selected.vehicle?.vehicleModel?.brand?.name || ''} ${selected.vehicle?.vehicleModel?.name || ''}`.trim();
        const linesHtml = (Array.isArray(selected.lines) ? selected.lines : []).map((l) => `
            <tr><td>${escapeHtml(l.description || '')}</td><td>${Number(l.amount || 0).toLocaleString()}</td></tr>`).join('');
        const totalLabel = settlementLabel ? `Total (${settlementLabel})` : 'Total';

        const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(selected.invoiceNo)}</title>
  <style>${DOCUMENT_PRINT_STYLES}</style>
</head>
<body>
  <div class="doc">
    <div class="doc-topbar"></div>
    <div class="doc-inner">
      ${brandSection}
      <div class="doc-headline">
        <div>
          <div class="doc-kind">Invoice</div>
          <div class="doc-main-id">${escapeHtml(selected.invoiceNo)}</div>
          <div class="doc-meta">Contract <b>${escapeHtml(contractNo)}</b> · Issued <b>${selected.createdAt ? escapeHtml(new Date(selected.createdAt).toLocaleString()) : '-'}</b></div>
          ${settlementLabel ? `<div class="doc-chip-row" style="margin-top:12px;"><span class="doc-pill doc-pill-em">${escapeHtml(settlementLabel)}</span></div>` : ''}
        </div>
        <div class="doc-pill">${escapeHtml(selected.status)}</div>
      </div>

      <div class="doc-cards">
        <div class="doc-card">
          <div class="doc-card-label">Bill to</div>
          <div class="doc-card-value">${escapeHtml(custName)}</div>
          <div class="doc-card-sub">${escapeHtml(custEmail)}</div>
        </div>
        <div class="doc-card">
          <div class="doc-card-label">Vehicle</div>
          <div class="doc-card-value">${escapeHtml(plate)}</div>
          <div class="doc-card-sub">${escapeHtml(vehLabel)}</div>
        </div>
      </div>

      <div class="doc-table-wrap">
        <table class="doc-table">
          <thead>
            <tr><th>Description</th><th>Amount (LKR)</th></tr>
          </thead>
          <tbody>${linesHtml}</tbody>
          <tfoot>
            <tr><td>${escapeHtml(totalLabel)}</td><td>${Number(displayTotal || 0).toLocaleString()}</td></tr>
          </tfoot>
        </table>
      </div>

      <div class="doc-foot">Thank you for your business. Use your browser print dialog and choose &quot;Save as PDF&quot; to download.</div>
    </div>
  </div>
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
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreVertical className="h-5 w-5" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent align="end" className="w-56 p-2 rounded-2xl border-border bg-card/95 backdrop-blur-xl shadow-2xl">
                                                <div className="grid gap-1">
                                                    <button
                                                        type="button"
                                                        className="w-full text-left p-3 rounded-xl font-bold flex gap-3 text-xs uppercase tracking-widest cursor-pointer hover:bg-secondary transition-all"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openInvoice(inv.invoiceId);
                                                        }}
                                                    >
                                                        <ExternalLink className="h-4 w-4 text-primary" /> View Details
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="w-full text-left p-3 rounded-xl font-bold flex gap-3 text-xs uppercase tracking-widest cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 transition-all"
                                                        onClick={(e) => sendInvoiceWhatsAppFromRow(e, inv)}
                                                        disabled={whatsappSending}
                                                    >
                                                        <MessageCircle className="h-4 w-4 shrink-0" /> WhatsApp Web
                                                    </button>
                                                    <button className="w-full text-left p-3 rounded-xl font-bold flex gap-3 text-xs uppercase tracking-widest opacity-50" type="button" disabled title="Coming soon">
                                                        <Download className="h-4 w-4 text-primary" /> Download PDF
                                                    </button>
                                                    <button className="w-full text-left p-3 rounded-xl font-bold flex gap-3 text-xs uppercase tracking-widest opacity-50" type="button" disabled title="Coming soon">
                                                        <Mail className="h-4 w-4 text-primary" /> Send to Email
                                                    </button>
                                                    <div className="h-[1px] bg-border my-2" />
                                                    <button className="w-full text-left p-3 rounded-xl font-bold flex gap-3 text-xs uppercase tracking-widest text-rose-500 opacity-50" type="button" disabled title="Use invoice detail actions">
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
                            {hasPrintBrandContent({
                                logoUrl: previewCompanyLogo,
                                name: previewCompanyName,
                                address: previewCompanyAddress,
                                contact: previewCompanyContact,
                                whatsapp: previewCompanyWhatsapp,
                            }) ? (
                                <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] to-transparent p-5 flex gap-4 items-start">
                                    {previewCompanyLogo ? (
                                        <img
                                            src={previewCompanyLogo}
                                            alt=""
                                            className="h-16 w-16 shrink-0 rounded-xl object-contain bg-white/80 border border-border shadow-sm"
                                        />
                                    ) : null}
                                    <div className="min-w-0 space-y-1">
                                        {previewCompanyName.trim() ? (
                                            <div className="text-lg font-black tracking-tight text-foreground">{previewCompanyName.trim()}</div>
                                        ) : previewCompanyLogo ? (
                                            <div className="text-sm font-bold text-muted-foreground">Company</div>
                                        ) : null}
                                        {previewCompanyAddress.trim() ? (
                                            <div className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{previewCompanyAddress.trim()}</div>
                                        ) : null}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {previewCompanyContact.trim() ? (
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/15">
                                                    {previewCompanyContact.trim()}
                                                </span>
                                            ) : null}
                                            {previewCompanyWhatsapp.trim() ? (
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/15">
                                                    WA {previewCompanyWhatsapp.trim()}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div className="rounded-xl border border-border bg-muted/10 p-4">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Bill to</div>
                                    <div className="font-black mt-1 text-foreground">{selected.customer?.name || selected.customer?.email}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{selected.customer?.email}</div>
                                </div>
                                <div className="rounded-xl border border-border bg-muted/10 p-4">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Vehicle</div>
                                    <div className="font-black mt-1 text-foreground">{selected.vehicle?.licensePlate}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        {selected.vehicle?.vehicleModel?.brand?.name} {selected.vehicle?.vehicleModel?.name}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border overflow-hidden bg-muted/5">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Description</TableHead>
                                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Amount (LKR)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(Array.isArray(selected.lines) ? selected.lines : []).map((l, idx) => (
                                            <TableRow key={idx} className="border-border/60">
                                                <TableCell className="font-medium">{l.description}</TableCell>
                                                <TableCell className="text-right font-mono tabular-nums">{Number(l.amount || 0).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-primary/5 border-t-2 border-primary/25">
                                            <TableCell className="font-black">Total{getSettlementLabel(selected) ? ` (${getSettlementLabel(selected)})` : ''}</TableCell>
                                            <TableCell className="text-right font-black font-mono tabular-nums text-base text-primary">
                                                {Number(getDisplayTotal(selected) || 0).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 flex-wrap">
                        <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                            onClick={() => selected && sendInvoiceWhatsApp(selected)}
                            disabled={!selected || detailLoading || whatsappSending}
                        >
                            <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp Web
                        </Button>
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
