import React, { useState, useEffect } from 'react';
import api from '../lib/api';
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
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter, Pencil, User, Trash2, Eye, Upload, Layers } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const ImageUploadPreview = ({ id, label, file, onChange, onView, className }) => {
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (!file) {
            setPreview(null);
            return;
        }

        if (file instanceof File) {
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else if (typeof file === 'string') {
            setPreview(file);
        }
    }, [file]);

    return (
        <div className={cn("space-y-4", className)}>
            <Label htmlFor={id} className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">{label}</Label>
            <div className="relative group">
                <Input
                    id={id}
                    type="file"
                    accept="image/*"
                    onChange={onChange}
                    className="hidden"
                />
                <Label
                    htmlFor={id}
                    className={cn(
                        "flex flex-col items-center justify-center w-full border-2 border-dashed rounded-[2rem] cursor-pointer transition-all overflow-hidden relative group/label",
                        preview ? "bg-white border-primary/20" : "bg-secondary/30 border-border hover:bg-secondary/50 hover:border-primary/30",
                        "h-48"
                    )}
                >
                    {preview ? (
                        <>
                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/label:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="rounded-full w-10 h-10 bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white text-white hover:text-primary transition-all scale-90 group-hover/label:scale-100"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onView(preview);
                                    }}
                                >
                                    <Eye className="w-5 h-5" />
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-3 text-muted-foreground p-4 text-center group-hover/label:text-primary transition-colors">
                            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-1 group-hover/label:scale-110 transition-transform">
                                <Upload className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Drop proof here</span>
                        </div>
                    )}
                </Label>
            </div>
        </div>
    );
};

