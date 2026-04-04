import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, User, Trash2, Search, Filter, ShieldCheck, Mail, UserPlus, Users, Key } from 'lucide-react';
import { cn } from "@/lib/utils";

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'STAFF',
        permissionGroupId: ''
    });
    const [permissionGroups, setPermissionGroups] = useState([]);

    const fetchUsers = async () => {
        try {
            const [usersRes, groupsRes] = await Promise.all([
                api.get('users'),
                api.get('permission-groups')
            ]);
            setUsers(usersRes.data);
            setPermissionGroups(groupsRes.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (val) => {
        setFormData(prev => ({ ...prev, role: val }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('users', formData);
            setOpen(false);
            fetchUsers();
            setFormData({ name: '', email: '', password: '', role: 'STAFF', permissionGroupId: '' });
        } catch (error) {
            console.error("Error creating user:", error);
            alert("Failed to create user.");
        }
    };

    /** Admin may delete non–Super Admin users; Super Admin may delete others (not self). */
    const canDeleteUserRow = (rowUser) => {
        if (!currentUser?.id || !rowUser?.id) return false;
        if (currentUser.id === rowUser.id) return false;
        if (currentUser.role === 'SUPER_ADMIN') return true;
        if (currentUser.role === 'ADMIN') return rowUser.role !== 'SUPER_ADMIN';
        return false;
    };

    const handleDelete = async (rowUser) => {
        if (!canDeleteUserRow(rowUser)) return;
        if (!confirm(`Are you sure you want to delete ${rowUser.name || rowUser.email}?`)) return;
        try {
            await api.delete(`users/${rowUser.id}`);
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert(error.response?.data?.message || 'Failed to delete user.');
        }
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative">
                    <h2 className="text-5xl font-black text-foreground tracking-tighter mb-2 italic">Access Control</h2>
                    <p className="text-muted-foreground font-medium text-lg italic opacity-70">"Administering system permissions and user hierarchies."</p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-black px-8 py-7 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs">
                            <UserPlus className="h-5 w-5" /> Enlist New User
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-2xl border-border rounded-[2.5rem] shadow-2xl p-8">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black tracking-tighter italic">User Enrollment</DialogTitle>
                                <DialogDescription className="text-muted-foreground italic font-medium">Configure credentials and operational clearance.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-6 font-medium">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Identity</Label>
                                    <Input
                                        id="name"
                                        placeholder="Enter full legal name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="h-14 bg-secondary/30 border-border rounded-2xl text-base focus:ring-4 focus:ring-primary/5 transition-all pl-6"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Digital Mail</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="user@organization.com"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="h-14 bg-secondary/30 border-border rounded-2xl text-base focus:ring-4 focus:ring-primary/5 transition-all pl-6"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Operational Role</Label>
                                        <Select
                                            value={formData.role}
                                            onValueChange={handleSelectChange}
                                        >
                                            <SelectTrigger className="h-14 bg-secondary/30 border-border rounded-2xl transition-all pl-6 font-bold">
                                                <SelectValue placeholder="Access Level" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border">
                                                <SelectItem value="ADMIN">Administrator</SelectItem>
                                                <SelectItem value="STAFF">Operational Staff</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Clearance Group</Label>
                                        <Select
                                            value={formData.permissionGroupId}
                                            onValueChange={(val) => setFormData(prev => ({ ...prev, permissionGroupId: val }))}
                                        >
                                            <SelectTrigger className="h-14 bg-secondary/30 border-border rounded-2xl transition-all pl-6 font-bold">
                                                <SelectValue placeholder="Select Group" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border">
                                                <SelectItem value="none" className="font-bold italic">No Group</SelectItem>
                                                {permissionGroups.map(group => (
                                                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Authentication Key</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Minimum 8 characters"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="h-14 bg-secondary/30 border-border rounded-2xl text-base focus:ring-4 focus:ring-primary/5 transition-all pl-6"
                                        required
                                    />
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button
                                    type="submit"
                                    className="w-full h-16 bg-primary font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Authorize User Account
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4 bg-card/50 backdrop-blur-md p-5 rounded-[2rem] border border-border shadow-sm">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Scan registry for authenticated personnel..."
                        className="pl-12 bg-secondary/50 border-border rounded-2xl h-12 text-sm font-medium focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Select value="all">
                        <SelectTrigger className="w-44 bg-secondary/50 border-border h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-secondary">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-primary" />
                                <SelectValue placeholder="Role Filter" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border">
                            <SelectItem value="all">All Personnel</SelectItem>
                            <SelectItem value="ADMIN">Administrators</SelectItem>
                            <SelectItem value="STAFF">Staff</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table Section */}
            <Card className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300">
                <Table>
                    <TableHeader className="bg-secondary/20">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6 pl-8">Personnel</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Operational Role</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Clearance</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Email Hash</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6 text-right pr-8">Control</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-24">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing Directory...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-24 italic text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-4 opacity-10" />
                                    No authorized personnel found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id} className="group border-border hover:bg-primary/[0.01] transition-all duration-300">
                                    <TableCell className="py-6 pl-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-sm border border-primary/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                                                {user.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-foreground text-base tracking-tight">{user.name}</div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1 opacity-60">
                                                    <Key className="w-3 h-3" /> ID: {user.id.substring(0, 8)}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <span className={cn(
                                            "inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border shadow-sm",
                                            user.role === 'SUPER_ADMIN'
                                                ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800"
                                                : user.role === 'ADMIN'
                                                    ? "bg-primary/5 text-primary border-primary/20"
                                                    : "bg-orange-50 text-orange-600 border-orange-200"
                                        )}>
                                            <ShieldCheck className="w-3 h-3 mr-2" />
                                            {user.role}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <span className="text-sm font-bold text-muted-foreground whitespace-nowrap bg-secondary/50 px-4 py-2 rounded-xl border border-border">
                                            {permissionGroups.find(g => g.id === user.permissionGroupId)?.name || 'Default Access'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-6 italic font-medium text-muted-foreground/80">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3 h-3" />
                                            {user.email}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6 pr-8 text-right">
                                        {canDeleteUserRow(user) ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all hover:scale-110 active:scale-90 hover:shadow-lg hover:shadow-rose-500/20"
                                                onClick={() => handleDelete(user)}
                                                title="Delete user"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </Button>
                                        ) : (
                                            <span
                                                className="inline-block text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2 py-1 max-w-[140px] text-right"
                                                title={
                                                    user.id === currentUser?.id
                                                        ? 'You cannot delete your own account'
                                                        : user.role === 'SUPER_ADMIN'
                                                            ? 'Only Super Admin can remove Super Admin accounts'
                                                            : 'Insufficient permission'
                                                }
                                            >
                                                {user.id === currentUser?.id
                                                    ? '—'
                                                    : user.role === 'SUPER_ADMIN' && currentUser?.role === 'ADMIN'
                                                        ? 'Protected'
                                                        : '—'}
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div >
    );
};

export default UserManagement;
