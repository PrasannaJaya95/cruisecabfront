import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
    Receipt,
    CheckCircle,
    Clock,
    RefreshCcw,
    Eye,
    Plus,
    AlertCircle,
    Info,
    Search,
    Trash2,
    Calendar as CalendarIcon,
    Filter
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function VendorBills() {
    const [bills, setBills] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtering State
    const [filters, setFilters] = useState({
        filterType: 'all',
        dateRange: null,
        vendorId: 'all',
        vehicleId: 'all'
    });

    // Wizard State
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardData, setWizardData] = useState({
        vendorId: '',
        vehicleId: '',
        month: (new Date().getMonth() + 1).toString(),
        year: new Date().getFullYear().toString(),
        description: '',
        monthlyPayment: '',
        items: [{ description: '', amount: '' }]
    });

    // View State
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    const [editData, setEditData] = useState(null);

    const handleViewBill = (bill) => {
        setSelectedBill(bill);
        setEditData({
            month: bill.month.toString(),
            year: bill.year.toString(),
            monthlyPayment: bill.monthlyPayment.toString(),
            description: bill.description || '',
            items: bill.items.map(item => ({ ...item, amount: item.amount.toString() }))
        });
        setIsViewOpen(true);
    };

    const fetchVendors = async () => {
        try {
            const { data } = await api.get('/vendors');
            setVendors(data);
        } catch (error) {
            console.error('Failed to fetch vendors', error);
        }
    };

    const fetchVehicles = async () => {
        try {
            const { data } = await api.get('/vehicles');
            setVehicles(data.filter(v => v.ownership === 'THIRD_PARTY'));
        } catch (error) {
            console.error('Failed to fetch vehicles', error);
        }
    };

    const fetchBills = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.filterType !== 'all' && filters.filterType !== 'range') {
                params.append('filterType', filters.filterType);
            }
            if (filters.filterType === 'range' && filters.dateRange) {
                params.append('dateRange', JSON.stringify([filters.dateRange.from, filters.dateRange.to]));
            }
            if (filters.vendorId !== 'all') params.append('vendorId', filters.vendorId);
            if (filters.vehicleId !== 'all') params.append('vehicleId', filters.vehicleId);

            const { data } = await api.get(`/vendor-bills?${params.toString()}`);
            setBills(data);
        } catch (error) {
            console.error('Failed to fetch vendor bills', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBills();
    }, [filters]);

    useEffect(() => {
        fetchVendors();
        fetchVehicles();
    }, []);

    const handleAddItem = () => {
        setWizardData({
            ...wizardData,
            items: [...wizardData.items, { description: '', amount: '' }]
        });
    };

    const handleRemoveItem = (index) => {
        const newItems = wizardData.items.filter((_, i) => i !== index);
        setWizardData({ ...wizardData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...wizardData.items];
        newItems[index][field] = value;
        setWizardData({ ...wizardData, items: newItems });
    };

    const handleSubmitWizard = async () => {
        try {
            setLoading(true);
            await api.post('/vendor-bills', wizardData);
            setIsWizardOpen(false);
            setWizardData({
                vendorId: '',
                vehicleId: '',
                month: (new Date().getMonth() + 1).toString(),
                year: new Date().getFullYear().toString(),
                description: '',
                monthlyPayment: '',
                items: [{ description: '', amount: '' }]
            });
            fetchBills();
        } catch (error) {
            console.error("Failed to create vendor bill", error);
            alert(error.response?.data?.message || "Failed to create vendor bill");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBill = async () => {
        try {
            setLoading(true);
            const { data } = await api.put(`/vendor-bills/${selectedBill.id}`, editData);
            setBills(prev => prev.map(b => b.id === data.id ? data : b));
            setIsViewOpen(false);
        } catch (error) {
            console.error("Failed to update vendor bill", error);
            alert(error.response?.data?.message || "Failed to update vendor bill");
        } finally {
            setLoading(false);
        }
    };

    const updateBillStatus = async (id, status) => {
        try {
            await api.put(`/vendor-bills/${id}/status`, { status });
            fetchBills();
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const totalBillAmount = wizardData.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase tracking-widest">Vehicle Vendor Bill</h1>
                    <p className="text-muted-foreground font-medium mt-1">Manage vendor settlements and sequential billing.</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/95 text-white font-black px-8 py-6 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 uppercase tracking-widest text-xs h-14">
                                <Plus className="w-4 h-4" /> Create New Vendor Bill
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-border rounded-[2.5rem] p-8 max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black uppercase tracking-widest">New Vendor Bill Wizard</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Vendor Name</Label>
                                        <Select value={wizardData.vendorId} onValueChange={(val) => setWizardData({ ...wizardData, vendorId: val })}>
                                            <SelectTrigger className="h-12 bg-secondary/50 border-none rounded-xl">
                                                <SelectValue placeholder="Select Vendor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vendors.map(v => (
                                                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Vehicle</Label>
                                        <Select value={wizardData.vehicleId} onValueChange={(val) => setWizardData({ ...wizardData, vehicleId: val })}>
                                            <SelectTrigger className="h-12 bg-secondary/50 border-none rounded-xl">
                                                <SelectValue placeholder="Select Vehicle" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vehicles.filter(v => !wizardData.vendorId || v.vendorId === wizardData.vendorId).map(v => (
                                                    <SelectItem key={v.id} value={v.id}>{v.licensePlate}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Billing Month</Label>
                                        <Select value={wizardData.month} onValueChange={(val) => setWizardData({ ...wizardData, month: val })}>
                                            <SelectTrigger className="h-12 bg-secondary/50 border-none rounded-xl">
                                                <SelectValue placeholder="Month" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {months.map((m, i) => (
                                                    <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Year</Label>
                                        <Input
                                            type="number"
                                            value={wizardData.year}
                                            onChange={(e) => setWizardData({ ...wizardData, year: e.target.value })}
                                            className="h-12 bg-secondary/50 border-none rounded-xl font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Base Monthly Rate</Label>
                                        <Input
                                            type="number"
                                            placeholder="Optional"
                                            value={wizardData.monthlyPayment}
                                            onChange={(e) => setWizardData({ ...wizardData, monthlyPayment: e.target.value })}
                                            className="h-12 bg-secondary/50 border-none rounded-xl font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Bill Items / Deductions</Label>
                                        <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="rounded-xl border-primary/20 hover:bg-primary/5 font-black text-[9px] uppercase tracking-widest flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> Add Line
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {wizardData.items.map((item, index) => (
                                            <div key={index} className="flex gap-3 items-start animate-in slide-in-from-left-2 duration-300">
                                                <div className="flex-1">
                                                    <Input
                                                        placeholder="Description"
                                                        value={item.description}
                                                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                        className="h-11 bg-secondary/30 border-none rounded-xl text-xs"
                                                    />
                                                </div>
                                                <div className="w-32">
                                                    <Input
                                                        type="number"
                                                        placeholder="Amount"
                                                        value={item.amount}
                                                        onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                                                        className="h-11 bg-secondary/30 border-none rounded-xl text-xs font-bold"
                                                    />
                                                </div>
                                                {wizardData.items.length > 1 && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="h-11 w-11 rounded-xl text-rose-500 hover:bg-rose-50">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Overall Remark / Description</Label>
                                    <Textarea
                                        placeholder="General notes about this bill..."
                                        value={wizardData.description}
                                        onChange={(e) => setWizardData({ ...wizardData, description: e.target.value })}
                                        className="bg-secondary/30 border-none rounded-xl min-h-[80px] text-xs"
                                    />
                                </div>

                                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Total Bill Amount</p>
                                        <p className="text-2xl font-black text-primary tracking-tighter">Rs. {totalBillAmount.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <AlertCircle className="w-5 h-5 text-primary ml-auto mb-1 opacity-50" />
                                        <p className="text-[9px] font-bold text-primary/40 uppercase tracking-tight max-w-[200px]">
                                            This amount will be recorded as the final settlement for the selected period.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="gap-3">
                                <Button variant="outline" onClick={() => setIsWizardOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-12 flex-1">Cancel</Button>
                                <Button
                                    onClick={handleSubmitWizard}
                                    disabled={!wizardData.vendorId || !wizardData.vehicleId || wizardData.items.some(i => !i.description || !i.amount) || loading}
                                    className="bg-primary text-white font-black uppercase tracking-widest h-12 rounded-xl flex-[2]"
                                >
                                    {loading ? 'Submitting...' : 'Generate & Save Bill'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filters */}
            <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-border/50 rounded-[2rem] p-6 shadow-2xl shadow-black/[0.02]">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-2xl border border-border/50">
                        {[
                            { label: 'All', value: 'all' },
                            { label: 'Today', value: 'today' },
                            { label: '7 Days', value: 'last7days' },
                            { label: '30 Days', value: 'last30days' },
                            { label: 'Range', value: 'range' }
                        ].map((t) => (
                            <Button
                                key={t.value}
                                variant={filters.filterType === t.value ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setFilters({ ...filters, filterType: t.value })}
                                className={cn(
                                    "rounded-xl font-black text-[9px] uppercase tracking-widest h-9 px-4",
                                    filters.filterType === t.value ? "shadow-lg shadow-primary/20" : "text-muted-foreground"
                                )}
                            >
                                {t.label}
                            </Button>
                        ))}
                    </div>

                    {filters.filterType === 'range' && (
                        <div className="animate-in slide-in-from-left-2 duration-300">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-11 rounded-xl border-border/50 bg-white/50 dark:bg-slate-900/50 flex items-center gap-2 px-4 font-bold text-[10px] uppercase tracking-widest">
                                        <CalendarIcon className="w-4 h-4 opacity-50" />
                                        {filters.dateRange?.from ? (
                                            filters.dateRange.to ? (
                                                <>
                                                    {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                                                    {format(filters.dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(filters.dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-border" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={filters.dateRange?.from}
                                        selected={filters.dateRange}
                                        onSelect={(range) => setFilters({ ...filters, dateRange: range })}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

                    <div className="h-8 w-[1px] bg-border/50 mx-2 hidden md:block"></div>

                    <div className="w-48">
                        <Select value={filters.vendorId} onValueChange={(val) => setFilters({ ...filters, vendorId: val })}>
                            <SelectTrigger className="h-11 bg-secondary/30 border-none rounded-xl text-[10px] font-black uppercase tracking-widest">
                                <div className="flex items-center gap-2"><Filter className="w-3 h-3 opacity-50" /><SelectValue placeholder="Vendor Filter" /></div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Vendors</SelectItem>
                                {vendors.map(v => (
                                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-48">
                        <Select value={filters.vehicleId} onValueChange={(val) => setFilters({ ...filters, vehicleId: val })}>
                            <SelectTrigger className="h-11 bg-secondary/30 border-none rounded-xl text-[10px] font-black uppercase tracking-widest">
                                <div className="flex items-center gap-2"><CarIcon className="w-3 h-3 opacity-50" /><SelectValue placeholder="Vehicle Filter" /></div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Vehicles</SelectItem>
                                {vehicles.map(v => (
                                    <SelectItem key={v.id} value={v.id}>{v.licensePlate}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button variant="ghost" onClick={() => setFilters({ filterType: 'all', dateRange: null, vendorId: 'all', vehicleId: 'all' })} className="ml-auto text-muted-foreground hover:text-foreground font-black text-[9px] uppercase tracking-widest">
                        Reset Matrix
                    </Button>
                </div>
            </Card>

            <Card className="bg-card border-border rounded-[2.5rem] shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-secondary/30">
                        <TableRow className="border-border">
                            <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 pl-8">Bill No / Period</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Vendor Details</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Vehicle Number</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-right">Settlement Amount</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Status</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bills.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground font-black uppercase tracking-widest text-xs">
                                    {loading ? 'Processing Billing Data...' : 'No bills matching current filters'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            bills.map((bill) => (
                                <TableRow key={bill.id} className="border-border group hover:bg-secondary/10 transition-colors">
                                    <TableCell className="py-6 pl-8">
                                        <div className="flex flex-col">
                                            <span className="font-black text-primary tracking-tighter text-sm uppercase">{bill.billNumber || 'UNASSIGNED'}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">{months[bill.month - 1]} {bill.year}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-foreground uppercase tracking-tight text-xs">{bill.vendor?.name}</span>
                                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">{bill.vendor?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <Badge variant="outline" className="rounded-xl border-border bg-secondary/30 font-black text-[10px] uppercase tracking-widest px-4 py-1.5 h-auto">
                                            {bill.vehicle?.licensePlate}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-6 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-black text-foreground text-lg tracking-tighter">Rs. {bill.totalAmount.toLocaleString()}</span>
                                            {bill.repairDeductions + bill.expenseDeductions > 0 && (
                                                <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">Includes Rs. {(bill.repairDeductions + bill.expenseDeductions).toLocaleString()} Deductions</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        {bill.status === 'PAID' ? (
                                            <div className="flex items-center gap-1.5 text-green-500">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                <span className="font-black text-[9px] uppercase tracking-widest">Paid</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-orange-500">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="font-black text-[9px] uppercase tracking-widest">Pending</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-6 text-right pr-8">
                                        <div className="flex justify-end gap-2">
                                            {bill.status === 'PENDING' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateBillStatus(bill.id, 'PAID')}
                                                    className="rounded-xl border-green-500/20 text-green-600 hover:bg-green-500/10 font-black text-[9px] uppercase tracking-widest h-9 px-4 shadow-sm"
                                                >
                                                    Mark Paid
                                                </Button>
                                            )}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleViewBill(bill)}
                                                className="rounded-xl h-9 w-9 bg-secondary/20 hover:bg-secondary/40 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-orange-500/5 border-orange-500/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
                    <div className="absolute right-[-20px] top-[-20px] text-orange-500 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity rotate-12">
                        <Clock size={160} />
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-600 shrink-0">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-orange-600 font-black uppercase tracking-widest text-[10px] mb-2">Unrealized Costs</h3>
                            <p className="text-orange-950/70 font-medium text-xs leading-relaxed max-w-sm">
                                Balances that exceed base monthly payments for some vehicles are carried over to future billing cycles automatically.
                            </p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-primary/5 border-primary/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
                    <div className="absolute right-[-20px] top-[-20px] text-primary opacity-[0.03] group-hover:opacity-[0.05] transition-opacity rotate-12">
                        <CheckCircle size={160} />
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-primary font-black uppercase tracking-widest text-[10px] mb-2">Billing Intelligence</h3>
                            <p className="text-primary-950/70 font-medium text-xs leading-relaxed max-w-sm">
                                System tracks all repairs and maintenance costs paid by the company on behalf of vendors for accurate settlement.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* View Details Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-border rounded-[2.5rem] p-8 max-w-2xl overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-widest flex items-center justify-between">
                            <span>Bill Details</span>
                            <Badge className={cn(
                                "font-black text-[10px] uppercase tracking-widest px-3 py-1",
                                selectedBill?.status === 'PAID' ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"
                            )}>
                                {selectedBill?.status}
                            </Badge>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedBill && editData && (
                        <div className="space-y-8 mt-4 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Bill Reference</p>
                                    <p className="text-lg font-black text-primary tracking-tighter">{selectedBill.billNumber || 'UNASSIGNED'}</p>
                                    <div className="flex items-center gap-2">
                                        {selectedBill.status === 'PENDING' ? (
                                            <div className="flex gap-2 items-center mt-1">
                                                <Select value={editData.month} onValueChange={(val) => setEditData({ ...editData, month: val })}>
                                                    <SelectTrigger className="h-8 bg-secondary/50 border-none rounded-lg text-[10px] font-bold w-24">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {months.map((m, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    type="number"
                                                    value={editData.year}
                                                    onChange={(e) => setEditData({ ...editData, year: e.target.value })}
                                                    className="h-8 bg-secondary/50 border-none rounded-lg text-[10px] font-bold w-16"
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-xs font-bold text-foreground">{months[selectedBill.month - 1]} {selectedBill.year}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Vendor & Vehicle</p>
                                    <p className="text-sm font-black text-foreground uppercase">{selectedBill.vendor?.name}</p>
                                    <p className="text-xs font-bold text-primary">{selectedBill.vehicle?.licensePlate}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Settlement Breakdown</h4>
                                    {selectedBill.status === 'PENDING' && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEditData({ ...editData, items: [...editData.items, { description: '', amount: '0' }] })}
                                            className="h-6 text-[9px] font-black uppercase text-primary hover:bg-primary/5"
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Add Line
                                        </Button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {selectedBill.status === 'PENDING' ? (
                                        editData.items.map((item, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <Input
                                                    value={item.description}
                                                    onChange={(e) => {
                                                        const newItems = [...editData.items];
                                                        newItems[idx].description = e.target.value;
                                                        setEditData({ ...editData, items: newItems });
                                                    }}
                                                    className="h-9 bg-secondary/30 border-none rounded-xl text-[10px]"
                                                    placeholder="Item Description"
                                                />
                                                <Input
                                                    type="number"
                                                    value={item.amount}
                                                    onChange={(e) => {
                                                        const newItems = [...editData.items];
                                                        newItems[idx].amount = e.target.value;
                                                        setEditData({ ...editData, items: newItems });
                                                    }}
                                                    className="h-9 w-24 bg-secondary/30 border-none rounded-xl text-[10px] font-bold text-right"
                                                />
                                                {editData.items.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setEditData({ ...editData, items: editData.items.filter((_, i) => i !== idx) })}
                                                        className="h-8 w-8 text-rose-500"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        selectedBill.items?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center py-1">
                                                <span className="text-xs font-medium text-foreground">{item.description}</span>
                                                <span className="text-xs font-bold text-foreground">Rs. {item.amount.toLocaleString()}</span>
                                            </div>
                                        ))
                                    )}

                                    {(selectedBill.repairDeductions > 0 || selectedBill.expenseDeductions > 0) && (
                                        <div className="pt-2 space-y-3">
                                            {selectedBill.repairDeductions > 0 && (
                                                <div className="flex justify-between items-center text-rose-500">
                                                    <span className="text-xs font-medium">Repair Deductions</span>
                                                    <span className="text-xs font-bold">- Rs. {selectedBill.repairDeductions.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {selectedBill.expenseDeductions > 0 && (
                                                <div className="flex justify-between items-center text-rose-500">
                                                    <span className="text-xs font-medium">Expense Deductions</span>
                                                    <span className="text-xs font-bold">- Rs. {selectedBill.expenseDeductions.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-secondary/30 rounded-2xl border border-border/50">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Remarks</p>
                                {selectedBill.status === 'PENDING' ? (
                                    <Textarea
                                        value={editData.description}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                        className="bg-transparent border-none rounded-none min-h-[60px] text-xs p-0 focus-visible:ring-0"
                                        placeholder="Add remarks here..."
                                    />
                                ) : (
                                    <p className="text-xs text-foreground/80 leading-relaxed italic">"{selectedBill.description}"</p>
                                )}
                            </div>

                            <div className="bg-primary p-6 rounded-3xl flex justify-between items-center shadow-xl shadow-primary/20">
                                <div>
                                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Net Payable</p>
                                    <p className="text-3xl font-black text-white tracking-tighter">
                                        Rs. {(selectedBill.status === 'PENDING' ?
                                            editData.items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0) :
                                            selectedBill.totalAmount
                                        ).toLocaleString()}
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                                    <Receipt className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-8 gap-3">
                        <Button onClick={() => setIsViewOpen(false)} variant="outline" className="flex-1 rounded-2xl font-black uppercase tracking-widest h-12 text-[10px]">
                            {selectedBill?.status === 'PENDING' ? 'Discard' : 'Close'}
                        </Button>
                        {selectedBill?.status === 'PENDING' && (
                            <Button
                                onClick={handleUpdateBill}
                                disabled={loading || editData?.items.some(i => !i.description || !i.amount)}
                                className="flex-[2] bg-primary text-white font-black uppercase tracking-widest h-12 rounded-2xl shadow-lg shadow-primary/20"
                            >
                                {loading ? 'Updating...' : 'Save Changes'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

const CarIcon = ({ className }) => (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 13.1V16c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg>
);
