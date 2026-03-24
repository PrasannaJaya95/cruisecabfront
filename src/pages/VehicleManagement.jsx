import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { resolveServerUrl } from '../lib/api';
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
import { Plus, Search, Filter, Edit2, CarFront, MoreHorizontal, Car as CarIcon, Calendar as CalendarIcon, Upload, X, Eye, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const ImageViewDialog = ({ src, open, onOpenChange }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden p-0 bg-transparent border-0 shadow-none flex items-center justify-center">
            <div className="relative w-full h-full max-h-[85vh] flex items-center justify-center">
                <img
                    src={src}
                    alt="Full size"
                    className="max-w-full max-h-full object-contain rounded-md shadow-2xl"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70 rounded-full"
                    onClick={() => onOpenChange(false)}
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>
        </DialogContent>
    </Dialog>
);

const ImageUploadPreview = ({ id, label, file, onChange, onView, className }) => {
    const getImageUrl = (url) => {
        return resolveServerUrl(url);
    };

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
            setPreview(getImageUrl(file));
        }
    }, [file]);

    return (
        <div className={cn("space-y-2", className)}>
            <Label htmlFor={id}>{label}</Label>
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
                        "flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition-all overflow-hidden relative",
                        preview ? "bg-slate-900 border-emerald-500/50" : "bg-slate-900/50 border-slate-700 hover:bg-slate-800",
                        label.includes("Main") ? "h-48" : "h-32"
                    )}
                >
                    {preview ? (
                        <>
                            <img src={preview} alt="Preview" className="w-full h-full object-contain p-2" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="rounded-full w-8 h-8"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onView(preview);
                                    }}
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>
                                <div className="text-white text-xs font-medium absolute bottom-2 px-2 truncate w-full text-center">
                                    Click to change
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
                            {label.includes("Main") ? <CarIcon className="w-10 h-10" /> : <Upload className="w-6 h-6" />}
                            <span className="text-xs">{label.includes("Main") ? "Click to upload main image" : "Click to upload"}</span>
                        </div>
                    )}
                </Label>
            </div>
        </div>
    );
};

