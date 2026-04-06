import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Gauge, Calendar, Car, History, Search, Hash } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const OdometerManagement = () => {
    const [odometers, setOdometers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [fleetCategories, setFleetCategories] = useState([]);
    const [formData, setFormData] = useState({
        vehicleId: '',
        reading: '',
        date: new Date().toISOString().split('T')[0]
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [odoRes, vehRes, catRes] = await Promise.all([
                api.get('/odometers'),
                api.get('/vehicles'),
                api.get('/fleet/categories')
            ]);
            setOdometers(odoRes.data);
            setVehicles(vehRes.data);
            setFleetCategories(Array.isArray(catRes.data) ? catRes.data : []);
        } catch (error) {
            console.error('Failed to sync telemetry registry', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        try {
            if (!formData.vehicleId) {
                alert('Select an authenticated vehicle unit.');
                return;
            }
            await api.post('/odometers', {
                ...formData,
                reading: parseInt(formData.reading),
                source: 'MANUAL'
            });
            setOpen(false);
            setFormData({ vehicleId: '', reading: '', date: new Date().toISOString().split('T')[0] });
            fetchData();
        } catch (error) {
            alert('Validation failed: Entry logic error.');
        }
    };

    const filteredOdometers = odometers.filter((odo) => {
        const catOk = categoryFilter === 'all' || odo.vehicle?.fleetCategoryId === categoryFilter;
        const q = searchTerm.toLowerCase();
        const plate = (odo.vehicle?.licensePlate || '').toLowerCase();
        const brand = (odo.vehicle?.vehicleModel?.brand?.name || '').toLowerCase();
        const model = (odo.vehicle?.vehicleModel?.name || '').toLowerCase();
        const catName = (odo.vehicle?.fleetCategory?.name || '').toLowerCase();
        const searchOk = !q || plate.includes(q) || brand.includes(q) || model.includes(q) || catName.includes(q);
        return catOk && searchOk;
    });

    const latestByVehicle = (() => {
        const map = new Map();
        
        // Step 1: Initialize with the current known odometer from the Vehicle records
        vehicles.forEach(v => {
            map.set(v.id, {
                id: `veh-${v.id}`,
                vehicleId: v.id,
                reading: v.lastOdometer || 0,
                date: v.updatedAt || new Date(),
                vehicle: v,
                source: 'VEHICLE_MASTER_RECORD'
            });
        });

        // Step 2: Overlay with the latest entries from the Odometer audit history
        odometers.forEach(odo => {
            const vid = odo.vehicleId;
            if (!vid) return;
            const existing = map.get(vid);
            if (!existing || new Date(odo.date) > new Date(existing.date)) {
                map.set(vid, odo);
            }
        });

        return Array.from(map.values())
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    })();

    return (
        <div className="space-y-10 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative">
                    <h2 className="text-5xl font-black text-foreground tracking-tighter mb-2 italic text-primary">Telemetry Logs</h2>
                    <p className="text-muted-foreground font-medium text-lg italic opacity-70">"Historical mileage tracking and physical fleet audit records."</p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-black px-8 py-7 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs">
                            <Plus className="h-5 w-5" /> Commit Reading
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border-border rounded-[2.5rem] shadow-2xl p-8">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black tracking-tighter italic uppercase">Manual Audit</DialogTitle>
                                <DialogDescription className="text-muted-foreground italic font-medium">Capture physical odometer state for fleet verification.</DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-6 py-8">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Asset Selection</Label>
                                    <Select
                                        value={formData.vehicleId}
                                        onValueChange={(val) => setFormData({ ...formData, vehicleId: val })}
                                    >
                                        <SelectTrigger className="h-14 bg-secondary/30 border-border rounded-2xl font-bold pl-6 transition-all focus:ring-4 focus:ring-primary/5">
                                            <SelectValue placeholder="Select Vehicle Unit" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border bg-card/95 backdrop-blur-2xl max-h-[300px]">
                                            {vehicles.map(v => (
                                                <SelectItem key={v.id} value={v.id} className="font-bold py-3 uppercase tracking-wider text-[10px]">
                                                    {v.vehicleModel?.brand?.name} {v.vehicleModel?.name} — <span className="text-primary">{v.licensePlate}</span>
                                                    {v.fleetCategory?.name ? ` · ${v.fleetCategory.name}` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Metric (KM)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            className="h-14 bg-secondary/30 border-border rounded-2xl text-base focus:ring-4 focus:ring-primary/5 transition-all pl-6"
                                            value={formData.reading}
                                            onChange={e => setFormData({ ...formData, reading: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Log Date</Label>
                                        <Input
                                            type="date"
                                            className="h-14 bg-secondary/30 border-border rounded-2xl text-base focus:ring-4 focus:ring-primary/5 transition-all px-4"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="submit" className="w-full h-16 bg-primary font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all">
                                    Authorize Record Entry
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center gap-4 bg-card/50 backdrop-blur-md p-5 rounded-[2rem] border border-border shadow-sm">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search plate, brand, model, category…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 bg-secondary/50 border-border rounded-2xl h-12 text-sm font-medium focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[200px] h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {fleetCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-6 px-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Historical Depth</span>
                        <div className="flex items-center gap-2">
                            <History className="h-3 w-3 text-primary" />
                            <span className="text-xs font-bold text-foreground italic">{odometers.length} Events Logged</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Latest Odometer Snapshot */}
            <div className="bg-card/50 backdrop-blur-md p-5 rounded-[2rem] border border-border shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black tracking-tight text-foreground">Current Odometer Snapshot</h3>
                        <p className="text-xs text-muted-foreground font-medium">Vehicle-wise latest odometer from system logs</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">
                        {latestByVehicle.length} Vehicles
                    </Badge>
                </div>
                {latestByVehicle.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">No telemetry entries yet.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {latestByVehicle.map(odo => (
                            <div key={`latest-${odo.vehicleId}`} className="rounded-xl border border-border bg-secondary/20 p-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    {odo.vehicle?.vehicleModel?.brand?.name} {odo.vehicle?.vehicleModel?.name}
                                </div>
                                <div className="text-xl font-black text-primary tracking-tight mt-1">
                                    {odo.vehicle?.licensePlate}
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-foreground tracking-tighter">{Number(odo.reading || 0).toLocaleString()}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">KM</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-1">
                                    {format(new Date(odo.date), 'MMM dd, yyyy HH:mm')}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Table Section */}
            <div className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300">
                <Table>
                    <TableHeader className="bg-secondary/20">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Incident Timestamp</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Asset Identity</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Mileage Metric</TableHead>
                            <TableHead className="py-6 px-8 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Data Integrity</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-24">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing Telemetry...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredOdometers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-24 italic text-muted-foreground uppercase text-[10px] font-black tracking-widest opacity-20">
                                    <Gauge className="h-12 w-12 mx-auto mb-4" />
                                    Filtered scope contains no records
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOdometers.map(odo => (
                                <TableRow key={odo.id} className="group border-border hover:bg-primary/[0.01] transition-all duration-300">
                                    <TableCell className="py-6 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground border border-border">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-foreground text-base tracking-tight italic">
                                                    {format(new Date(odo.date), 'MMM dd, yyyy')}
                                                </span>
                                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                                    Recorded at {format(new Date(odo.date), 'HH:mm')}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <Car className="h-3 w-3 text-primary opacity-60" />
                                                <span className="text-[10px] font-black text-foreground uppercase tracking-widest opacity-80">
                                                    {odo.vehicle?.vehicleModel?.brand?.name} {odo.vehicle?.vehicleModel?.name}
                                                </span>
                                            </div>
                                            <span className="text-lg font-black text-primary tracking-tighter italic">
                                                {odo.vehicle?.licensePlate}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="flex items-baseline gap-1.5 group-hover:scale-105 transition-transform origin-left duration-300">
                                            <span className="text-2xl font-black text-foreground tracking-tighter italic">
                                                {odo.reading.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">KM</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6 px-8 text-right">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-3 py-1 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 rounded-lg">
                                            {odo.source?.replace('_', ' ') || 'MANUAL SYSTEM ENTRY'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default OdometerManagement;
