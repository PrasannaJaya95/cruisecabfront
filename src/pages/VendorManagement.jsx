import React, { useState, useEffect } from 'react';
import api, { resolveServerUrl } from '../lib/api';
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Store, Trash2, Pencil, Check, ChevronsUpDown, X, Search, Filter, Layers, UserPlus, Phone, MapPin, CreditCard, FileText, Camera } from 'lucide-react';
import ImageUploadPreview from '../components/ImageUploadPreview';
import { cn } from "@/lib/utils";

const VendorManagement = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [viewingVehicles, setViewingVehicles] = useState(null);

    // New State for Search, Filter, Grouping
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("ALL");
    const [groupBy, setGroupBy] = useState("NONE");

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        nic: '',
        nicFront: null,
        nicBack: null,
        utilityBill: null,
        attachment1: null,
        attachment2: null,
        photo: null,
        vendorType: 'VEHICLE_OWNER'
    });

    const fetchVendors = async () => {
        try {
            const { data } = await api.get('/vendors');
            setVendors(data);
        } catch (error) {
            console.error('Failed to fetch vendors', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleEdit = (vendor) => {
        setEditingId(vendor.id);
        setFormData({
            name: vendor.name,
            email: vendor.email,
            phone: vendor.vendorDetails?.phone || '',
            address: vendor.vendorDetails?.address || '',
            nic: vendor.vendorDetails?.nic || '',
            nicFront: vendor.vendorDetails?.nicFrontUrl || null,
            nicBack: vendor.vendorDetails?.nicBackUrl || null,
            utilityBill: vendor.vendorDetails?.utilityBillUrl || null,
            attachment1: vendor.vendorDetails?.attachment1Url || null,
            attachment2: vendor.vendorDetails?.attachment2Url || null,
            photo: vendor.vendorDetails?.photoUrl || null,
            vendorType: vendor.vendorDetails?.vendorType || 'VEHICLE_OWNER'
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingId(null);
        setFormData({
            name: '', email: '',
            phone: '', address: '', nic: '',
            nicFront: null, nicBack: null, utilityBill: null, attachment1: null, attachment2: null, photo: null,
            vendorType: 'VEHICLE_OWNER'
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Validate required fields
            const required = ['name', 'email', 'phone', 'address', 'nic'];
            const missing = required.filter(field => !formData[field]);

            // Check required documents (only for new vendors, not edits)
            const requiredDocs = !editingId ? ['nicFront', 'nicBack'] : [];
            const missingDocs = requiredDocs.filter(field => !formData[field]);

            if (missing.length > 0 || missingDocs.length > 0) {
                const allMissing = [
                    ...missing,
                    ...missingDocs.map(d => d.replace(/([A-Z])/g, ' $1').trim())
                ];
                alert(`Missing Required Fields: ${allMissing.join(', ')}`);
                return;
            }

            const convertToBase64 = (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = (error) => reject(error);
                });
            };

            const processedData = { ...formData };

            const imageFields = ['nicFront', 'nicBack', 'utilityBill', 'attachment1', 'attachment2', 'photo'];
            for (const field of imageFields) {
                if (formData[field] instanceof File) {
                    processedData[`${field}Url`] = await convertToBase64(formData[field]);
                } else if (typeof formData[field] === 'string') {
                    processedData[`${field}Url`] = formData[field];
                }
                delete processedData[field];
            }

            if (editingId) {
                await api.put(`/vendors/${editingId}`, processedData);
            } else {
                await api.post('/vendors', processedData);
            }
            handleClose();
            fetchVendors();
        } catch (error) {
            console.error("Error saving vendor:", error);
            const message = error.response?.data?.message || "Failed to save vendor.";
            alert(message);
        }
    };



    // Filter and Grouping Logic
    const filteredVendors = vendors.filter(vendor => {
        const matchesSearch =
            vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vendor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (vendor.vendorDetails?.vendorCode || "").toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = filterType === "ALL" || (vendor.vendorDetails?.vendorType || "VEHICLE_OWNER") === filterType;

        return matchesSearch && matchesType;
    });

    const groupedVendors = groupBy === "TYPE"
        ? filteredVendors.reduce((acc, vendor) => {
            const type = vendor.vendorDetails?.vendorType || "Uncategorized";
            if (!acc[type]) acc[type] = [];
            acc[type].push(vendor);
            return acc;
        }, {})
        : null;

    const renderVendorRow = (vendor) => {
        const vehicleCount = vendor.vendorVehicles?.length || 0;

        return (
            <TableRow key={vendor.id} className="group border-border hover:bg-primary/[0.01] transition-all duration-300">
                <TableCell className="py-6 pl-8">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-sm border border-primary/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm overflow-hidden">
                            {vendor.vendorDetails?.photoUrl ? (
                                <img src={vendor.vendorDetails.photoUrl} alt={vendor.name} className="h-full w-full object-cover" />
                            ) : (
                                <Store className="h-5 w-5" />
                            )}
                        </div>
                        <div>
                            <div className="font-bold text-foreground text-base tracking-tight">{vendor.name}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1 opacity-60">
                                CODE: {vendor.vendorDetails?.vendorCode || 'N/A'}
                            </div>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="py-6 italic font-medium text-muted-foreground/80">
                    <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-primary/50" />
                        {vendor.vendorDetails?.phone || 'No Contact'}
                    </div>
                </TableCell>
                <TableCell className="py-6">
                    <span className={cn(
                        "inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border shadow-sm",
                        vendor.vendorDetails?.vendorType === 'VEHICLE_OWNER' ? "bg-primary/5 text-primary border-primary/20" : "bg-orange-50 text-orange-600 border-orange-200"
                    )}>
                        {vendor.vendorDetails?.vendorType?.replace('_', ' ') || 'GENERAL'}
                    </span>
                </TableCell>
                <TableCell className="py-6">
                    <div
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 cursor-pointer",
                            vehicleCount > 0
                                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-sm border border-emerald-500/20"
                                : "bg-slate-100 text-slate-400 opacity-60 pointer-events-none"
                        )}
                        onClick={() => vehicleCount > 0 && setViewingVehicles(vendor)}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span className="text-xs font-black tracking-tight">{vehicleCount} Assigned Vehicles</span>
                    </div>
                </TableCell>
                <TableCell className="py-6 pr-8 text-right">
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-primary hover:bg-primary/5 rounded-xl transition-all hover:scale-110 active:scale-90"
                            onClick={() => handleEdit(vendor)}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all hover:scale-110 active:scale-90 hover:shadow-lg hover:shadow-rose-500/20"
                            onClick={() => handleDelete(vendor.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
        );
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this vendor?')) return;
        try {
            await api.delete(`/vendors/${id}`);
            fetchVendors();
        } catch (error) {
            console.error("Error deleting vendor:", error);
        }
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative">
                    <h2 className="text-5xl font-black text-foreground tracking-tighter mb-2 italic text-primary">Service Partners</h2>
                    <p className="text-muted-foreground font-medium text-lg italic opacity-70">"Managing external logistics and operational vendors."</p>
                </div>

                <Dialog open={open} onOpenChange={(val) => {
                    if (!val) handleClose();
                    setOpen(val);
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-black px-8 py-7 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs">
                            <UserPlus className="h-5 w-5" /> {editingId ? 'Modify Record' : 'Onboard Partner'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[800px] h-fit max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-2xl border-border rounded-[2.5rem] shadow-2xl p-8 scrollbar-hide">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black tracking-tighter italic">{editingId ? 'Partner Modification' : 'Partner Registration'}</DialogTitle>
                                <DialogDescription className="text-muted-foreground italic font-medium">Configure partnership parameters and documentation.</DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Entity Name</Label>
                                        <Input id="name" value={formData.name} onChange={handleInputChange} required className="h-14 bg-secondary/30 border-border rounded-2xl text-base focus:ring-4 focus:ring-primary/5 transition-all pl-6" placeholder="Full Legal Name" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Type</Label>
                                            <Select value={formData.vendorType} onValueChange={(val) => setFormData(prev => ({ ...prev, vendorType: val }))}>
                                                <SelectTrigger className="h-14 bg-secondary/30 border-border rounded-2xl font-bold pl-6 transition-all">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-border">
                                                    <SelectItem value="VEHICLE_OWNER">Vehicle Owner</SelectItem>
                                                    <SelectItem value="SERVICE_VENDOR">Service Vendor</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Phone</Label>
                                            <Input id="phone" value={formData.phone} onChange={handleInputChange} required className="h-14 bg-secondary/30 border-border rounded-2xl text-base pl-6" placeholder="+94 77..." />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Email</Label>
                                        <Input id="email" type="email" value={formData.email} onChange={handleInputChange} required className="h-14 bg-secondary/30 border-border rounded-2xl text-base pl-6" placeholder="partner@rentix.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Residential Address</Label>
                                        <Input id="address" value={formData.address} onChange={handleInputChange} required className="h-14 bg-secondary/30 border-border rounded-2xl text-base pl-6" placeholder="Physical location of operations" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">National ID / NIC</Label>
                                        <Input id="nic" value={formData.nic} onChange={handleInputChange} required className="h-14 bg-secondary/30 border-border rounded-2xl text-base pl-6" placeholder="Format: 19XXXXXXXXXXV" />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Documentation & Media</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Driving License image</Label>
                                            <ImageUploadPreview id="photo" file={formData.photo} onChange={(e) => setFormData(prev => ({ ...prev, photo: e.target.files[0] }))} className="aspect-square rounded-2xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">NIC Front</Label>
                                            <ImageUploadPreview id="nicFront" file={formData.nicFront} onChange={(e) => setFormData(prev => ({ ...prev, nicFront: e.target.files[0] }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">NIC Back</Label>
                                            <ImageUploadPreview id="nicBack" file={formData.nicBack} onChange={(e) => setFormData(prev => ({ ...prev, nicBack: e.target.files[0] }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Utility Bill</Label>
                                            <ImageUploadPreview id="utilityBill" file={formData.utilityBill} onChange={(e) => setFormData(prev => ({ ...prev, utilityBill: e.target.files[0] }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Additional</Label>
                                            <ImageUploadPreview id="attachment1" file={formData.attachment1} onChange={(e) => setFormData(prev => ({ ...prev, attachment1: e.target.files[0] }))} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="pt-8 border-t border-border mt-4">
                                <Button type="submit" className="w-full h-16 bg-primary font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all">
                                    {editingId ? 'Authorize Registry Update' : 'Initialize Partner Onboarding'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!viewingVehicles} onOpenChange={(val) => !val && setViewingVehicles(null)}>
                    <DialogContent className="sm:max-w-[600px] h-fit max-h-[80vh] bg-card border-border rounded-[2.5rem] shadow-2xl p-0 overflow-hidden flex flex-col">
                        <DialogHeader className="p-10 pb-6 bg-secondary/10 border-b border-border">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                    <Layers className="h-7 w-7" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black tracking-tight">{viewingVehicles?.name}'s Fleet</DialogTitle>
                                    <DialogDescription className="font-bold text-muted-foreground italic">Assigned high-performance vehicles</DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <div className="p-6 overflow-y-auto scrollbar-hide">
                            <div className="grid grid-cols-1 gap-3">
                                {viewingVehicles?.vendorVehicles?.map(vehicle => (
                                    <div key={vehicle.id} className="flex items-center justify-between p-5 bg-secondary/20 hover:bg-secondary/40 border border-border rounded-2xl transition-all group">
                                        <div className="flex items-center gap-5">
                                            <div className="h-12 w-12 rounded-xl bg-background border border-border/50 flex items-center justify-center">
                                                <img
                                                    src={resolveServerUrl(vehicle.imageUrl) || 'https://via.placeholder.com/150'}
                                                    alt={vehicle.licensePlate}
                                                    className="h-10 w-10 object-contain rounded-lg"
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-foreground tracking-widest uppercase">{vehicle.licensePlate}</div>
                                                <div className="text-xs font-bold text-muted-foreground italic">
                                                    {vehicle.vehicleModel?.brand?.name} {vehicle.vehicleModel?.name}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                            {vehicle.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-8 border-t border-border bg-secondary/5">
                            <Button variant="outline" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs border-border hover:bg-secondary/40 transition-all" onClick={() => setViewingVehicles(null)}>
                                Close Fleet View
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4 bg-card/50 backdrop-blur-md p-5 rounded-[2rem] border border-border shadow-sm">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Scan registry for authenticated partners..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 bg-secondary/50 border-border rounded-2xl h-12 text-sm font-medium focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-44 bg-secondary/50 border-border h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-secondary">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-primary" />
                                <SelectValue placeholder="Vendor Type" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border">
                            <SelectItem value="ALL">All Partners</SelectItem>
                            <SelectItem value="VEHICLE_OWNER">Owners</SelectItem>
                            <SelectItem value="SERVICE_VENDOR">Service</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={groupBy} onValueChange={setGroupBy}>
                        <SelectTrigger className="w-44 bg-secondary/50 border-border h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-secondary">
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-primary" />
                                <SelectValue placeholder="Group Results" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border">
                            <SelectItem value="NONE">Ungrouped</SelectItem>
                            <SelectItem value="TYPE">Categorize</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table Section */}
            <Card className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300">
                {groupBy === "TYPE" && groupedVendors ? (
                    Object.entries(groupedVendors).map(([type, group]) => (
                        <div key={type} className="border-b last:border-0 border-border">
                            <div className="bg-secondary/10 px-8 py-3 font-black text-[10px] uppercase tracking-[0.2em] text-primary/70 flex items-center gap-2">
                                <Badge variant="outline" className="bg-primary text-white border-0">{group.length}</Badge>
                                {type.replace('_', ' ')}
                            </div>
                            <Table>
                                <TableBody>
                                    {group.map(vendor => renderVendorRow(vendor))}
                                </TableBody>
                            </Table>
                        </div>
                    ))
                ) : (
                    <Table>
                        <TableHeader className="bg-secondary/20">
                            <TableRow className="border-border hover:bg-transparent">
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6 pl-8">Partner Identity</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Digital Contact</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Entity Type</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Operational Status</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6 text-right pr-8">Operational Control</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-24">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing Repository...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredVendors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-24 italic text-muted-foreground">
                                        <Store className="h-12 w-12 mx-auto mb-4 opacity-10" />
                                        No partner associations found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredVendors.map((vendor) => renderVendorRow(vendor))
                            )}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </div>
    );
};

export default VendorManagement;