const DriverManagement = () => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        licenseNumber: '',
        expiryDate: '',
        address: '',
        nic: '',
        driverImage: null,
        licenseFront: null,
        licenseBack: null,
        nicFront: null,
        nicBack: null,
        optionalDoc1: null,
        optionalDoc2: null
    });
    const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '' });
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [groupBy, setGroupBy] = useState("NONE");
    const [viewingImage, setViewingImage] = useState(null);

    const fetchDrivers = async () => {
        try {
            const { data } = await api.get('/drivers');
            setDrivers(data);
        } catch (error) {
            console.error('Failed to fetch drivers', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleEdit = (driver) => {
        setEditingId(driver.id);
        setFormData({
            name: driver.name,
            email: driver.email,
            phoneNumber: driver.driverDetails?.phoneNumber || '',
            licenseNumber: driver.driverDetails?.licenseNumber || '',
            expiryDate: driver.driverDetails?.licenseExpiryDate ? new Date(driver.driverDetails.licenseExpiryDate).toISOString().split('T')[0] : '',
            address: driver.driverDetails?.address || '',
            nic: driver.driverDetails?.nic || '',
            driverImage: driver.driverDetails?.driverImageUrl || null,
            licenseFront: driver.driverDetails?.licenseFrontUrl || null,
            licenseBack: driver.driverDetails?.licenseBackUrl || null,
            nicFront: driver.driverDetails?.nicFrontUrl || null,
            nicBack: driver.driverDetails?.nicBackUrl || null,
            optionalDoc1: driver.driverDetails?.optionalDoc1Url || null,
            optionalDoc2: driver.driverDetails?.optionalDoc2Url || null
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingId(null);
        setFormData({
            name: '',
            email: '',
            phoneNumber: '',
            licenseNumber: '',
            expiryDate: '',
            address: '',
            nic: '',
            driverImage: null,
            licenseFront: null,
            licenseBack: null,
            nicFront: null,
            nicBack: null,
            optionalDoc1: null,
            optionalDoc2: null
        });
    };

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const required = ['name', 'email', 'phoneNumber', 'licenseNumber', 'expiryDate', 'address', 'nic'];
            const missing = required.filter(field => !formData[field]);

            const requiredDocs = !editingId ? ['licenseFront', 'licenseBack', 'nicFront', 'nicBack'] : [];
            const missingDocs = requiredDocs.filter(field => !formData[field]);

            if (missing.length > 0 || missingDocs.length > 0) {
                const allMissing = [
                    ...missing,
                    ...missingDocs.map(d => d.replace(/([A-Z])/g, ' $1').trim())
                ];
                setAlertInfo({
                    open: true,
                    title: 'Incomplete Dossier',
                    message: `Please provide the following credentials: ${allMissing.join(', ')}`
                });
                return;
            }

            const processedData = {
                ...formData,
                expiryDate: formData.expiryDate
            };

            const imageFields = ['driverImage', 'licenseFront', 'licenseBack', 'nicFront', 'nicBack', 'optionalDoc1', 'optionalDoc2'];
            for (const field of imageFields) {
                if (formData[field] instanceof File) {
                    processedData[`${field}Url`] = await convertToBase64(formData[field]);
                } else if (typeof formData[field] === 'string') {
                    processedData[`${field}Url`] = formData[field];
                }
                delete processedData[field];
            }
            if (!formData.password) delete processedData.password;

            if (editingId) {
                await api.put(`/drivers/${editingId}`, processedData);
            } else {
                await api.post('/drivers', processedData);
            }
            handleClose();
            fetchDrivers();
        } catch (error) {
            console.error("Error saving driver:", error);
            setAlertInfo({
                open: true,
                title: 'Compliance Error',
                message: "Failed to update driver records. " + (error.response?.data?.message || '')
            });
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/drivers/${id}`);
            fetchDrivers();
        } catch (error) {
            console.error("Error deleting driver:", error);
        }
    };

    const filteredDrivers = drivers.filter(driver => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            driver.name.toLowerCase().includes(searchLower) ||
            driver.email.toLowerCase().includes(searchLower) ||
            (driver.driverDetails?.phoneNumber || "").includes(searchLower) ||
            (driver.driverDetails?.licenseNumber || "").toLowerCase().includes(searchLower);

        const status = driver.driverDetails?.status || "ACTIVE";
        const matchesStatus = filterStatus === "ALL" || status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const groupedDrivers = groupBy === "STATUS"
        ? filteredDrivers.reduce((acc, driver) => {
            const status = driver.driverDetails?.status || "ACTIVE";
            if (!acc[status]) acc[status] = [];
            acc[status].push(driver);
            return acc;
        }, {})
        : null;

    const renderDriverRow = (driver) => {
        const status = driver.driverDetails?.status || "ACTIVE";
        const isLeave = status === 'ON_LEAVE';
        return (
            <TableRow key={driver.id} className="border-border group hover:bg-secondary/10 transition-colors">
                <TableCell className="py-6 pl-8">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden border border-border group-hover:border-primary/20 transition-all shadow-sm">
                            {driver.driverDetails?.driverImageUrl ? (
                                <img src={driver.driverDetails.driverImageUrl} alt={driver.name} className="h-full w-full object-cover group-hover:scale-110 transition-all duration-500" />
                            ) : (
                                <User className="h-6 w-6 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <div className="font-black text-foreground text-sm flex items-center gap-2">
                                {driver.name}
                                {status === 'ACTIVE' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">{driver.email}</div>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="font-bold text-foreground py-6">{driver.driverDetails?.phoneNumber || 'N/A'}</TableCell>
                <TableCell className="py-6">
                    <div className="font-black text-foreground text-xs">{driver.driverDetails?.licenseNumber}</div>
                    <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                        Expiry: <span className="text-primary">{driver.driverDetails?.licenseExpiryDate ? new Date(driver.driverDetails.licenseExpiryDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </TableCell>
                <TableCell className="py-6">
                    <Badge className={cn(
                        "rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-none shadow-sm",
                        isLeave ? "bg-amber-100 text-amber-600 hover:bg-amber-100" : "bg-emerald-100 text-emerald-600 hover:bg-emerald-100"
                    )}>
                        {status.replace('_', ' ')}
                    </Badge>
                </TableCell>
                <TableCell className="text-right py-6 pr-8">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(driver)}
                            className="h-9 w-9 bg-primary/5 hover:bg-primary text-primary hover:text-white rounded-xl transition-all"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(driver.id)}
                            className="h-9 w-9 bg-destructive/5 hover:bg-destructive text-destructive hover:text-white rounded-xl transition-all"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-5xl font-black text-foreground tracking-tighter mb-2">Driver Registry</h2>
                    <p className="text-muted-foreground font-medium text-lg italic">"Managing our elite team of professional drivers."</p>
                </div>
                <Dialog
                    open={open}
                    onOpenChange={(val) => {
                        setOpen(val);
                        if (!val) handleClose();
                    }}
                >
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-black px-8 py-7 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs">
                            <Plus className="h-5 w-5" /> Onboard Driver
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border rounded-[2.5rem] shadow-2xl p-0 custom-scrollbar">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                                <div>
                                    <DialogTitle className="text-3xl font-black tracking-tight text-foreground">
                                        {editingId ? 'Refine Profile' : 'New Dossier'}
                                    </DialogTitle>
                                    <DialogDescription className="font-medium text-muted-foreground mt-2">
                                        {editingId ? 'Modify professional credentials and access.' : 'Registering a new high-performance driver to our elite network.'}
                                    </DialogDescription>
                                </div>
                            </DialogHeader>
                            <div className="px-10 py-8 space-y-8">
                                <div className="flex flex-col items-center justify-center p-6 bg-secondary/20 rounded-[2rem] border border-border/50 shadow-inner">
                                    <ImageUploadPreview
                                        id="driverImage"
                                        label="Professional Headshot"
                                        file={formData.driverImage}
                                        onChange={(e) => setFormData(prev => ({ ...prev, driverImage: e.target.files[0] }))}
                                        onView={setViewingImage}
                                        className="w-full max-w-sm"
                                    />
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">01</div>
                                        <h3 className="text-lg font-black tracking-tight">Identity Details</h3>
                                        <div className="h-px flex-1 bg-border/50"></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest ml-1">Full Identity *</Label>
                                            <Input id="name" placeholder="Full Legal Name" value={formData.name} onChange={handleInputChange} required className="rounded-xl h-12 bg-secondary/50 border-border focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest ml-1">Communication Channel *</Label>
                                            <Input id="email" type="email" placeholder="Professional Email" value={formData.email} onChange={handleInputChange} required className="rounded-xl h-12 bg-secondary/50 border-border focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="phoneNumber" className="text-[10px] font-black uppercase tracking-widest ml-1">Direct Line *</Label>
                                            <Input id="phoneNumber" placeholder="+94 XX XXX XXXX" value={formData.phoneNumber} onChange={handleInputChange} required className="rounded-xl h-12 bg-secondary/50 border-border focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="nic" className="text-[10px] font-black uppercase tracking-widest ml-1">Identity Protocol (NIC) *</Label>
                                            <Input id="nic" placeholder="NIC Number" value={formData.nic} onChange={handleInputChange} required className="rounded-xl h-12 bg-secondary/50 border-border focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest ml-1">Permanent Residence *</Label>
                                        <Input id="address" placeholder="Physical Address" value={formData.address} onChange={handleInputChange} required className="rounded-xl h-12 bg-secondary/50 border-border focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium" />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">02</div>
                                        <h3 className="text-lg font-black tracking-tight">Professional Credentials</h3>
                                        <div className="h-px flex-1 bg-border/50"></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="licenseNumber" className="text-[10px] font-black uppercase tracking-widest ml-1">License Signature *</Label>
                                            <Input id="licenseNumber" placeholder="Plate/License ID" value={formData.licenseNumber} onChange={handleInputChange} required className="rounded-xl h-12 bg-secondary/50 border-border focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="expiryDate" className="text-[10px] font-black uppercase tracking-widest ml-1">Validity Period (Expiry) *</Label>
                                            <Input id="expiryDate" type="date" value={formData.expiryDate} onChange={handleInputChange} required className="rounded-xl h-12 bg-secondary/50 border-border focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <ImageUploadPreview
                                            id="licenseFront"
                                            label="License (Obverse) *"
                                            file={formData.licenseFront}
                                            onChange={(e) => setFormData(prev => ({ ...prev, licenseFront: e.target.files[0] }))}
                                            onView={setViewingImage}
                                        />
                                        <ImageUploadPreview
                                            id="licenseBack"
                                            label="License (Reverse) *"
                                            file={formData.licenseBack}
                                            onChange={(e) => setFormData(prev => ({ ...prev, licenseBack: e.target.files[0] }))}
                                            onView={setViewingImage}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <ImageUploadPreview
                                            id="nicFront"
                                            label="NIC (Obverse) *"
                                            file={formData.nicFront}
                                            onChange={(e) => setFormData(prev => ({ ...prev, nicFront: e.target.files[0] }))}
                                            onView={setViewingImage}
                                        />
                                        <ImageUploadPreview
                                            id="nicBack"
                                            label="NIC (Reverse) *"
                                            file={formData.nicBack}
                                            onChange={(e) => setFormData(prev => ({ ...prev, nicBack: e.target.files[0] }))}
                                            onView={setViewingImage}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">03</div>
                                        <h3 className="text-lg font-black tracking-tight">Ancillary Files</h3>
                                        <div className="h-px flex-1 bg-border/50"></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <ImageUploadPreview
                                            id="optionalDoc1"
                                            label="Optional Registry I"
                                            file={formData.optionalDoc1}
                                            onChange={(e) => setFormData(prev => ({ ...prev, optionalDoc1: e.target.files[0] }))}
                                            onView={setViewingImage}
                                        />
                                        <ImageUploadPreview
                                            id="optionalDoc2"
                                            label="Optional Registry II"
                                            file={formData.optionalDoc2}
                                            onChange={(e) => setFormData(prev => ({ ...prev, optionalDoc2: e.target.files[0] }))}
                                            onView={setViewingImage}
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="sm:justify-between px-10 pb-10">
                                <p className="text-sm text-muted-foreground self-center font-medium italic opacity-50">* Mandatory Compliance Required</p>
                                <Button type="submit" className="bg-primary hover:bg-primary/95 text-primary-foreground font-black px-10 h-14 rounded-2xl transition-all shadow-xl shadow-primary/20 scale-100 hover:scale-[1.02] active:scale-95">
                                    {editingId ? 'Validate Updates' : 'Commit Registry'}
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
                        placeholder="Scan registry by name, credential, or contact..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 bg-secondary/50 border-border rounded-2xl h-12 text-sm font-medium focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-44 bg-secondary/50 border-border h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-secondary">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-primary" />
                                <SelectValue placeholder="Status" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border">
                            <SelectItem value="ALL">All States</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={groupBy} onValueChange={setGroupBy}>
                        <SelectTrigger className="w-44 bg-secondary/50 border-border h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-secondary">
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-primary" />
                                <SelectValue placeholder="Organization" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border">
                            <SelectItem value="NONE">Ungrouped</SelectItem>
                            <SelectItem value="STATUS">By State</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300">
                <Table>
                    <TableHeader className="bg-secondary/20">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6 pl-8">Operator Detail</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Contact Access</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Credential Hash</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">State</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6 text-right pr-8">Control</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-48">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground animate-pulse">
                                        <User className="h-8 w-8 opacity-20" />
                                        <p className="font-black uppercase tracking-widest text-[10px]">Synchronizing Registry...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredDrivers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-48">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Search className="h-8 w-8 opacity-20" />
                                        <p className="font-black uppercase tracking-widest text-[10px]">No matches in registry</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : groupBy === 'STATUS' ? (
                            Object.entries(groupedDrivers).map(([status, groupDrivers]) => (
                                <React.Fragment key={status}>
                                    <TableRow className="bg-secondary/10 border-border">
                                        <TableCell colSpan={5} className="font-black text-[10px] uppercase tracking-[0.2em] py-4 pl-8 text-primary">
                                            {status.replace('_', ' ')} Registry ({groupDrivers.length})
                                        </TableCell>
                                    </TableRow>
                                    {groupDrivers.map(renderDriverRow)}
                                </React.Fragment>
                            ))
                        ) : (
                            filteredDrivers.map(renderDriverRow)
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
                <DialogContent className="max-w-4xl bg-transparent border-none shadow-none p-0">
                    <div className="relative group">
                        <img src={viewingImage} alt="Document View" className="w-full h-auto rounded-3xl" />
                        <Button
                            variant="secondary"
                            size="icon"
                            className="absolute top-4 right-4 rounded-full bg-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setViewingImage(null)}
                        >
                            <Plus className="rotate-45" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={alertInfo.open} onOpenChange={(open) => setAlertInfo(prev => ({ ...prev, open }))}>
                <AlertDialogContent className="bg-card border-border rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <User className="h-10 w-10 text-primary" />
                    </div>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tight mb-2">{alertInfo.title}</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground font-medium">
                            {alertInfo.message}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8">
                        <AlertDialogAction onClick={() => setAlertInfo(prev => ({ ...prev, open: false }))} className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-6 rounded-xl transition-all shadow-lg shadow-primary/20">Acknowledge</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default DriverManagement;
