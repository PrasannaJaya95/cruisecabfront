import { useEffect, useMemo, useState } from 'react';
import { format, differenceInCalendarDays, addDays } from 'date-fns';
import api, { resolveServerUrl } from '../lib/api';
import { DOCUMENT_PRINT_STYLES, hasPrintBrandContent } from '../lib/printDocumentTheme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, FileText, MessageCircle } from 'lucide-react';
import {
    normalizePhoneForWhatsApp,
    pickCustomerWhatsAppPhone,
    openWhatsAppWeb,
} from '../lib/whatsappWeb';

function qEscape(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export default function Quotations() {
    const [vehicles, setVehicles] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [quotationHistory, setQuotationHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [customerMode, setCustomerMode] = useState('EXISTING'); // EXISTING | NEW
    const [customerId, setCustomerId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [quotationWhatsAppPhone, setQuotationWhatsAppPhone] = useState('');
    const [customerType, setCustomerType] = useState('LOCAL'); // LOCAL | FOREIGN | CORPORATE

    const [vehicleId, setVehicleId] = useState('');
    const [fleetCategories, setFleetCategories] = useState([]);
    const [quotationVehicleCategoryFilter, setQuotationVehicleCategoryFilter] = useState('all');
    const [quotationVehicleSearch, setQuotationVehicleSearch] = useState('');
    const [pickupDate, setPickupDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [dropoffDate, setDropoffDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));

    const [extraCharges, setExtraCharges] = useState([{ description: '', amount: 0 }]);

    const [companyName, setCompanyName] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyLogo, setCompanyLogo] = useState(null);
    const [companyContactNumber, setCompanyContactNumber] = useState('');
    const [companyWhatsAppNumber, setCompanyWhatsAppNumber] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const results = await Promise.allSettled([
                    api.get('/vehicles'),
                    api.get('/fleet/categories'),
                    api.get('/clients'),
                    api.get('/contracts'),
                    api.get('/bookings'),
                    api.get('/quotations'),
                    api.get('/settings/company_name'),
                    api.get('/settings/company_address'),
                    api.get('/settings/company_logo'),
                    api.get('/settings/company_contact_number'),
                    api.get('/settings/company_whatsapp_number'),
                ]);

                const getData = (idx, fallback) => {
                    const r = results[idx];
                    return r.status === 'fulfilled' ? (r.value?.data ?? fallback) : fallback;
                };

                setVehicles(getData(0, []));
                const cats = getData(1, []);
                setFleetCategories(Array.isArray(cats) ? cats : []);
                const rawClients = getData(2, []);
                const clientList = Array.isArray(rawClients) ? rawClients : [];
                setCustomers(clientList.filter((c) => c.status !== 'ARCHIVED'));
                setContracts(getData(3, []));
                setBookings(getData(4, []));
                setQuotationHistory(getData(5, []));

                const nameVal = getData(6, { value: 'false' })?.value;
                const addressVal = getData(7, { value: 'false' })?.value;
                const logoVal = getData(8, { value: 'false' })?.value;
                const contactVal = getData(9, { value: 'false' })?.value;
                const whatsappVal = getData(10, { value: 'false' })?.value;

                setCompanyName(nameVal !== 'false' ? (nameVal || '') : '');
                setCompanyAddress(addressVal !== 'false' ? (addressVal || '') : '');
                setCompanyLogo(logoVal && logoVal !== 'false' ? resolveServerUrl(logoVal) : null);
                setCompanyContactNumber(contactVal !== 'false' ? (contactVal || '') : '');
                setCompanyWhatsAppNumber(whatsappVal !== 'false' ? (whatsappVal || '') : '');
            } catch (e) {
                console.error('Failed to load quotation data:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const selectedCustomer = useMemo(
        () => customers.find((c) => c.id === customerId) || null,
        [customers, customerId]
    );

    const selectedVehicle = useMemo(
        () => vehicles.find((v) => v.id === vehicleId) || null,
        [vehicles, vehicleId]
    );

    const vehiclesForQuotation = useMemo(() => {
        return vehicles.filter((v) => {
            const catOk =
                quotationVehicleCategoryFilter === 'all' || v.fleetCategoryId === quotationVehicleCategoryFilter;
            const q = quotationVehicleSearch.trim().toLowerCase();
            const hay = `${v.licensePlate} ${v.vehicleModel?.brand?.name || ''} ${v.vehicleModel?.name || ''} ${v.fleetCategory?.name || ''}`.toLowerCase();
            const searchOk = !q || hay.includes(q);
            return catOk && searchOk;
        });
    }, [vehicles, quotationVehicleCategoryFilter, quotationVehicleSearch]);

    useEffect(() => {
        if (customerMode === 'EXISTING' && selectedCustomer) {
            const inferredName = selectedCustomer.type === 'CORPORATE'
                ? (selectedCustomer.companyName || '')
                : (selectedCustomer.name || '');
            setCustomerName(inferredName);
            setCustomerEmail(selectedCustomer.email || '');
            setCustomerType((selectedCustomer.type || 'LOCAL').toUpperCase());
            setQuotationWhatsAppPhone(pickCustomerWhatsAppPhone(selectedCustomer) || '');
        }
    }, [customerMode, selectedCustomer]);

    const rentalDays = useMemo(() => {
        if (!pickupDate || !dropoffDate) return 1;
        const days = differenceInCalendarDays(new Date(dropoffDate), new Date(pickupDate));
        return Math.max(1, Number.isFinite(days) ? days : 1);
    }, [pickupDate, dropoffDate]);

    const dailyRate = useMemo(() => {
        if (!selectedVehicle) return 0;
        const isForeign = (customerType || '').toUpperCase() === 'FOREIGN';
        if (isForeign) return Number(selectedVehicle.foreignDailyRentalRate || selectedVehicle.dailyRentalRate || 0);
        return Number(selectedVehicle.dailyRentalRate || 0);
    }, [selectedVehicle, customerType]);

    const baseAmount = useMemo(() => dailyRate * rentalDays, [dailyRate, rentalDays]);
    const extraAmount = useMemo(
        () => extraCharges.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
        [extraCharges]
    );
    const grandTotal = baseAmount + extraAmount;

    const quotationNo = useMemo(() => {
        const now = new Date();
        const d = format(now, 'yyyyMMdd-HHmmss');
        return `QT-${d}`;
    }, []);

    const addExtraRow = () => {
        setExtraCharges((prev) => [...prev, { description: '', amount: 0 }]);
    };

    const removeExtraRow = (idx) => {
        setExtraCharges((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateExtraRow = (idx, key, value) => {
        setExtraCharges((prev) =>
            prev.map((r, i) => (i === idx ? { ...r, [key]: key === 'amount' ? Number(value || 0) : value } : r))
        );
    };

    const checkVehicleConflicts = (targetVehicleId, targetPickupDate, targetDropoffDate) => {
        const toDateOnly = (d) => {
            const dt = new Date(d);
            return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
        };
        const reqStart = toDateOnly(targetPickupDate);
        const reqEnd = toDateOnly(targetDropoffDate);
        const isOverlapping = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && aEnd >= bStart;

        const contractConflicts = (contracts || [])
            .filter((c) => c.vehicleId === targetVehicleId && ['UPCOMING', 'IN_PROGRESS', 'RETURN'].includes(String(c.status || '').toUpperCase()))
            .filter((c) => isOverlapping(toDateOnly(c.pickupDate), toDateOnly(c.dropoffDate), reqStart, reqEnd))
            .map((c) => ({
                source: 'Contract',
                ref: c.contractNo || c.id,
                start: format(new Date(c.pickupDate), 'yyyy-MM-dd'),
                end: format(new Date(c.dropoffDate), 'yyyy-MM-dd'),
            }));

        const bookingConflicts = (bookings || [])
            .filter((b) => b.vehicleId === targetVehicleId && ['PENDING', 'CONFIRMED'].includes(String(b.status || '').toUpperCase()))
            .filter((b) => isOverlapping(toDateOnly(b.startDate), toDateOnly(b.endDate), reqStart, reqEnd))
            .map((b) => ({
                source: 'Booking',
                ref: b.id,
                start: format(new Date(b.startDate), 'yyyy-MM-dd'),
                end: format(new Date(b.endDate), 'yyyy-MM-dd'),
            }));

        return [...contractConflicts, ...bookingConflicts];
    };

    const buildLiveQuotationData = () => ({
        quotationNo,
        issueDate: new Date().toISOString(),
        validUntil: addDays(new Date(), 7).toISOString(),
        customerMode,
        customerId: customerMode === 'EXISTING' ? customerId : null,
        customerName: customerName.trim(),
        customerEmail: customerEmail || '',
        customerType,
        vehicleId,
        pickupDate,
        dropoffDate,
        rentalDays,
        dailyRate: Number(dailyRate || 0),
        baseAmount: Number(baseAmount || 0),
        extraCharges: extraCharges.filter((r) => (r.description || '').trim() || Number(r.amount || 0) !== 0),
        extraAmount: Number(extraAmount || 0),
        totalAmount: Number(grandTotal || 0),
        vehicle: selectedVehicle || null,
    });

    const buildQuotationWhatsAppText = (q, vehicle) => {
        const veh = vehicle || q.vehicle;
        const vehLabel = `${veh?.vehicleModel?.brand?.name || ''} ${veh?.vehicleModel?.name || ''}`.trim();
        const issueDate = q.issueDate ? new Date(q.issueDate) : new Date();
        const validUntil = q.validUntil ? new Date(q.validUntil) : addDays(issueDate, 7);
        const rows = Array.isArray(q.extraCharges) ? q.extraCharges : [];
        const extraLines = rows
            .filter((r) => (String(r.description || '').trim() || Number(r.amount || 0) !== 0))
            .map((r) => `• ${String(r.description || 'Extra').trim()}: LKR ${Number(r.amount || 0).toLocaleString()}`)
            .join('\n');

        const parts = [
            `Hello ${q.customerName || 'there'},`,
            '',
            `Quotation *${q.quotationNo || 'Draft'}*`,
            `Vehicle: ${veh?.licensePlate || '-'}${vehLabel ? ` (${vehLabel})` : ''}`,
            `Period: ${format(new Date(q.pickupDate), 'yyyy-MM-dd')} → ${format(new Date(q.dropoffDate), 'yyyy-MM-dd')} (${Number(q.rentalDays || 1)} days)`,
            `Daily rate: LKR ${Number(q.dailyRate || 0).toLocaleString()}`,
            `Base rental: LKR ${Number(q.baseAmount || 0).toLocaleString()}`,
        ];
        if (extraLines) {
            parts.push('Extras:', extraLines);
        }
        parts.push(
            '',
            `*Grand total: LKR ${Number(q.totalAmount || 0).toLocaleString()}*`,
            '',
            `Valid through ${format(validUntil, 'yyyy-MM-dd')}.`,
            '',
            'Reply to confirm or if you have questions. We can provide a PDF on request.',
        );
        if (companyName.trim()) {
            parts.push('', `_${companyName.trim()}_`);
        }
        return parts.join('\n');
    };

    const sendQuotationViaWhatsApp = (savedQuotation = null) => {
        const q = savedQuotation || buildLiveQuotationData();
        const vehicle = q.vehicle || vehicles.find((v) => v.id === q.vehicleId) || null;
        if (!vehicle) {
            alert('Please select a vehicle first.');
            return;
        }
        const phoneRaw =
            (savedQuotation && pickCustomerWhatsAppPhone(savedQuotation.customer)) ||
            quotationWhatsAppPhone.trim() ||
            pickCustomerWhatsAppPhone(selectedCustomer);
        const phone = normalizePhoneForWhatsApp(phoneRaw);
        if (!phone) {
            alert(
                'No WhatsApp number found. For new customers, enter mobile/WhatsApp below. For existing customers, ensure phone or mobile is saved on the customer record.'
            );
            return;
        }
        const msg = buildQuotationWhatsAppText(q, vehicle);
        openWhatsAppWeb(phone, msg);
    };

    const buildQuotationHtml = (q) => {
        const issueDate = q.issueDate ? new Date(q.issueDate) : new Date();
        const validUntil = q.validUntil ? new Date(q.validUntil) : addDays(issueDate, 7);
        const vehicle = q.vehicle || selectedVehicle || null;
        const rows = Array.isArray(q.extraCharges) ? q.extraCharges : [];

        const showBrand = hasPrintBrandContent({
            logoUrl: companyLogo,
            name: companyName,
            address: companyAddress,
            contact: companyContactNumber,
            whatsapp: companyWhatsAppNumber,
        });
        const logoImg = companyLogo
            ? `<img class="doc-logo" src="${qEscape(companyLogo)}" alt="" />`
            : '';
        const nameBlock = companyName.trim()
            ? `<div class="doc-company-name">${qEscape(companyName.trim())}</div>`
            : companyLogo
                ? `<div class="doc-company-name" style="font-size:16px;color:var(--muted);">Your rental partner</div>`
                : '';
        const addrBlock = companyAddress.trim()
            ? `<div class="doc-company-muted">${qEscape(companyAddress).replace(/\n/g, '<br/>')}</div>`
            : '';
        const chips = [];
        if (companyContactNumber.trim()) {
            chips.push(`<span class="doc-chip">Contact ${qEscape(companyContactNumber.trim())}</span>`);
        }
        if (companyWhatsAppNumber.trim()) {
            chips.push(`<span class="doc-chip">WhatsApp ${qEscape(companyWhatsAppNumber.trim())}</span>`);
        }
        const chipRow = chips.length ? `<div class="doc-chip-row">${chips.join('')}</div>` : '';
        const brandSection = showBrand
            ? `<div class="doc-brand-row">${logoImg}<div>${nameBlock}${addrBlock}${chipRow}</div></div>`
            : '';

        const vehLabel = `${vehicle?.vehicleModel?.brand?.name || ''} ${vehicle?.vehicleModel?.name || ''}`.trim();
        const rowsHtml = `
      <tr><td>Daily rate × ${Number(q.rentalDays || 1)} day(s) @ ${Number(q.dailyRate || 0).toLocaleString()} LKR</td><td>${Number(q.baseAmount || 0).toLocaleString()}</td></tr>
      ${rows.map((r) => `
      <tr><td>${qEscape(r.description || 'Extra charge')}</td><td>${Number(r.amount || 0).toLocaleString()}</td></tr>`).join('')}`;

        return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${qEscape(q.quotationNo || 'Quotation')}</title>
  <style>${DOCUMENT_PRINT_STYLES}</style>
</head>
<body>
  <div class="doc">
    <div class="doc-topbar"></div>
    <div class="doc-inner">
      ${brandSection}
      <div class="doc-headline">
        <div>
          <div class="doc-kind">Quotation</div>
          <div class="doc-main-id">${qEscape(q.quotationNo || 'Draft')}</div>
          <div class="doc-meta">Issued <b>${qEscape(issueDate.toLocaleString())}</b> · Valid through <b>${qEscape(format(validUntil, 'yyyy-MM-dd'))}</b></div>
        </div>
        <div class="doc-pill doc-pill-em">${Number(q.rentalDays || 1)} day rental</div>
      </div>

      <div class="doc-cards">
        <div class="doc-card">
          <div class="doc-card-label">Customer</div>
          <div class="doc-card-value">${qEscape(q.customerName || '')}</div>
          <div class="doc-card-sub">${qEscape(q.customerEmail || '—')}</div>
          <div class="doc-chip-row" style="margin-top:10px;"><span class="doc-chip">${qEscape(q.customerType || '')}</span></div>
        </div>
        <div class="doc-card">
          <div class="doc-card-label">Vehicle</div>
          <div class="doc-card-value">${qEscape(vehicle?.licensePlate || '')}</div>
          <div class="doc-card-sub">${qEscape(vehLabel)}</div>
        </div>
      </div>

      <div class="doc-card" style="margin-bottom:16px;background:#fff;border-style:dashed;">
        <div class="doc-card-label">Rental period</div>
        <div class="doc-card-value" style="font-size:15px;">
          ${qEscape(format(new Date(q.pickupDate), 'yyyy-MM-dd'))} → ${qEscape(format(new Date(q.dropoffDate), 'yyyy-MM-dd'))}
        </div>
      </div>

      <div class="doc-table-wrap">
        <table class="doc-table">
          <thead>
            <tr><th>Description</th><th>Amount (LKR)</th></tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot>
            <tr><td>Grand total</td><td>${Number(q.totalAmount || 0).toLocaleString()}</td></tr>
          </tfoot>
        </table>
      </div>

      <div class="doc-foot">
        System-generated quotation — no signature required. Valid for 7 days from the issue date.
        Use your browser print dialog and choose &quot;Save as PDF&quot; to download.
      </div>
    </div>
  </div>
</body>
</html>`;
    };

    const openPrintHtml = (html) => {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
    };

    const downloadQuotationPdf = (quotationRow = null) => {
        const q = quotationRow || buildLiveQuotationData();
        if (!q.vehicleId) {
            alert('Please select a vehicle first.');
            return;
        }
        if (!String(q.customerName || '').trim()) {
            alert('Please provide customer name.');
            return;
        }

        const conflicts = checkVehicleConflicts(q.vehicleId, q.pickupDate, q.dropoffDate);
        if (!quotationRow && conflicts.length > 0) {
            const details = conflicts
                .map((c, i) => `${i + 1}. ${c.source} ${c.ref} -> ${c.start} to ${c.end}`)
                .join('\n');
            alert(`This vehicle already has an existing booking/contract in the selected date range.\n\nSelected: ${q.pickupDate} to ${q.dropoffDate}\n\nConflicts:\n${details}`);
            return;
        }
        openPrintHtml(buildQuotationHtml(q));
    };

    const saveQuotation = async () => {
        const q = buildLiveQuotationData();
        if (!q.vehicleId) return alert('Please select a vehicle first.');
        if (!String(q.customerName || '').trim()) return alert('Please provide customer name.');

        const conflicts = checkVehicleConflicts(q.vehicleId, q.pickupDate, q.dropoffDate);
        if (conflicts.length > 0) {
            const details = conflicts
                .map((c, i) => `${i + 1}. ${c.source} ${c.ref} -> ${c.start} to ${c.end}`)
                .join('\n');
            alert(`This vehicle already has an existing booking/contract in the selected date range.\n\nSelected: ${q.pickupDate} to ${q.dropoffDate}\n\nConflicts:\n${details}`);
            return;
        }

        try {
            setSaving(true);
            const payload = {
                customerMode: q.customerMode,
                customerId: q.customerMode === 'EXISTING' ? q.customerId : null,
                customerName: q.customerName,
                customerEmail: q.customerEmail || null,
                customerType: q.customerType,
                vehicleId: q.vehicleId,
                pickupDate: q.pickupDate,
                dropoffDate: q.dropoffDate,
                rentalDays: q.rentalDays,
                dailyRate: q.dailyRate,
                baseAmount: q.baseAmount,
                extraCharges: q.extraCharges,
                extraAmount: q.extraAmount,
                totalAmount: q.totalAmount,
            };
            await api.post('/quotations', payload);
            const { data } = await api.get('/quotations');
            setQuotationHistory(data || []);
            alert('Quotation saved successfully.');
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || 'Failed to save quotation');
        } finally {
            setSaving(false);
        }
    };

    const showScreenBrand = hasPrintBrandContent({
        logoUrl: companyLogo,
        name: companyName,
        address: companyAddress,
        contact: companyContactNumber,
        whatsapp: companyWhatsAppNumber,
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-black tracking-tight text-foreground">Quotations</h1>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => downloadQuotationPdf()} disabled={loading || saving} className="rounded-xl font-black text-[10px] uppercase tracking-widest">
                        <FileText className="w-4 h-4 mr-2" /> Download PDF
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => sendQuotationViaWhatsApp(null)}
                        disabled={loading || saving}
                        className="rounded-xl font-black text-[10px] uppercase tracking-widest border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                    >
                        <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp Web
                    </Button>
                    <Button onClick={saveQuotation} disabled={loading || saving} className="rounded-xl font-black text-[10px] uppercase tracking-widest">
                        {saving ? 'Saving...' : 'Save Quotation'}
                    </Button>
                </div>
            </div>

            {showScreenBrand ? (
                <div className="rounded-[1.75rem] border border-primary/15 bg-gradient-to-br from-primary/[0.07] via-card to-card p-6 flex flex-col sm:flex-row gap-5 items-start shadow-sm">
                    {companyLogo ? (
                        <img
                            src={companyLogo}
                            alt=""
                            className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl object-contain bg-white/90 border border-border"
                        />
                    ) : null}
                    <div className="min-w-0 space-y-2 flex-1">
                        {companyName.trim() ? (
                            <div className="text-2xl font-black tracking-tight text-foreground">{companyName.trim()}</div>
                        ) : (
                            <div className="text-lg font-bold text-muted-foreground">Company profile</div>
                        )}
                        {companyAddress.trim() ? (
                            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed max-w-xl">{companyAddress.trim()}</p>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                            {companyContactNumber.trim() ? (
                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    {companyContactNumber.trim()}
                                </span>
                            ) : null}
                            {companyWhatsAppNumber.trim() ? (
                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    WhatsApp {companyWhatsAppNumber.trim()}
                                </span>
                            ) : null}
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-1">Shown on every quotation PDF</p>
                    </div>
                </div>
            ) : null}

            <Card className="rounded-[1.75rem] border-border/80 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                    <CardTitle className="text-lg font-black tracking-tight">Quotation generation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Customer Source</Label>
                            <Select value={customerMode} onValueChange={setCustomerMode}>
                                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EXISTING">Existing Customer</SelectItem>
                                    <SelectItem value="NEW">New Customer (No record creation)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {customerMode === 'EXISTING' ? (
                            <div className="space-y-2">
                                <Label>Customer</Label>
                                <Select value={customerId} onValueChange={setCustomerId}>
                                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                                    <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {(c.type === 'CORPORATE' ? c.companyName : c.name) || c.email} ({c.type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Customer Type</Label>
                                <Select value={customerType} onValueChange={setCustomerType}>
                                    <SelectTrigger><SelectValue placeholder="Select customer type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOCAL">Local</SelectItem>
                                        <SelectItem value="FOREIGN">Foreign</SelectItem>
                                        <SelectItem value="CORPORATE">Corporate</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Customer Name</Label>
                            <Input
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                disabled={customerMode === 'EXISTING'}
                                placeholder="Enter customer name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Customer Email (Optional)</Label>
                            <Input
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                disabled={customerMode === 'EXISTING'}
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>WhatsApp / mobile (for Send via WhatsApp)</Label>
                            <Input
                                value={quotationWhatsAppPhone}
                                onChange={(e) => setQuotationWhatsAppPhone(e.target.value)}
                                placeholder="e.g. 0771234567 or 94771234567 — prefilled from customer when possible"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Opens WhatsApp Web with a pre-filled quotation summary. Edit this if the customer uses a different WhatsApp number.
                            </p>
                        </div>
                    </div>

                    {customerMode === 'EXISTING' ? (
                        <div className="text-sm text-muted-foreground">
                            Customer Type: <b>{customerType || '-'}</b>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Filter by category</Label>
                            <Select value={quotationVehicleCategoryFilter} onValueChange={setQuotationVehicleCategoryFilter}>
                                <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All categories</SelectItem>
                                    {fleetCategories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Search vehicles</Label>
                            <Input
                                placeholder="Plate, brand, model, category…"
                                value={quotationVehicleSearch}
                                onChange={(e) => setQuotationVehicleSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Vehicle</Label>
                            <Select value={vehicleId} onValueChange={setVehicleId}>
                                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                                <SelectContent>
                                    {vehiclesForQuotation.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>
                                            {v.licensePlate} - {v.vehicleModel?.brand?.name} {v.vehicleModel?.name}
                                            {v.fleetCategory?.name ? ` · ${v.fleetCategory.name}` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Pickup Date</Label>
                            <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Drop-off Date</Label>
                            <Input type="date" value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} />
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Extra Charges</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {extraCharges.map((row, idx) => (
                                <div key={`row-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <Input
                                        className="md:col-span-8"
                                        placeholder="Description"
                                        value={row.description}
                                        onChange={(e) => updateExtraRow(idx, 'description', e.target.value)}
                                    />
                                    <Input
                                        className="md:col-span-3"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="Amount"
                                        value={row.amount}
                                        onChange={(e) => updateExtraRow(idx, 'amount', e.target.value)}
                                    />
                                    <Button
                                        variant="destructive"
                                        className="md:col-span-1"
                                        onClick={() => removeExtraRow(idx)}
                                        disabled={extraCharges.length === 1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" onClick={addExtraRow}>
                                <Plus className="w-4 h-4 mr-2" /> Add Charge Row
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-primary/15 bg-gradient-to-b from-card to-muted/10 overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-black tracking-tight flex items-center gap-2">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                                    <FileText className="h-4 w-4" />
                                </span>
                                Live preview summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-xl border border-border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40 border-0">
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Item</TableHead>
                                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Amount (LKR)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Base rental ({rentalDays} day(s) × {Number(dailyRate).toLocaleString()})</TableCell>
                                            <TableCell className="text-right font-mono font-semibold">{Number(baseAmount).toLocaleString()}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Extra charges</TableCell>
                                            <TableCell className="text-right font-mono font-semibold">{Number(extraAmount).toLocaleString()}</TableCell>
                                        </TableRow>
                                        <TableRow className="bg-primary/5 border-t-2 border-primary/30">
                                            <TableCell className="font-black">Grand total</TableCell>
                                            <TableCell className="text-right font-black font-mono text-base text-primary">{Number(grandTotal).toLocaleString()}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
                                Quotation validity: 7 days. Quotations do not create contracts and do not affect P&amp;L.
                            </div>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Quotation History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Quotation No</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Vehicle</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead className="text-right">Total (LKR)</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotationHistory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        No quotations saved yet.
                                    </TableCell>
                                </TableRow>
                            ) : quotationHistory.map((q) => (
                                <TableRow key={q.id}>
                                    <TableCell>{q.quotationNo}</TableCell>
                                    <TableCell>{q.customerName}</TableCell>
                                    <TableCell>
                                        {q.vehicle?.licensePlate} - {q.vehicle?.vehicleModel?.brand?.name} {q.vehicle?.vehicleModel?.name}
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(q.pickupDate), 'yyyy-MM-dd')} to {format(new Date(q.dropoffDate), 'yyyy-MM-dd')}
                                    </TableCell>
                                    <TableCell className="text-right">{Number(q.totalAmount || 0).toLocaleString()}</TableCell>
                                    <TableCell>{q.createdAt ? format(new Date(q.createdAt), 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => downloadQuotationPdf(q)}>
                                                <FileText className="w-4 h-4 mr-2" /> PDF
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
                                                onClick={() => sendQuotationViaWhatsApp(q)}
                                            >
                                                <MessageCircle className="w-4 h-4 mr-2" /> WA
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