const VehicleManagement = () => {
    const [searchParams] = useSearchParams(); // Get URL params
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);
    const [paymentSchedules, setPaymentSchedules] = useState([]);
    const [newSchedule, setNewSchedule] = useState({
        startDate: undefined,
        endDate: undefined,
        monthlyAmount: '',
        isActive: true
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [brandFilter, setBrandFilter] = useState('all');
    const [groupBy, setGroupBy] = useState('none');
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [deletingVehicle, setDeletingVehicle] = useState(null);

    const [brands, setBrands] = useState([]);
    const [models, setModels] = useState([]);
    const [vendorsList, setVendorsList] = useState([]);
    const [formData, setFormData] = useState({
        brandId: '',
        modelId: '',
        year: '',
        licensePlate: '',
        color: '',
        fuelType: 'Petrol',
        transmission: 'Automatic',
        lastOdometer: '',
        licenseRenewalDate: '',
        licenseFront: null, // File object or URL string
        licenseBack: null,
        insuranceFront: null,
        insuranceBack: null,
        mainImage: null,
        extraImage1: null,
        extraImage2: null,
        extraImage3: null,
        extraImage4: null,

        insuranceRenewalDate: '',
        financeInstallmentDate: '',
        ownership: 'COMPANY', // COMPANY, THIRD_PARTY
        rentalType: 'SHORT_TERM', // SHORT_TERM, LONG_TERM
        vendorId: '',
        dailyRentalRate: '',
        foreignDailyRentalRate: '',
        bookingFee: '',
        contractStartDate: undefined,
        contractEndDate: undefined
    });

    const needsDocuments = formData.ownership === 'COMPANY' || formData.rentalType === 'LONG_TERM';

    const fetchVehicles = async () => {
        try {
            const { data } = await api.get('/vehicles');
            setVehicles(data);
        } catch (error) {
            console.error('Failed to fetch vehicles', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBrands = async () => {
        try {
            const { data } = await api.get('/fleet/brands');
            setBrands(data);
        } catch (error) { console.error("Failed to fetch brands", error); }
    };

    const fetchModels = async (brandId) => {
        try {
            const { data } = await api.get(`/fleet/models?brandId=${brandId}`);
            setModels(data);
        } catch (error) { console.error("Failed to fetch models", error); }
    };

    const fetchVendors = async () => {
        try {
            const { data } = await api.get('/vendors');
            setVendorsList(data);
        } catch (error) { console.error("Failed to fetch vendors", error); }
    };

    const fetchPaymentSchedules = async (vehicleId) => {
        try {
            const { data } = await api.get(`/payment-schedules?vehicleId=${vehicleId}`);
            setPaymentSchedules(data);
        } catch (error) { console.error("Failed to fetch payment schedules", error); }
    };

    useEffect(() => {
        fetchVehicles();
        fetchBrands();
        fetchVendors();

        // Check for status param in URL
        const statusParam = searchParams.get('status');
        if (statusParam) {
            setStatusFilter(statusParam);
        }
    }, [searchParams]);

    useEffect(() => {
        if (formData.brandId) {
            fetchModels(formData.brandId);
        } else {
            setModels([]);
        }
    }, [formData.brandId]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (field, value) => {
        if (field === 'brandId') {
            setFormData(prev => ({ ...prev, [field]: value, modelId: '' }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleDateChange = (field, date) => {
        setFormData(prev => ({ ...prev, [field]: date }));
    };

    const DatePickerField = ({ label, date, onSelect }) => (
        <div className="space-y-2 flex flex-col">
            <Label>{label}</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date && isValid(date) ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={onSelect}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>
    );

    const filteredVehicles = vehicles.filter(vehicle => {
        const plate = vehicle.licensePlate?.toLowerCase() || '';
        const model = vehicle.vehicleModel?.name?.toLowerCase() || '';
        const brand = vehicle.vehicleModel?.brand?.name?.toLowerCase() || '';
        const search = searchQuery.toLowerCase();

        const matchesSearch = plate.includes(search) || model.includes(search) || brand.includes(search);

        const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
        const matchesBrand = brandFilter === 'all' || vehicle.vehicleModel?.brandId === brandFilter;

        return matchesSearch && matchesStatus && matchesBrand;
    });

    const groupedVehicles = (() => {
        if (groupBy === 'none') {
            return { 'All Vehicles': filteredVehicles };
        }

        return filteredVehicles.reduce((groups, vehicle) => {
            let key = '';
            if (groupBy === 'brand') {
                key = vehicle.vehicleModel?.brand?.name || 'Unknown Brand';
            } else if (groupBy === 'status') {
                key = vehicle.status || 'Unknown Status';
            }

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(vehicle);
            return groups;
        }, {});
    })();

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleEdit = (vehicle) => {
        setEditingVehicle(vehicle);
        setFormData({
            brandId: vehicle.vehicleModel?.brandId ? vehicle.vehicleModel.brandId.toString() : '',
            modelId: vehicle.modelId ? vehicle.modelId.toString() : '',
            year: vehicle.year,
            licensePlate: vehicle.licensePlate,
            vin: vehicle.vin || '',
            color: vehicle.color,
            fuelType: vehicle.fuelType,
            transmission: vehicle.transmission,
            currentOdometer: vehicle.currentOdometer,
            lastOdometer: vehicle.lastOdometer || '',
            status: vehicle.status,
            licenseRenewalDate: vehicle.licenseRenewalDate ? new Date(vehicle.licenseRenewalDate) : undefined,
            insuranceRenewalDate: vehicle.insuranceRenewalDate ? new Date(vehicle.insuranceRenewalDate) : undefined,
            financeInstallmentDate: vehicle.financeInstallmentDate ? new Date(vehicle.financeInstallmentDate) : undefined,
            mainImage: vehicle.imageUrl || null,
            extraImage1: (vehicle.additionalImages && JSON.parse(vehicle.additionalImages)[0]) || null,
            extraImage2: (vehicle.additionalImages && JSON.parse(vehicle.additionalImages)[1]) || null,
            extraImage3: (vehicle.additionalImages && JSON.parse(vehicle.additionalImages)[2]) || null,
            extraImage4: (vehicle.additionalImages && JSON.parse(vehicle.additionalImages)[3]) || null,
            licenseFront: vehicle.licenseFrontUrl || null,
            licenseBack: vehicle.licenseBackUrl || null,
            insuranceFront: vehicle.insuranceFrontUrl || null,
            insuranceBack: vehicle.insuranceBackUrl || null,
            ownership: vehicle.ownership || 'COMPANY',
            vendorId: vehicle.vendorId || '',
            dailyRentalRate: vehicle.dailyRentalRate || '',
            foreignDailyRentalRate: vehicle.foreignDailyRentalRate || '',
            bookingFee: vehicle.bookingFee || '',
            contractStartDate: vehicle.contractStartDate ? new Date(vehicle.contractStartDate) : undefined,
            contractEndDate: vehicle.contractEndDate ? new Date(vehicle.contractEndDate) : undefined
        });
        fetchPaymentSchedules(vehicle.id);
        setOpen(true);
    };

    const handleDialogChange = (isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
            setFormData({
                mainImage: null,
                extraImage1: null,
                extraImage2: null,
                extraImage3: null,
                extraImage4: null,
                licenseFront: null,
                licenseBack: null,
                insuranceFront: null,
                insuranceBack: null,
                modelId: '',
                brandId: '',
                year: '',
                licensePlate: '',
                vin: '',
                color: '',
                fuelType: 'Petrol',
                transmission: 'Automatic',
                status: 'AVAILABLE',
                lastOdometer: '',
                licenseRenewalDate: undefined,
                insuranceRenewalDate: undefined,
                financeInstallmentDate: undefined,
                ownership: 'COMPANY',
                vendorId: '',
                dailyRentalRate: '',
                foreignDailyRentalRate: '',
                bookingFee: '',
                contractStartDate: undefined,
                contractEndDate: undefined
            });
            setEditingVehicle(null);
            setPaymentSchedules([]);
            setNewSchedule({
                startDate: undefined,
                endDate: undefined,
                monthlyAmount: '',
                isActive: true
            });
        }
    };

    const handleAddSchedule = async () => {
        if (!editingVehicle) return;
        if (!newSchedule.startDate || !newSchedule.endDate || !newSchedule.monthlyAmount) {
            alert("Please fill all schedule fields");
            return;
        }
        try {
            await api.post('/payment-schedules', {
                vehicleId: editingVehicle.id,
                ...newSchedule
            });
            fetchPaymentSchedules(editingVehicle.id);
            setNewSchedule({
                startDate: undefined,
                endDate: undefined,
                monthlyAmount: '',
                isActive: true
            });
        } catch (error) {
            console.error("Failed to add schedule", error);
            alert("Failed to add schedule");
        }
    };

    const handleDeleteSchedule = async (id) => {
        if (!confirm("Are you sure you want to delete this schedule?")) return;
        try {
            await api.delete(`/payment-schedules/${id}`);
            fetchPaymentSchedules(editingVehicle.id);
        } catch (error) {
            console.error("Failed to delete schedule", error);
            alert("Failed to delete schedule");
        }
    };

    const triggerError = (message) => {
        setErrorMessage(message);
        setShowErrorDialog(true);
    };

    const canDeleteVehicles = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    const handleDeleteVehicle = async () => {
        if (!deletingVehicle) return;
        try {
            await api.delete(`/vehicles/${deletingVehicle.id}`);
            setVehicles(prev => prev.filter(v => v.id !== deletingVehicle.id));
            setDeletingVehicle(null);
        } catch (error) {
            console.error("Error deleting vehicle:", error);
            const detailedError = error.response?.data?.message || error.message || "Unknown error";
            triggerError(`Failed to delete vehicle: ${detailedError}`);
            setDeletingVehicle(null);
        } finally {
            fetchVehicles();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.brandId || !formData.modelId) {
            triggerError("Please select both Brand and Model.");
            return;
        }

        // Validate required fields
        const requiredFields = [
            { field: 'year', label: 'Year' },
            { field: 'licensePlate', label: 'License Plate' },
            { field: 'color', label: 'Color' },
            { field: 'dailyRentalRate', label: 'Local / Corporate Daily Rate' },
            { field: 'foreignDailyRentalRate', label: 'Foreign Daily Rate' },
            { field: 'bookingFee', label: 'Booking Fee' },
            { field: 'lastOdometer', label: 'Last Odometer Value' }
        ];

        // Conditional requirements for License, Insurance, and Finance Installment
        if (needsDocuments) {
            requiredFields.push(
                { field: 'licenseRenewalDate', label: 'Revenue License Renewal Date' },
                { field: 'insuranceRenewalDate', label: 'Insurance Renewal Date' }
            );
        }

        // Conditional requirements for 3rd Party
        if (formData.ownership === 'THIRD_PARTY') {
            requiredFields.push(
                { field: 'vendorId', label: 'Vendor' },
                { field: 'contractStartDate', label: 'Contract Start Date' },
                { field: 'contractEndDate', label: 'Contract End Date' }
            );
        }

        const missingFields = requiredFields.filter(({ field }) => !formData[field]);

        // Validate required documents (only for new vehicles, or if not present in edit)
        // For new vehicles: must have file
        // For edit: must have file OR existing URL string
        const checkDocument = (field) => {
            const value = formData[field];
            if (editingVehicle) {
                // In edit mode, valid if it has a value (string url or new File)
                return !!value;
            } else {
                // In create mode, valid only if it's a File (or truthy, assuming initial state is null)
                return !!value;
            }
        };

        const documentFields = [
            { field: 'mainImage', label: 'Main Vehicle Image' }
        ];

        if (needsDocuments) {
            documentFields.push(
                { field: 'licenseFront', label: 'Revenue License Front' },
                { field: 'licenseBack', label: 'Revenue License Back' },
                { field: 'insuranceFront', label: 'Insurance Front' },
                { field: 'insuranceBack', label: 'Insurance Back' }
            );
        }

        const missingDocuments = documentFields.filter(({ field }) => !checkDocument(field));

        if (missingFields.length > 0 || missingDocuments.length > 0) {
            const allMissing = [
                ...missingFields.map(f => f.label),
                ...missingDocuments.map(f => f.label)
            ];
            triggerError(`Please fill in all required fields: ${allMissing.join(', ')}`);
            return;
        }

        try {
            // Process images
            const imageFields = ['licenseFront', 'licenseBack', 'insuranceFront', 'insuranceBack', 'mainImage'];
            const processedData = {
                ...formData,
                year: parseInt(formData.year),
                lastOdometer: parseInt(formData.lastOdometer) || 0,
                dailyRentalRate: parseFloat(formData.dailyRentalRate) || 0,
                foreignDailyRentalRate: parseFloat(formData.foreignDailyRentalRate) || 0,
                bookingFee: parseFloat(formData.bookingFee) || 0
            };

            // Convert single image fields
            for (const field of imageFields) {
                let targetField = `${field}Url`;
                if (field === 'mainImage') targetField = 'imageUrl';

                if (formData[field] instanceof File) {
                    processedData[targetField] = await convertToBase64(formData[field]);
                } else if (typeof formData[field] === 'string') {
                    // Keep existing URL if it's a string (edit mode)
                    processedData[targetField] = formData[field];
                }
            }

            // Process additional images
            const extraImages = [];
            for (let i = 1; i <= 4; i++) {
                const file = formData[`extraImage${i}`];
                if (file instanceof File) {
                    extraImages.push(await convertToBase64(file));
                } else if (typeof file === 'string') {
                    extraImages.push(file);
                }
            }
            if (extraImages.length > 0) {
                processedData.additionalImages = JSON.stringify(extraImages);
            }

            // Remove File objects from payload to avoid clutter/errors
            imageFields.forEach(f => delete processedData[f]);
            [1, 2, 3, 4].forEach(i => delete processedData[`extraImage${i}`]);

            if (editingVehicle) {
                await api.put(`/vehicles/${editingVehicle.id}`, processedData);
            } else {
                const { data: created } = await api.post('/vehicles', processedData);
                // Ensure the just-created vehicle is visible immediately, even if filters/search were set.
                setVehicles(prev => [created, ...prev]);
                setSearchQuery('');
                setStatusFilter('all');
                setBrandFilter('all');
                setGroupBy('none');
            }

            setOpen(false);
            if (!editingVehicle) {
                setShowSuccessDialog(true);
            }
            // Re-fetch to hydrate relations (model/brand) and ensure canonical server state.
            fetchVehicles();
            handleDialogChange(false); // Reset form properly
        } catch (error) {
            console.error("Error saving vehicle:", error);
            const detailedError = error.response?.data?.message || error.message || "Unknown error";
            const validationErrors = error.response?.data?.errors
                ? "\n" + JSON.stringify(error.response.data.errors, null, 2)
                : "";
            triggerError(`Failed to save vehicle: ${detailedError}${validationErrors}`);
        }
    };


    const getStatusBadge = (status) => {
        switch (status) {
            case 'AVAILABLE': return <Badge className="bg-emerald-500">Available</Badge>;
            case 'RENTED': return <Badge className="bg-blue-500">Rented</Badge>;
            case 'MAINTENANCE': return <Badge variant="destructive">Maintenance</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-5xl font-black text-foreground tracking-tighter mb-2">Fleet Management</h2>
                    <p className="text-muted-foreground font-medium text-lg italic">"Efficiently manage and monitor your premium vehicle inventory."</p>
                </div>

                {/* Contract Alerts */}
                {vehicles.some(v => v.contractEndDate && v.ownership === 'THIRD_PARTY') && (
                    <div className="w-full mt-6 space-y-3">
                        {vehicles.filter(v => v.contractEndDate && v.ownership === 'THIRD_PARTY').map(vehicle => {
                            const endDate = new Date(vehicle.contractEndDate);
                            const today = new Date();
                            const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

                            let alertColor = "";
                            let alertText = "";
                            let showAlert = false;

                            if (diffDays <= 1 && diffDays >= 0) {
                                alertColor = "bg-red-500/10 border-red-500 text-red-600";
                                alertText = "Contract expires tomorrow!";
                                showAlert = true;
                            } else if (diffDays <= 14 && diffDays > 1) {
                                alertColor = "bg-orange-500/10 border-orange-500 text-orange-600";
                                alertText = `Contract expires in ${diffDays} days.`;
                                showAlert = true;
                            } else if (diffDays <= 30 && diffDays > 14) {
                                alertColor = "bg-yellow-500/10 border-yellow-500 text-yellow-600";
                                alertText = `Contract expires in ${diffDays} days.`;
                                showAlert = true;
                            }

                            if (!showAlert) return null;

                            return (
                                <div key={vehicle.id} className={cn("p-4 rounded-2xl border flex items-center justify-between gap-4 animate-in slide-in-from-top duration-500", alertColor)}>
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="w-5 h-5" />
                                        <div>
                                            <span className="font-black text-sm uppercase tracking-wider">{vehicle.licensePlate}</span>
                                            <p className="text-xs font-bold opacity-80">{alertText} (Ends: {format(endDate, "PPP")})</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="font-black text-[10px] uppercase tracking-widest hover:bg-white/20"
                                        onClick={() => handleEdit(vehicle)}
                                    >
                                        Details
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
                <Dialog open={open} onOpenChange={handleDialogChange}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-black px-8 py-7 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs">
                            <Plus className="h-5 w-5" /> Add Vehicle
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border rounded-[2.5rem] shadow-2xl p-0 custom-scrollbar">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                                <div>
                                    <DialogTitle className="text-3xl font-black tracking-tight text-foreground">
                                        {editingVehicle ? 'Update Vehicle' : 'New Fleet Member'}
                                    </DialogTitle>
                                    <DialogDescription className="font-medium text-muted-foreground mt-2">
                                        {editingVehicle ? `Modifying settings for ${editingVehicle.licensePlate}` : 'Onboard a new high-performance vehicle to your fleet.'}
                                    </DialogDescription>
                                </div>
                            </DialogHeader>
                            <div className="px-10 py-8">
                                <Tabs defaultValue="details" className="w-full">
                                    <TabsList className="grid w-full grid-cols-4 bg-secondary/50 p-1.5 rounded-2xl mb-8 border border-border">
                                        <TabsTrigger value="details" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg shadow-primary/20 py-3 transition-all">Details</TabsTrigger>
                                        <TabsTrigger value="rental" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg shadow-primary/20 py-3 transition-all">Pricing</TabsTrigger>
                                        <TabsTrigger value="service" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg shadow-primary/20 py-3 transition-all">Service</TabsTrigger>
                                        {formData.ownership === 'THIRD_PARTY' && editingVehicle && (
                                            <TabsTrigger value="payment-schedule" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg shadow-primary/20 py-3 transition-all">Payment Schedule</TabsTrigger>
                                        )}
                                    </TabsList>
                                    <TabsContent value="details" className="space-y-4 pt-4 px-1">
                                        <div className="space-y-6">
                                            <h3 className="text-lg font-semibold">Vehicle Images</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <ImageUploadPreview
                                                    id="mainImage"
                                                    label="Main Vehicle Image *"
                                                    file={formData.mainImage}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, mainImage: e.target.files[0] }))}
                                                    onView={setViewingImage}
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[1, 2, 3, 4].map((num) => (
                                                        <ImageUploadPreview
                                                            key={num}
                                                            id={`extraImage${num}`}
                                                            label={`Extra ${num}`}
                                                            file={formData[`extraImage${num}`]}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, [`extraImage${num}`]: e.target.files[0] }))}
                                                            onView={setViewingImage}
                                                            className="h-32"
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <h3 className="text-lg font-semibold mt-6">Vehicle Information</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="brand">Brand *</Label>
                                                    <Select onValueChange={(val) => handleSelectChange('brandId', val)} value={formData.brandId}>
                                                        <SelectTrigger><SelectValue placeholder="Select Brand" /></SelectTrigger>
                                                        <SelectContent>
                                                            {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="model">Model *</Label>
                                                    <Select onValueChange={(val) => handleSelectChange('modelId', val)} value={formData.modelId} disabled={!formData.brandId}>
                                                        <SelectTrigger><SelectValue placeholder="Select Model" /></SelectTrigger>
                                                        <SelectContent>
                                                            {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="year">Year *</Label>
                                                    <Input id="year" type="number" placeholder="2024" value={formData.year} onChange={handleInputChange} required />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="licensePlate">License Plate *</Label>
                                                    <Input id="licensePlate" placeholder="ABC-1234" value={formData.licensePlate} onChange={handleInputChange} required />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="color">Color</Label>
                                                    <Input id="color" placeholder="e.g. Black" value={formData.color} onChange={handleInputChange} required />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Fuel Type</Label>
                                                    <Select onValueChange={(val) => handleSelectChange('fuelType', val)} defaultValue={formData.fuelType}>
                                                        <SelectTrigger><SelectValue placeholder="Select fuel" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Petrol">Petrol</SelectItem>
                                                            <SelectItem value="Diesel">Diesel</SelectItem>
                                                            <SelectItem value="Electric">Electric</SelectItem>
                                                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Transmission</Label>
                                                    <Select onValueChange={(val) => handleSelectChange('transmission', val)} defaultValue={formData.transmission}>
                                                        <SelectTrigger><SelectValue placeholder="Select transmission" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Automatic">Automatic</SelectItem>
                                                            <SelectItem value="Manual">Manual</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="status">Vehicle Status *</Label>
                                                    <Select onValueChange={(val) => handleSelectChange('status', val)} value={formData.status}>
                                                        <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="AVAILABLE">Available</SelectItem>
                                                            <SelectItem value="RENTED">Rented</SelectItem>
                                                            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                                            <SelectItem value="RESERVED">Reserved</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="ownership">Ownership</Label>
                                                    <Select
                                                        value={formData.ownership}
                                                        onValueChange={(val) => {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                ownership: val,
                                                                vendorId: val === 'COMPANY' ? '' : prev.vendorId,
                                                                contractStartDate: val === 'COMPANY' ? undefined : prev.contractStartDate,
                                                                contractEndDate: val === 'COMPANY' ? undefined : prev.contractEndDate
                                                            }));
                                                        }}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Select Ownership" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="COMPANY">Company Owned</SelectItem>
                                                            <SelectItem value="THIRD_PARTY">3rd Party</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {formData.ownership === 'THIRD_PARTY' && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="vendor">Vendor</Label>
                                                        <Select
                                                            value={formData.vendorId}
                                                            onValueChange={(val) => handleSelectChange('vendorId', val)}
                                                        >
                                                            <SelectTrigger><SelectValue placeholder="Select Vendor" /></SelectTrigger>
                                                            <SelectContent>
                                                                {vendorsList.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="rentalType">Rental Type</Label>
                                                        <Select
                                                            value={formData.rentalType}
                                                            onValueChange={(val) => handleSelectChange('rentalType', val)}
                                                        >
                                                            <SelectTrigger><SelectValue placeholder="Select Rental Type" /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="SHORT_TERM">Short Term</SelectItem>
                                                                <SelectItem value="LONG_TERM">Long Term</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="rental" className="space-y-4 pt-4 px-1">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="dailyRentalRate">Local / Corporate Daily Rate (LKR) *</Label>
                                                <Input id="dailyRentalRate" type="number" placeholder="0.00" value={formData.dailyRentalRate} onChange={handleInputChange} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="foreignDailyRentalRate">Foreign Customer Daily Rate (LKR) *</Label>
                                                <Input id="foreignDailyRentalRate" type="number" placeholder="0.00" value={formData.foreignDailyRentalRate} onChange={handleInputChange} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="bookingFee">Booking Fee (LKR) *</Label>
                                                <Input id="bookingFee" type="number" placeholder="0.00" value={formData.bookingFee} onChange={handleInputChange} required />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="service" className="space-y-6 pt-4 px-1">
                                        {formData.ownership === 'THIRD_PARTY' && (
                                            <div className="space-y-6 pt-4 border p-6 rounded-md bg-secondary/5 mb-6">
                                                <h4 className="font-medium text-lg flex items-center gap-2">
                                                    <CalendarIcon className="w-5 h-5 text-primary" />
                                                    Contract Information
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <DatePickerField
                                                        label="Contract Start Date *"
                                                        date={formData.contractStartDate}
                                                        onSelect={(date) => handleDateChange('contractStartDate', date)}
                                                    />
                                                    <DatePickerField
                                                        label="Contract End Date *"
                                                        date={formData.contractEndDate}
                                                        onSelect={(date) => handleDateChange('contractEndDate', date)}
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground italic">* Required for 3rd Party vehicles</p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="lastOdometer">Last Odometer Value *</Label>
                                            <Input id="lastOdometer" type="number" placeholder="Enter current odometer" value={formData.lastOdometer} onChange={handleInputChange} required />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* License Section */}
                                            <div className="space-y-6 border p-6 rounded-md h-full flex flex-col justify-between">
                                                <h4 className="font-medium text-lg">Revenue License {needsDocuments && "*"}</h4>
                                                <DatePickerField
                                                    label={`Renewal Date ${needsDocuments ? "*" : ""}`}
                                                    date={formData.licenseRenewalDate}
                                                    onSelect={(date) => handleDateChange('licenseRenewalDate', date)}
                                                />
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <ImageUploadPreview
                                                            id="licenseFront"
                                                            label={`Front ${needsDocuments ? "*" : ""}`}
                                                            file={formData.licenseFront}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, licenseFront: e.target.files[0] }))}
                                                            onView={setViewingImage}
                                                            className="h-48"
                                                        />
                                                        <ImageUploadPreview
                                                            id="licenseBack"
                                                            label={`Back ${needsDocuments ? "*" : ""}`}
                                                            file={formData.licenseBack}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, licenseBack: e.target.files[0] }))}
                                                            onView={setViewingImage}
                                                            className="h-48"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Insurance Section */}
                                            <div className="space-y-6 border p-6 rounded-md h-full flex flex-col justify-between">
                                                <h4 className="font-medium text-lg">Insurance {needsDocuments && "*"}</h4>
                                                <DatePickerField
                                                    label={`Renewal Date ${needsDocuments ? "*" : ""}`}
                                                    date={formData.insuranceRenewalDate}
                                                    onSelect={(date) => handleDateChange('insuranceRenewalDate', date)}
                                                />
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <ImageUploadPreview
                                                            id="insuranceFront"
                                                            label={`Front ${needsDocuments ? "*" : ""}`}
                                                            file={formData.insuranceFront}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, insuranceFront: e.target.files[0] }))}
                                                            onView={setViewingImage}
                                                            className="h-48"
                                                        />
                                                        <ImageUploadPreview
                                                            id="insuranceBack"
                                                            label={`Back ${needsDocuments ? "*" : ""}`}
                                                            file={formData.insuranceBack}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, insuranceBack: e.target.files[0] }))}
                                                            onView={setViewingImage}
                                                            className="h-48"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 border p-4 rounded-md">
                                            <h4 className="font-medium">Finance Installment</h4>
                                            <DatePickerField
                                                label="Next Installment Date"
                                                date={formData.financeInstallmentDate}
                                                onSelect={(date) => handleDateChange('financeInstallmentDate', date)}
                                            />
                                        </div>
                                    </TabsContent>
                                    {formData.ownership === 'THIRD_PARTY' && (
                                        <TabsContent value="payment-schedule" className="space-y-6 pt-4 px-1">
                                            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
                                                <h4 className="font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <Plus className="w-4 h-4" /> Add Payment Tier
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">From</Label>
                                                        <DatePickerField
                                                            date={newSchedule.startDate}
                                                            onSelect={(date) => setNewSchedule(prev => ({ ...prev, startDate: date }))}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">To</Label>
                                                        <DatePickerField
                                                            date={newSchedule.endDate}
                                                            onSelect={(date) => setNewSchedule(prev => ({ ...prev, endDate: date }))}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Monthly Amount</Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={newSchedule.monthlyAmount}
                                                            onChange={(e) => setNewSchedule(prev => ({ ...prev, monthlyAmount: e.target.value }))}
                                                            className="bg-white border-border rounded-xl"
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        onClick={handleAddSchedule}
                                                        className="bg-primary text-white font-black uppercase tracking-widest text-[10px] h-10 rounded-xl"
                                                    >
                                                        Add Line
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="border border-border rounded-3xl overflow-hidden mt-6">
                                                <Table>
                                                    <TableHeader className="bg-secondary/30">
                                                        <TableRow className="border-border">
                                                            <TableHead className="font-black text-[10px] uppercase tracking-widest">Duration</TableHead>
                                                            <TableHead className="font-black text-[10px] uppercase tracking-widest">Monthly Payment</TableHead>
                                                            <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
                                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {paymentSchedules.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="h-24 text-center text-xs font-bold opacity-50 uppercase tracking-widest">No payment schedules added</TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            paymentSchedules.map((schedule) => (
                                                                <TableRow key={schedule.id} className="border-border">
                                                                    <TableCell className="text-xs font-bold">
                                                                        {format(new Date(schedule.startDate), "PP")} - {format(new Date(schedule.endDate), "PP")}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs font-black text-primary">
                                                                        Rs. {schedule.monthlyAmount.toLocaleString()}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {schedule.isActive ? (
                                                                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 font-black text-[8px] uppercase tracking-widest">Active</Badge>
                                                                        ) : (
                                                                            <Badge className="bg-secondary text-muted-foreground border-border font-black text-[8px] uppercase tracking-widest">Inactive</Badge>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => handleDeleteSchedule(schedule.id)}
                                                                            className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg"
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </TabsContent>
                                    )}
                                </Tabs>
                            </div>
                            <DialogFooter className="sm:justify-between px-10 pb-10">
                                <p className="text-sm text-muted-foreground self-center">* Required fields</p>
                                <Button type="submit" className="bg-primary hover:bg-primary/95 text-primary-foreground font-black px-8 h-12 rounded-xl transition-all shadow-lg shadow-primary/20">
                                    {editingVehicle ? 'Update Fleet member' : 'Save New Vehicle'}
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
                        placeholder="Search by Plate, Model or Brand..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 bg-secondary/50 border-border rounded-2xl h-12 text-sm font-medium focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-44 bg-secondary/50 border-border h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-secondary">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-primary" />
                                <SelectValue placeholder="Status" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border">
                            <SelectItem value="all">Every Status</SelectItem>
                            <SelectItem value="AVAILABLE">Available</SelectItem>
                            <SelectItem value="RENTED">Rented</SelectItem>
                            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={brandFilter} onValueChange={setBrandFilter}>
                        <SelectTrigger className="w-44 bg-secondary/50 border-border h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-secondary">
                            <SelectValue placeholder="Brand" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border">
                            <SelectItem value="all">Every Brand</SelectItem>
                            {brands.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-10">
                {Object.entries(groupedVehicles).map(([groupName, groupVehicles]) => (
                    <div key={groupName} className="space-y-6">
                        {groupBy !== 'none' && (
                            <div className="flex items-center gap-4">
                                <h3 className="text-xl font-black text-foreground tracking-tighter uppercase tracking-[0.2em]">{groupName}</h3>
                                <div className="h-px flex-1 bg-border/50"></div>
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-secondary/50 px-3 py-1 rounded-full border border-border">{groupVehicles.length} units</span>
                            </div>
                        )}
                        <Card className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300">
                            <Table>
                                <TableHeader className="bg-secondary/20">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6 pl-8">Vehicle Image</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Plate Number</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Model/Brand</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Daily Rates (LKR)</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Status</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6 text-right pr-8">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupVehicles.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-black uppercase tracking-widest text-xs">No Vehicles Found</TableCell>
                                        </TableRow>
                                    ) : (
                                        groupVehicles.map(vehicle => (
                                            <TableRow key={vehicle.id} className="border-border group hover:bg-secondary/10 transition-colors">
                                                <TableCell className="py-6 pl-8">
                                                    <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-secondary border border-border group-hover:bg-card transition-colors shadow-sm">
                                                        <img
                                                            src={resolveServerUrl(vehicle.imageUrl) || 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=200'}
                                                            alt={vehicle.licensePlate}
                                                            referrerPolicy="no-referrer"
                                                            loading="lazy"
                                                            decoding="async"
                                                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${vehicle.licensePlate}&background=random&size=400`; }}
                                                            className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-black text-foreground tracking-tight py-6">
                                                    <div className="px-3 py-1.5 bg-secondary/80 rounded-lg border border-border inline-block text-xs">
                                                        {vehicle.licensePlate}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-6">
                                                    <div>
                                                        <p className="font-black text-foreground">{vehicle.vehicleModel?.brand?.name}</p>
                                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">{vehicle.vehicleModel?.name}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-black text-primary py-6">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 cursor-help" title="Local / Corporate Customer Rate">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                            <span>Rs. {vehicle.dailyRentalRate?.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-blue-500 cursor-help" title="Foreign Customer Rate">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                                            <span className="text-[10px]">Rs. {vehicle.foreignDailyRentalRate?.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-6">
                                                    {getStatusBadge(vehicle.status)}
                                                </TableCell>
                                                <TableCell className="text-right pr-8">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setEditingVehicle(vehicle);
                                                                handleEdit(vehicle);
                                                            }}
                                                            className="h-9 w-9 bg-primary/5 hover:bg-primary text-primary hover:text-white rounded-xl transition-all"
                                                            title="Quick View"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEdit(vehicle)}
                                                            className="h-9 w-9 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-all"
                                                            title="Edit Vehicle"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        {canDeleteVehicles && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setDeletingVehicle(vehicle)}
                                                                className="h-9 w-9 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white rounded-xl transition-all"
                                                                title="Delete Vehicle"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
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
                    </div>
                ))}

                {!loading && Object.values(groupedVehicles).flat().length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed rounded-[2.5rem] border-border bg-card/30">
                        <div className="flex flex-col items-center gap-4 text-muted-foreground">
                            <Search className="h-12 w-12 opacity-20" />
                            <p className="font-black uppercase tracking-widest text-xs">No vehicles found matching your criteria</p>
                        </div>
                    </div>
                )}
            </div>

            <ImageViewDialog
                src={viewingImage}
                open={!!viewingImage}
                onOpenChange={(open) => !open && setViewingImage(null)}
            />

            <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <AlertDialogContent className="bg-card border-border rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="h-10 w-10 text-emerald-500" />
                    </div>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tight mb-2">Success!</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground font-medium">
                            The new vehicle has been successfully added to your fleet database and is now live.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8">
                        <AlertDialogAction onClick={() => setShowSuccessDialog(false)} className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-6 rounded-xl transition-all shadow-lg shadow-primary/20">Great!</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
                <AlertDialogContent className="bg-card border-border rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="h-10 w-10 text-red-500" />
                    </div>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tight mb-2 text-red-500">Execution Error</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground font-medium">
                            {errorMessage}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8">
                        <AlertDialogAction onClick={() => setShowErrorDialog(false)} className="bg-red-500 hover:bg-red-600 text-white font-black px-10 py-6 rounded-xl transition-all shadow-lg shadow-red-500/20">Understood</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!deletingVehicle} onOpenChange={(open) => !open && setDeletingVehicle(null)}>
                <AlertDialogContent className="bg-card border-border rounded-[2.5rem] shadow-2xl p-10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tight text-rose-600">Delete vehicle?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground font-medium">
                            This will permanently delete <span className="font-black text-foreground">{deletingVehicle?.licensePlate}</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 flex gap-3 sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl font-black uppercase tracking-widest text-[10px]"
                            onClick={() => setDeletingVehicle(null)}
                        >
                            Cancel
                        </Button>
                        <AlertDialogAction
                            onClick={handleDeleteVehicle}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-black px-8 py-6 rounded-xl transition-all shadow-lg shadow-rose-600/20"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
};

export default VehicleManagement;
