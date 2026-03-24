import { useEffect, useMemo, useState } from 'react';
import { format, differenceInCalendarDays, addDays } from 'date-fns';
import api, { resolveServerUrl } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, FileText } from 'lucide-react';

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
    const [customerType, setCustomerType] = useState('LOCAL'); // LOCAL | FOREIGN | CORPORATE

    const [vehicleId, setVehicleId] = useState('');
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
                setCustomers(getData(1, []));
                setContracts(getData(2, []));
                setBookings(getData(3, []));
                setQuotationHistory(getData(4, []));

                const nameVal = getData(5, { value: 'false' })?.value;
                const addressVal = getData(6, { value: 'false' })?.value;
                const logoVal = getData(7, { value: 'false' })?.value;
                const contactVal = getData(8, { value: 'false' })?.value;
                const whatsappVal = getData(9, { value: 'false' })?.value;

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

    useEffect(() => {
        if (customerMode === 'EXISTING' && selectedCustomer) {
            const inferredName = selectedCustomer.type === 'CORPORATE'
                ? (selectedCustomer.companyName || '')
                : (selectedCustomer.name || '');
            setCustomerName(inferredName);
            setCustomerEmail(selectedCustomer.email || '');
            setCustomerType((selectedCustomer.type || 'LOCAL').toUpperCase());
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

    const buildQuotationHtml = (q) => {
        const issueDate = q.issueDate ? new Date(q.issueDate) : new Date();
        const validUntil = q.validUntil ? new Date(q.validUntil) : addDays(issueDate, 7);
        const vehicle = q.vehicle || selectedVehicle || null;
        const rows = Array.isArray(q.extraCharges) ? q.extraCharges : [];
        return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${qEscape(q.quotationNo || 'Quotation')}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    .row { display:flex; justify-content:space-between; gap:16px; }
    .muted { color:#555; font-size:12px; }
    table { width:100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border-bottom: 1px solid #ddd; padding: 10px 6px; text-align:left; font-size: 13px; }
    th { font-size: 11px; text-transform: uppercase; color:#444; }
    .right { text-align:right; }
    .total { font-weight: 800; font-size: 16px; }
  </style>
</head>
<body>
  <div style="margin-bottom:18px;">
    <div style="display:flex;align-items:flex-start;gap:14px;">
      ${companyLogo ? `<img src="${qEscape(companyLogo)}" alt="Company Logo" style="height:52px; width:52px; object-fit:contain; border-radius:10px; background:rgba(255,255,255,0.6);" />` : ''}
      <div>
        ${companyName ? `<div style="font-weight:900;font-size:22px;line-height:1.1;">${qEscape(companyName)}</div>` : ''}
        ${companyAddress ? `<div class="muted" style="margin-top:6px;">${qEscape(companyAddress).replace(/\n/g, '<br/>')}</div>` : ''}
        ${companyContactNumber ? `<div class="muted" style="margin-top:6px;">Contact: <b>${qEscape(companyContactNumber)}</b></div>` : ''}
        ${companyWhatsAppNumber ? `<div class="muted" style="margin-top:4px;">WhatsApp: <b>${qEscape(companyWhatsAppNumber)}</b></div>` : ''}
      </div>
    </div>
  </div>

  <div class="row">
    <div>
      <div style="font-weight:900; font-size:22px;">QUOTATION</div>
      <div class="muted">Quotation No: <b>${qEscape(q.quotationNo || '-')}</b></div>
      <div class="muted">Date: <b>${qEscape(issueDate.toLocaleString())}</b></div>
      <div class="muted">Valid Until: <b>${qEscape(format(validUntil, 'yyyy-MM-dd'))}</b></div>
    </div>
  </div>

  <div style="margin-top:18px;" class="row">
    <div>
      <div class="muted">Customer</div>
      <div style="font-weight:700;">${qEscape(q.customerName || '')}</div>
      <div class="muted">${qEscape(q.customerEmail || '-')}</div>
      <div class="muted">Customer Type: <b>${qEscape(q.customerType || '')}</b></div>
    </div>
    <div style="text-align:right;">
      <div class="muted">Vehicle</div>
      <div style="font-weight:700;">${qEscape(vehicle?.licensePlate || '')}</div>
      <div class="muted">${qEscape((vehicle?.vehicleModel?.brand?.name || '') + ' ' + (vehicle?.vehicleModel?.name || '')).trim()}</div>
    </div>
  </div>

  <div style="margin-top:12px;" class="row">
    <div class="muted">Rental Period: <b>${qEscape(format(new Date(q.pickupDate), 'yyyy-MM-dd'))}</b> to <b>${qEscape(format(new Date(q.dropoffDate), 'yyyy-MM-dd'))}</b> (${Number(q.rentalDays || 1)} day(s))</div>
  </div>

  <table>
    <thead>
      <tr><th>Description</th><th class="right">Amount (LKR)</th></tr>
    </thead>
    <tbody>
      <tr><td>Daily Rate x ${Number(q.rentalDays || 1)} day(s) (Rate: ${Number(q.dailyRate || 0).toLocaleString()})</td><td class="right">${Number(q.baseAmount || 0).toLocaleString()}</td></tr>
      ${rows.map((r) => `
        <tr><td>${qEscape(r.description || 'Extra Charge')}</td><td class="right">${Number(r.amount || 0).toLocaleString()}</td></tr>
      `).join('')}
      <tr><td class="total">Grand Total</td><td class="right total">${Number(q.totalAmount || 0).toLocaleString()}</td></tr>
    </tbody>
  </table>

  <div class="muted" style="margin-top:18px;">This is a system generated document. No signature required.</div>
  <div class="muted" style="margin-top:6px;">Quotation validity: 7 days from the issue date.</div>
  <div class="muted" style="margin-top:12px;">Print tip: choose "Save as PDF" in the print dialog.</div>
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

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => downloadQuotationPdf()} disabled={loading || saving}>
                        <FileText className="w-4 h-4 mr-2" /> Download PDF
                    </Button>
                    <Button onClick={saveQuotation} disabled={loading || saving}>
                        {saving ? 'Saving...' : 'Save Quotation'}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Quotation Generation</CardTitle>
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

                    {customerMode === 'EXISTING' ? (
                        <div className="text-sm text-muted-foreground">
                            Customer Type: <b>{customerType || '-'}</b>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Vehicle</Label>
                            <Select value={vehicleId} onValueChange={setVehicleId}>
                                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                                <SelectContent>
                                    {vehicles.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>
                                            {v.licensePlate} - {v.vehicleModel?.brand?.name} {v.vehicleModel?.name}
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

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Quotation Preview Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Amount (LKR)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Base Rental ({rentalDays} day(s) x {Number(dailyRate).toLocaleString()})</TableCell>
                                        <TableCell className="text-right">{Number(baseAmount).toLocaleString()}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Extra Charges</TableCell>
                                        <TableCell className="text-right">{Number(extraAmount).toLocaleString()}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-bold">Grand Total</TableCell>
                                        <TableCell className="text-right font-bold">{Number(grandTotal).toLocaleString()}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                            <div className="text-xs text-muted-foreground mt-4">
                                Quotation validity: 7 days. Quotations do not create contracts and do not affect P&L.
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
                                        <Button variant="outline" size="sm" onClick={() => downloadQuotationPdf(q)}>
                                            <FileText className="w-4 h-4 mr-2" /> PDF
                                        </Button>
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

