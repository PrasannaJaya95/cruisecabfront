import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Plus, Shield, Trash2, Pencil, Users, Key, Search, Hash } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const AVAILABLE_PERMISSIONS = [
    { code: 'CUSTOMER_CONFIRM', label: 'Confirm Customers' },
    { code: 'FLEET_MANAGE', label: 'Fleet Management' },
    { code: 'BOOKING_OVERRIDE', label: 'Booking Overrides' },
    { code: 'FINANCE_VIEW', label: 'Financial auditing' },
];

const PermissionGroupManagement = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        permissions: [],
        userIds: []
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [groupsRes, usersRes] = await Promise.all([
                api.get('/permission-groups'),
                api.get('/users')
            ]);
            setGroups(groupsRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            console.error('Failed to sync security registry', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handlePermissionToggle = (code) => {
        setFormData(prev => {
            const exists = prev.permissions.includes(code);
            return {
                ...prev,
                permissions: exists
                    ? prev.permissions.filter(p => p !== code)
                    : [...prev.permissions, code]
            };
        });
    };

    const handleUserToggle = (userId) => {
        setFormData(prev => {
            const exists = prev.userIds?.includes(userId);
            return {
                ...prev,
                userIds: exists
                    ? prev.userIds.filter(id => id !== userId)
                    : [...(prev.userIds || []), userId]
            };
        });
    };

    const handleEdit = (group) => {
        setEditingId(group.id);
        setFormData({
            name: group.name,
            permissions: group.permissions || [],
            userIds: group.users ? group.users.map(u => u.id) : []
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingId(null);
        setFormData({ name: '', permissions: [], userIds: [] });
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/permission-groups/${editingId}`, formData);
            } else {
                await api.post('/permission-groups', formData);
            }
            handleClose();
            fetchData();
        } catch (error) {
            alert("Security policy violation: Check database constraints.");
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/permission-groups/${id}`);
            fetchData();
        } catch (error) {
            alert("Integrity lock: Active seats detected in this group.");
        }
    };

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-10 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative">
                    <h2 className="text-5xl font-black text-foreground tracking-tighter mb-2 italic text-primary uppercase">Security Enclaves</h2>
                    <p className="text-muted-foreground font-medium text-lg italic opacity-70">"Defining administrative roles and personnel protocol."</p>
                </div>

                <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-black px-8 py-7 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs">
                            <Plus className="h-5 w-5" /> Initialize Group
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[700px] bg-card/95 backdrop-blur-2xl border-border rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto scrollbar-hide">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black tracking-tighter italic uppercase">{editingId ? 'Modify Enclave' : 'New Security Group'}</DialogTitle>
                                <DialogDescription className="text-muted-foreground italic font-medium">Provision system-wide capabilities for administrative entities.</DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-8 py-8">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Group Designation</Label>
                                    <Input id="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Senior Regional Executives" className="h-14 bg-secondary/30 border-border rounded-2xl text-base focus:ring-4 focus:ring-primary/5 transition-all pl-6" required />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                            <Key className="h-3 w-3" /> Capability Matrix
                                        </Label>
                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary-foreground bg-primary px-2">{formData.permissions.length} Selected</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-[2rem] bg-secondary/20 border border-border/50">
                                        {AVAILABLE_PERMISSIONS.map((perm) => (
                                            <div key={perm.code} className="flex items-center space-x-4 p-4 rounded-2xl hover:bg-card/50 transition-all border border-transparent hover:border-border cursor-pointer group shadow-sm bg-card/30" onClick={() => handlePermissionToggle(perm.code)}>
                                                <Checkbox
                                                    id={perm.code}
                                                    checked={formData.permissions.includes(perm.code)}
                                                    onCheckedChange={() => handlePermissionToggle(perm.code)}
                                                    className="rounded-md border-primary/20"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-foreground group-hover:text-primary transition-colors tracking-tight italic uppercase">{perm.label}</span>
                                                    <code className="text-[9px] text-muted-foreground uppercase opacity-40 font-mono italic">{perm.code}</code>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pb-4">
                                    <div className="flex items-center justify-between px-1">
                                        <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                            <Users className="h-3 w-3" /> Personnel Assignment
                                        </Label>
                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest opacity-50 px-2">{formData.userIds?.length || 0} Entities</Badge>
                                    </div>
                                    <div className="grid gap-3 p-6 rounded-[2rem] bg-secondary/20 border border-border/50 max-h-60 overflow-y-auto scrollbar-hide">
                                        {users.length === 0 ? (
                                            <div className="py-12 text-center opacity-20 italic text-xs font-black uppercase tracking-[0.2em]">Scan registry failed: No candidates</div>
                                        ) : (
                                            users.map((user) => (
                                                <div key={user.id} className="flex items-center space-x-4 p-4 rounded-2xl hover:bg-card/50 transition-all border border-transparent hover:border-primary/5 cursor-pointer group bg-card/30 shadow-sm" onClick={() => handleUserToggle(user.id)}>
                                                    <Checkbox
                                                        id={`user-${user.id}`}
                                                        checked={formData.userIds?.includes(user.id)}
                                                        onCheckedChange={() => handleUserToggle(user.id)}
                                                        className="rounded-full h-5 w-5 border-primary/20"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-foreground group-hover:text-primary transition-colors uppercase tracking-tight italic">{user.name}</span>
                                                        <span className="text-[10px] font-bold text-muted-foreground italic opacity-60 font-mono uppercase italic">{user.email}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-8 pt-6 border-t border-border">
                                <Button type="submit" className="w-full h-16 bg-primary font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all">
                                    {editingId ? 'Authorize Update' : 'Initialize Security Group'}
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
                        placeholder="Search security groups by designation..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 bg-secondary/50 border-border rounded-2xl h-12 text-sm font-medium focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                </div>
                <div className="flex items-center gap-6 px-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Network Coverage</span>
                        <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3 text-primary" />
                            <span className="text-xs font-bold text-foreground italic uppercase tracking-tighter">{groups.length} Segments Defined</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300">
                <Table>
                    <TableHeader className="bg-secondary/20">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Group Identity</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Capabilities</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Seats</TableHead>
                            <TableHead className="py-6 px-8 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Operational Control</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-24">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing Policy Registry...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredGroups.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-24 italic text-muted-foreground uppercase text-[10px] font-black tracking-widest opacity-20">
                                    <Shield className="h-12 w-12 mx-auto mb-4" />
                                    No enclave records located
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredGroups.map((group) => (
                                <TableRow key={group.id} className="group border-border hover:bg-primary/[0.01] transition-all duration-300">
                                    <TableCell className="py-6 px-8">
                                        <div className="flex items-center gap-5">
                                            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                                                <Shield className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-foreground text-xl tracking-tighter uppercase group-hover:text-primary transition-colors italic">{group.name}</div>
                                                <div className="text-[10px] font-mono text-muted-foreground uppercase opacity-40 flex items-center gap-1 italic">
                                                    <Hash className="h-2 w-2" /> {group.id.substring(0, 16).toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="flex gap-1.5 flex-wrap max-w-[320px]">
                                            {group.permissions.map(p => (
                                                <span key={p} className="inline-flex items-center rounded-lg bg-primary/5 px-2.5 py-1 text-[9px] font-black text-primary border border-primary/10 uppercase tracking-widest italic group-hover:bg-primary group-hover:text-white transition-all cursor-default shadow-sm hover:scale-105">
                                                    {p}
                                                </span>
                                            ))}
                                            {group.permissions.length === 0 && <span className="text-muted-foreground text-[10px] font-bold italic opacity-30 uppercase tracking-[0.2em]">Zero-Trust restricted</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="flex flex-col group-hover:scale-110 transition-transform origin-left duration-300">
                                            <span className="text-3xl font-black text-foreground tracking-tighter italic leading-none">{group._count?.users || 0}</span>
                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Verified Personnel</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6 px-8 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/5 rounded-xl transition-all hover:scale-110 active:scale-90" onClick={() => handleEdit(group)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all hover:scale-110 active:scale-90 hover:shadow-lg hover:shadow-rose-500/20" onClick={() => handleDelete(group.id)}>
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
        </div>
    );
};

export default PermissionGroupManagement;
