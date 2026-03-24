import { useState, useEffect } from 'react';
import api, { resolveServerUrl } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Download, FileText, TrendingUp, TrendingDown, DollarSign, Car } from 'lucide-react';

export default function PLReports() {
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState('all');
    const [startDate, setStartDate] = useState(format(new Date().setMonth(new Date().getMonth() - 1), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [companyName, setCompanyName] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyLogo, setCompanyLogo] = useState(null);
    const [companyContactNumber, setCompanyContactNumber] = useState('');
    const [companyWhatsAppNumber, setCompanyWhatsAppNumber] = useState('');

    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const { data } = await api.get('/vehicles');
                setVehicles(data);
            } catch (error) {
                console.error('Failed to fetch vehicles', error);
            }
        };
        fetchVehicles();
    }, []);

    useEffect(() => {
        const fetchCompanyProfile = async () => {
            try {
                const [nameRes, addressRes, logoRes, contactRes, whatsappRes] = await Promise.all([
                    api.get('/settings/company_name'),
                    api.get('/settings/company_address'),
                    api.get('/settings/company_logo'),
                    api.get('/settings/company_contact_number'),
                    api.get('/settings/company_whatsapp_number'),
                ]);
                setCompanyName(nameRes.data.value !== 'false' ? (nameRes.data.value || '') : '');
                setCompanyAddress(addressRes.data.value !== 'false' ? (addressRes.data.value || '') : '');
                const rawLogo = logoRes.data.value !== 'false' ? (logoRes.data.value || null) : null;
                setCompanyLogo(rawLogo ? resolveServerUrl(rawLogo) : null);
                setCompanyContactNumber(contactRes.data.value !== 'false' ? (contactRes.data.value || '') : '');
                setCompanyWhatsAppNumber(whatsappRes.data.value !== 'false' ? (whatsappRes.data.value || '') : '');
            } catch (e) {
                console.error('Failed to fetch company profile for P&L print:', e);
            }
        };

        fetchCompanyProfile();
    }, []);

    const fetchPLReport = async () => {
        setLoading(true);
        try {
            const qs = selectedVehicle === 'all'
                ? `/reports/vehicle-pl?startDate=${startDate}&endDate=${endDate}`
                : `/reports/vehicle-pl?vehicleId=${selectedVehicle}&startDate=${startDate}&endDate=${endDate}`;
            const { data } = await api.get(qs);
            setReportData(data);
        } catch (error) {
            console.error('Failed to fetch P&L report', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = () => {
        window.print();
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    {companyLogo ? (
                        <img
                            src={companyLogo}
                            alt="Company Logo"
                            style={{ height: 52, width: 52, objectFit: 'contain', borderRadius: 10, background: 'rgba(255,255,255,0.6)' }}
                        />
                    ) : null}
                    <div>
                        {companyName?.trim() ? (
                            <div style={{ fontWeight: 900, fontSize: 26, lineHeight: 1.1 }}>
                                {companyName.trim()}
                            </div>
                        ) : null}
                        {companyAddress?.trim() ? (
                            <div style={{ color: '#555', fontSize: 12, marginTop: 6, whiteSpace: 'pre-line' }}>
                                {companyAddress}
                            </div>
                        ) : null}
                        {companyContactNumber?.trim() ? (
                            <div style={{ color: '#555', fontSize: 12, marginTop: 6 }}>
                                Contact: <b>{companyContactNumber.trim()}</b>
                            </div>
                        ) : null}
                        {companyWhatsAppNumber?.trim() ? (
                            <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>
                                WhatsApp: <b>{companyWhatsAppNumber.trim()}</b>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase tracking-widest">Financial Analytics</h1>
                    <p className="text-muted-foreground font-medium mt-1">Vehicle Profit & Loss performance tracking.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={downloadPDF} className="rounded-xl font-black text-[10px] uppercase tracking-widest border-primary/20 hover:bg-primary/5">
                        <FileText className="w-4 h-4 mr-2" /> PDF Report
                    </Button>
                    <Button variant="outline" className="rounded-xl font-black text-[10px] uppercase tracking-widest border-primary/20 hover:bg-primary/5">
                        <Download className="w-4 h-4 mr-2" /> Excel Export
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="bg-card/50 backdrop-blur-md border-border rounded-[2.5rem] shadow-sm overflow-hidden">
                <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Vehicle</Label>
                            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                                <SelectTrigger className="bg-secondary/50 border-border rounded-xl h-12">
                                    <SelectValue placeholder="Select Vehicle" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                        <SelectItem value="all">All Vehicles (Company P&L)</SelectItem>
                                    {vehicles.map(v => (
                                        <SelectItem key={v.id} value={v.id}>{v.licensePlate} - {v.vehicleModel?.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">From Date</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-secondary/50 border-border rounded-xl h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">To Date</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-secondary/50 border-border rounded-xl h-12"
                            />
                        </div>
                        <Button
                            onClick={fetchPLReport}
                            disabled={loading}
                            className="bg-primary text-white font-black uppercase tracking-widest text-xs h-12 rounded-xl shadow-lg shadow-primary/20"
                        >
                            Generate Report
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {reportData && (
                <div className="space-y-8 animate-in slide-in-from-bottom duration-700">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-primary text-white border-none rounded-[2.5rem] shadow-2xl shadow-primary/20 overflow-hidden relative">
                            <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                                <DollarSign size={150} />
                            </div>
                            <CardHeader>
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Income</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-black tracking-tighter">Rs. {reportData.totalIncome.toLocaleString()}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border rounded-[2.5rem] shadow-sm relative overflow-hidden">
                            <div className="absolute right-[-20px] top-[-20px] text-muted-foreground/5 rotate-12">
                                <TrendingDown size={150} />
                            </div>
                            <CardHeader>
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Expenses</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-black tracking-tighter text-foreground">Rs. {reportData.totalExpenses.toLocaleString()}</p>
                            </CardContent>
                        </Card>

                        <Card className={cn(
                            "border-none rounded-[2.5rem] shadow-2xl overflow-hidden relative",
                            reportData.profitLoss >= 0 ? "bg-green-500 text-white shadow-green-500/20" : "bg-red-500 text-white shadow-red-500/20"
                        )}>
                            <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                                {reportData.profitLoss >= 0 ? <TrendingUp size={150} /> : <TrendingDown size={150} />}
                            </div>
                            <CardHeader>
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Net Profit/Loss</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-black tracking-tighter">Rs. {reportData.profitLoss.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="bg-card border-border rounded-[2.5rem] shadow-sm">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                    <Car className="w-6 h-6 text-primary" /> Vehicle Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0">
                                <div className="space-y-4">
                                    <div className="flex justify-between py-3 border-b border-border/50">
                                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Plate Number</span>
                                        <span className="font-black text-foreground">{reportData.vehicle.plate}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-border/50">
                                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Model</span>
                                        <span className="font-black text-foreground">{reportData.vehicle.model}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-border/50">
                                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Ownership</span>
                                        <Badge className="bg-primary/10 text-primary border-primary/20 font-black text-[10px] uppercase tracking-widest">
                                            {reportData.vehicle.ownership === 'COMPANY' ? 'Company Owned' : '3rd Party'}
                                        </Badge>
                                    </div>
                                    {reportData.vehicle.vendor && (
                                        <div className="flex justify-between py-3 border-b border-border/50">
                                            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Vendor</span>
                                            <span className="font-black text-foreground">{reportData.vehicle.vendor}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border rounded-[2.5rem] shadow-sm">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black uppercase tracking-tight">Expense Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0">
                                <div className="space-y-4">
                                    <div className="flex justify-between py-3 border-b border-border/50">
                                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Maintenance & Repairs</span>
                                        <span className="font-black text-foreground">Rs. {reportData.breakdown.maintenance.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-border/50">
                                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Direct Expenses</span>
                                        <span className="font-black text-foreground">Rs. {reportData.breakdown.directExpenses.toLocaleString()}</span>
                                    </div>
                                    {(reportData.isCompanyView || reportData.vehicle.ownership === 'THIRD_PARTY') && (
                                        <>
                                            <div className="flex justify-between py-3 border-b border-border/50">
                                                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Vendor Monthly Payments</span>
                                                <span className="font-black text-foreground">Rs. {reportData.breakdown.vendorPayments.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between py-3 border-b border-border/50">
                                                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Unrealized Co-Paid Costs</span>
                                                <span className="font-black text-red-500">Rs. {reportData.breakdown.unrealizedCosts.toLocaleString()}</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex justify-between py-4 bg-secondary/20 px-4 rounded-xl mt-4">
                                        <span className="text-sm font-black uppercase tracking-widest text-foreground">Total Period Expenses</span>
                                        <span className="font-black text-foreground text-lg">Rs. {reportData.totalExpenses.toLocaleString()}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="bg-card border-border rounded-[2.5rem] shadow-sm">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black uppercase tracking-tight">Income Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0">
                                <div className="space-y-4">
                                    <div className="flex justify-between py-3 border-b border-border/50">
                                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Upfront Invoice Income</span>
                                        <span className="font-black text-foreground">Rs. {Number(reportData.breakdownCards?.income?.upfront || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-border/50">
                                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Return Settlement Income</span>
                                        <span className="font-black text-foreground">Rs. {Number(reportData.breakdownCards?.income?.return || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-border/50">
                                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Other Income</span>
                                        <span className="font-black text-foreground">Rs. {Number(reportData.breakdownCards?.income?.other || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-4 bg-secondary/20 px-4 rounded-xl mt-4">
                                        <span className="text-sm font-black uppercase tracking-widest text-foreground">Total Period Income</span>
                                        <span className="font-black text-foreground text-lg">Rs. {Number(reportData.totalIncome || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border rounded-[2.5rem] shadow-sm">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black uppercase tracking-tight">Liabilities (Deposits) Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0">
                                <div className="space-y-4">
                                    <div className="flex justify-between py-3 border-b border-border/50">
                                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Deposits Received (Liability +)</span>
                                        <span className="font-black text-foreground">Rs. {Number(reportData.breakdownCards?.liabilities?.created || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-border/50">
                                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Deposits Settled/Refunded (Liability -)</span>
                                        <span className="font-black text-foreground">Rs. {Number(reportData.breakdownCards?.liabilities?.settled || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-4 bg-secondary/20 px-4 rounded-xl mt-4">
                                        <span className="text-sm font-black uppercase tracking-widest text-foreground">Net Liability Balance</span>
                                        <span className="font-black text-foreground text-lg">Rs. {Number(reportData.breakdownCards?.liabilities?.net || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Drill-down tables */}
                    <div className="grid grid-cols-1 gap-8">
                        <Card className="bg-card border-border rounded-[2.5rem] shadow-sm overflow-hidden">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black uppercase tracking-tight">Income Breakdown (Sources)</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Invoice</TableHead>
                                            <TableHead>Contract</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead className="text-right">Amount (LKR)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(reportData.income || []).length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">No income entries for this period.</TableCell>
                                            </TableRow>
                                        ) : (
                                            (reportData.income || []).map((e) => (
                                                <TableRow key={e.id}>
                                                    <TableCell>{e.createdAt ? format(new Date(e.createdAt), 'MMM dd, yyyy') : '-'}</TableCell>
                                                    <TableCell className="font-mono text-xs font-bold">{e.invoiceNo || '-'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{e.contractNo || '-'}</TableCell>
                                                    <TableCell>{e.customer?.name || e.customer?.email || '-'}</TableCell>
                                                    <TableCell className="text-right font-black">Rs. {Number(e.amount || 0).toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border rounded-[2.5rem] shadow-sm overflow-hidden">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black uppercase tracking-tight">Liability Breakdown (Security Deposits)</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Invoice</TableHead>
                                            <TableHead>Contract</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead className="text-right">Amount (LKR)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(reportData.liabilities || []).length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">No liability entries for this period.</TableCell>
                                            </TableRow>
                                        ) : (
                                            (reportData.liabilities || []).map((e) => (
                                                <TableRow key={e.id}>
                                                    <TableCell>{e.createdAt ? format(new Date(e.createdAt), 'MMM dd, yyyy') : '-'}</TableCell>
                                                    <TableCell className="font-mono text-xs font-bold">{e.invoiceNo || '-'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{e.contractNo || '-'}</TableCell>
                                                    <TableCell>{e.customer?.name || e.customer?.email || '-'}</TableCell>
                                                    <TableCell className="text-right font-black">Rs. {Number(e.amount || 0).toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                                <div className="text-xs text-muted-foreground mt-3">
                                    Note: Positive amount = liability created (deposit received). Negative amount = liability settled/refunded/consumed.
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border rounded-[2.5rem] shadow-sm overflow-hidden">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black uppercase tracking-tight">Expense Breakdown (Line Items)</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-6">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Maintenance & Repairs</div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Amount (LKR)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(reportData.expenses?.maintenance || []).length === 0 ? (
                                                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No maintenance records.</TableCell></TableRow>
                                            ) : (
                                                (reportData.expenses.maintenance || []).map(m => (
                                                    <TableRow key={m.id}>
                                                        <TableCell>{m.date ? format(new Date(m.date), 'MMM dd, yyyy') : '-'}</TableCell>
                                                        <TableCell>{m.description || '-'}</TableCell>
                                                        <TableCell className="text-right font-black">Rs. {Number(m.amount || 0).toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Direct Expenses</div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Amount (LKR)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(reportData.expenses?.direct || []).length === 0 ? (
                                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No direct expense records.</TableCell></TableRow>
                                            ) : (
                                                (reportData.expenses.direct || []).map(e => (
                                                    <TableRow key={e.id}>
                                                        <TableCell>{e.date ? format(new Date(e.date), 'MMM dd, yyyy') : '-'}</TableCell>
                                                        <TableCell className="font-mono text-xs">{e.category || '-'}</TableCell>
                                                        <TableCell>{e.description || '-'}</TableCell>
                                                        <TableCell className="text-right font-black">Rs. {Number(e.amount || 0).toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {(reportData.isCompanyView || reportData.vehicle?.ownership === 'THIRD_PARTY') && (
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Vendor Monthly Payments</div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Vendor</TableHead>
                                                    <TableHead>Bill No</TableHead>
                                                    <TableHead className="text-right">Amount (LKR)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(reportData.expenses?.vendorBills || []).length === 0 ? (
                                                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No vendor bills.</TableCell></TableRow>
                                                ) : (
                                                    (reportData.expenses.vendorBills || []).map(b => (
                                                        <TableRow key={b.id}>
                                                            <TableCell>{b.date ? format(new Date(b.date), 'MMM dd, yyyy') : '-'}</TableCell>
                                                            <TableCell>{b.vendor?.name || b.vendor?.email || '-'}</TableCell>
                                                            <TableCell className="font-mono text-xs">{b.billNumber || '-'}</TableCell>
                                                            <TableCell className="text-right font-black">Rs. {Number(b.amount || 0).toLocaleString()}</TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
