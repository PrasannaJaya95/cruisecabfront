import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil, Search, Hash, LayoutGrid } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VehicleBrandManagement = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newBrand, setNewBrand] = useState('');
    const [open, setOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchBrands = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/fleet/brands');
            setBrands(data);
        } catch (error) {
            console.error('Failed to fetch brands', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBrands(); }, []);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        try {
            if (editingBrand) {
                await api.put(`/fleet/brands/${editingBrand.id}`, { name: newBrand });
            } else {
                await api.post('/fleet/brands', { name: newBrand });
            }
            setNewBrand('');
            setEditingBrand(null);
            setOpen(false);
            fetchBrands();
        } catch (error) {
            alert('Failed to save brand record');
        }
    };

    const handleEdit = (brand) => {
        setEditingBrand(brand);
        setNewBrand(brand.name);
        setOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/fleet/brands/${deleteId}`);
            setDeleteId(null);
            fetchBrands();
        } catch (error) {
            alert('Integrity violation: Brand is assigned to active models.');
        }
    };

    const filteredBrands = brands.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-10 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative">
                    <h2 className="text-5xl font-black text-foreground tracking-tighter mb-2 italic text-primary">Automotive Brands</h2>
                    <p className="text-muted-foreground font-medium text-lg italic opacity-70">"Cataloging global manufacturers for the Rentix fleet."</p>
                </div>

                <Dialog open={open} onOpenChange={(val) => {
                    if (!val) {
                        setEditingBrand(null);
                        setNewBrand('');
                    }
                    setOpen(val);
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-black px-8 py-7 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs">
                            <Plus className="h-5 w-5" /> {editingBrand ? 'Modify Brand' : 'Register New Brand'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-2xl border-border rounded-[2.5rem] shadow-2xl p-8 custom-scrollbar">
                        <form onSubmit={handleSave}>
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black tracking-tighter italic uppercase">{editingBrand ? 'Record Modification' : 'Manufacturer Entry'}</DialogTitle>
                                <DialogDescription className="text-muted-foreground italic font-medium">Define legal manufacturer name for fleet indexing.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-8">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Brand Identity</Label>
                                    <Input
                                        id="name"
                                        value={newBrand}
                                        onChange={(e) => setNewBrand(e.target.value)}
                                        placeholder="e.g. Mercedes-Benz, Porsche, Toyota"
                                        className="h-14 bg-secondary/30 border-border rounded-2xl text-base focus:ring-4 focus:ring-primary/5 transition-all pl-6"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="w-full h-16 bg-primary font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all">
                                    {editingBrand ? 'Authorize Name Change' : 'Initialize Manufacturer Record'}
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
                        placeholder="Scan registry for authenticated manufacturers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 bg-secondary/50 border-border rounded-2xl h-12 text-sm font-medium focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                </div>
                <div className="flex items-center gap-6 px-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Network Status</span>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-foreground">Operational</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300">
                <Table>
                    <TableHeader className="bg-secondary/20">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Manufacturer Identity</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Registry ID / Hash</TableHead>
                            <TableHead className="py-6 px-8 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Operational Control</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-24">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing Database...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredBrands.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-24 italic text-muted-foreground uppercase text-[10px] font-black tracking-widest opacity-20">
                                    <LayoutGrid className="h-12 w-12 mx-auto mb-4" />
                                    No manufacturer records located
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredBrands.map((brand) => (
                                <TableRow key={brand.id} className="group border-border hover:bg-primary/[0.01] transition-all duration-300">
                                    <TableCell className="py-6 px-8">
                                        <div className="flex items-center gap-5">
                                            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-base border border-primary/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm uppercase">
                                                {brand.name[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-foreground text-lg tracking-tight uppercase group-hover:text-primary transition-colors">{brand.name}</div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1 opacity-60">
                                                    GLOBAL MANUFACTURER
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="flex items-center gap-2 text-muted-foreground font-mono text-[10px] tracking-tighter opacity-40 uppercase italic">
                                            <Hash className="h-3 w-3" />
                                            {brand.id.substring(0, 16)}...
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6 px-8 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 text-primary hover:bg-primary/5 rounded-xl transition-all hover:scale-110 active:scale-90"
                                                onClick={() => handleEdit(brand)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all hover:scale-110 active:scale-90 hover:shadow-lg hover:shadow-rose-500/20"
                                                onClick={() => setDeleteId(brand.id)}
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
                        <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic text-rose-500">Integrity Warning</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground font-medium italic">
                            You are about to purge this manufacturer from the global registry. This action will cascade to all associated vehicle models and active inventory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 gap-3">
                        <AlertDialogCancel className="rounded-2xl border-border h-14 font-bold px-8">Abort Proceeding</AlertDialogCancel>
                        <AlertDialogAction className="bg-rose-500 hover:bg-rose-600 rounded-2xl h-14 font-black uppercase tracking-widest text-xs px-8" onClick={handleDelete}>Confirm Purge</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default VehicleBrandManagement;
