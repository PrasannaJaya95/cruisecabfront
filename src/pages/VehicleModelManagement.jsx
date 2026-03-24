import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil, Search, Hash, LayoutGrid, Box } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VehicleModelManagement = () => {
    const [models, setModels] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ name: '', brandId: '' });
    const [open, setOpen] = useState(false);
    const [editingModel, setEditingModel] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [modelsRes, brandsRes] = await Promise.all([
                api.get('/fleet/models'),
                api.get('/fleet/brands')
            ]);
            setModels(modelsRes.data);
            setBrands(brandsRes.data);
        } catch (error) {
            console.error('Failed to sync model registry', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        try {
            if (!formData.brandId) {
                alert('Please associate this model with a manufacturer.');
                return;
            }
            if (editingModel) {
                await api.put(`/fleet/models/${editingModel.id}`, formData);
            } else {
                await api.post('/fleet/models', formData);
            }
            setFormData({ name: '', brandId: '' });
            setEditingModel(null);
            setOpen(false);
            fetchData();
        } catch (error) {
            alert('Failed to authorize model record.');
        }
    };

    const handleEdit = (model) => {
        setEditingModel(model);
        setFormData({ name: model.name, brandId: model.brandId });
        setOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/fleet/models/${deleteId}`);
            setDeleteId(null);
            fetchData();
        } catch (error) {
            alert('Integrity violation: Model is referenced in active inventory.');
        }
    };

    const filteredModels = models.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.brand?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-10 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative">
                    <h2 className="text-5xl font-black text-foreground tracking-tighter mb-2 italic text-primary">Fleet Models</h2>
                    <p className="text-muted-foreground font-medium text-lg italic opacity-70">"Cataloging specific vehicle variants and engineering specifications."</p>
                </div>

                <Dialog open={open} onOpenChange={(val) => {
                    if (!val) {
                        setEditingModel(null);
                        setFormData({ name: '', brandId: '' });
                    }
                    setOpen(val);
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-black px-8 py-7 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs">
                            <Plus className="h-5 w-5" /> {editingModel ? 'Modify Variant' : 'Register New Variant'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-2xl border-border rounded-[2.5rem] shadow-2xl p-8 custom-scrollbar">
                        <form onSubmit={handleSave}>
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black tracking-tighter italic uppercase">{editingModel ? 'Variant Modification' : 'Model Entry'}</DialogTitle>
                                <DialogDescription className="text-muted-foreground italic font-medium">Link engineering variants to their parent manufacturers.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-8">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Parent Manufacturer</Label>
                                    <Select value={formData.brandId} onValueChange={(val) => setFormData({ ...formData, brandId: val })}>
                                        <SelectTrigger className="h-14 bg-secondary/30 border-border rounded-2xl font-bold pl-6 transition-all focus:ring-4 focus:ring-primary/5">
                                            <SelectValue placeholder="Select Brand" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border bg-card/95 backdrop-blur-2xl">
                                            {brands.map((brand) => (
                                                <SelectItem key={brand.id} value={brand.id} className="font-bold py-3 uppercase tracking-wider text-[10px]">{brand.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Variant Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Camry SE, Model 3 Ludicrous, S-Class"
                                        className="h-14 bg-secondary/30 border-border rounded-2xl text-base focus:ring-4 focus:ring-primary/5 transition-all pl-6"
                                        required
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="w-full h-16 bg-primary font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all">
                                    {editingModel ? 'Authorize Update' : 'Initialize Variant Record'}
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
                        placeholder="Scan registry for specific model variants..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 bg-secondary/50 border-border rounded-2xl h-12 text-sm font-medium focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                </div>
                <div className="flex items-center gap-6 px-4 border-l border-border ml-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Index Coverage</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-foreground italic">{models.length} <span className="text-[10px] opacity-40 non-italic">VARIANTS</span></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300">
                <Table>
                    <TableHeader className="bg-secondary/20">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Manufacturer / Model Variant</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Fleet UUID / Registry Hash</TableHead>
                            <TableHead className="py-6 px-8 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Operational Control</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-24">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Synchronizing Registry...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredModels.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-24 italic text-muted-foreground uppercase text-[10px] font-black tracking-widest opacity-20">
                                    <Box className="h-12 w-12 mx-auto mb-4" />
                                    No variants located in current scope
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredModels.map((model) => (
                                <TableRow key={model.id} className="group border-border hover:bg-primary/[0.01] transition-all duration-300">
                                    <TableCell className="py-6 px-8">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0 border-primary/20 bg-primary/5 text-primary rounded-md">
                                                    {model.brand?.name}
                                                </Badge>
                                            </div>
                                            <span className="font-bold text-foreground text-xl tracking-tight uppercase group-hover:translate-x-1 transition-transform duration-300 italic">{model.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6 font-mono text-[10px] text-muted-foreground opacity-30 uppercase tracking-tighter">
                                        <div className="flex items-center gap-2">
                                            <Hash className="h-3 w-3" />
                                            {model.id}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6 px-8 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 text-primary hover:bg-primary/5 rounded-xl transition-all hover:scale-110 active:scale-90"
                                                onClick={() => handleEdit(model)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all hover:scale-110 active:scale-90 hover:shadow-lg hover:shadow-rose-500/20"
                                                onClick={() => setDeleteId(model.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-card/95 backdrop-blur-2xl border-border rounded-[2.5rem] p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic text-rose-500">Inventory Warning</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground font-medium italic">
                            Purging this model variant will impact all current vehicle listings and historical telemetry associated with this engineering profile.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 gap-3">
                        <AlertDialogCancel className="rounded-2xl border-border h-14 font-bold px-8">Abort Operation</AlertDialogCancel>
                        <AlertDialogAction className="bg-rose-500 hover:bg-rose-600 rounded-2xl h-14 font-black uppercase tracking-widest text-xs px-8" onClick={handleDelete}>Confirm Deletion</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default VehicleModelManagement;
