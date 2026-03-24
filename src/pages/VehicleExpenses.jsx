import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Receipt, Plus, Search, Filter, Calendar, DollarSign, Edit, Trash2, ArrowUpDown, ShieldCheck } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const VehicleExpenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Filter states
    const [filterVehicle, setFilterVehicle] = useState('ALL');
    const [filterStartDate, setFilterStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [filterEndDate, setFilterEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    const initialFormState = {
        vehicleId: '',
        description: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        paidByCompany: false
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchVehicles();
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            let url = `/expenses?startDate=${filterStartDate}&endDate=${filterEndDate}`;
            if (filterVehicle !== 'ALL') {
                url += `&vehicleId=${filterVehicle}`;
            }
            const res = await api.get(url);
            setExpenses(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch expenses', error);
            setLoading(false);
        }
    };

    const fetchVehicles = async () => {
        try {
            const res = await api.get('/vehicles');
            setVehicles(res.data);
        } catch (error) {
            console.error('Failed to fetch vehicles', error);
        }
    };

    const handleApplyFilters = () => {
        fetchExpenses();
    };

    const handleEdit = (expense) => {
        setEditingId(expense.id);
        setFormData({
            vehicleId: expense.vehicleId,
            description: expense.description,
            amount: expense.amount,
            date: format(new Date(expense.date), 'yyyy-MM-dd'),
            paidByCompany: expense.paidByCompany || false
        });
        setIsOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (editingId) {
                await api.put(`/expenses/${editingId}`, formData);
            } else {
                await api.post('/expenses', formData);
            }
            fetchExpenses();
            setIsOpen(false);
            setFormData(initialFormState);
            setEditingId(null);
        } catch (error) {
            console.error('Failed to save expense', error);
            alert(error.response?.data?.error || 'Failed to save expense');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this expense record?')) return;
        try {
            await api.delete(`/expenses/${id}`);
            fetchExpenses();
        } catch (error) {
            console.error('Failed to delete expense', error);
        }
    };

    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#FA5A28] to-orange-400 uppercase">
                        Vehicle Expenses
                    </h1>
                    <p className="text-muted-foreground font-medium tracking-wide uppercase text-[10px] opacity-70">
                        Track and audit all vehicle-related expenditures
                    </p>
                </div>
                <Button
                    onClick={() => { setEditingId(null); setFormData(initialFormState); setIsOpen(true); }}
                    className="h-12 px-8 rounded-2xl bg-[#FA5A28] hover:bg-[#FA5A28]/90 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="mr-2 h-4 w-4" /> Log Expense
                </Button>
            </div>

            {/* Filters Section */}
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 shadow-2xl shadow-black/[0.02]">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Vehicle Registry</Label>
                        <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                            <SelectTrigger className="h-12 bg-white/50 dark:bg-slate-800/50 border-border/50 rounded-xl text-xs font-bold uppercase tracking-widest">
                                <SelectValue placeholder="All Vehicles" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL" className="text-xs uppercase font-bold tracking-widest">All Vehicles</SelectItem>
                                {vehicles.map(v => (
                                    <SelectItem key={v.id} value={v.id} className="text-xs uppercase font-bold tracking-widest">
                                        {v.licensePlate}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">From Date</Label>
                        <Input
                            type="date"
                            className="h-12 bg-white/50 dark:bg-slate-800/50 border-border/50 rounded-xl text-xs font-bold tracking-widest"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">To Date</Label>
                        <Input
                            type="date"
                            className="h-12 bg-white/50 dark:bg-slate-800/50 border-border/50 rounded-xl text-xs font-bold tracking-widest"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={handleApplyFilters}
                        className="h-12 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest"
                    >
                        <Filter className="mr-2 h-4 w-4" /> Apply Filters
                    </Button>
                </div>
            </div>

            {/* Total Balance Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-16 -mt-16 animate-pulse"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Total Aggregate Cost</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-white tracking-tighter">LKR {totalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                    <DollarSign className="absolute bottom-4 right-4 h-12 w-12 text-white/5 rotate-12 transition-transform group-hover:scale-110" />
                </div>
            </div>

            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/[0.02]">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-border/50">
                            <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.2em]">Vehicle</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em]">Description</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em]">Date</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em]">Amount</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em]">Ownership</TableHead>
                            <TableHead className="py-6 px-8 text-right text-[10px] font-black uppercase tracking-[0.2em]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground uppercase font-black tracking-widest animate-pulse">Loading Ledger...</TableCell></TableRow>
                        ) : expenses.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground uppercase font-black tracking-widest">No expenses found for this period</TableCell></TableRow>
                        ) : expenses.map((expense) => (
                            <TableRow key={expense.id} className="group hover:bg-primary/[0.02] border-border/50 transition-colors">
                                <TableCell className="py-6 px-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                                            <Receipt className="w-5 h-5 text-[#FA5A28]" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest">{expense.vehicle?.licensePlate}</p>
                                            <p className="text-[10px] text-muted-foreground font-bold">{expense.vehicle?.vehicleModel?.brand?.name} {expense.vehicle?.vehicleModel?.name}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-6 max-w-xs transition-all">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{expense.description}</p>
                                </TableCell>
                                <TableCell className="py-6">
                                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/70 tracking-widest uppercase">
                                        <Calendar className="w-4 h-4" /> {format(new Date(expense.date), 'MMM dd, yyyy')}
                                    </div>
                                </TableCell>
                                <TableCell className="py-6">
                                    <p className="text-sm font-black tracking-tighter text-slate-900 dark:text-white">
                                        LKR {expense.amount.toLocaleString()}
                                    </p>
                                </TableCell>
                                <TableCell className="py-6">
                                    <div className="flex flex-col gap-1">
                                        {expense.paidByCompany ? (
                                            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-100 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 w-fit">Company Paid</Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-100 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 w-fit">Owner Paid</Badge>
                                        )}
                                        {expense.isRealized && (
                                            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-100 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 w-fit flex items-center gap-1">
                                                <ShieldCheck className="w-2 h-2" /> Realized
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-6 px-8 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)} className="h-9 w-9 rounded-xl hover:bg-[#FA5A28]/10 hover:text-[#FA5A28] transition-all">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)} className="h-9 w-9 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-all">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-border/50 rounded-[2.5rem] shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-8 pb-4 bg-muted/30">
                        <DialogTitle className="text-2xl font-black tracking-tight uppercase">
                            {editingId ? 'Recalibrate Expense' : 'Register New Expenditure'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Target Vehicle</Label>
                            <Select value={formData.vehicleId} onValueChange={(val) => setFormData({ ...formData, vehicleId: val })}>
                                <SelectTrigger className="h-12 bg-muted/50 border-none rounded-xl text-xs font-bold uppercase tracking-widest">
                                    <SelectValue placeholder="Select Vehicle" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicles.map(v => (
                                        <SelectItem key={v.id} value={v.id} className="text-xs uppercase font-bold tracking-widest">
                                            {v.licensePlate} - {v.vehicleModel?.brand?.name} {v.vehicleModel?.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Expense Identification</Label>
                            <Input
                                placeholder="Fuel, Insurance, Spare parts etc..."
                                className="h-12 bg-muted/50 border-none rounded-xl text-xs font-bold tracking-widest"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Financial Magnitude (LKR)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="h-12 pl-12 bg-muted/50 border-none rounded-xl text-xs font-bold tracking-widest"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Chronology Date</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                                    <Input
                                        type="date"
                                        className="h-12 pl-12 bg-muted/50 border-none rounded-xl text-xs font-bold tracking-widest"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 bg-primary/5 p-4 rounded-xl border border-primary/10">
                            <Checkbox
                                id="expensePaidByCompany"
                                checked={formData.paidByCompany}
                                onCheckedChange={(checked) => setFormData({ ...formData, paidByCompany: !!checked })}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="expensePaidByCompany"
                                    className="text-[11px] font-black uppercase tracking-widest text-primary leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Cost Paid by Company
                                </label>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                                    Tick this if the company handles this expense for 3rd party vehicles.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="ghost" onClick={() => setIsOpen(false)} className="h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest">Abstain</Button>
                            <Button onClick={handleSubmit} className="h-12 px-8 rounded-xl bg-[#FA5A28] hover:bg-[#FA5A28]/90 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all active:scale-95">
                                {editingId ? 'Authorize Correction' : 'Commit to Ledger'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default VehicleExpenses;
