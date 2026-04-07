import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil, Search, LayoutGrid } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const FleetCategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [sortOrder, setSortOrder] = useState('0');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/fleet/categories');
            setCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch fleet categories', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCategories(); }, []);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        try {
            setSaving(true);
            const payload = { name: trimmed, sortOrder: parseInt(sortOrder, 10) || 0 };
            if (editing) {
                await api.put(`/fleet/categories/${editing.id}`, payload);
            } else {
                await api.post('/fleet/categories', payload);
            }
            setName('');
            setSortOrder('0');
            setEditing(null);
            setOpen(false);
            fetchCategories();
        } catch (error) {
            console.error('Save failed:', error);
            const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to save category';
            alert(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (cat) => {
        setEditing(cat);
        setName(cat.name);
        setSortOrder(String(cat.sortOrder ?? 0));
        setOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/fleet/categories/${deleteId}`);
            setDeleteId(null);
            fetchCategories();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to delete category');
        }
    };

    const filtered = categories.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative">
                    <h2 className="text-5xl font-black text-foreground tracking-tighter mb-2 italic text-primary">Fleet Categories</h2>
                    <p className="text-muted-foreground font-medium text-lg italic opacity-70">
                        &quot;Define segments such as Car, SUV, Luxury, VIP, or VVIP—then assign each vehicle to a category.&quot;
                    </p>
                </div>

                <Dialog open={open} onOpenChange={(val) => {
                    if (!val) {
                        setEditing(null);
                        setName('');
                        setSortOrder('0');
                    }
                    setOpen(val);
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-black px-8 py-7 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs">
                            <Plus className="h-5 w-5" /> {editing ? 'Edit Category' : 'New Category'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-2xl border-border rounded-[2.5rem] shadow-2xl p-8 custom-scrollbar">
                        <form onSubmit={handleSave}>
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black tracking-tighter italic uppercase">
                                    {editing ? 'Update Category' : 'Create Category'}
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground italic font-medium">
                                    Categories appear when adding vehicles and in fleet filters.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-8">
                                <div className="space-y-2">
                                    <Label htmlFor="cat-name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Category name *</Label>
                                    <Input
                                        id="cat-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. SUV, Luxury, VIP"
                                        className="h-14 bg-secondary/30 border-border rounded-2xl text-base focus:ring-4 focus:ring-primary/5 transition-all pl-6"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sort" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Sort order</Label>
                                    <Input
                                        id="sort"
                                        type="number"
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        placeholder="0"
                                        className="h-14 bg-secondary/30 border-border rounded-2xl text-base pl-6"
                                    />
                                    <p className="text-[10px] text-muted-foreground font-medium">Lower numbers appear first in dropdowns.</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button 
                                    type="submit" 
                                    disabled={saving}
                                    className="w-full h-16 bg-primary font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {saving ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </div>
                                    ) : (
                                        editing ? 'Save changes' : 'Create category'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-card/50 backdrop-blur-md p-5 rounded-[2rem] border border-border shadow-sm">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 bg-secondary/50 border-border rounded-2xl h-12 text-sm font-medium focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                </div>
            </div>

            <div className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300">
                <Table>
                    <TableHeader className="bg-secondary/20">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Category</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Sort</TableHead>
                            <TableHead className="py-6 px-8 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-24">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Loading…</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-24 italic text-muted-foreground uppercase text-[10px] font-black tracking-widest opacity-20">
                                    <LayoutGrid className="h-12 w-12 mx-auto mb-4" />
                                    No categories yet
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((cat) => (
                                <TableRow key={cat.id} className="group border-border hover:bg-primary/[0.01] transition-all duration-300">
                                    <TableCell className="py-6 px-8">
                                        <div className="flex items-center gap-5">
                                            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-base border border-primary/10">
                                                {cat.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-black text-foreground tracking-tight text-lg">{cat.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest">{cat.sortOrder ?? 0}</Badge>
                                    </TableCell>
                                    <TableCell className="py-6 px-8 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary"
                                                onClick={() => handleEdit(cat)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 rounded-xl hover:bg-rose-500/10 text-rose-600"
                                                onClick={() => setDeleteId(cat.id)}
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

            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent className="rounded-[2rem] border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black uppercase tracking-tight">Delete category?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vehicles using this category will have the category cleared. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl font-black uppercase text-[10px]">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="rounded-xl bg-rose-600 font-black uppercase text-[10px]" onClick={handleDelete}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default FleetCategoryManagement;
