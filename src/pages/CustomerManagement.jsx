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
    DialogTrigger
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, User, Trash2, Pencil, FileText, Upload, Save, Send, Building2, Globe, CheckCircle, Search, Filter, Coins, Archive, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from "@/components/ui/card";
import CustomerWizard from '@/components/CustomerWizard';
import SuccessWizard from '@/components/SuccessWizard';

const CustomerManagement = () => {
    const { user } = useAuth();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isReadOnly, setIsReadOnly] = useState(false);

    // Approval Wizard State
    const [approvalWizardOpen, setApprovalWizardOpen] = useState(false);
    const [customerToApprove, setCustomerToApprove] = useState(null);

    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
    const [customerToArchive, setCustomerToArchive] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);

    // Success Wizard State
    const [showSuccessWizard, setShowSuccessWizard] = useState(false);
    const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });

    // Filter & Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterType, setFilterType] = useState('ALL');

    // Form State
    const [customerType, setCustomerType] = useState('local'); // local, foreign, corporate
    const [formData, setFormData] = useState({
        // Common
        email: '',
        address: '',
        phone: '',
        mobile: '',
        description: '',

        // Local/Foreign specific
        name: '',
        nicOrPassport: '', // Local
        drivingLicenseNo: '',
        passportNo: '', // Foreign

        // Corporate specific
        companyName: '',
        brNumber: '',
        contactPersonName: '',
        contactPersonMobile: '',

        // Relations (Local)
        closeRelationName: '',
        closeRelationMobile: '',

        doc1Url: '',
        doc2Url: '',
        utilityBillUrl: '',
        drivingLicenseFrontUrl: '',
        drivingLicenseBackUrl: '',
        intlDrivingLicenseFrontUrl: '',
        intlDrivingLicenseBackUrl: '',
        aaPermitUrl: '',
    });

    const [files, setFiles] = useState({
        doc1: null, // NIC/Passport/BR Front
        doc2: null, // NIC/Passport/BR Back (or Visa for Foreign)
        utilityBill: null, // Local/Corporate
        support1: null,
        support2: null
    });

    const fetchCustomers = async () => {
        try {
            const { data } = await api.get('/clients');
            setCustomers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch customers', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const canApproveCustomers =
        user?.role === 'SUPER_ADMIN' ||
        user?.role === 'ADMIN' ||
        user?.permissionGroup?.permissions?.includes('CUSTOMER_CONFIRM');

    const canArchiveOrDeleteCustomer =
        user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleFileChange = (e, key) => {
        setFiles(prev => ({ ...prev, [key]: e.target.files[0] }));
    };

    const resetForm = () => {
        setFormData({
            email: '', address: '', phone: '', mobile: '', description: '',
            name: '', nicOrPassport: '', drivingLicenseNo: '', passportNo: '',
            companyName: '', brNumber: '', contactPersonName: '', contactPersonMobile: '',
            closeRelationName: '', closeRelationMobile: '',
            doc1Url: '', doc2Url: '', utilityBillUrl: '', drivingLicenseFrontUrl: '', drivingLicenseBackUrl: '',
            intlDrivingLicenseFrontUrl: '', intlDrivingLicenseBackUrl: '', aaPermitUrl: '',
        });
        setFiles({ doc1: null, doc2: null, utilityBill: null, support1: null, support2: null });
        setCustomerType('local');
        setEditingId(null);
    };

    const handleClose = () => {
        setOpen(false);
        resetForm();
        setIsReadOnly(false);
    };

    const handleEdit = (customer) => {
        setEditingId(customer.id);
        setIsReadOnly(customer.status === 'CONFIRMED');
        setCustomerType(customer.type.toLowerCase());
        setFormData({
            email: customer.email || '',
            address: customer.address || '',
            phone: customer.phone || '',
            mobile: customer.mobile || '',
            description: customer.description || '',
            name: customer.name || '',
            nicOrPassport: customer.nicOrPassport || '',
            drivingLicenseNo: customer.drivingLicenseNo || '',
            passportNo: customer.passportNo || '',
            companyName: customer.companyName || '',
            brNumber: customer.brNumber || '',
            contactPersonName: customer.contactPersonName || '',
            contactPersonMobile: customer.contactPersonMobile || '',
            closeRelationName: customer.closeRelationName || '',
            closeRelationMobile: customer.closeRelationMobile || '',
            doc1Url: customer.doc1Url || '',
            doc2Url: customer.doc2Url || '',
            utilityBillUrl: customer.utilityBillUrl || '',
            drivingLicenseFrontUrl: customer.drivingLicenseFrontUrl || '',
            drivingLicenseBackUrl: customer.drivingLicenseBackUrl || '',
            intlDrivingLicenseFrontUrl: customer.intlDrivingLicenseFrontUrl || '',
            intlDrivingLicenseBackUrl: customer.intlDrivingLicenseBackUrl || '',
            aaPermitUrl: customer.aaPermitUrl || '',
        });
        setOpen(true);
    };

    const handleCreateNew = () => {
        console.log('CustomerManagement: handleCreateNew - Initializing fresh state');
        resetForm();
        setOpen(true);
    };

    const handleWizardSubmit = async (wizardData, wizardFiles, wizardType, status = 'DRAFT') => {
        const mode = editingId ? 'UPDATE' : 'CREATE';
        console.log(`CustomerManagement: handleWizardSubmit starting [MODE: ${mode}]`, { 
            editingId, 
            wizardType, 
            status 
        });
        
        const payload = {
            ...wizardData,
            type: wizardType.toUpperCase(),
            status: status === 'SUBMIT' ? 'PENDING_APPROVAL' : 'DRAFT'
        };

        // console.log('CustomerManagement: handleWizardSubmit payload prepared:', payload);

        try {
            // Setup File Upload logic
            const uploadedUrls = {};
            for (const [key, file] of Object.entries(wizardFiles)) {
                if (file instanceof File) {
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                        const uploadRes = await api.post('/upload', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        // The server returns a relative path like /uploads/filename.ext
                        uploadedUrls[`${key}Url`] = uploadRes.data.url;
                    } catch (uploadErr) {
                        console.error(`CustomerManagement: Failed to upload ${key}`, uploadErr);
                        alert(`Warning: Failed to upload ${key}. Continuing...`);
                    }
                }
            }

            // Merge uploaded URLs into the payload
            Object.assign(payload, uploadedUrls);

            if (editingId) {
                console.log(`CustomerManagement: [UPDATE MODE] Updating customer ${editingId}...`);
                await api.put(`/clients/${editingId}`, payload);
                console.log('CustomerManagement: Update successful.');
                setSuccessMessage({
                    title: "Customer Updated!",
                    message: "The customer profile has been successfully updated."
                });
            } else {
                console.log('CustomerManagement: Creating new customer...');
                const createRes = await api.post('/clients', payload);
                console.log('CustomerManagement: Creation successful:', createRes.data);
                setSuccessMessage({
                    title: "Customer Created!",
                    message: "New customer has been successfully added to the system."
                });
            }

            handleClose();
            await fetchCustomers();
            setShowSuccessWizard(true);
        } catch (error) {
            console.error("CustomerManagement: Error saving customer:", error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
            alert(`Failed to save customer: ${errorMessage}`);
        }
    };

    const handleSubmit = async (status = 'DRAFT') => {
        if (!validateForm()) return;

        const payload = {
            ...formData,
            type: customerType.toUpperCase(),
            status: status === 'SUBMIT' ? 'PENDING_APPROVAL' : 'DRAFT'
        };

        try {
            if (editingId) {
                await api.put(`/clients/${editingId}`, payload);
                setSuccessMessage({
                    title: "Customer Updated!",
                    message: "The customer profile has been successfully updated."
                });
            } else {
                await api.post('/clients', payload);
                setSuccessMessage({
                    title: "Customer Created!",
                    message: "New customer has been successfully added to the system."
                });
            }
            handleClose();
            fetchCustomers();
            setShowSuccessWizard(true);
        } catch (error) {
            console.error("Error saving customer:", error);
            alert("Failed to save customer.");
        }
    };

    const handleApproveClick = (customer) => {
        setCustomerToApprove(customer);
        setApprovalWizardOpen(true);
    };

    const confirmApproval = async () => {
        if (!customerToApprove) return;

        try {
            console.log("Approving customer:", customerToApprove.id);
            await api.put(`/clients/${customerToApprove.id}`, { status: 'CONFIRMED' });

            setApprovalWizardOpen(false);
            setCustomerToApprove(null);
            fetchCustomers();

            setSuccessMessage({
                title: "Customer Approved!",
                message: "This customer now has full access to the platform."
            });
            setShowSuccessWizard(true);
        } catch (error) {
            console.error("Error approving customer:", error);
            alert("Failed to approve customer.");
        }
    };

    const handleArchiveClick = (customer) => {
        setCustomerToArchive(customer);
        setArchiveDialogOpen(true);
    };

    const confirmArchive = async () => {
        if (!customerToArchive) return;
        try {
            await api.post(`/clients/${customerToArchive.id}/archive`);
            setArchiveDialogOpen(false);
            setCustomerToArchive(null);
            fetchCustomers();
            setSuccessMessage({
                title: 'Customer archived',
                message: 'This customer is now archived and hidden from active lists.',
            });
            setShowSuccessWizard(true);
        } catch (error) {
            console.error('Archive error:', error);
            alert(error.response?.data?.message || 'Failed to archive customer.');
        }
    };

    const handleUnarchive = async (customer) => {
        if (!window.confirm(`Restore "${customer.name || customer.companyName || customer.code}" to active customers (status: Confirmed)?`)) return;
        try {
            await api.post(`/clients/${customer.id}/unarchive`, { status: 'CONFIRMED' });
            fetchCustomers();
            setSuccessMessage({
                title: 'Customer restored',
                message: 'The customer has been unarchived and set to Confirmed.',
            });
            setShowSuccessWizard(true);
        } catch (error) {
            console.error('Unarchive error:', error);
            alert(error.response?.data?.message || 'Failed to restore customer.');
        }
    };

    const handleDeleteClick = (customer) => {
        setCustomerToDelete(customer);
        setDeleteDialogOpen(true);
    };

    const confirmDeleteArchived = async () => {
        if (!customerToDelete) return;
        try {
            await api.delete(`/clients/${customerToDelete.id}`);
            setDeleteDialogOpen(false);
            setCustomerToDelete(null);
            fetchCustomers();
            setSuccessMessage({
                title: 'Customer deleted',
                message: 'The archived customer record has been permanently removed.',
            });
            setShowSuccessWizard(true);
        } catch (error) {
            console.error('Delete error:', error);
            alert(error.response?.data?.message || 'Failed to delete customer.');
        }
    };

    const validateForm = () => {
        // Implementation of mandatory field check based on type
        // For Draft, maybe less strict? For Submit, strict.
        // Assuming strict for now as requested "fields must be compulsory"
        const required = [];

        if (customerType === 'local') {
            required.push('name', 'phone', 'mobile', 'address', 'nicOrPassport', 'drivingLicenseNo');
        } else if (customerType === 'foreign') {
            required.push('name', 'phone', 'mobile', 'address', 'passportNo');
        } else if (customerType === 'corporate') {
            required.push('companyName', 'phone', 'mobile', 'address', 'brNumber', 'contactPersonName', 'contactPersonMobile');
        }

        const missing = required.filter(field => !formData[field]);
        if (missing.length > 0) {
            alert(`Missing mandatory fields: ${missing.join(', ')}`);
            return false;
        }
        return true;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-5xl font-black text-foreground tracking-tighter mb-2">Customer Registry</h2>
                    <p className="text-muted-foreground font-medium text-lg italic">"Manage and identify your elite clientele with precision."</p>
                </div>
                <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
                    <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-black px-8 py-7 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs" onClick={handleCreateNew}>
                        <Plus className="h-5 w-5" /> Add New Customer
                    </Button>
                    <CustomerWizard
                        open={open}
                        onOpenChange={(val) => {
                            if (!val) handleClose();
                        }}
                        onSubmit={handleWizardSubmit}
                        initialData={editingId ? formData : null}
                        isReadOnly={isReadOnly}
                        editingCustomerId={editingId}
                    />
                </Dialog>
            </div>

            {/* Search and Filters */}
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-card/50 backdrop-blur-md p-5 rounded-[2rem] border border-border shadow-sm">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, code, or email..."
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
                            <SelectItem value="ALL">All Statuses</SelectItem>
                            <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-44 bg-secondary/50 border-border h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-secondary">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-primary" />
                                <SelectValue placeholder="Type" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border">
                            <SelectItem value="ALL">All Types</SelectItem>
                            <SelectItem value="LOCAL">Local</SelectItem>
                            <SelectItem value="FOREIGN">Foreign</SelectItem>
                            <SelectItem value="CORPORATE">Corporate</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* List View */}
            <Card className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300">
                <Table>
                    <TableHeader className="bg-secondary/20">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6 pl-8">Customer Code</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Name / Company</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Type</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Loyalty Points</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Status</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6 text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-black uppercase tracking-widest text-xs">Loading Customers...</TableCell>
                            </TableRow>
                        ) : customers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-black uppercase tracking-widest text-xs">No Customers found</TableCell>
                            </TableRow>
                        ) : (
                            customers
                                .filter(customer => {
                                    const matchesSearch =
                                        (customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
                                        (customer.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
                                        (customer.code?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
                                        (customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) || '');

                                    const matchesStatus = filterStatus === 'ALL' || customer.status === filterStatus;
                                    const matchesType = filterType === 'ALL' || customer.type === filterType;

                                    return matchesSearch && matchesStatus && matchesType;
                                })
                                .map((customer) => (
                                    <TableRow key={customer.id} className="border-border group hover:bg-secondary/10 transition-colors">
                                        <TableCell className="py-6 pl-8 font-mono text-primary font-black text-xs">
                                            {customer.code}
                                        </TableCell>
                                        <TableCell className="py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-black text-xs text-primary shadow-sm border border-border">
                                                    {(customer.type === 'CORPORATE' ? customer.companyName : customer.name)?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-foreground">
                                                        {customer.type === 'CORPORATE' ? customer.companyName : customer.name}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                                                        {customer.email || '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-6">
                                            <span className="px-3 py-1 bg-secondary rounded-lg border border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                {customer.type}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-6">
                                            <div className="flex items-center gap-2 text-amber-500 font-black">
                                                <Coins className="w-4 h-4" />
                                                {(customer.loyaltyPoints || 0).toLocaleString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-6">
                                            <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                                customer.status === 'CONFIRMED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                    customer.status === 'PENDING_APPROVAL' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                        customer.status === 'ARCHIVED' ? "bg-slate-100 text-slate-600 border-slate-200" :
                                                        "bg-secondary text-muted-foreground border-border"
                                            )}>
                                                {customer.status ? customer.status.replace('_', ' ') : 'DRAFT'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right py-6 pr-8">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {customer.status === 'PENDING_APPROVAL' && canApproveCustomers && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 bg-emerald-500/5 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl transition-all"
                                                            onClick={() => handleApproveClick(customer)}
                                                            title="Approve Customer"
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                )}
                                                {customer.status !== 'ARCHIVED' && canArchiveOrDeleteCustomer && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 bg-slate-500/5 hover:bg-slate-600 text-slate-600 hover:text-white rounded-xl transition-all"
                                                        onClick={() => handleArchiveClick(customer)}
                                                        title="Archive customer"
                                                    >
                                                        <Archive className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {customer.status === 'ARCHIVED' && canArchiveOrDeleteCustomer && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 bg-blue-500/5 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl transition-all"
                                                            onClick={() => handleUnarchive(customer)}
                                                            title="Restore customer"
                                                        >
                                                            <Undo2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 bg-red-500/5 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition-all"
                                                            onClick={() => handleDeleteClick(customer)}
                                                            title="Permanently delete archived customer"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                {customer.status !== 'ARCHIVED' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 bg-primary/5 hover:bg-primary text-primary hover:text-white rounded-xl transition-all"
                                                        onClick={() => handleEdit(customer)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Approval Wizard Dialog */}
            <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border rounded-[2.5rem] shadow-2xl p-10">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight">Archive customer?</DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium">
                            Archived customers are excluded from active operations. Only Super Admin and Admin can archive or delete.
                        </DialogDescription>
                    </DialogHeader>
                    {customerToArchive && (
                        <p className="text-sm font-bold text-foreground py-2">
                            {customerToArchive.name || customerToArchive.companyName} <span className="text-primary font-mono">{customerToArchive.code}</span>
                        </p>
                    )}
                    <DialogFooter className="gap-3">
                        <Button variant="ghost" onClick={() => setArchiveDialogOpen(false)} className="rounded-xl">Cancel</Button>
                        <Button onClick={confirmArchive} className="bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-[10px]">
                            Archive
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border rounded-[2.5rem] shadow-2xl p-10">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight text-red-600">Delete permanently?</DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium">
                            This removes the customer record from the database. This cannot be undone. Only archived customers can be deleted.
                        </DialogDescription>
                    </DialogHeader>
                    {customerToDelete && (
                        <p className="text-sm font-bold text-foreground py-2">
                            {customerToDelete.name || customerToDelete.companyName} <span className="text-primary font-mono">{customerToDelete.code}</span>
                        </p>
                    )}
                    <DialogFooter className="gap-3">
                        <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">Cancel</Button>
                        <Button onClick={confirmDeleteArchived} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-[10px]">
                            Delete forever
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={approvalWizardOpen} onOpenChange={setApprovalWizardOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center text-center overflow-hidden">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="h-10 w-10 text-emerald-500" />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight mb-2">Confirm Approval</DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium">
                            Are you sure you want to approve this customer? They will lead our elite fleet.
                        </DialogDescription>
                    </DialogHeader>

                    {customerToApprove && (
                        <div className="w-full mt-6 py-5 px-6 bg-secondary/30 rounded-2xl border border-border text-left">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs uppercase tracking-widest font-black opacity-40">
                                    <span>Client</span>
                                    <span>Code</span>
                                </div>
                                <div className="flex justify-between items-center font-black">
                                    <span className="text-foreground">{customerToApprove.name || customerToApprove.companyName}</span>
                                    <span className="text-primary">{customerToApprove.code}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="w-full mt-10 flex flex-col sm:flex-row gap-3">
                        <Button variant="ghost" onClick={() => setApprovalWizardOpen(false)} className="flex-1 font-black uppercase tracking-widest text-[10px] py-6 rounded-xl border border-border">
                            Cancel
                        </Button>
                        <Button onClick={confirmApproval} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] py-6 rounded-xl shadow-lg shadow-emerald-500/20">
                            Confirm Approval
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <SuccessWizard
                open={showSuccessWizard}
                onOpenChange={setShowSuccessWizard}
                title={successMessage.title}
                message={successMessage.message}
                onAction={(action) => {
                    setShowSuccessWizard(false);
                    if (action === 'add_another') {
                        // Small delay to ensure smooth transition
                        setTimeout(() => {
                            resetForm();
                            setOpen(true);
                        }, 200);
                    }
                }}
            />
        </div>
    );
};

export default CustomerManagement;
