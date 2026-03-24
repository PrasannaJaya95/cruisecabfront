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
import { Wrench, Plus, Search, Edit, Trash2, Calendar, DollarSign, CheckCircle2, Clock, PlayCircle, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

const VehicleRepair = () => {
    const [repairs, setRepairs] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const initialFormState = {
        vehicleId: '',
        description: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: '',
        cost: '',
        status: 'PENDING',
        paidByCompany: false
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchRepairs();
        fetchVehicles();
    }, []);

    const fetchRepairs = async () => {
        try {
            const res = await api.get('/maintenances');
            setRepairs(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch repairs', error);
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

    const handleEdit = (repair) => {
        setEditingId(repair.id);
        setFormData({
            vehicleId: repair.vehicleId,
            description: repair.description,
            startDate: format(new Date(repair.startDate), 'yyyy-MM-dd'),
            endDate: repair.endDate ? format(new Date(repair.endDate), 'yyyy-MM-dd') : '',
            cost: repair.cost || '',
            status: repair.status,
            paidByCompany: repair.paidByCompany || false
        });
        setIsOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (formData.status === 'DONE' && (!formData.endDate || !formData.cost)) {
                alert('Please provide End Date and Cost for completed repairs.');
                return;
            }

            if (editingId) {
                await api.put(`/maintenances/${editingId}`, formData);
            } else {
                await api.post('/maintenances', formData);
            }
            fetchRepairs();
            setIsOpen(false);
            setFormData(initialFormState);
            setEditingId(null);
        } catch (error) {
            console.error('Failed to save repair', error);
            alert(error.response?.data?.error || 'Failed to save repair');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this repair record?')) return;
        try {
            await api.delete(`/maintenances/${id}`);
            fetchRepairs();
        } catch (error) {
            console.error('Failed to delete repair', error);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'PENDING': return <Clock className="w-4 h-4 text-amber-500" />;
            case 'IN_PROGRESS': return <PlayCircle className="w-4 h-4 text-blue-500" />;
            case 'DONE': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            default: return null;
        }
    };

    const filteredRepairs = repairs.filter(r =>
        r.vehicle?.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600 uppercase">
                        Vehicle Repairs
                    </h1>
                    <p className="text-muted-foreground font-medium tracking-wide uppercase text-[10px] opacity-70">
                        Manage vehicle maintenance schedules and costs
                    </p>
                </div>
                <Button
                    onClick={() => { setEditingId(null); setFormData(initialFormState); setIsOpen(true); }}
                    className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="mr-2 h-4 w-4" /> Start Repair
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                    <input
                        type="text"
                        placeholder="Search by License Plate or Description..."
                        className="w-full h-14 pl-12 pr-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-border/50 rounded-2xl text-xs font-bold uppercase tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/[0.02]">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-border/50">
                            <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.2em]">Vehicle</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em]">Description</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em]">Dates</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em]">Cost</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em]">Ownership</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em]">Status</TableHead>
                            <TableHead className="py-6 px-8 text-right text-[10px] font-black uppercase tracking-[0.2em]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground uppercase font-black tracking-widest animate-pulse">Loading Repairs Matrix...</TableCell></TableRow>
                        ) : filteredRepairs.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground uppercase font-black tracking-widest">No repairs found</TableCell></TableRow>
                        ) : filteredRepairs.map((repair) => (
                            <TableRow key={repair.id} className="group hover:bg-primary/[0.02] border-border/50 transition-colors">
                                <TableCell className="py-6 px-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <Wrench className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest">{repair.vehicle?.licensePlate}</p>
                                            <p className="text-[10px] text-muted-foreground font-bold">{repair.vehicle?.vehicleModel?.brand?.name} {repair.vehicle?.vehicleModel?.name}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-6 max-w-xs transition-all">
                                    <p className="text-xs font-bold text-muted-foreground line-clamp-2 uppercase tracking-tight">{repair.description}</p>
                                </TableCell>
                                <TableCell className="py-6">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/70 tracking-widest uppercase">
                                            <Clock className="w-3 h-3" /> {format(new Date(repair.startDate), 'MMM dd, yyyy')}
                                        </div>
                                        {repair.endDate && (
                                            <div className="flex items-center gap-2 text-[10px] font-black text-green-600/70 tracking-widest uppercase">
                                                <CheckCircle2 className="w-3 h-3" /> {format(new Date(repair.endDate), 'MMM dd, yyyy')}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-6">
                                    <p className="text-xs font-black tracking-widest">
                                        {repair.cost ? `LKR ${repair.cost.toLocaleString()}` : '—'}
                                    </p>
                                </TableCell>
                                <TableCell className="py-6">
                                    <div className="flex flex-col gap-1">
                                        {repair.paidByCompany ? (
                                            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-100 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 w-fit">Company Paid</Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-100 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 w-fit">Owner Paid</Badge>
                                        )}
                                        {repair.isRealized && (
                                            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-100 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 w-fit flex items-center gap-1">
                                                <ShieldCheck className="w-2 h-2" /> Realized
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-6">
                                    <div className={cn(
                                        "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm",
                                        repair.status === 'DONE' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                            repair.status === 'IN_PROGRESS' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                                "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    )}>
                                        {getStatusIcon(repair.status)}
                                        {repair.status.replace('_', ' ')}
                                    </div>
                                </TableCell>
                                <TableCell className="py-6 px-8 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(repair)} className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(repair.id)} className="h-9 w-9 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-all">
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
                <DialogContent className="max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-border/50 rounded-[2.5rem] shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-8 pb-4 bg-muted/30">
                        <DialogTitle className="text-2xl font-black tracking-tight uppercase">
                            {editingId ? 'Modify Repair Protocol' : 'Initialize Repair Sequence'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Vehicle Registry</Label>
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
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Status Phase</Label>
                                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                    <SelectTrigger className="h-12 bg-muted/50 border-none rounded-xl text-xs font-bold uppercase tracking-widest">
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING" className="text-xs uppercase font-bold tracking-widest">Pending</SelectItem>
                                        <SelectItem value="IN_PROGRESS" className="text-xs uppercase font-bold tracking-widest">In Progress</SelectItem>
                                        <SelectItem value="DONE" className="text-xs uppercase font-bold tracking-widest">Done</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Repair Description</Label>
                            <Input
                                placeholder="Enter repair details..."
                                className="h-12 bg-muted/50 border-none rounded-xl text-xs font-bold tracking-widest"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Sequence Start</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                                    <Input
                                        type="date"
                                        className="h-12 pl-12 bg-muted/50 border-none rounded-xl text-xs font-bold tracking-widest"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className={cn("text-[10px] font-black uppercase tracking-widest opacity-60", formData.status !== 'DONE' && "opacity-20")}>Sequence End</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                                    <Input
                                        type="date"
                                        disabled={formData.status !== 'DONE'}
                                        className="h-12 pl-12 bg-muted/50 border-none rounded-xl text-xs font-bold tracking-widest disabled:opacity-30"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className={cn("text-[10px] font-black uppercase tracking-widest opacity-60", formData.status !== 'DONE' && "opacity-20")}>Total Protocol Cost (LKR)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                                <Input
                                    type="number"
                                    disabled={formData.status !== 'DONE'}
                                    placeholder="0.00"
                                    className="h-12 pl-12 bg-muted/50 border-none rounded-xl text-xs font-bold tracking-widest disabled:opacity-30"
                                    value={formData.cost}
                                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 bg-primary/5 p-4 rounded-xl border border-primary/10">
                            <Checkbox
                                id="paidByCompany"
                                checked={formData.paidByCompany}
                                onCheckedChange={(checked) => setFormData({ ...formData, paidByCompany: !!checked })}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="paidByCompany"
                                    className="text-[11px] font-black uppercase tracking-widest text-primary leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Cost Paid by Company
                                </label>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                                    Tick this if the company (Rentix) handles the repair cost for 3rd party vehicles.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="ghost" onClick={() => setIsOpen(false)} className="h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest">Abort</Button>
                            <Button onClick={handleSubmit} className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95">
                                {editingId ? 'Execute Update' : 'Initialize Sequence'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VehicleRepair;
