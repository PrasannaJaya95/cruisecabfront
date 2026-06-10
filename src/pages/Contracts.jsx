import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { printHtmlDocument } from '@/lib/printHtmlDocument';
import { partitionInvoiceLinesForAdvance } from '@/lib/invoiceLineTable';
import { cn } from '@/lib/utils';
import { resolveDiscountState } from '@/utils/discount';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimeInput24 } from '@/components/ui/time-input-24';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import ImageUploadPreview from '@/components/ImageUploadPreview';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addDays } from 'date-fns';
import { formatDate, formatDateTime } from '@/lib/dates';
import { Plus, Search, MapPin, Settings, Edit, Trash2, X, ExternalLink, Eye, DollarSign, ChevronLeft, ChevronRight, CheckCircle2, MessageCircle, Copy, Check, FileText, Receipt, Printer, Share2 } from 'lucide-react';
import { normalizePhoneForWhatsApp, pickCustomerWhatsAppPhone, openWhatsAppWeb } from '@/lib/whatsappWeb';
import Pagination from '@/components/Pagination';
import LocationManager from '@/components/LocationManager';

function customerDisplayNameForWhatsApp(customer) {
    if (!customer) return 'there';
    if (String(customer.type || '').toUpperCase() === 'CORPORATE' && customer.companyName?.trim()) {
        return customer.companyName.trim();
    }
    return customer.name?.trim() || customer.email?.split('@')[0] || 'there';
}

function buildAdvanceReceiptWhatsAppMessage(receipt, shareUrl) {
    const name = customerDisplayNameForWhatsApp(receipt.contract?.customer);
    const no = receipt.receiptNo || '';
    const contract = receipt.contract?.contractNo || '-';
    const amount = Number(receipt.amount ?? 0);
    return [
        `Hello ${name},`,
        '',
        `Your advance payment receipt *${no}* is ready (contract ${contract}).`,
        `Amount received (LKR): *${amount.toLocaleString()}*`,
        '',
        `View or print: ${shareUrl}`,
        '',
        'Thank you.',
    ].join('\n');
}

function buildInvoiceWhatsAppMessage(invoice, shareUrl) {
    const name = customerDisplayNameForWhatsApp(invoice.customer);
    const no = invoice.invoiceNo || '';
    const contract = invoice.contract?.contractNo || '-';
    const amount = Number(invoice.total ?? 0);
    const isReturn = String(invoice.type || '').toUpperCase() === 'RETURN';
    
    if (isReturn) {
        return [
            `Hello ${name},`,
            '',
            `Your return settlement invoice *${no}* is ready (contract ${contract}).`,
            `Settlement amount (LKR): *${Number(Math.abs(amount)).toLocaleString()}*`,
            '',
            `View or print: ${shareUrl}`,
            '',
            'Thank you.',
        ].join('\n');
    }

    return [
        `Hello ${name},`,
        '',
        `Your upfront invoice *${no}* is ready (contract ${contract}).`,
        `Invoice total (LKR): *${amount.toLocaleString()}*`,
        '',
        `View or print: ${shareUrl}`,
        '',
        'Thank you.',
    ].join('\n');
}

const ImageViewDialog = ({ src, open, onOpenChange }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden p-0 bg-transparent border-0 shadow-none flex items-center justify-center">
            <DialogHeader className="sr-only">
                <DialogTitle>Image View</DialogTitle>
                <DialogDescription>Full size image preview</DialogDescription>
            </DialogHeader>
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

const parseTimeTo24h = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const t = timeStr.trim().toUpperCase();

    const m24 = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (m24) {
        const h = Number(m24[1]);
        const min = Number(m24[2]);
        if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return { h, min };
    }

    const m12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(t);
    if (m12) {
        let h = Number(m12[1]);
        const min = Number(m12[2]);
        const ap = m12[3];
        if (h < 1 || h > 12 || min < 0 || min > 59) return null;
        if (ap === 'PM' && h !== 12) h += 12;
        if (ap === 'AM' && h === 12) h = 0;
        return { h, min };
    }

    return null;
};

const combineDateAndTime = (dateStr, timeStr) => {
    if (!dateStr) return null;
    let d;
    if (dateStr instanceof Date) {
        d = dateStr;
    } else {
        d = new Date(dateStr);
    }

    if (isNaN(d.getTime())) return null;

    const hhmm = parseTimeTo24h(timeStr);
    if (!hhmm) return null;

    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hhmm.h, hhmm.min, 0, 0);
};

const MS_PER_RENTAL_DAY = 24 * 60 * 60 * 1000;

function computeRentalDayUnits(pickupDateYmd, pickupTimeHm, dropoffDateYmd, dropoffTimeHm) {
    const start = combineDateAndTime(pickupDateYmd, pickupTimeHm);
    const end = combineDateAndTime(dropoffDateYmd, dropoffTimeHm);
    if (!start || !end) return 0;
    const ms = end.getTime() - start.getTime();
    if (!Number.isFinite(ms) || ms <= 0) return 0;
    return ms / MS_PER_RENTAL_DAY;
}

function formatRentalPeriod(pickupDateYmd, pickupTimeHm, dropoffDateYmd, dropoffTimeHm) {
    const start = combineDateAndTime(pickupDateYmd, pickupTimeHm);
    const end = combineDateAndTime(dropoffDateYmd, dropoffTimeHm);
    if (!start || !end) return '—';
    const ms = end.getTime() - start.getTime();
    if (!Number.isFinite(ms) || ms <= 0) return '—';
    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    return parts.length ? parts.join(', ') : 'Less than 1 minute';
}

const Contracts = () => {
    const [contracts, setContracts] = useState([]);
    const [filteredContracts, setFilteredContracts] = useState([]); // Displayed contracts
    const [searchParams, setSearchParams] = useSearchParams();
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [contractListCategoryFilter, setContractListCategoryFilter] = useState('all');
    const [contractListSearch, setContractListSearch] = useState('');
    const [customers, setCustomers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [fleetCategories, setFleetCategories] = useState([]);
    const [contractVehicleCategoryFilter, setContractVehicleCategoryFilter] = useState('all');
    const [contractVehicleSearch, setContractVehicleSearch] = useState('');
    const [districts, setDistricts] = useState([]);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [isLocationManagerOpen, setIsLocationManagerOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [viewingImage, setViewingImage] = useState(null);
    const [isReadOnly, setIsReadOnly] = useState(false); // New State for Read-Only Mode
    const [deleteConfirmId, setDeleteConfirmId] = useState(null); // ID of contract pending deletion
    const [upfrontInvoice, setUpfrontInvoice] = useState(null);
    const [returnInvoice, setReturnInvoice] = useState(null);
    const [agreement, setAgreement] = useState(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [receiptSuccessOpen, setReceiptSuccessOpen] = useState(false);
    const [currentSavedReceipt, setCurrentSavedReceipt] = useState(null);
    const [copiedReceiptLink, setCopiedReceiptLink] = useState(false);
    const [copiedInvoiceLink, setCopiedInvoiceLink] = useState(false);
    // Posted (and not reversed) advance receipt for the contract currently being edited.
    // The upfront invoice can hide its payments while UPCOMING (upfrontReleased=false),
    // so we read this directly from the advance receipts endpoint to know whether the
    // "Create Advance Receipt" button should stay locked.
    const [activeAdvanceReceipt, setActiveAdvanceReceipt] = useState(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 20 });

    // Form State
    /**
     * Factory (not a constant) so a freshly-opened form always shows the
     * **current** wall-clock time in pick-up / drop-off, not whatever time
     * the user happened to load the page at. UPCOMING is the default status,
     * which the user wants to default to "now" for both fields.
     */
    const makeInitialFormState = () => ({
        customerId: '',
        vehicleId: '',
        pickupDate: '',
        pickupTime: format(new Date(), 'HH:mm'),
        dropoffDate: '',
        dropoffTime: format(new Date(), 'HH:mm'),
        appliedDailyRate: '',
        securityDeposit: '',
        advancePaymentAmount: '0',
        advancePaymentDate: '',
        dailyKmLimit: '100',
        allocatedKm: '100',
        extraMileageCharge: '0',
        securityDepositReturned: '0',
        status: 'UPCOMING', // Default status

        // Delivery
        isDelivery: false,
        deliveryCharge: '',
        districtId: '',
        cityId: '',

        // Vehicle State
        fuelLevel: 'FULL',
        startOdometer: '',
        endOdometer: '',

        // Checklist
        license: false,
        insurance: false,
        carpets: false,
        spareWheel: false,
        jack: false,
        jackHandle: false,
        airPump: false,
        audioSetup: false,
        toolCover: false,
        mudCovers: false,

        // Return Checklist
        returnLicense: false,
        returnInsurance: false,
        returnCarpets: false,
        returnSpareWheel: false,
        returnJack: false,
        returnJackHandle: false,
        returnAirPump: false,
        returnAudioSetup: false,
        returnToolCover: false,
        returnMudCovers: false,

        batteryCode: '',
        remark: '',
        inspectionImages: [null, null, null, null, null],

        returnBatteryCode: '',
        returnRemark: '',
        returnInspectionImages: [null, null, null, null, null],

        // Return details
        actualReturnDate: '',
        actualReturnTime: '',
        isCollection: false,
        collectionCharge: '',

        // Extra charges (RETURN only -> consumed from security deposit)
        hasDamageCharge: false,
        damageCharge: '0',
        hasOtherCharge: false,
        otherChargeLines: [],
        otherChargeDescription: '',
        otherChargeAmount: '0',

        frontTyres: '100%',
        rearTyres: '100%',
        returnFrontTyres: '100%',
        returnRearTyres: '100%',
    });

    const [formData, setFormData] = useState(makeInitialFormState);
    const [baseDailyRate, setBaseDailyRate] = useState(0);
    const [discountType, setDiscountType] = useState('PERCENT'); // PERCENT | AMOUNT
    const [discountValue, setDiscountValue] = useState('0');
    
    // Status helpers for conditional read-only fields
    const isEditing = !!editingId;
    const isConfirmed = isEditing && ['IN_PROGRESS', 'RETURN', 'COMPLETED'].includes(formData.status);
    const isReturned = isEditing && ['RETURN', 'COMPLETED'].includes(formData.status);
    const isCompletedStatus = isEditing && formData.status === 'COMPLETED';

    // Exchange Form State
    const [exchangeData, setExchangeData] = useState({
        oldVehicleReturnDate: '',
        oldVehicleReturnOdometer: '',
        newVehicleId: '',
        newVehicleStartDate: '',
        newVehicleStartOdometer: '',
        newVehicleDailyRate: '',
        isEndOfContract: false
    });

    const [selectedChecklistId, setSelectedChecklistId] = useState('MAIN');
    const [exchangeChecklists, setExchangeChecklists] = useState({});

    useEffect(() => {
        // No specific load needed
    }, [selectedChecklistId]);

    const handleExchangeChecklistChange = (exId, field, value) => {
        setExchangeChecklists(prev => ({
            ...prev,
            [exId]: {
                ...prev[exId],
                [field]: value
            }
        }));
    };

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleImageChange = (index, file, isReturn) => {
        const fieldName = isReturn ? 'returnInspectionImages' : 'inspectionImages';

        let currentImages;
        if (selectedChecklistId === 'MAIN') {
            currentImages = [...(formData[fieldName] || [null, null, null, null, null])];
        } else {
            const exData = exchangeChecklists[selectedChecklistId] || {};
            currentImages = [...(exData[fieldName] || [null, null, null, null, null])];
        }

        // Ensure size
        while (currentImages.length < 5) currentImages.push(null);

        currentImages[index] = file;

        if (selectedChecklistId === 'MAIN') {
            handleChange(fieldName, currentImages);
        } else {
            handleExchangeChecklistChange(selectedChecklistId, fieldName, currentImages);
        }
    };

    const saveExchangeChecklist = async (exId) => {
        try {
            const data = { ...exchangeChecklists[exId] };
            if (!data) return;

            // Convert images to base64 if they are files
            const processImages = async (images) => {
                if (!images || !Array.isArray(images)) return JSON.stringify([]);
                const processed = await Promise.all(images.map(async (img) => {
                    if (img instanceof File) {
                        return await convertToBase64(img);
                    }
                    return img;
                }));
                return JSON.stringify(processed); // Store as JSON string of array
            };

            data.inspectionImages = await processImages(data.inspectionImages);
            data.returnInspectionImages = await processImages(data.returnInspectionImages);

            await api.put(`/contracts/exchange/${exId}`, data);
            alert("Exchange checklist saved!");
            fetchContracts(); // Refresh to get latest
        } catch (error) {
            console.error(error);
            alert("Failed to save exchange checklist");
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchContracts();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, statusFilter, contractListSearch]);

    useEffect(() => {
        fetchCustomers();
        fetchVehicles();
        fetchFleetCategories();
        fetchDistricts();
    }, []);

    const vehiclesForContractSelect = useMemo(() => {
        // Prepare combined dates if they are fully filled
        const newStart = (formData.pickupDate && formData.pickupTime && formData.dropoffDate && formData.dropoffTime) 
            ? combineDateAndTime(formData.pickupDate, formData.pickupTime) 
            : null;
        const newEnd = (formData.pickupDate && formData.pickupTime && formData.dropoffDate && formData.dropoffTime) 
            ? combineDateAndTime(formData.dropoffDate, formData.dropoffTime) 
            : null;

        const hasFullDates = newStart && newEnd && newEnd > newStart;

        return vehicles.filter((v) => {
            const catOk =
                contractVehicleCategoryFilter === 'all' || v.fleetCategoryId === contractVehicleCategoryFilter;
            const q = contractVehicleSearch.trim().toLowerCase();
            const hay = `${v.licensePlate} ${v.vehicleModel?.brand?.name || ''} ${v.vehicleModel?.name || ''} ${v.fleetCategory?.name || ''}`.toLowerCase();
            if (!catOk || (q && !hay.includes(q))) return false;

            // Base status check
            if (!['AVAILABLE', 'RENTED'].includes(v.status) && v.id !== formData.vehicleId) return false;
            
            // If dates are fully filled, filter out vehicles that have a conflict
            if (hasFullDates) {
                const conflict = contracts.some((c) => {
                    if (c.vehicleId !== v.id) return false;
                    if (editingId && c.id === editingId) return false;
                    if (!['UPCOMING', 'IN_PROGRESS', 'RETURN'].includes(c.status)) return false;

                    const ctStart = combineDateAndTime(c.pickupDate, c.pickupTime);
                    const ctEnd = combineDateAndTime(c.dropoffDate, c.dropoffTime);
                    if (!ctStart || !ctEnd) return false;

                    // Strict overlap check: (NewStart < ExistingEnd) && (ExistingStart < NewEnd)
                    return (newStart < ctEnd) && (ctStart < newEnd);
                });
                if (conflict) return false;
            }

            return true;
        });
    }, [
        vehicles,
        contractVehicleCategoryFilter,
        contractVehicleSearch,
        formData.vehicleId,
        formData.pickupDate,
        formData.pickupTime,
        formData.dropoffDate,
        formData.dropoffTime,
        contracts,
        editingId
    ]);

    // Validation for Date/Time overlap
    const rangeConflict = useMemo(() => {
        if (!formData.vehicleId || !formData.pickupDate || !formData.dropoffDate || !formData.pickupTime || !formData.dropoffTime) return null;

        const newStart = combineDateAndTime(formData.pickupDate, formData.pickupTime);
        const newEnd = combineDateAndTime(formData.dropoffDate, formData.dropoffTime);

        if (!newStart || !newEnd || newEnd <= newStart) return null;

        const conflict = contracts.find((c) => {
            if (c.vehicleId !== formData.vehicleId) return false;
            if (editingId && c.id === editingId) return false;
            if (!['UPCOMING', 'IN_PROGRESS', 'RETURN'].includes(c.status)) return false;

            const cStart = new Date(c.pickupDate);
            const cEnd = new Date(c.dropoffDate);
            // Quick date-only filter first for performance
            if (newStart > cEnd || newEnd < cStart) return false;

            // Precise check
            const ctStart = combineDateAndTime(c.pickupDate, c.pickupTime);
            const ctEnd = combineDateAndTime(c.dropoffDate, c.dropoffTime);
            if (!ctStart || !ctEnd) return false;

            return (newStart < ctEnd) && (ctStart < newEnd);
        });

        return conflict;
    }, [formData, contracts, editingId]);

    // True when this contract already has a posted (and not reversed) advance receipt.
    // Source of truth is the dedicated advance receipts endpoint — the upfront invoice
    // can be hidden (upfrontReleased=false) while the contract is still UPCOMING, so we
    // can't always rely on its payments array.
    const hasPostedAdvanceReceipt = Boolean(activeAdvanceReceipt);

    useEffect(() => {
        if (editingId && isOpen) {
            fetchUpfrontInvoice(editingId);
            fetchReturnInvoice(editingId);
            fetchAgreement(editingId);
            fetchActiveAdvanceReceipt(editingId);
        } else {
            setActiveAdvanceReceipt(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingId, isOpen]);

    // Handle URL Params and Filtering
    useEffect(() => {
        const status = searchParams.get('status');
        if (status) {
            setStatusFilter(status);
        }

        // Deep Link: Open specific contract if ID is present
        const contractId = searchParams.get('id');

        if (contractId && contracts.length > 0) {
            console.log("Deep link triggered for ID:", contractId);
            const targetId = String(contractId);
            const targetContract = contracts.find(c => String(c.id) === targetId);

            if (targetContract) {
                console.log("Found contract:", targetContract);
                // Determine mode from URL
                const isViewMode = searchParams.get('view') === 'true';

                // If we are already editing this contract, just make sure it's open
                if (editingId !== targetContract.id) {
                    handleEdit(targetContract);
                    setIsReadOnly(isViewMode);
                } else if (!isOpen) {
                    setIsReadOnly(isViewMode);
                    setIsOpen(true);
                }
            } else {
                console.log("Contract not found for ID:", contractId);
            }
        }
    }, [searchParams, contracts]); // Removed isOpen/editingId to avoid loops

    useEffect(() => {
        let result = contracts;
        if (statusFilter !== 'ALL') {
            result = result.filter(c => c.status === statusFilter);
        }
        if (contractListCategoryFilter !== 'all') {
            result = result.filter((c) => c.vehicle?.fleetCategoryId === contractListCategoryFilter);
        }
        const q = contractListSearch.trim().toLowerCase();
        if (q) {
            result = result.filter((c) => {
                const plate = (c.vehicle?.licensePlate || '').toLowerCase();
                const model = (c.vehicle?.vehicleModel?.name || '').toLowerCase();
                const brand = (c.vehicle?.vehicleModel?.brand?.name || '').toLowerCase();
                const cat = (c.vehicle?.fleetCategory?.name || '').toLowerCase();
                const cust = (c.customer?.name || '').toLowerCase();
                const no = String(c.contractNo || '').toLowerCase();
                return plate.includes(q) || model.includes(q) || brand.includes(q) || cat.includes(q) || cust.includes(q) || no.includes(q);
            });
        }
        setFilteredContracts(result);
    }, [contracts, statusFilter, contractListCategoryFilter, contractListSearch]);

    useEffect(() => {
        if (formData.districtId) {
            fetchCities(formData.districtId);
        }
    }, [formData.districtId]);

    const fetchContracts = async () => {
        try {
            setLoading(true);
            const statusQuery = statusFilter !== 'ALL' ? `&status=${statusFilter}` : '';
            const searchQuery = contractListSearch ? `&search=${encodeURIComponent(contractListSearch)}` : '';
            const res = await api.get(`/contracts?page=${page}&limit=20${statusQuery}${searchQuery}`);
            const data = res.data;
            
            if (data.pagination) {
                setPagination(data.pagination);
            }
            
            const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
            setContracts(list);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/clients?status=CONFIRMED&limit=1000');
            const data = res.data;
            const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
            const confirmed = list.filter(c => c.status === 'CONFIRMED');
            setCustomers(confirmed);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchVehicles = async () => {
        try {
            const res = await api.get('/vehicles?limit=1000');
            const data = res.data;
            const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
            setVehicles(list);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchFleetCategories = async () => {
        try {
            const res = await api.get('/fleet/categories?limit=1000');
            const data = res.data;
            const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
            setFleetCategories(list);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchDistricts = async () => {
        try {
            const res = await api.get('/locations/districts');
            setDistricts(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchCities = async (districtId) => {
        try {
            const res = await api.get(`/locations/cities?districtId=${districtId}`);
            setCities(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const getBaseRateForCustomerVehicle = (vehicleId, customerId) => {
        if (!vehicleId || !customerId) return 0;
        const vehicle = vehicles.find(v => v.id === vehicleId);
        const customer = customers.find(c => c.id === customerId);
        if (!vehicle || !customer) return 0;
        return customer.type === 'FOREIGN'
            ? Number(vehicle.foreignDailyRentalRate || vehicle.dailyRentalRate || 0)
            : Number(vehicle.dailyRentalRate || 0);
    };

    const parseImages = (jsonString) => {
        try {
            if (!jsonString) return [null, null, null, null, null];
            const parsed = JSON.parse(jsonString);
            const arr = Array.isArray(parsed) ? parsed : [];
            while (arr.length < 5) arr.push(null);
            return arr;
        } catch (e) {
            return [null, null, null, null, null];
        }
    };

    const handleEdit = (contract) => {
        setEditingId(contract.id);
        setUpfrontInvoice(null);
        setAgreement(null);
        setActiveAdvanceReceipt(null);

        // Populate form data
        setFormData({
            customerId: contract.customerId,
            vehicleId: contract.vehicleId,
            pickupDate: format(new Date(contract.pickupDate), 'yyyy-MM-dd'),
            pickupTime: contract.pickupTime,
            dropoffDate: format(new Date(contract.dropoffDate), 'yyyy-MM-dd'),
            dropoffTime: contract.dropoffTime,
            appliedDailyRate: contract.appliedDailyRate || '',
            securityDeposit: contract.securityDeposit,
            advancePaymentAmount: contract.advancePaymentAmount ?? '0',
            advancePaymentDate: contract.advancePaymentDate ? format(new Date(contract.advancePaymentDate), 'yyyy-MM-dd') : '',
            dailyKmLimit: contract.dailyKmLimit || 100,
            allocatedKm: contract.allocatedKm || 100,
            extraMileageCharge: contract.extraMileageCharge || 0,
            securityDepositReturned: contract.securityDepositReturned || 0,
            status: contract.status,

            isDelivery: contract.isDelivery,
            deliveryCharge: contract.deliveryCharge || '',
            districtId: contract.city ? contract.city.districtId : '',
            cityId: contract.cityId || '',

            fuelLevel: contract.fuelLevel,

            startOdometer: (contract.status === 'UPCOMING' && contract.vehicle?.lastOdometer > contract.startOdometer)
                ? contract.vehicle.lastOdometer
                : contract.startOdometer,
            endOdometer: contract.endOdometer || '',

            license: contract.license,
            insurance: contract.insurance,
            carpets: contract.carpets,
            spareWheel: contract.spareWheel,
            jack: contract.jack,
            jackHandle: contract.jackHandle,
            airPump: contract.airPump,
            audioSetup: contract.audioSetup,
            toolCover: contract.toolCover,
            mudCovers: contract.mudCovers,

            batteryCode: contract.batteryCode || '',
            remark: contract.remark || '',
            inspectionImages: parseImages(contract.inspectionImages),

            frontTyres: contract.frontTyres,
            rearTyres: contract.rearTyres,

            // Return Checklist
            returnLicense: contract.returnLicense || false,
            returnInsurance: contract.returnInsurance || false,
            returnCarpets: contract.returnCarpets || false,
            returnSpareWheel: contract.returnSpareWheel || false,
            returnJack: contract.returnJack || false,
            returnJackHandle: contract.returnJackHandle || false,
            returnAirPump: contract.returnAirPump || false,
            returnAudioSetup: contract.returnAudioSetup || false,
            returnToolCover: contract.returnToolCover || false,
            returnMudCovers: contract.returnMudCovers || false,
            returnFrontTyres: contract.returnFrontTyres || '100%',
            returnRearTyres: contract.returnRearTyres || '100%',
            returnBatteryCode: contract.returnBatteryCode || '',
            returnRemark: contract.returnRemark || '',
            returnInspectionImages: parseImages(contract.returnInspectionImages),

            // Return Details
            actualReturnDate: contract.actualReturnDate ? format(new Date(contract.actualReturnDate), 'yyyy-MM-dd') : '',
            actualReturnTime: contract.actualReturnTime || '',
            isCollection: contract.isCollection || false,
            collectionCharge: contract.collectionCharge || '',

            // Extra charges (RETURN only)
            hasDamageCharge: Number(contract.damageCharge || 0) > 0,
            damageCharge: contract.damageCharge ?? '0',
            hasOtherCharge: Number(contract.otherChargeAmount || 0) > 0,
            otherChargeDescription: contract.otherChargeDescription || '',
            otherChargeAmount: contract.otherChargeAmount ?? '0',
            otherChargeLines: Number(contract.otherChargeAmount || 0) > 0
                ? [
                    {
                        id: 'existing-0',
                        description: contract.otherChargeDescription || '',
                        amount: String(contract.otherChargeAmount ?? '0'),
                    }
                ]
                : [],
        });

        const detectedBaseRate = getBaseRateForCustomerVehicle(contract.vehicleId, contract.customerId);
        const appliedRate = Number(contract.appliedDailyRate || 0);
        const storedBase = contract.baseDailyRate != null ? Number(contract.baseDailyRate) : detectedBaseRate;
        const discount = resolveDiscountState({
            baseDailyRate: storedBase > 0 ? storedBase : detectedBaseRate,
            appliedDailyRate: appliedRate,
            discountType: contract.discountType,
            discountValue: contract.discountValue,
        });
        setDiscountType(discount.discountType);
        setDiscountValue(discount.discountValue);
        setBaseDailyRate(discount.baseDailyRate > 0 ? discount.baseDailyRate : appliedRate);

        // Populate exchange checklists
        if (contract.vehicleExchanges) {
            const exMap = {};
            contract.vehicleExchanges.forEach(ex => {
                const copy = { ...ex };
                copy.inspectionImages = parseImages(ex.inspectionImages);
                copy.returnInspectionImages = parseImages(ex.returnInspectionImages);
                exMap[ex.id] = copy;
            });
            setExchangeChecklists(exMap);
        }

        setIsOpen(true);
    };

    const handleView = (contract) => {
        // Open in new window with query params
        const url = `/bookings/contracts?id=${contract.id}&view=true`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleEditClick = (contract) => {
        handleEdit(contract);
        setIsReadOnly(false);
    };

    const handleCreateNew = () => {
        setEditingId(null);
        setFormData(makeInitialFormState());
        setExchangeChecklists({});
        setSelectedChecklistId('MAIN');
        setIsReadOnly(false);
        setBaseDailyRate(0);
        setDiscountType('PERCENT');
        setDiscountValue('0');
        setIsOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const processImages = async (images) => {
                if (!images || !Array.isArray(images)) return JSON.stringify([]);
                const processed = await Promise.all(images.map(async (img) => {
                    if (img instanceof File) {
                        return await convertToBase64(img);
                    }
                    return img;
                }));
                return JSON.stringify(processed);
            };

            const rawPayload = { ...formData };
            // Local-only UI helpers (server contractSchema does not need these).
            delete rawPayload.hasDamageCharge;
            delete rawPayload.hasOtherCharge;
            delete rawPayload.otherChargeLines;

            const status = rawPayload.status;
            let payloadToSend = {};

            // Helper to clean and convert numbers
            const toNum = (val) => (val === '' || val === null || val === undefined) ? 0 : Number(val);

            // Refine payload based on status to avoid hitting Prisma/MongoDB "50 field" update limits (P2010)
            if (status === 'RETURN' || status === 'COMPLETED') {
                payloadToSend = {
                    status,
                    customerId: rawPayload.customerId,
                    vehicleId: rawPayload.vehicleId,

                    // Return basics
                    actualReturnDate: rawPayload.actualReturnDate,
                    actualReturnTime: rawPayload.actualReturnTime,
                    startOdometer: toNum(rawPayload.startOdometer),
                    endOdometer: toNum(rawPayload.endOdometer),

                    // Financials
                    appliedDailyRate: toNum(rawPayload.appliedDailyRate),
                    securityDeposit: toNum(rawPayload.securityDeposit),
                    dailyKmLimit: toNum(rawPayload.dailyKmLimit),
                    allocatedKm: toNum(rawPayload.allocatedKm),
                    extraMileageCharge: toNum(rawPayload.extraMileageCharge),
                    securityDepositReturned: toNum(rawPayload.securityDepositReturned),

                    // Return checklist
                    returnLicense: rawPayload.returnLicense,
                    returnInsurance: rawPayload.returnInsurance,
                    returnCarpets: rawPayload.returnCarpets,
                    returnSpareWheel: rawPayload.returnSpareWheel,
                    returnJack: rawPayload.returnJack,
                    returnJackHandle: rawPayload.returnJackHandle,
                    returnAirPump: rawPayload.returnAirPump,
                    returnAudioSetup: rawPayload.returnAudioSetup,
                    returnToolCover: rawPayload.returnToolCover,
                    returnMudCovers: rawPayload.returnMudCovers,
                    returnFrontTyres: rawPayload.returnFrontTyres,
                    returnRearTyres: rawPayload.returnRearTyres,
                    returnBatteryCode: rawPayload.returnBatteryCode,
                    returnRemark: rawPayload.returnRemark,

                    // Extra return charges
                    damageCharge: toNum(rawPayload.damageCharge),
                    otherChargeAmount: toNum(rawPayload.otherChargeAmount),
                    otherChargeDescription: rawPayload.otherChargeDescription,

                    // Collection
                    isCollection: rawPayload.isCollection,
                    collectionCharge: toNum(rawPayload.collectionCharge),

                    // Return images
                    returnInspectionImages: rawPayload.returnInspectionImages,
                    
                    // We also keep original handover data to prevent data loss
                    remark: rawPayload.remark,
                    batteryCode: rawPayload.batteryCode,
                    inspectionImages: rawPayload.inspectionImages
                };
            } else if (status === 'IN_PROGRESS' || status === 'UPCOMING') {
                payloadToSend = {
                    status,
                    customerId: rawPayload.customerId,
                    vehicleId: rawPayload.vehicleId,

                    // Handover schedule
                    pickupDate: rawPayload.pickupDate,
                    pickupTime: rawPayload.pickupTime,
                    dropoffDate: rawPayload.dropoffDate,
                    dropoffTime: rawPayload.dropoffTime,

                    appliedDailyRate: toNum(rawPayload.appliedDailyRate),
                    baseDailyRate: toNum(baseDailyRate),
                    discountType,
                    discountValue: toNum(discountValue),
                    securityDeposit: toNum(rawPayload.securityDeposit),
                    advancePaymentAmount: toNum(rawPayload.advancePaymentAmount),
                    advancePaymentDate: rawPayload.advancePaymentDate,
                    dailyKmLimit: toNum(rawPayload.dailyKmLimit),
                    allocatedKm: toNum(rawPayload.allocatedKm),
                    extraMileageCharge: toNum(rawPayload.extraMileageCharge),

                    // Delivery
                    isDelivery: rawPayload.isDelivery,
                    deliveryCharge: toNum(rawPayload.deliveryCharge),
                    isCollection: rawPayload.isCollection,
                    collectionCharge: toNum(rawPayload.collectionCharge),

                    // Vehicle state + main checklist
                    fuelLevel: rawPayload.fuelLevel,
                    startOdometer: toNum(rawPayload.startOdometer),
                    frontTyres: rawPayload.frontTyres,
                    rearTyres: rawPayload.rearTyres,
                    batteryCode: rawPayload.batteryCode,
                    remark: rawPayload.remark,

                    license: rawPayload.license,
                    insurance: rawPayload.insurance,
                    carpets: rawPayload.carpets,
                    spareWheel: rawPayload.spareWheel,
                    jack: rawPayload.jack,
                    jackHandle: rawPayload.jackHandle,
                    airPump: rawPayload.airPump,
                    audioSetup: rawPayload.audioSetup,
                    toolCover: rawPayload.toolCover,
                    mudCovers: rawPayload.mudCovers,

                    inspectionImages: rawPayload.inspectionImages,
                };
            } else if (status === 'CANCELLED') {
                payloadToSend = {
                    status,
                    customerId: rawPayload.customerId,
                    vehicleId: rawPayload.vehicleId
                };
            }


            payloadToSend.inspectionImages = await processImages(payloadToSend.inspectionImages);
            payloadToSend.returnInspectionImages = await processImages(payloadToSend.returnInspectionImages);

            if (editingId) {
                await api.put(`/contracts/${editingId}`, payloadToSend);
            } else {
                await api.post(`/contracts`, payloadToSend);
            }
            setIsOpen(false);
            fetchContracts();
            setEditingId(null);
            setFormData(makeInitialFormState());
            setUpfrontInvoice(null);
            setReturnInvoice(null);
            setAgreement(null);
            setActiveAdvanceReceipt(null);
            setExchangeData({ // Reset exchange form
                oldVehicleReturnDate: '',
                oldVehicleReturnOdometer: '',
                newVehicleId: '',
                newVehicleStartDate: '',
                newVehicleStartOdometer: '',

                newVehicleDailyRate: '',
                isEndOfContract: false
            });
        } catch (error) {
            console.error(error.response?.data || error);
            alert("Failed to save contract. Check console.");
        }
    };

    const fetchUpfrontInvoice = async (contractId) => {
        if (!contractId) return;
        try {
            setInvoiceLoading(true);
            const { data } = await api.get(`/invoices/contract/${contractId}?type=UPFRONT`);
            setUpfrontInvoice(data);
        } catch (error) {
            // 404 = not created yet
            if (error.response?.status === 404) {
                setUpfrontInvoice(null);
            } else {
                console.error('Failed to fetch invoice:', error);
            }
        } finally {
            setInvoiceLoading(false);
        }
    };

    // Look up the open (posted, non-reversed) advance receipt for a contract.
    // Backend currently allows at most one such receipt per contract, so we keep the
    // newest match — that's what the UI cares about when locking the issue button.
    const fetchActiveAdvanceReceipt = async (contractId) => {
        if (!contractId) {
            setActiveAdvanceReceipt(null);
            return;
        }
        try {
            const { data } = await api.get('/advance-receipts', {
                params: { contractId, limit: 50 },
            });
            const rows = Array.isArray(data?.data) ? data.data : [];
            const open = rows.find((r) => !r?.reversedAt) || null;
            setActiveAdvanceReceipt(open);
        } catch (error) {
            console.error('Failed to fetch advance receipts for contract:', error);
            setActiveAdvanceReceipt(null);
        }
    };

    const fetchReturnInvoice = async (contractId) => {
        if (!contractId) return;
        try {
            setInvoiceLoading(true);
            const { data } = await api.get(`/invoices/contract/${contractId}?type=RETURN`);
            setReturnInvoice(data);
        } catch (error) {
            if (error.response?.status === 404) {
                setReturnInvoice(null);
            } else {
                console.error('Failed to fetch return invoice:', error);
            }
        } finally {
            setInvoiceLoading(false);
        }
    };

    const fetchAgreement = async (contractId) => {
        if (!contractId) return;
        try {
            setInvoiceLoading(true);
            const { data } = await api.get(`/agreements/contract/${contractId}`);
            setAgreement(data);
        } catch (error) {
            if (error.response?.status === 404) {
                setAgreement(null);
            } else {
                console.error('Failed to fetch agreement:', error);
            }
        } finally {
            setInvoiceLoading(false);
        }
    };

    const createUpfrontInvoice = async ({ openDialog = true } = {}) => {
        if (!editingId) return;
        try {
            setInvoiceLoading(true);
            const { data } = await api.post(`/invoices/contract/${editingId}/upfront`, {});
            setUpfrontInvoice(data);
            if (openDialog) setInvoiceDialogOpen(true);
        } catch (error) {
            console.error('Failed to create invoice:', error);
            alert(error.response?.data?.message || 'Failed to create invoice');
        } finally {
            setInvoiceLoading(false);
        }
    };

    const openAdvanceReceipt = async () => {
        if (!editingId) return;
        // Mirror the backend safeguard: only one posted (non-reversed) advance receipt per contract.
        // Prevents double-clicks or stale UI state from triggering a duplicate post.
        if (hasPostedAdvanceReceipt) {
            alert('An advance receipt has already been issued for this contract.');
            return;
        }
        const amt = Number(formData.advancePaymentAmount || 0);
        if (!(amt > 0)) {
            alert('Enter an advance amount first.');
            return;
        }
        try {
            const { data } = await api.post('/advance-receipts/issue', {
                contractId: editingId,
                amount: amt,
                paymentDate: formData.advancePaymentDate || null,
            });
            await Promise.all([
                fetchUpfrontInvoice(editingId),
                fetchActiveAdvanceReceipt(editingId),
            ]);
            
            if (data?.id) {
                setCurrentSavedReceipt(data);
                setReceiptSuccessOpen(true);
            } else {
                // Fallback for safety
                const receiptNo = data?.receiptNo || '';
                const amtFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(
                    Number(data?.amount ?? amt) || 0,
                );
                alert(
                    `Advance receipt created successfully${receiptNo ? ` (${receiptNo})` : ''}.\n` +
                        `Amount posted: ${amtFmt}.`
                );
            }
        } catch (e) {
            alert(e.response?.data?.message || e.message || 'Could not issue receipt. Save the contract if you just changed the advance.');
        }
    };

    const createReturnInvoice = async ({ openDialog = true } = {}) => {
        if (!editingId) return;
        try {
            setInvoiceLoading(true);
            // Send live form data to ensure invoice matches the on-screen summary
            const { data } = await api.post(`/invoices/contract/${editingId}/return`, {
                // Return basics
                actualReturnDate: formData.actualReturnDate,
                actualReturnTime: formData.actualReturnTime,
                endOdometer: formData.endOdometer,
                
                // Charges
                damageCharge: formData.damageCharge,
                otherChargeAmount: formData.otherChargeAmount,
                otherChargeDescription: formData.otherChargeDescription,
                isCollection: formData.isCollection,
                collectionCharge: formData.collectionCharge,
                
                // Rate overrides
                extraMileageCharge: formData.extraMileageCharge,
                securityDeposit: formData.securityDeposit,
                appliedDailyRate: formData.appliedDailyRate
            });
            setReturnInvoice(data);
            if (openDialog) setInvoiceDialogOpen(true);
        } catch (error) {
            console.error('Failed to create return invoice:', error);
            alert(error.response?.data?.message || 'Failed to create return invoice');
        } finally {
            setInvoiceLoading(false);
        }
    };

    const createAgreement = async () => {
        if (!editingId) return;
        try {
            setInvoiceLoading(true);
            const { data } = await api.post(`/agreements/contract/${editingId}/generate`, {});
            setAgreement(data);
        } catch (error) {
            console.error('Failed to create agreement:', error);
            alert(error.response?.data?.message || 'Failed to create agreement');
        } finally {
            setInvoiceLoading(false);
        }
    };

    const printAdvanceReceipt = async (receipt = currentSavedReceipt) => {
        if (!receipt?.id) {
            alert('No advance receipt found to print.');
            return;
        }
        try {
            await printHtmlDocument(async () => {
                const res = await api.get(`/advance-receipts/${receipt.id}/html`, {
                    responseType: 'text',
                    headers: { Accept: 'text/html' },
                });
                return typeof res.data === 'string' ? res.data : '';
            });
        } catch (error) {
            console.error('Failed to print advance receipt:', error);
            const msg =
                typeof error.response?.data === 'string'
                    ? error.response.data
                    : error.response?.data?.message;
            alert(msg || error.message || 'Failed to open receipt for printing.');
        }
    };

    const openAgreement = async (mode = 'view') => {
        if (!agreement?.id) return;
        try {
            const { data } = await api.get(`/agreements/${agreement.id}/share-link`);
            if (data?.shareUrl) {
                const baseUrl = data.shareUrl;
                const separator = baseUrl.includes('?') ? '&' : '?';
                const url = mode === 'download'
                    ? `${baseUrl}${separator}download=1`
                    : baseUrl;
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            console.error('Failed to open agreement:', error);
            alert(error.response?.data?.message || 'Failed to open agreement');
        }
    };

    // No automatic upfront invoice refresh on RETURN/COMPLETED.

    const handleDelete = (id) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await api.delete(`/contracts/${deleteConfirmId}`);
            fetchContracts();
        } catch (error) {
            console.error(error);
        } finally {
            setDeleteConfirmId(null);
        }
    };

    // Helper to determine the current active vehicle for exchange
    const getActiveVehicleId = () => {
        if (!editingId) return null;
        const activeContract = contracts.find(c => c.id === editingId);
        if (!activeContract) return null;

        const exchanges = activeContract.vehicleExchanges || [];
        if (exchanges.length > 0) {
            return exchanges[exchanges.length - 1].newVehicleId;
        }
        return activeContract.vehicleId;
    };

    const activeVehicleId = getActiveVehicleId();
    const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

    // Auto-calculate allocated KM from exact rental period (24h day-units × daily km limit)
    useEffect(() => {
        if (formData.vehicleId && formData.pickupDate && formData.dropoffDate && formData.pickupTime && formData.dropoffTime) {
            const units = computeRentalDayUnits(
                formData.pickupDate,
                formData.pickupTime,
                formData.dropoffDate,
                formData.dropoffTime
            );
            if (units > 0) {
                const dailyKm = Number(formData.dailyKmLimit) || 100;
                const calculatedAllocated = Math.round(dailyKm * units);
                setFormData((prev) => ({
                    ...prev,
                    allocatedKm: calculatedAllocated,
                }));
            }
        }
    }, [
        formData.vehicleId,
        formData.pickupDate,
        formData.dropoffDate,
        formData.pickupTime,
        formData.dropoffTime,
        formData.dailyKmLimit,
        vehicles,
    ]);

    // Auto-populate Start Odometer from Vehicle's Last Odometer
    useEffect(() => {
        if (!editingId && formData.vehicleId) {
            const vehicle = vehicles.find(v => v.id === formData.vehicleId);
            if (vehicle && vehicle.lastOdometer !== undefined) {
                setFormData(prev => ({
                    ...prev,
                    startOdometer: vehicle.lastOdometer
                }));
            }
        }
    }, [formData.vehicleId, vehicles, editingId]);

    /// "Latest" odometer reading for the currently-selected vehicle. Used as the
    /// floor for Start Odometer (you can never start a rental at a lower mileage
    /// than the vehicle's current reading) and as a helper hint in the UI.
    const selectedVehicleLastOdo = useMemo(() => {
        if (!formData.vehicleId) return 0;
        const v = vehicles.find((x) => x.id === formData.vehicleId);
        return Number(v?.lastOdometer) || 0;
    }, [formData.vehicleId, vehicles]);

    /// True when the user has typed (or the form holds) a Start Odometer value
    /// that's strictly less than the vehicle's latest reading. The backend now
    /// rejects this on save, but we surface it inline so the user sees the
    /// problem before clicking Update.
    const contractRentalDayUnits = useMemo(
        () => computeRentalDayUnits(
            formData.pickupDate,
            formData.pickupTime,
            formData.dropoffDate,
            formData.dropoffTime
        ),
        [formData.pickupDate, formData.pickupTime, formData.dropoffDate, formData.dropoffTime]
    );

    const contractRentalPeriodLabel = useMemo(
        () => formatRentalPeriod(
            formData.pickupDate,
            formData.pickupTime,
            formData.dropoffDate,
            formData.dropoffTime
        ),
        [formData.pickupDate, formData.pickupTime, formData.dropoffDate, formData.dropoffTime]
    );

    const startOdoBelowLatest = useMemo(() => {
        const entered = Number(formData.startOdometer);
        if (!Number.isFinite(entered)) return false;
        return entered < selectedVehicleLastOdo;
    }, [formData.startOdometer, selectedVehicleLastOdo]);

    /// When the contract is being transitioned UPCOMING → IN_PROGRESS (handover
    /// time), or is already IN_PROGRESS but the form is being re-opened with a
    /// stale Start Odometer, auto-bump the field to the vehicle's latest reading.
    /// Never lowers a higher manually-typed value — the user might have just
    /// taken a fresh meter reading that's even more current than what we know.
    useEffect(() => {
        if (!editingId) return;
        if (!['UPCOMING', 'IN_PROGRESS'].includes(formData.status)) return;
        if (!selectedVehicleLastOdo) return;
        const current = Number(formData.startOdometer) || 0;
        if (current < selectedVehicleLastOdo) {
            setFormData((prev) => ({ ...prev, startOdometer: selectedVehicleLastOdo }));
        }
    }, [editingId, formData.status, selectedVehicleLastOdo]);

    // Auto-detect customer-category base rate (LOCAL/CORPORATE/FOREIGN).
    useEffect(() => {
        if (formData.vehicleId && formData.customerId) {
            const rate = getBaseRateForCustomerVehicle(formData.vehicleId, formData.customerId);
            if (!editingId) {
                setBaseDailyRate(rate);
                setDiscountType('PERCENT');
                setDiscountValue('0');
            } else if (formData.status === 'UPCOMING') {
                setBaseDailyRate(rate);
            }
        }
    }, [formData.vehicleId, formData.customerId, vehicles, customers, editingId, formData.status]);

    // Apply discount to base rate, then keep appliedDailyRate synchronized.
    useEffect(() => {
        const canApplyDiscount = !editingId || formData.status === 'UPCOMING';
        if (!canApplyDiscount) return;
        const base = Number(baseDailyRate) || 0;
        const dv = Math.max(0, Number(discountValue) || 0);
        let discounted = base;
        if (discountType === 'PERCENT') {
            discounted = base - (base * dv / 100);
        } else {
            discounted = base - dv;
        }
        discounted = Math.max(0, Number(discounted.toFixed(2)));
        setFormData(prev => {
            if (Number(prev.appliedDailyRate || 0) === discounted) return prev;
            return { ...prev, appliedDailyRate: discounted };
        });
    }, [baseDailyRate, discountType, discountValue, editingId, formData.status]);

    return (
        <div className="p-6 space-y-6">
            <ImageViewDialog src={viewingImage} open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)} />

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="w-5 h-5" />
                            Delete Contract
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Are you sure you want to delete this contract? This action <span className="font-bold text-destructive">cannot be undone</span> and all associated data will be permanently removed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Yes, Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-black tracking-tighter text-[#1E3A8A] dark:text-white uppercase">Contracts</h1>

                <div className="flex flex-wrap items-center gap-4">
                    <Input
                        className="w-[220px]"
                        placeholder="Search contract, customer, vehicle, category…"
                        value={contractListSearch}
                        onChange={(e) => setContractListSearch(e.target.value)}
                    />
                    <Select value={contractListCategoryFilter} onValueChange={setContractListCategoryFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {fleetCategories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select disabled={isReadOnly} value={statusFilter} onValueChange={(val) => {
                        setStatusFilter(val);
                        setSearchParams(val === 'ALL' ? {} : { status: val });
                    }}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Statuses</SelectItem>
                            <SelectItem value="UPCOMING">Upcoming</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="RETURN">Return</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleCreateNew}>
                        <Plus className="mr-2 h-4 w-4" /> New Contract
                    </Button>
                </div>
            </div>

            <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) setSearchParams({});
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? "Edit Contract" : "Create New Contract"}
                            {editingId && (
                                <span className="ml-3 text-xs font-black text-muted-foreground uppercase tracking-widest">
                                    {contracts.find(c => c.id === editingId)?.contractNo || ''}
                                </span>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {editingId ? "Update the contract details below." : "Fill in the details below to create a new rental contract."}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="flex w-full">
                            <TabsTrigger value="details" className="flex-1">Contract Details</TabsTrigger>
                            {editingId && formData.status === 'IN_PROGRESS' && <TabsTrigger value="exchange" className="flex-1">Vehicle Exchange</TabsTrigger>}
                            <TabsTrigger value="checklist" className="flex-1">Vehicle Checklist</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Customer (Confirmed Only)</Label>
                                    <Select disabled={isReadOnly || isConfirmed} value={formData.customerId} onValueChange={(val) => handleChange('customerId', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Customer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name || c.email}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {editingId && (
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select disabled={isReadOnly} value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="UPCOMING">Upcoming</SelectItem>
                                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                                <SelectItem value="RETURN">Return</SelectItem>
                                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {formData.status === 'RETURN' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Actual Return Date</Label>
                                        <Input disabled={isReadOnly || isCompletedStatus} type="date" value={formData.actualReturnDate} onChange={e => handleChange('actualReturnDate', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Actual Return Time</Label>
                                        <TimeInput24 disabled={isReadOnly || isCompletedStatus} value={formData.actualReturnTime} onChange={e => handleChange('actualReturnTime', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Start Odometer</Label>
                                        <Input
                                            disabled={isReadOnly || isReturned}
                                            type="number"
                                            min={selectedVehicleLastOdo || undefined}
                                            value={formData.startOdometer}
                                            onChange={e => handleChange('startOdometer', e.target.value)}
                                            className={startOdoBelowLatest ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                        />
                                        {selectedVehicleLastOdo > 0 && (
                                            <p className={`text-[11px] ${startOdoBelowLatest ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                                {startOdoBelowLatest
                                                    ? `Start odometer cannot be below the vehicle's latest reading (${selectedVehicleLastOdo} km).`
                                                    : `Vehicle's latest reading: ${selectedVehicleLastOdo} km.`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // In-progress/completed mode: show pickup/dropoff fields (same as in progress)
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Pick-up Date</Label>
                                        <Input
                                            disabled={isReadOnly || isConfirmed}
                                            type="date"
                                            value={formData.pickupDate}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                handleChange('pickupDate', v);
                                                if (v && !editingId) {
                                                    const [y, mo, d] = v.split('-').map(Number);
                                                    handleChange('dropoffDate', format(addDays(new Date(y, mo - 1, d), 1), 'yyyy-MM-dd'));
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Pick-up Time</Label>
                                        {/* Time stays editable in IN_PROGRESS so the operator can correct the
                                            real handover time after the customer arrives. Date is still locked. */}
                                        <TimeInput24
                                            disabled={isReadOnly || isReturned}
                                            value={formData.pickupTime}
                                            onChange={(e) => handleChange('pickupTime', e.target.value)}
                                        />
                                        <p className="text-[11px] text-muted-foreground">Pick-up and drop-off times are saved as entered (status changes do not reset them).</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Drop-off Date</Label>
                                        <Input disabled={isReadOnly || isConfirmed} type="date" value={formData.dropoffDate} onChange={e => handleChange('dropoffDate', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Drop-off Time</Label>
                                        <TimeInput24 disabled={isReadOnly || isReturned} value={formData.dropoffTime} onChange={e => handleChange('dropoffTime', e.target.value)} />
                                    </div>
                                    {formData.pickupDate && formData.dropoffDate && formData.pickupTime && formData.dropoffTime && contractRentalDayUnits > 0 ? (
                                        <p className="col-span-2 text-[11px] font-medium text-indigo-600">
                                            Rental period: {contractRentalPeriodLabel}
                                        </p>
                                    ) : null}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Select Vehicle</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-2 space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <Select
                                                disabled={isReadOnly}
                                                value={contractVehicleCategoryFilter}
                                                onValueChange={setContractVehicleCategoryFilter}
                                            >
                                                <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue placeholder="Category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All categories</SelectItem>
                                                    {fleetCategories.map((c) => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                disabled={isReadOnly}
                                                className="h-9 text-xs"
                                                placeholder="Search plate, brand, model, category…"
                                                value={contractVehicleSearch}
                                                onChange={(e) => setContractVehicleSearch(e.target.value)}
                                            />
                                        </div>
                                        <Select disabled={isReadOnly || isConfirmed} value={formData.vehicleId} onValueChange={(val) => handleChange('vehicleId', val)}>
                                            <SelectTrigger className={cn(rangeConflict && "border-destructive ring-destructive")}>
                                                <SelectValue placeholder="Select Vehicle" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vehiclesForContractSelect.map((v) => (
                                                    <SelectItem key={v.id} value={v.id} className={cn(v.status === 'RENTED' && "text-blue-600 italic")}>
                                                        {v.licensePlate} - {v.vehicleModel?.name}
                                                        {v.fleetCategory?.name ? ` · ${v.fleetCategory.name}` : ''}
                                                        {v.status === 'RENTED' ? ' (Currently Rented)' : ''}
                                                    </SelectItem>
                                                ))}
                                                {vehiclesForContractSelect.length === 0 && (
                                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                                        No available vehicles for the selected range.
                                                    </div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {rangeConflict && (
                                            <p className="text-[10px] font-bold text-destructive animate-pulse bg-destructive/5 p-2 rounded border border-destructive/20 leading-tight">
                                                This vehicle already have upcoming booking that date and time range, so please select another vehicle or select another date time range
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-center border rounded-md bg-muted/30 p-2 text-center">
                                        {!formData.pickupDate || !formData.dropoffDate ? (
                                            <p className="text-[10px] text-muted-foreground italic">Select dates first for precise availability.</p>
                                        ) : (
                                            <p className="text-[10px] text-indigo-600 font-medium">Showing vehicles available for selected dates.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {formData.status === 'COMPLETED' && (
                                // Completed mode: additionally show actual return date/time
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2">
                                        <Label>Actual Return Date</Label>
                                        <Input disabled={isReadOnly || isCompletedStatus} type="date" value={formData.actualReturnDate} onChange={e => handleChange('actualReturnDate', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Actual Return Time</Label>
                                        <TimeInput24 disabled={isReadOnly || isCompletedStatus} value={formData.actualReturnTime} onChange={e => handleChange('actualReturnTime', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            <div className={cn(
                                "grid gap-4",
                                formData.status === 'RETURN' ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"
                            )}>
                                <div className="space-y-2">
                                    <Label>Applied Daily Rate (LKR)</Label>
                                    <Input
                                        disabled={isReadOnly || isConfirmed}
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.appliedDailyRate}
                                        onChange={e => handleChange('appliedDailyRate', e.target.value)}
                                    />
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {formData.customerId && customers.find(c => c.id === formData.customerId)?.type === 'FOREIGN'
                                            ? "Foreign Customer Rate Applied"
                                            : "Local/Corporate Rate Applied"}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        Base daily rate: {new Intl.NumberFormat('en-US').format(Number(baseDailyRate || 0))} LKR
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Daily Rate Discount</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Select
                                            disabled={isReadOnly || (editingId && formData.status !== 'UPCOMING')}
                                            value={discountType}
                                            onValueChange={(v) => setDiscountType(v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PERCENT">Percent (%)</SelectItem>
                                                <SelectItem value="AMOUNT">Amount (LKR)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            disabled={isReadOnly || (editingId && formData.status !== 'UPCOMING')}
                                            type="text"
                                            inputMode="decimal"
                                            autoComplete="off"
                                            value={discountValue}
                                            onChange={(e) => setDiscountValue(e.target.value)}
                                            placeholder={discountType === 'PERCENT' ? '0 - 100' : '0.00'}
                                        />
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        {editingId && formData.status !== 'UPCOMING'
                                            ? 'Discount can be changed only while contract status is Upcoming.'
                                            : 'Discount updates only the daily rate. All rental calculations use the discounted daily rate.'}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Security Deposit</Label>
                                    <Input
                                        disabled={isReadOnly || isConfirmed}
                                        type="text"
                                        inputMode="decimal"
                                        autoComplete="off"
                                        placeholder="0.00"
                                        value={formData.securityDeposit === undefined || formData.securityDeposit === null ? '' : String(formData.securityDeposit)}
                                        onChange={e => handleChange('securityDeposit', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Advance Payment Collected (LKR)</Label>
                                    <Input
                                        disabled={isReadOnly || isConfirmed}
                                        type="text"
                                        inputMode="decimal"
                                        autoComplete="off"
                                        placeholder="0.00"
                                        value={formData.advancePaymentAmount === undefined || formData.advancePaymentAmount === null ? '' : String(formData.advancePaymentAmount)}
                                        onChange={e => handleChange('advancePaymentAmount', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Advance Paid Date</Label>
                                    <Input
                                        disabled={isReadOnly || isConfirmed}
                                        type="date"
                                        value={formData.advancePaymentDate}
                                        onChange={e => handleChange('advancePaymentDate', e.target.value)}
                                    />
                                </div>
                                {formData.status !== 'RETURN' && (
                                    <div className="space-y-2">
                                        <Label>Start Odometer</Label>
                                        <Input
                                            disabled={isReadOnly || isReturned}
                                            type="number"
                                            min={selectedVehicleLastOdo || undefined}
                                            value={formData.startOdometer}
                                            onChange={e => handleChange('startOdometer', e.target.value)}
                                            className={startOdoBelowLatest ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                        />
                                        {selectedVehicleLastOdo > 0 && (
                                            <p className={`text-[11px] ${startOdoBelowLatest ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                                {startOdoBelowLatest
                                                    ? `Start odometer cannot be below the vehicle's latest reading (${selectedVehicleLastOdo} km). Increase the value or update the vehicle's odometer first.`
                                                    : formData.status === 'IN_PROGRESS'
                                                        ? `Vehicle's latest reading: ${selectedVehicleLastOdo} km. Auto-synced on handover.`
                                                        : `Vehicle's latest reading: ${selectedVehicleLastOdo} km.`}
                                            </p>
                                        )}
                                    </div>
                                )}
                                {(formData.status === 'RETURN' || formData.status === 'COMPLETED') && (
                                    <div className="space-y-2">
                                        <Label>Actual Returned Odometer</Label>
                                        <Input
                                            disabled={isReadOnly || isCompletedStatus}
                                            type="number"
                                            value={formData.endOdometer}
                                            onChange={e => handleChange('endOdometer', e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Mileage Summary */}
                            {editingId && (
                                <div className="border rounded-lg p-4 bg-slate-50 space-y-2">
                                    <h4 className="font-semibold text-sm">Mileage Summary & Billing</h4>
                                    {(() => {
                                        let totalKm = 0;
                                        const activeContract = contracts.find(c => c.id === editingId);
                                        const exchanges = activeContract?.vehicleExchanges || [];
                                        const breakdown = [];

                                        const mainStart = Number(formData.startOdometer) || 0;
                                        let mainEnd = 0;
                                        if (exchanges.length > 0) {
                                            mainEnd = Number(exchanges[0].oldVehicleReturnOdometer) || 0;
                                        } else {
                                            mainEnd = Number(formData.endOdometer) || mainStart;
                                        }
                                        const mainDiff = Math.max(0, mainEnd - mainStart);
                                        if (mainEnd > 0) {
                                            totalKm += mainDiff;
                                            breakdown.push({ label: `Main Vehicle (${activeContract?.vehicle?.licensePlate || 'Original'})`, start: mainStart, end: mainEnd, diff: mainDiff });
                                        }

                                        exchanges.forEach((ex, i) => {
                                            const segStart = Number(ex.newVehicleStartOdometer) || 0;
                                            let segEnd = 0;
                                            if (i < exchanges.length - 1) {
                                                segEnd = Number(exchanges[i + 1].oldVehicleReturnOdometer) || 0;
                                            } else {
                                                segEnd = Number(formData.endOdometer) || segStart;
                                            }
                                            const segDiff = Math.max(0, segEnd - segStart);
                                            totalKm += segDiff;
                                            breakdown.push({ label: `Exchange ${i + 1} (${ex.newVehicle?.licensePlate || 'New'})`, start: segStart, end: segEnd, diff: segDiff });
                                        });

                                        const allocatedKmScheduled = Number(formData.allocatedKm) || 0;
                                        const extraKmRatePerKm = Number(formData.extraMileageCharge) || 0;
                                        const dailyKmLimit = Number(formData.dailyKmLimit) || 0;
                                        const dailyRate = Number(formData.appliedDailyRate) || 0;

                                        // When status is COMPLETED and return date/time is entered,
                                        // late return time covers extra mileage first (dailyKmLimit proportionally),
                                        // then any remaining mileage is charged as extra km.


                                        let overtimeMinutesCeil = 0;
                                        let extraDays = 0;
                                        let extraHours = 0;
                                        let extraMins = 0;
                                        let extraTimeCharge = 0;
                                        let extraDayCharge = 0;
                                        let extraCoverageKm = 0;
                                        let coveredKm = allocatedKmScheduled;

                                        if (
                                            (formData.status === 'COMPLETED' || formData.status === 'RETURN') &&
                                            formData.actualReturnDate &&
                                            formData.actualReturnTime &&
                                            formData.dropoffDate &&
                                            formData.dropoffTime
                                        ) {
                                            const scheduledEnd = combineDateAndTime(formData.dropoffDate, formData.dropoffTime);
                                            const actualEnd = combineDateAndTime(formData.actualReturnDate, formData.actualReturnTime);

                                            if (scheduledEnd && actualEnd && actualEnd.getTime() > scheduledEnd.getTime()) {
                                                // Count late time in minutes (round up so partial minute charges apply).
                                                overtimeMinutesCeil = Math.ceil((actualEnd.getTime() - scheduledEnd.getTime()) / (1000 * 60));
                                                extraDays = Math.floor(overtimeMinutesCeil / 1440);
                                                const rem = overtimeMinutesCeil - extraDays * 1440;
                                                extraHours = Math.floor(rem / 60);
                                                extraMins = rem - extraHours * 60;

                                                extraDayCharge = dailyRate * extraDays;
                                                // Charge only the remainder time (after full extra days).
                                                // (The coverage mileage is still based on total overtime minutes.)
                                                extraTimeCharge = rem > 0 ? dailyRate * (rem / 1440) : 0;

                                                // Extra time covers extra mileage before extra-km billing
                                                extraCoverageKm = Math.round(dailyKmLimit * (overtimeMinutesCeil / 1440));
                                                coveredKm = allocatedKmScheduled + extraCoverageKm;
                                            }
                                        }

                                        const extraKm = Math.max(0, totalKm - coveredKm);
                                        const extraCharge = extraKm * extraKmRatePerKm;

                                        const damageChargeAmount = formData.hasDamageCharge
                                            ? Number(formData.damageCharge) || 0
                                            : 0;
                                        const otherChargeAmount = Array.isArray(formData.otherChargeLines)
                                            ? formData.otherChargeLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
                                            : 0;
                                        const otherChargeDescription = Array.isArray(formData.otherChargeLines)
                                            ? formData.otherChargeLines
                                                .filter(l => (Number(l.amount) || 0) > 0 && (l.description || '').trim().length > 0)
                                                .map(l => l.description.trim())
                                                .join(', ')
                                            : '';
                                        const collectionChargeAmount =
                                            (formData.status === 'RETURN' || formData.status === 'COMPLETED') && formData.isCollection
                                                ? (Number(formData.collectionCharge) || 0)
                                                : 0;
                                        const totalExtraCharge =
                                            extraDayCharge +
                                            extraTimeCharge +
                                            extraCharge +
                                            damageChargeAmount +
                                            otherChargeAmount +
                                            collectionChargeAmount;

                                        return (
                                            <div className="space-y-2 text-sm">
                                                <div className="space-y-1">
                                                    {breakdown.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                                                            <span>{item.label}: {item.start} - {item.end}</span>
                                                            <span>{item.diff} km</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="border-t pt-2 grid grid-cols-2 gap-4">
                                                    <div>Total Distance: <span className="font-medium">{totalKm} km</span></div>
                                                    <div>Allocated (Scheduled): <span className="font-medium">{allocatedKmScheduled} km</span></div>
                                                    <div>Covered (incl extra time): <span className="font-medium">{coveredKm} km</span></div>
                                                    <div className={extraKm > 0 ? "text-red-600 font-bold" : ""}>
                                                        Extra Mileage: {extraKm} km
                                                    </div>
                                                    {(formData.status === 'COMPLETED' || formData.status === 'RETURN') && overtimeMinutesCeil > 0 && (
                                                        <>
                                                            <div>
                                                                Extra Days Charge: <span className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(extraDayCharge)}</span>
                                                            </div>
                                                            <div>
                                                                Extra Time Charge: <span className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(extraTimeCharge)}</span>
                                                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-80">
                                                                    Late: {extraDays}d {extraHours}h {extraMins}m
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                    <div className={extraCharge > 0 ? "text-red-600 font-bold" : ""}>
                                                        Extra Charge: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(extraCharge)}
                                                    </div>
                                                </div>

                                                {(formData.status === 'RETURN' || formData.status === 'COMPLETED') && (
                                                    <div className="border-t pt-3 space-y-3">
                                                        {formData.status === 'RETURN' && (
                                                            <>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Switch
                                                                            disabled={isReadOnly}
                                                                            checked={!!formData.hasDamageCharge}
                                                                            onCheckedChange={(checked) => {
                                                                                handleChange('hasDamageCharge', checked);
                                                                                if (!checked) handleChange('damageCharge', '0');
                                                                            }}
                                                                        />
                                                                        <span className="font-medium text-muted-foreground italic">Damage Charge</span>
                                                                    </div>
                                                                </div>
                                                                {formData.hasDamageCharge && (
                                                                    <div className="space-y-2">
                                                                        <Label>Damage Amount (LKR)</Label>
                                                                        <Input
                                                                            disabled={isReadOnly || formData.status !== 'RETURN'}
                                                                            type="number"
                                                                            value={formData.damageCharge}
                                                                            onChange={(e) => handleChange('damageCharge', e.target.value)}
                                                                        />
                                                                    </div>
                                                                )}

                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Switch
                                                                            disabled={isReadOnly}
                                                                            checked={!!formData.hasOtherCharge}
                                                                            onCheckedChange={(checked) => {
                                                                                if (!checked) {
                                                                                    setFormData(prev => ({
                                                                                        ...prev,
                                                                                        hasOtherCharge: false,
                                                                                        otherChargeLines: [],
                                                                                        otherChargeAmount: '0',
                                                                                        otherChargeDescription: ''
                                                                                    }));
                                                                                    return;
                                                                                }

                                                                                setFormData(prev => {
                                                                                    const existingLines = Array.isArray(prev.otherChargeLines) ? prev.otherChargeLines : [];
                                                                                    const baseLines = existingLines.length
                                                                                        ? existingLines
                                                                                        : [{ id: String(Date.now()), description: '', amount: '0' }];

                                                                                    const normalized = baseLines.map(l => ({
                                                                                        id: l.id || String(Date.now()),
                                                                                        description: l.description || '',
                                                                                        amount: String(l.amount ?? '0')
                                                                                    }));

                                                                                    const total = normalized.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
                                                                                    const desc = normalized
                                                                                        .filter(l => (Number(l.amount) || 0) > 0 && (l.description || '').trim().length > 0)
                                                                                        .map(l => l.description.trim())
                                                                                        .join(', ');

                                                                                    return {
                                                                                        ...prev,
                                                                                        hasOtherCharge: total > 0 || normalized.length > 0,
                                                                                        otherChargeLines: normalized,
                                                                                        otherChargeAmount: String(total),
                                                                                        otherChargeDescription: desc
                                                                                    };
                                                                                });
                                                                            }}
                                                                        />
                                                                        <span className="font-medium text-muted-foreground italic">Other Charge</span>
                                                                    </div>
                                                                </div>
                                                                {formData.hasOtherCharge && (
                                                                    <div className="space-y-3">
                                                                        {(formData.otherChargeLines || []).map((line, idx) => {
                                                                            const lineId = line.id || String(idx);
                                                                            return (
                                                                                <div key={lineId} className="grid grid-cols-12 gap-4 items-end">
                                                                                    <div className="col-span-7 space-y-2">
                                                                                        <Label>Other Description</Label>
                                                                                        <Input
                                                                                            disabled={isReadOnly || formData.status !== 'RETURN'}
                                                                                            type="text"
                                                                                            value={line.description}
                                                                                            onChange={(e) => {
                                                                                                const v = e.target.value;
                                                                                                setFormData(prev => {
                                                                                                    const newLines = (prev.otherChargeLines || []).map(l =>
                                                                                                        (l.id || String(idx)) === lineId
                                                                                                            ? { ...l, description: v }
                                                                                                            : l
                                                                                                    );
                                                                                                    const total = newLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
                                                                                                    const desc = newLines
                                                                                                        .filter(l => (Number(l.amount) || 0) > 0 && (l.description || '').trim().length > 0)
                                                                                                        .map(l => l.description.trim())
                                                                                                        .join(', ');
                                                                                                    return {
                                                                                                        ...prev,
                                                                                                        otherChargeLines: newLines,
                                                                                                        otherChargeAmount: String(total),
                                                                                                        otherChargeDescription: desc
                                                                                                    };
                                                                                                });
                                                                                            }}
                                                                                        />
                                                                                    </div>

                                                                                    <div className="col-span-3 space-y-2">
                                                                                        <Label>Amount (LKR)</Label>
                                                                                        <Input
                                                                                            disabled={isReadOnly || formData.status !== 'RETURN'}
                                                                                            type="number"
                                                                                            value={line.amount}
                                                                                            onChange={(e) => {
                                                                                                const v = e.target.value;
                                                                                                setFormData(prev => {
                                                                                                    const newLines = (prev.otherChargeLines || []).map(l =>
                                                                                                        (l.id || String(idx)) === lineId
                                                                                                            ? { ...l, amount: v }
                                                                                                            : l
                                                                                                    );
                                                                                                    const total = newLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
                                                                                                    const desc = newLines
                                                                                                        .filter(l => (Number(l.amount) || 0) > 0 && (l.description || '').trim().length > 0)
                                                                                                        .map(l => l.description.trim())
                                                                                                        .join(', ');
                                                                                                    return {
                                                                                                        ...prev,
                                                                                                        otherChargeLines: newLines,
                                                                                                        otherChargeAmount: String(total),
                                                                                                        otherChargeDescription: desc
                                                                                                    };
                                                                                                });
                                                                                            }}
                                                                                        />
                                                                                    </div>

                                                                                    <div className="col-span-2 flex justify-end pb-1">
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            disabled={isReadOnly || formData.status !== 'RETURN'}
                                                                                            onClick={() => {
                                                                                                setFormData(prev => {
                                                                                                    const newLines = (prev.otherChargeLines || []).filter((_, i) => i !== idx);
                                                                                                    if (newLines.length === 0) {
                                                                                                        return {
                                                                                                            ...prev,
                                                                                                            hasOtherCharge: false,
                                                                                                            otherChargeLines: [],
                                                                                                            otherChargeAmount: '0',
                                                                                                            otherChargeDescription: ''
                                                                                                        };
                                                                                                    }
                                                                                                    const total = newLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
                                                                                                    const desc = newLines
                                                                                                        .filter(l => (Number(l.amount) || 0) > 0 && (l.description || '').trim().length > 0)
                                                                                                        .map(l => l.description.trim())
                                                                                                        .join(', ');
                                                                                                    return {
                                                                                                        ...prev,
                                                                                                        otherChargeLines: newLines,
                                                                                                        otherChargeAmount: String(total),
                                                                                                        otherChargeDescription: desc
                                                                                                    };
                                                                                                });
                                                                                            }}
                                                                                        >
                                                                                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}

                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            disabled={isReadOnly || formData.status !== 'RETURN'}
                                                                            onClick={() => {
                                                                                setFormData(prev => {
                                                                                    const existing = Array.isArray(prev.otherChargeLines) ? prev.otherChargeLines : [];
                                                                                    const newLines = [
                                                                                        ...existing,
                                                                                        { id: String(Date.now()), description: '', amount: '0' }
                                                                                    ];
                                                                                    const total = newLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
                                                                                    const desc = newLines
                                                                                        .filter(l => (Number(l.amount) || 0) > 0 && (l.description || '').trim().length > 0)
                                                                                        .map(l => l.description.trim())
                                                                                        .join(', ');
                                                                                    return {
                                                                                        ...prev,
                                                                                        otherChargeLines: newLines,
                                                                                        hasOtherCharge: true,
                                                                                        otherChargeAmount: String(total),
                                                                                        otherChargeDescription: desc
                                                                                    };
                                                                                });
                                                                            }}
                                                                        >
                                                                            + Add Other Charge Line
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}

                                                        {formData.status === 'COMPLETED' && (
                                                            <div className="space-y-1">
                                                                {damageChargeAmount > 0 && (
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="font-medium text-muted-foreground italic">Damage Charge</span>
                                                                        <span className="font-black text-red-600">
                                                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(damageChargeAmount)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {(formData.otherChargeLines || [])
                                                                    .filter(l => (Number(l.amount) || 0) > 0)
                                                                    .map((l, idx) => (
                                                                        <div key={(l.id || String(idx))} className="flex justify-between items-center">
                                                                            <span className="font-medium text-muted-foreground italic">
                                                                                Other Charge{l.description ? ` (${l.description})` : ''}
                                                                            </span>
                                                                            <span className="font-black text-red-600">
                                                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(Number(l.amount) || 0)}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                        )}

                                                        {collectionChargeAmount > 0 && (
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-medium text-muted-foreground italic">Collection Charge</span>
                                                                <span className="font-black text-red-600">
                                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(collectionChargeAmount)}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="flex justify-between items-center pt-2 border-t">
                                                            <span className="font-black text-xs uppercase tracking-widest text-primary">Total Extra Charge</span>
                                                            <span className={totalExtraCharge > 0 ? "font-black text-red-600" : "font-black"}>
                                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(totalExtraCharge)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Daily KM Limit</Label>
                                    <Input disabled={isReadOnly || isConfirmed} type="number" value={formData.dailyKmLimit} onChange={e => handleChange('dailyKmLimit', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Total Allocated KM</Label>
                                    <Input disabled={isReadOnly || isConfirmed} type="number" value={formData.allocatedKm} onChange={e => handleChange('allocatedKm', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Extra KM Charge (LKR)</Label>
                                        <Input
                                            disabled={isReadOnly || isConfirmed}
                                            type="text"
                                            inputMode="decimal"
                                            autoComplete="off"
                                            value={formData.extraMileageCharge === undefined || formData.extraMileageCharge === null ? '' : String(formData.extraMileageCharge)}
                                            onChange={e => handleChange('extraMileageCharge', e.target.value)}
                                        />
                                </div>
                            </div>

                            <div className="border rounded-lg p-4 space-y-4">
                                {formData.status === 'UPCOMING' && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Switch disabled={isReadOnly}
                                                    checked={formData.isDelivery}
                                                    onCheckedChange={(checked) => handleChange('isDelivery', checked)}
                                                />
                                                <Label>Delivery Logic (Enable Delivery)</Label>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => setIsLocationManagerOpen(true)}>
                                                <Settings className="w-4 h-4 mr-2" /> Manage Locations
                                            </Button>
                                        </div>

                                        {formData.isDelivery && (
                                            <div className="grid grid-cols-3 gap-4 mt-2">
                                                <div className="space-y-2">
                                                    <Label>District</Label>
                                                    <Select disabled={isReadOnly} value={formData.districtId} onValueChange={(val) => handleChange('districtId', val)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select District" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {districts.map(d => (
                                                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>City</Label>
                                                    <Select disabled={isReadOnly} value={formData.cityId} onValueChange={(val) => handleChange('cityId', val)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select City" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {cities.map(c => (
                                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Delivery Charge</Label>
                                                    <Input disabled={isReadOnly} type="number" placeholder="0.00" value={formData.deliveryCharge} onChange={e => handleChange('deliveryCharge', e.target.value)} />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {formData.status === 'RETURN' && (
                                    <>
                                        <div className="flex items-center space-x-2">
                                            <Switch disabled={isReadOnly}
                                                checked={formData.isCollection}
                                                onCheckedChange={(checked) => handleChange('isCollection', checked)}
                                            />
                                            <Label>Vehicle Pick-up (Collection)</Label>
                                        </div>

                                        {formData.isCollection && (
                                            <div className="grid grid-cols-2 gap-4 mt-2">
                                                <div className="space-y-2">
                                                    <Label>Collection Charge</Label>
                                                    <Input disabled={isReadOnly} type="number" value={formData.collectionCharge} onChange={e => handleChange('collectionCharge', e.target.value)} />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Refund Logic */}
                            {false && formData.status === 'RETURN' && (
                                <div className="mt-6 border border-emerald-500/20 rounded-2xl p-6 bg-emerald-500/5 space-y-4">
                                    <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" /> Security Deposit Refund
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6 items-end">
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground italic">Refund Amount (LKR)</Label>
                                            <Input
                                                disabled={isReadOnly}
                                                type="number"
                                                placeholder="0.00"
                                                value={formData.securityDepositReturned}
                                                onChange={e => handleChange('securityDepositReturned', e.target.value)}
                                                className="border-emerald-500/30 focus-visible:ring-emerald-500/20"
                                            />
                                        </div>
                                        <div className="bg-white/50 p-4 rounded-xl border border-emerald-500/20 flex justify-between items-center h-12">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Net Company Retention</span>
                                            <span className="font-black text-emerald-700">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(
                                                    Math.max(0, (Number(formData.securityDeposit) || 0) - (Number(formData.securityDepositReturned) || 0))
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground font-medium italic">
                                        Note: Refund amount will be deducted from the security deposit liability. The remaining amount (if any) is retained by the company.
                                    </p>
                                </div>
                            )}

                            {/* Late Return Extras Breakdown removed (RETURN preview shown in Mileage Summary & Billing). */}

                            {/* Upfront Payment Summary */}
                            <div className="mt-6 border-2 border-primary/20 rounded-2xl p-6 bg-primary/5 space-y-4">
                                <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" /> {formData.status === 'RETURN' ? 'Return Payment Summary' : 'Upfront Payment Summary'}
                                </h4>
                                {(() => {
                                    const rate = Number(formData.appliedDailyRate) || 0;
                                    const rentalDayUnits = contractRentalDayUnits;
                                    const rentalChargeBase = Number((rate * rentalDayUnits).toFixed(2));
                                    const deposit = Number(formData.securityDeposit) || 0;
                                    const advancePaid = Math.max(0, Number(formData.advancePaymentAmount) || 0);
                                    const advancePaidDateText = formData.advancePaymentDate
                                        ? format(new Date(formData.advancePaymentDate), 'yyyy-MM-dd')
                                        : '';
                                    const includeHandoverCharges = formData.status === 'IN_PROGRESS';
                                    const delivery = (Number(formData.deliveryCharge) || 0);
                                    const collection = 0;

                                    // Late return extra day/time charges (RETURN/COMPLETED)
                                    const parseTimeTo24h = (timeStr) => {
                                        if (!timeStr || typeof timeStr !== 'string') return null;
                                        const t = timeStr.trim().toUpperCase();
                                        const m24 = /^(\d{1,2}):(\d{2})$/.exec(t);
                                        if (m24) {
                                            const h = Number(m24[1]);
                                            const min = Number(m24[2]);
                                            if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return { h, min };
                                            return null;
                                        }
                                        const m12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(t);
                                        if (m12) {
                                            let h = Number(m12[1]);
                                            const min = Number(m12[2]);
                                            const ap = m12[3];
                                            if (h < 1 || h > 12 || min < 0 || min > 59) return null;
                                            if (ap === 'PM' && h !== 12) h += 12;
                                            if (ap === 'AM' && h === 12) h = 0;
                                            return { h, min };
                                        }
                                        return null;
                                    };

                                    const combineDateAndTime = (dateStr, timeStr) => {
                                        if (!dateStr) return null;
                                        if (dateStr instanceof Date) {
                                            const parsed = parseTimeTo24h(timeStr);
                                            if (!parsed) return null;
                                            return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate(), parsed.h, parsed.min, 0, 0);
                                        }
                                        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
                                        if (!m) return null;
                                        const y = Number(m[1]);
                                        const mo = Number(m[2]);
                                        const d = Number(m[3]);
                                        const parsed = parseTimeTo24h(timeStr);
                                        if (!parsed) return null;
                                        return new Date(y, mo - 1, d, parsed.h, parsed.min, 0, 0);
                                    };

                                    let extraDayCharge = 0;
                                    let extraTimeRemainderCharge = 0;
                                    let extraKmCost = 0;

                                    if (
                                        (formData.status === 'RETURN' || formData.status === 'COMPLETED') &&
                                        formData.actualReturnDate &&
                                        formData.actualReturnTime &&
                                        formData.dropoffTime
                                    ) {
                                        const scheduledEnd = combineDateAndTime(formData.dropoffDate, formData.dropoffTime);
                                        const actualEnd = combineDateAndTime(formData.actualReturnDate, formData.actualReturnTime);

                                        let overtimeMinutesCeil = 0;
                                        if (scheduledEnd && actualEnd && actualEnd.getTime() > scheduledEnd.getTime()) {
                                            overtimeMinutesCeil = Math.ceil((actualEnd.getTime() - scheduledEnd.getTime()) / (1000 * 60));
                                            const extraDays = Math.floor(overtimeMinutesCeil / 1440);
                                            const remMinutes = overtimeMinutesCeil - extraDays * 1440;

                                            extraDayCharge = rate * extraDays;
                                            extraTimeRemainderCharge = remMinutes > 0 ? rate * (remMinutes / 1440) : 0;
                                        }

                                        // Calculate mileage independently, but include coverage from late return time if any
                                        const dailyKmLimit = Number(formData.dailyKmLimit) || 0;
                                        const allocatedKmScheduled = Number(formData.allocatedKm) || 0;
                                        const extraCoverageKm = Math.round(dailyKmLimit * (overtimeMinutesCeil / 1440));
                                        const coveredKm = allocatedKmScheduled + extraCoverageKm;

                                        const startOdo = Number(formData.startOdometer) || 0;
                                        const endOdo = Number(formData.endOdometer) || startOdo;
                                        const usedKm = Math.max(0, endOdo - startOdo);

                                        const extraKmRemaining = Math.max(0, usedKm - coveredKm);
                                        const extraKmRatePerKm = Number(formData.extraMileageCharge) || 0;
                                        extraKmCost = extraKmRemaining * extraKmRatePerKm;
                                    }

                                    // Upfront Payment Summary total should NOT include late-return extra charges.
                                    // Late charges are shown as breakdown and settled against security deposit separately.
                                    const totalUpfront = rentalChargeBase + deposit + delivery + collection;
                                    // The typed-in advance is only a *plan* until cash is collected via an
                                    // advance receipt. Until then, do NOT subtract it from the displayed
                                    // balance — otherwise the customer appears to have paid money we never
                                    // received and the printed balance is too low.
                                    const advanceDeductedNow = hasPostedAdvanceReceipt
                                        ? Math.min(advancePaid, totalUpfront)
                                        : 0;
                                    const balanceDueNow = Math.max(0, totalUpfront - advanceDeductedNow);

                                        if (formData.status === 'RETURN') {
                                            const damageChargeAmount = formData.hasDamageCharge
                                                ? Number(formData.damageCharge) || 0
                                                : 0;
                                            const otherChargeLines = Array.isArray(formData.otherChargeLines) ? formData.otherChargeLines : [];
                                            const otherChargeAmount = otherChargeLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
                                            const collectionChargeAmount = formData.isCollection
                                                ? (Number(formData.collectionCharge) || 0)
                                                : 0;

                                            const deductionsTotal =
                                                extraDayCharge +
                                                extraTimeRemainderCharge +
                                                extraKmCost +
                                                damageChargeAmount +
                                                otherChargeAmount +
                                                collectionChargeAmount;

                                            const net = deposit - deductionsTotal; // + refund, - customer pay
                                            const refundToCustomer = Math.max(0, net);
                                            const customerToPay = Math.max(0, deductionsTotal - deposit);

                                            return (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="font-medium text-muted-foreground italic">Security Deposit</span>
                                                        <span className="font-black text-foreground">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(deposit)}</span>
                                                    </div>

                                                    <div className="pt-2 space-y-2">
                                                        {extraDayCharge > 0 && (
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="font-medium text-muted-foreground italic">Deduction - Late Return Extra Days</span>
                                                                <span className="text-red-600 font-black">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(extraDayCharge)}</span>
                                                            </div>
                                                        )}
                                                        {extraTimeRemainderCharge > 0 && (
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="font-medium text-muted-foreground italic">Deduction - Late Return Extra Time</span>
                                                                <span className="text-red-600 font-black">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(extraTimeRemainderCharge)}</span>
                                                            </div>
                                                        )}
                                                        {extraKmCost > 0 && (
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="font-medium text-muted-foreground italic">Deduction - Extra Mileage Charge</span>
                                                                <span className="text-red-600 font-black">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(extraKmCost)}</span>
                                                            </div>
                                                        )}
                                                        {damageChargeAmount > 0 && (
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="font-medium text-muted-foreground italic">Deduction - Damage Charge</span>
                                                                <span className="text-red-600 font-black">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(damageChargeAmount)}</span>
                                                            </div>
                                                        )}
                                                        {otherChargeLines
                                                            .filter(l => (Number(l.amount) || 0) > 0)
                                                            .map((l, idx) => (
                                                                <div key={l.id || idx} className="flex justify-between items-center text-sm">
                                                                    <span className="font-medium text-muted-foreground italic">
                                                                        Deduction - Other Charge{l.description ? ` (${l.description})` : ''}
                                                                    </span>
                                                                    <span className="text-red-600 font-black">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(Number(l.amount) || 0)}</span>
                                                                </div>
                                                            ))}
                                                        {collectionChargeAmount > 0 && (
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="font-medium text-muted-foreground italic">Deduction - Collection Charge</span>
                                                                <span className="text-red-600 font-black">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(collectionChargeAmount)}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="pt-3 border-t border-primary/10 flex justify-between items-center text-sm">
                                                        <span className="font-black text-xs uppercase tracking-widest text-primary">Return Net</span>
                                                        <span className="font-black">
                                                            {refundToCustomer > 0
                                                                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(refundToCustomer)
                                                                : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(customerToPay)}
                                                        </span>
                                                    </div>

                                                    {refundToCustomer > 0 ? (
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="font-medium text-muted-foreground italic">Company Refund Amount</span>
                                                            <span className="font-black text-emerald-700">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(refundToCustomer)}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="font-medium text-muted-foreground italic">Customer Need Pay Amount</span>
                                                            <span className="font-black text-red-600">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(customerToPay)}</span>
                                                        </div>
                                                    )}

                                                    {editingId && (
                                                        <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                                            {!returnInvoice ? (
                                                                <Button
                                                                    disabled={isReadOnly || invoiceLoading}
                                                                    onClick={() => createReturnInvoice()}
                                                                    className="bg-primary text-primary-foreground"
                                                                >
                                                                    Create Return Invoice
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    type="button"
                                                                    variant="secondary"
                                                                    disabled={invoiceLoading}
                                                                    onClick={() => setInvoiceDialogOpen(true)}
                                                                >
                                                                    View Return Invoice ({returnInvoice.invoiceNo})
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-medium text-muted-foreground italic">
                                                    Rental Charge ({contractRentalPeriodLabel} × {new Intl.NumberFormat('en-US').format(rate)} LKR/day)
                                                </span>
                                                <span className="font-black text-foreground">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(rentalChargeBase)}</span>
                                            </div>
                                            {/* Late return extras are shown in the Return Settlement/Extras breakdown. */}
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-medium text-muted-foreground italic">Security Deposit (Refundable Liability)</span>
                                                <span className="font-black text-foreground">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(deposit)}</span>
                                            </div>
                                            {(delivery > 0 || formData.isDelivery) && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium text-muted-foreground italic">Delivery Charge</span>
                                                    <span className="font-black text-foreground">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(delivery)}</span>
                                                </div>
                                            )}
                                            {/*
                                              The deduction line only renders once an advance receipt has been
                                              posted. The action button (and its helper note) live outside the
                                              deduction block so the user can still create / see the lock state
                                              even when no money has been received yet.
                                            */}
                                            {advanceDeductedNow > 0 && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium text-muted-foreground italic">
                                                        Less: Advance Payment{advancePaidDateText ? ` (${advancePaidDateText})` : ''}
                                                    </span>
                                                    <span className="font-black text-emerald-700">
                                                        -{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(advanceDeductedNow)}
                                                    </span>
                                                </div>
                                            )}
                                            {editingId && advancePaid > 0 && (
                                                <div className="space-y-1">
                                                    {!hasPostedAdvanceReceipt && (
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="font-medium text-muted-foreground italic">
                                                                Advance Payment (not yet received)
                                                            </span>
                                                            <span className="font-black text-muted-foreground">
                                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(advancePaid)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {!hasPostedAdvanceReceipt ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full sm:w-auto rounded-xl border-primary/30"
                                                            onClick={openAdvanceReceipt}
                                                            disabled={isReadOnly}
                                                        >
                                                            {formData.status === 'UPCOMING'
                                                                ? 'Create Advance Receipt'
                                                                : 'Issue advance receipt'}
                                                        </Button>
                                                    ) : (
                                                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex-1 rounded-xl border-emerald-500/40 text-emerald-800"
                                                                disabled={!activeAdvanceReceipt?.id}
                                                                onClick={() => printAdvanceReceipt(activeAdvanceReceipt)}
                                                            >
                                                                <Printer className="w-4 h-4 mr-1" />
                                                                Print / Save PDF
                                                                {activeAdvanceReceipt?.receiptNo
                                                                    ? ` (${activeAdvanceReceipt.receiptNo})`
                                                                    : ''}
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {hasPostedAdvanceReceipt ? (
                                                        <p className="text-[11px] text-muted-foreground">
                                                            Advance receipt issued
                                                            {activeAdvanceReceipt?.receiptNo
                                                                ? `: ${activeAdvanceReceipt.receiptNo}. `
                                                                : '. '}
                                                            Reverse from Bookings → Advance receipts to issue a new one.
                                                        </p>
                                                    ) : (
                                                        <p className="text-[11px] text-muted-foreground">
                                                            The advance amount above is not deducted from the balance until you create an advance receipt to record the cash actually received.
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {false && (collection > 0 || formData.isCollection) && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium text-muted-foreground italic">Collection Charge</span>
                                                    <span className="font-black text-foreground">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(collection)}</span>
                                                </div>
                                            )}
                                            <div className="pt-3 border-t border-primary/10 flex justify-between items-center">
                                                <span className="font-black text-xs uppercase tracking-widest text-primary">All-Inclusive Upfront Total</span>
                                                <span className="text-xl font-black text-primary">
                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(totalUpfront)}
                                                </span>
                                            </div>
                                            <div className="pt-3 border-t border-primary/10 flex justify-between items-center">
                                                <span className="font-black text-xs uppercase tracking-widest text-primary">Balance Payment Amount</span>
                                                <span className="text-xl font-black text-blue-600">
                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(balanceDueNow)}
                                                </span>
                                            </div>

                                            {false && formData.status === 'COMPLETED' && (
                                                (() => {
                                                    const damageChargeAmount = formData.hasDamageCharge
                                                        ? Number(formData.damageCharge) || 0
                                                        : 0;
                                                    const otherChargeAmount = formData.hasOtherCharge
                                                        ? Number(formData.otherChargeAmount) || 0
                                                        : 0;
                                                    const otherChargeDescription = formData.otherChargeDescription || '';
                                                    const collectionChargeAmount = formData.isCollection
                                                        ? (Number(formData.collectionCharge) || 0)
                                                        : 0;

                                                    const extraTotal =
                                                        extraDayCharge +
                                                        extraTimeRemainderCharge +
                                                        extraKmCost +
                                                        damageChargeAmount +
                                                        otherChargeAmount +
                                                        collectionChargeAmount;
                                                    const deductedFromDeposit = Math.min(deposit, extraTotal);
                                                    const refundToCustomer = Math.max(0, deposit - deductedFromDeposit);
                                                    const customerToPay = Math.max(0, extraTotal - deposit);

                                                    return (
                                                        <div className="pt-4 border-t border-primary/10 space-y-2">
                                                            {(extraDayCharge > 0 || extraTimeRemainderCharge > 0 || extraKmCost > 0 || damageChargeAmount > 0 || otherChargeAmount > 0 || collectionChargeAmount > 0) && (
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center justify-between text-sm">
                                                                        <span className="font-medium text-muted-foreground italic">Late Return Extra Days Charge</span>
                                                                        <span className="font-black">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(extraDayCharge)}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between text-sm">
                                                                        <span className="font-medium text-muted-foreground italic">Late Return Extra Time Charge</span>
                                                                        <span className="font-black">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(extraTimeRemainderCharge)}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between text-sm">
                                                                        <span className="font-medium text-muted-foreground italic">Extra Mileage Charge</span>
                                                                        <span className={extraKmCost > 0 ? 'text-red-600 font-black' : 'font-black text-foreground'}>
                                                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(extraKmCost)}
                                                                        </span>
                                                                    </div>
                                                                    {damageChargeAmount > 0 && (
                                                                        <div className="flex items-center justify-between text-sm">
                                                                            <span className="font-medium text-muted-foreground italic">Damage Charge</span>
                                                                            <span className="text-red-600 font-black">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(damageChargeAmount)}</span>
                                                                        </div>
                                                                    )}
                                                                    {otherChargeAmount > 0 && (
                                                                        <div className="flex items-center justify-between text-sm">
                                                                            <span className="font-medium text-muted-foreground italic">
                                                                                Other Charge{otherChargeDescription ? ` (${otherChargeDescription})` : ''}
                                                                            </span>
                                                                            <span className="text-red-600 font-black">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(otherChargeAmount)}</span>
                                                                        </div>
                                                                    )}
                                                                    {collectionChargeAmount > 0 && (
                                                                        <div className="flex items-center justify-between text-sm">
                                                                            <span className="font-medium text-muted-foreground italic">Collection Charge</span>
                                                                            <span className="text-red-600 font-black">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(collectionChargeAmount)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span className="font-medium text-muted-foreground italic">Late Return Settlement Total</span>
                                                                <span className="font-black">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(extraTotal)}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span className="font-medium text-muted-foreground italic">Security Deposit</span>
                                                                <span className="font-black">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(deposit)}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span className="font-medium text-muted-foreground italic">Deducted From Security Deposit</span>
                                                                <span className="font-black text-emerald-700">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(deductedFromDeposit)}</span>
                                                            </div>
                                                            {refundToCustomer > 0 ? (
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <span className="font-medium text-muted-foreground italic">Refund Amount to Customer</span>
                                                                    <span className="font-black text-emerald-700">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(refundToCustomer)}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <span className="font-medium text-muted-foreground italic">Customer Needs to Pay</span>
                                                                    <span className="font-black text-red-600">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(customerToPay)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()
                                            )}
                                            {editingId && formData.status === 'IN_PROGRESS' && (
                                                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                                    {!upfrontInvoice ? (
                                                        <Button
                                                            disabled={isReadOnly || invoiceLoading}
                                                            onClick={() => createUpfrontInvoice()}
                                                            className="bg-primary text-primary-foreground"
                                                        >
                                                            Create Upfront Invoice
                                                        </Button>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="secondary"
                                                                disabled={invoiceLoading}
                                                                onClick={() => setInvoiceDialogOpen(true)}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <Eye className="w-4 h-4" /> View Invoice ({upfrontInvoice.invoiceNo})
                                                            </Button>

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 flex items-center gap-2"
                                                                onClick={() => {
                                                                    const rawPhone = pickCustomerWhatsAppPhone(upfrontInvoice.customer);
                                                                    const phone = normalizePhoneForWhatsApp(rawPhone);
                                                                    if (!phone) { alert('No mobile number found.'); return; }
                                                                    const shareUrl = upfrontInvoice.shareUrl;
                                                                    if (!shareUrl) { alert('Link not ready.'); return; }
                                                                    const message = buildInvoiceWhatsAppMessage(upfrontInvoice, shareUrl);
                                                                    openWhatsAppWeb(phone, message);
                                                                }}
                                                            >
                                                                <MessageCircle className="w-4 h-4" /> WhatsApp
                                                            </Button>

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="border-blue-500 text-blue-500 hover:bg-blue-50 flex items-center gap-2"
                                                                onClick={() => {
                                                                    if (upfrontInvoice?.shareUrl) {
                                                                        window.open(upfrontInvoice.shareUrl, '_blank');
                                                                    }
                                                                }}
                                                            >
                                                                <Printer className="w-4 h-4" /> Print
                                                            </Button>
                                                        </div>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        disabled={invoiceLoading}
                                                        onClick={() => createUpfrontInvoice({ openDialog: false })}
                                                    >
                                                        Refresh Invoice
                                                    </Button>
                                                    {!agreement ? (
                                                        <Button
                                                            type="button"
                                                            variant="default"
                                                            disabled={isReadOnly || invoiceLoading}
                                                            onClick={createAgreement}
                                                        >
                                                            Generate Agreement
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            disabled={invoiceLoading}
                                                            onClick={() => openAgreement('view')}
                                                        >
                                                            View Agreement ({agreement.agreementNo})
                                                        </Button>
                                                    )}
                                                    {agreement && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            disabled={invoiceLoading}
                                                            onClick={() => openAgreement('download')}
                                                        >
                                                            Download Agreement PDF
                                                        </Button>
                                                    )}
                                                </div>
                                            )}

                                            {editingId && formData.status === 'RETURN' && (
                                                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                                    {!returnInvoice ? (
                                                        <Button
                                                            disabled={isReadOnly || invoiceLoading}
                                                            onClick={() => createReturnInvoice()}
                                                            className="bg-primary text-primary-foreground"
                                                        >
                                                            Create Return Invoice
                                                        </Button>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="secondary"
                                                                disabled={invoiceLoading}
                                                                onClick={() => setInvoiceDialogOpen(true)}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <Eye className="w-4 h-4" /> View Invoice ({returnInvoice.invoiceNo})
                                                            </Button>

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 flex items-center gap-2"
                                                                onClick={() => {
                                                                    const rawPhone = pickCustomerWhatsAppPhone(returnInvoice.customer);
                                                                    const phone = normalizePhoneForWhatsApp(rawPhone);
                                                                    if (!phone) { alert('No mobile number found.'); return; }
                                                                    const shareUrl = returnInvoice.shareUrl;
                                                                    if (!shareUrl) { alert('Link not ready.'); return; }
                                                                    const message = buildInvoiceWhatsAppMessage(returnInvoice, shareUrl);
                                                                    openWhatsAppWeb(phone, message);
                                                                }}
                                                            >
                                                                <MessageCircle className="w-4 h-4" /> WhatsApp
                                                            </Button>

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="border-blue-500 text-blue-500 hover:bg-blue-50 flex items-center gap-2"
                                                                onClick={() => {
                                                                    if (returnInvoice?.shareUrl) {
                                                                        window.open(returnInvoice.shareUrl, '_blank');
                                                                    }
                                                                }}
                                                            >
                                                                <Printer className="w-4 h-4" /> Print
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="space-y-2">
                                <Label>Fuel Level</Label>
                                <Select disabled={isReadOnly} value={formData.fuelLevel} onValueChange={(val) => handleChange('fuelLevel', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FULL">Full</SelectItem>
                                        <SelectItem value="HALF">Half</SelectItem>
                                        <SelectItem value="LOW">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </TabsContent>

                        <TabsContent value="checklist" className="space-y-6 pt-4">
                            {editingId && contracts.find(c => c.id === editingId)?.vehicleExchanges?.length > 0 && (
                                <div className="bg-muted/30 p-4 rounded-md border">
                                    <Label className="mb-2 block">Select Vehicle to Inspect</Label>
                                    <Select disabled={isReadOnly}
                                        value={selectedChecklistId}
                                        onValueChange={setSelectedChecklistId}
                                    >
                                        <SelectTrigger className="w-full md:w-[400px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MAIN">
                                                Main Vehicle ({contracts.find(c => c.id === editingId)?.vehicle?.licensePlate || 'Original'})
                                            </SelectItem>
                                            {contracts.find(c => c.id === editingId)?.vehicleExchanges.map((ex, idx) => (
                                                <SelectItem key={ex.id} value={ex.id}>
                                                    Exchange {idx + 1} ({ex.newVehicle?.licensePlate || 'New'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {selectedChecklistId === 'MAIN'
                                            ? "Viewing checklist for the original vehicle."
                                            : "Viewing checklist for the exchanged vehicle. Save changes separately for exchanges."}
                                    </p>
                                </div>
                            )}

                            <Tabs defaultValue="pickup" className="w-full">
                                <TabsList className="w-full bg-muted/20">
                                    <TabsTrigger value="pickup" className="flex-1 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-900">Pickup Checklist</TabsTrigger>
                                    <TabsTrigger value="dropoff" className="flex-1 data-[state=active]:bg-rose-100 data-[state=active]:text-rose-900">Drop Off Checklist</TabsTrigger>
                                </TabsList>

                                <TabsContent value="pickup" className="space-y-4 pt-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {['License', 'Insurance', 'Carpets', 'Spare Wheel', 'Jack', 'Jack Handle', 'Air Pump', 'Audio Setup', 'Tool Cover', 'Mud Covers'].map((item) => {
                                            const map = {
                                                'License': 'license', 'Insurance': 'insurance', 'Carpets': 'carpets',
                                                'Spare Wheel': 'spareWheel', 'Jack': 'jack', 'Jack Handle': 'jackHandle',
                                                'Air Pump': 'airPump', 'Audio Setup': 'audioSetup', 'Tool Cover': 'toolCover',
                                                'Mud Covers': 'mudCovers'
                                            };
                                            const field = map[item];

                                            const getValue = (f) => {
                                                if (selectedChecklistId === 'MAIN') return !!formData[f];
                                                const ex = exchangeChecklists[selectedChecklistId] || {};
                                                return !!ex[f];
                                            };

                                            const setValue = (f, val) => {
                                                if (selectedChecklistId === 'MAIN') handleChange(f, val);
                                                else handleExchangeChecklistChange(selectedChecklistId, f, val);
                                            };

                                            return (
                                                <div key={item} className="flex items-center space-x-2 border p-3 rounded-md">
                                                    <Switch disabled={isReadOnly}
                                                        checked={getValue(field)}
                                                        onCheckedChange={(c) => setValue(field, c)}
                                                    />
                                                    <Label>{item}</Label>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Front Tyres</Label>
                                            <Select disabled={isReadOnly}
                                                value={selectedChecklistId === 'MAIN' ? formData.frontTyres : (exchangeChecklists[selectedChecklistId]?.frontTyres || '100%')}
                                                onValueChange={(val) => selectedChecklistId === 'MAIN' ? handleChange('frontTyres', val) : handleExchangeChecklistChange(selectedChecklistId, 'frontTyres', val)}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {['100%', '80%', '60%', '40%'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Rear Tyres</Label>
                                            <Select disabled={isReadOnly}
                                                value={selectedChecklistId === 'MAIN' ? formData.rearTyres : (exchangeChecklists[selectedChecklistId]?.rearTyres || '100%')}
                                                onValueChange={(val) => selectedChecklistId === 'MAIN' ? handleChange('rearTyres', val) : handleExchangeChecklistChange(selectedChecklistId, 'rearTyres', val)}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {['100%', '80%', '60%', '40%'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Battery Code</Label>
                                        <Input disabled={isReadOnly}
                                            value={selectedChecklistId === 'MAIN' ? formData.batteryCode : (exchangeChecklists[selectedChecklistId]?.batteryCode || '')}
                                            onChange={e => selectedChecklistId === 'MAIN' ? handleChange('batteryCode', e.target.value) : handleExchangeChecklistChange(selectedChecklistId, 'batteryCode', e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Remark</Label>
                                        <Textarea disabled={isReadOnly}
                                            value={selectedChecklistId === 'MAIN' ? formData.remark : (exchangeChecklists[selectedChecklistId]?.remark || '')}
                                            onChange={e => selectedChecklistId === 'MAIN' ? handleChange('remark', e.target.value) : handleExchangeChecklistChange(selectedChecklistId, 'remark', e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Inspection Images (5 Required)</Label>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                            {[0, 1, 2, 3, 4].map((index) => {
                                                const images = selectedChecklistId === 'MAIN'
                                                    ? (formData.inspectionImages || [null, null, null, null, null])
                                                    : (exchangeChecklists[selectedChecklistId]?.inspectionImages || [null, null, null, null, null]);
                                                const file = images[index];

                                                return (
                                                    <ImageUploadPreview disabled={isReadOnly}
                                                        key={index}
                                                        id={`pickup-img-${index}`}
                                                        label={`Image ${index + 1}`}
                                                        file={file}
                                                        onChange={(e) => handleImageChange(index, e.target.files[0], false)}
                                                        onView={setViewingImage}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="dropoff" className="space-y-4 pt-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {['License', 'Insurance', 'Carpets', 'Spare Wheel', 'Jack', 'Jack Handle', 'Air Pump', 'Audio Setup', 'Tool Cover', 'Mud Covers'].map((item) => {
                                            const map = {
                                                'License': 'license', 'Insurance': 'insurance', 'Carpets': 'carpets',
                                                'Spare Wheel': 'spareWheel', 'Jack': 'jack', 'Jack Handle': 'jackHandle',
                                                'Air Pump': 'airPump', 'Audio Setup': 'audioSetup', 'Tool Cover': 'toolCover',
                                                'Mud Covers': 'mudCovers'
                                            };
                                            const field = `return${map[item].charAt(0).toUpperCase() + map[item].slice(1)}`;

                                            const getValue = (f) => {
                                                if (selectedChecklistId === 'MAIN') return !!formData[f];
                                                const ex = exchangeChecklists[selectedChecklistId] || {};
                                                return !!ex[f];
                                            };

                                            const setValue = (f, val) => {
                                                if (selectedChecklistId === 'MAIN') handleChange(f, val);
                                                else handleExchangeChecklistChange(selectedChecklistId, f, val);
                                            };

                                            return (
                                                <div key={item} className="flex items-center space-x-2 border p-3 rounded-md">
                                                    <Switch disabled={isReadOnly}
                                                        checked={getValue(field)}
                                                        onCheckedChange={(c) => setValue(field, c)}
                                                    />
                                                    <Label>{item}</Label>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Return Front Tyres</Label>
                                            <Select disabled={isReadOnly}
                                                value={selectedChecklistId === 'MAIN' ? (formData.returnFrontTyres || '100%') : (exchangeChecklists[selectedChecklistId]?.returnFrontTyres || '100%')}
                                                onValueChange={(val) => selectedChecklistId === 'MAIN' ? handleChange('returnFrontTyres', val) : handleExchangeChecklistChange(selectedChecklistId, 'returnFrontTyres', val)}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {['100%', '80%', '60%', '40%'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Return Rear Tyres</Label>
                                            <Select disabled={isReadOnly}
                                                value={selectedChecklistId === 'MAIN' ? (formData.returnRearTyres || '100%') : (exchangeChecklists[selectedChecklistId]?.returnRearTyres || '100%')}
                                                onValueChange={(val) => selectedChecklistId === 'MAIN' ? handleChange('returnRearTyres', val) : handleExchangeChecklistChange(selectedChecklistId, 'returnRearTyres', val)}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {['100%', '80%', '60%', '40%'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Return Battery Code</Label>
                                        <Input disabled={isReadOnly}
                                            value={selectedChecklistId === 'MAIN' ? (formData.returnBatteryCode || '') : (exchangeChecklists[selectedChecklistId]?.returnBatteryCode || '')}
                                            onChange={e => selectedChecklistId === 'MAIN' ? handleChange('returnBatteryCode', e.target.value) : handleExchangeChecklistChange(selectedChecklistId, 'returnBatteryCode', e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Return Remark</Label>
                                        <Textarea disabled={isReadOnly}
                                            value={selectedChecklistId === 'MAIN' ? (formData.returnRemark || '') : (exchangeChecklists[selectedChecklistId]?.returnRemark || '')}
                                            onChange={e => selectedChecklistId === 'MAIN' ? handleChange('returnRemark', e.target.value) : handleExchangeChecklistChange(selectedChecklistId, 'returnRemark', e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Return Inspection Images (5 Required)</Label>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                            {[0, 1, 2, 3, 4].map((index) => {
                                                const images = selectedChecklistId === 'MAIN'
                                                    ? (formData.returnInspectionImages || [null, null, null, null, null])
                                                    : (exchangeChecklists[selectedChecklistId]?.returnInspectionImages || [null, null, null, null, null]);
                                                const file = images[index];

                                                return (
                                                    <ImageUploadPreview disabled={isReadOnly}
                                                        key={index}
                                                        id={`dropoff-img-${index}`}
                                                        label={`Image ${index + 1}`}
                                                        file={file}
                                                        onChange={(e) => handleImageChange(index, e.target.files[0], true)}
                                                        onView={setViewingImage}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </TabsContent>

                        {/* Vehicle Exchange Tab - Only for In Progress Contracts */}
                        {editingId && (formData.status === 'IN_PROGRESS' || formData.status === 'RETURN' || formData.status === 'COMPLETED') && (
                            <TabsContent value="exchange" className="space-y-4 pt-4">
                                <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                                    <h3 className="font-semibold text-lg">Vehicle Exchange</h3>
                                    <p className="text-sm text-muted-foreground">Swap the current vehicle due to breakdown or other reasons.</p>

                                    {/* 1. New Exchange Form Section */}
                                    <div className="bg-background border rounded-md p-4 space-y-4">
                                        <h4 className="font-medium text-sm">New Exchange</h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            {/* Common Exchange Time */}
                                            <div className="space-y-2">
                                                <Label>Exchange Date & Time</Label>
                                                <Input disabled={isReadOnly}
                                                    type="datetime-local"
                                                    value={exchangeData.oldVehicleReturnDate} // They share the same value now
                                                    onChange={e => setExchangeData({
                                                        ...exchangeData,
                                                        oldVehicleReturnDate: e.target.value,
                                                        newVehicleStartDate: e.target.value
                                                    })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                {/* Left: Old Vehicle Return */}
                                                <div className="space-y-2 p-4 border rounded-md">
                                                    <Label className="text-red-600 font-semibold">Breakdown Vehicle Return ({activeVehicle?.licensePlate || 'Current'})</Label>
                                                    <div className="space-y-2 mt-2">
                                                        <Label>Return Odometer</Label>
                                                        <Input disabled={isReadOnly}
                                                            type="number"
                                                            value={exchangeData.oldVehicleReturnOdometer}
                                                            onChange={e => setExchangeData({ ...exchangeData, oldVehicleReturnOdometer: e.target.value })}
                                                        />
                                                        {/* End Contract Option */}
                                                        <div className="flex items-center space-x-2 pt-2">
                                                            <Switch disabled={isReadOnly}
                                                                id="end-contract"
                                                                checked={exchangeData.isEndOfContract}
                                                                onCheckedChange={(checked) => setExchangeData({ ...exchangeData, isEndOfContract: checked })}
                                                            />
                                                            <Label htmlFor="end-contract">End of the contract</Label>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: New Vehicle Handover */}
                                                {!exchangeData.isEndOfContract && (
                                                    <div className="space-y-2 p-4 border rounded-md">
                                                        <Label className="text-green-600 font-semibold">Replacement Vehicle Handover</Label>
                                                        <div className="space-y-2 mt-2">
                                                            <Label>Select New Vehicle</Label>
                                                            <Select disabled={isReadOnly} onValueChange={(val) => {
                                                                const v = vehicles.find(x => x.id === val);
                                                                setExchangeData(prev => ({
                                                                    ...prev,
                                                                    newVehicleId: val,
                                                                    newVehicleDailyRate: v ? (v.dailyRentalRate || '') : ''
                                                                }));
                                                            }}>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select Vehicle" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {vehicles.filter(v => v.id !== formData.vehicleId).map(v => (
                                                                        <SelectItem key={v.id} value={v.id}>{v.licensePlate} - {v.vehicleModel?.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>

                                                            <Label>Start Odometer</Label>
                                                            <Input disabled={isReadOnly}
                                                                type="number"
                                                                value={exchangeData.newVehicleStartOdometer}
                                                                onChange={e => setExchangeData({ ...exchangeData, newVehicleStartOdometer: e.target.value })}
                                                            />
                                                            <Label>Daily Rate</Label>
                                                            <Input disabled={isReadOnly}
                                                                type="number"
                                                                value={exchangeData.newVehicleDailyRate}
                                                                onChange={e => setExchangeData({ ...exchangeData, newVehicleDailyRate: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full"
                                            variant="destructive"
                                            onClick={async () => {
                                                try {
                                                    if (!exchangeData.oldVehicleReturnDate) {
                                                        return alert("Please select an Exchange Date & Time");
                                                    }

                                                    const payload = {
                                                        oldVehicleId: activeVehicleId,
                                                        oldVehicleReturnDate: new Date(exchangeData.oldVehicleReturnDate).toISOString(),
                                                        oldVehicleReturnOdometer: exchangeData.oldVehicleReturnOdometer,

                                                        // If End of Contract, we send UNDEFINED for new vehicle fields to avoid validation errors
                                                        newVehicleId: exchangeData.isEndOfContract ? undefined : exchangeData.newVehicleId,
                                                        newVehicleStartDate: exchangeData.isEndOfContract
                                                            ? undefined
                                                            : new Date(exchangeData.newVehicleStartDate).toISOString(),
                                                        newVehicleStartOdometer: exchangeData.isEndOfContract ? undefined : exchangeData.newVehicleStartOdometer,
                                                        newVehicleDailyRate: exchangeData.isEndOfContract ? undefined : exchangeData.newVehicleDailyRate,

                                                        isEndOfContract: exchangeData.isEndOfContract
                                                    };

                                                    if (!payload.isEndOfContract && !payload.newVehicleId) return alert("Select new vehicle");

                                                    await axios.post(`http://localhost:5000/api/contracts/${editingId}/exchange`, payload);
                                                    alert("Vehicle exchanged successfully!");
                                                    setExchangeData({ // Reset form
                                                        oldVehicleReturnDate: '',
                                                        oldVehicleReturnOdometer: '',
                                                        newVehicleId: '',
                                                        newVehicleStartDate: '',
                                                        newVehicleStartOdometer: '',

                                                        newVehicleDailyRate: '',
                                                        isEndOfContract: false
                                                    });
                                                    setIsOpen(false);
                                                    fetchContracts();
                                                } catch (e) {
                                                    console.error(e);
                                                    alert("Exchange failed: " + JSON.stringify(e.response?.data || e.message));
                                                }
                                            }}
                                        >
                                            Confirm Vehicle Exchange
                                        </Button>
                                    </div>

                                    {/* 2. Exchange History Table Section (Moved Bottom) */}
                                    {contracts.find(c => c.id === editingId)?.vehicleExchanges && (
                                        <div className="border rounded-lg overflow-hidden bg-background mt-6">
                                            <div className="bg-muted px-4 py-2 font-medium text-sm flex justify-between items-center">
                                                <span>Exchange History</span>
                                                <span className="text-xs text-muted-foreground">{contracts.find(c => c.id === editingId).vehicleExchanges.length} record(s)</span>
                                            </div>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Breakdown Vehicle</TableHead>
                                                        <TableHead>Exchange Date</TableHead>
                                                        <TableHead>Returned Odo</TableHead>
                                                        <TableHead>Replacement Vehicle</TableHead>
                                                        <TableHead>Start Odo</TableHead>
                                                        <TableHead>Replacement Return</TableHead>
                                                        <TableHead>Rate</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(contracts.find(c => c.id === editingId)?.vehicleExchanges || []).map((ex, index, arr) => {
                                                        let replacementReturnDate = null;
                                                        let replacementReturnOdo = null;

                                                        if (index < arr.length - 1) {
                                                            const nextEx = arr[index + 1];
                                                            replacementReturnDate = nextEx.oldVehicleReturnDate;
                                                            replacementReturnOdo = nextEx.oldVehicleReturnOdometer;
                                                        } else {
                                                            const contract = contracts.find(c => c.id === editingId);
                                                            if (contract.status === 'RETURN' || contract.status === 'COMPLETED') {
                                                                replacementReturnDate = contract.actualReturnDate;
                                                                replacementReturnOdo = contract.endOdometer;
                                                            }
                                                        }

                                                        return (
                                                            <TableRow key={ex.id}>
                                                                <TableCell>
                                                                    <div className="font-medium">{ex.oldVehicle?.licensePlate}</div>
                                                                    <div className="text-xs text-muted-foreground">{ex.oldVehicle?.vehicleModel?.name}</div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div>{formatDateTime(ex.oldVehicleReturnDate, '-')}</div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div>{ex.oldVehicleReturnOdometer}</div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="font-medium">{ex.newVehicle?.licensePlate}</div>
                                                                    <div className="text-xs text-muted-foreground">{ex.newVehicle?.vehicleModel?.name}</div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div>{ex.newVehicleStartOdometer}</div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {replacementReturnDate ? (
                                                                        <>
                                                                            <div>{formatDateTime(replacementReturnDate)}</div>
                                                                            <div className="text-xs text-muted-foreground">Odo: {replacementReturnOdo}</div>
                                                                        </>
                                                                    ) : (
                                                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">Active</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(ex.newVehicleDailyRate || 0)}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                    {(!contracts.find(c => c.id === editingId)?.vehicleExchanges?.length) && (
                                                        <TableRow>
                                                            <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                                                                No vehicle exchanges recorded yet.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>

                    <div className="flex justify-end pt-4 gap-2">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        {!isReadOnly && (() => {
                            // The Start Odometer floor only applies while the contract is
                            // pre-handover or live (UPCOMING / IN_PROGRESS); RETURN/COMPLETED
                            // edits don't expose the field so we don't block on it.
                            const blockOnStartOdo =
                                ['UPCOMING', 'IN_PROGRESS'].includes(formData.status) &&
                                startOdoBelowLatest;
                            const disabled = !!rangeConflict || blockOnStartOdo;
                            return (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={disabled}
                                    className={cn(disabled && "opacity-50 cursor-not-allowed")}
                                    title={
                                        blockOnStartOdo
                                            ? `Start odometer is below the vehicle's latest reading (${selectedVehicleLastOdo} km).`
                                            : undefined
                                    }
                                >
                                    {editingId ? "Update Contract" : "Create Contract"}
                                </Button>
                            );
                        })()}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
                <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl flex flex-col max-h-[90dvh]">
                    {(() => {
                        const inv = (formData.status === 'RETURN' ? returnInvoice : upfrontInvoice);
                        if (!inv) return (
                            <div className="p-12 text-center flex flex-col items-center gap-4">
                                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                                    <Receipt className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg">No Invoice Found</h3>
                                    <p className="text-muted-foreground text-sm">Please generate or refresh the invoice first.</p>
                                </div>
                                <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>Close</Button>
                            </div>
                        );

                        const isReturn = String(inv.type || '').toUpperCase() === 'RETURN';
                        const title = isReturn ? 'Return Settlement' : 'Upfront Invoice';
                        const total = Number(inv.total || 0);

                        return (
                            <div className="flex flex-col h-full overflow-hidden">
                                {/* Header */}
                                <div className={cn(
                                    isReturn ? "from-sky-500/10 via-background to-background" : "from-blue-500/10 via-background to-background"
                                )}>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-xl flex items-center justify-center shadow-sm",
                                                    isReturn ? "bg-sky-500 text-white" : "bg-blue-600 text-white"
                                                )}>
                                                    {isReturn ? <Receipt className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                </div>
                                                <h2 className="text-2xl font-black tracking-tight text-foreground font-calibri-bold uppercase">{title}</h2>
                                            </div>
                                            <p className="text-muted-foreground text-xs font-bold font-mono tracking-wider pl-12 uppercase">
                                                Invoice No: <span className="text-foreground">{inv.invoiceNo}</span>
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setInvoiceDialogOpen(false)} className="rounded-full h-8 w-8">
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="flex-1 overflow-y-auto px-8 space-y-6 pb-8">
                                    {/* Summary Card */}
                                    <div className="w-full p-6 rounded-3xl bg-muted/30 border border-border/50 flex flex-col items-center gap-2 relative overflow-hidden group">
                                        <div className={cn(
                                            "absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity",
                                            isReturn ? "text-sky-500" : "text-blue-500"
                                        )}>
                                            <DollarSign className="w-16 h-16 -mr-4 -mt-4 rotate-12" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                            {isReturn ? (total < 0 ? 'Customer Needs to Pay' : 'Company Have to Refund') : 'Balance Due'}
                                        </span>
                                        <span className={cn(
                                            "text-4xl font-black font-mono",
                                            isReturn ? (total < 0 ? 'text-red-600' : 'text-emerald-600') : 'text-foreground'
                                        )}>
                                            LKR {Number(Math.abs(total)).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-background border rounded-2xl p-4 space-y-1 shadow-sm">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">Customer</span>
                                            <span className="text-xs font-bold text-foreground block truncate">{inv.customer?.name || inv.customer?.email}</span>
                                        </div>
                                        <div className="bg-background border rounded-2xl p-4 space-y-1 shadow-sm">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">Vehicle</span>
                                            <span className="text-xs font-bold text-foreground block truncate">
                                                {inv.vehicle?.licensePlate} — {inv.vehicle?.vehicleModel?.name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Table */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Line Items</span>
                                            <span className="text-[10px] font-bold text-muted-foreground">{inv.lines?.length || 0} Item(s)</span>
                                        </div>
                                        <div className="border rounded-2xl overflow-hidden bg-background shadow-sm">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow className="hover:bg-transparent border-none">
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Description</TableHead>
                                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest h-10">Amount</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(() => {
                                                        const raw = inv.lines || [];
                                                        const { showSubtotal, beforeAdvance, advance, subTotal } = partitionInvoiceLinesForAdvance(raw);
                                                        if (showSubtotal) {
                                                            return (
                                                                <>
                                                                    {beforeAdvance.map((l, idx) => (
                                                                        <TableRow key={`pre-${idx}`} className="border-border/30 h-11">
                                                                            <TableCell className="text-xs font-medium py-2">{l.description}</TableCell>
                                                                            <TableCell className="text-right text-xs font-mono py-2">{Number(l.amount || 0).toLocaleString()}</TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                    <TableRow className="bg-muted/30 border-none h-11">
                                                                        <TableCell className="text-xs font-black uppercase tracking-widest py-2">Sub total</TableCell>
                                                                        <TableCell className="text-right text-xs font-black font-mono py-2">{subTotal.toLocaleString()}</TableCell>
                                                                    </TableRow>
                                                                    {advance.map((l, idx) => (
                                                                        <TableRow key={`adv-${idx}`} className="border-border/30 h-11">
                                                                            <TableCell className="text-xs font-medium py-2">{l.description}</TableCell>
                                                                            <TableCell className="text-right text-xs font-mono text-emerald-600 py-2">-{Number(Math.abs(l.amount || 0)).toLocaleString()}</TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </>
                                                            );
                                                        }
                                                        return raw.map((l, idx) => (
                                                            <TableRow key={idx} className="border-border/30 h-11">
                                                                <TableCell className="text-xs font-medium py-2">{l.description}</TableCell>
                                                                <TableCell className="text-right text-xs font-mono py-2">{Number(l.amount || 0).toLocaleString()}</TableCell>
                                                            </TableRow>
                                                        ));
                                                    })()}
                                                    <TableRow className={cn(
                                                        "border-none h-12",
                                                        isReturn ? "bg-sky-50" : "bg-blue-50"
                                                    )}>
                                                        <TableCell className="text-xs font-black uppercase tracking-widest py-2">Total Settlement</TableCell>
                                                        <TableCell className="text-right text-sm font-black font-mono py-2">LKR {Number(Math.abs(total)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="grid grid-cols-1 gap-3">
                                        <Button 
                                            className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#22c35e] text-white font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-[#25D366]/20 transition-all active:scale-95 font-calibri-bold"
                                            onClick={() => {
                                                const rawPhone = pickCustomerWhatsAppPhone(inv.customer);
                                                const phone = normalizePhoneForWhatsApp(rawPhone);
                                                if (!phone) {
                                                    alert('No mobile number found for this customer.');
                                                    return;
                                                }
                                                const shareUrl = inv.shareUrl;
                                                if (!shareUrl) {
                                                    alert('Share link not available.');
                                                    return;
                                                }
                                                const message = buildInvoiceWhatsAppMessage(inv, shareUrl);
                                                openWhatsAppWeb(phone, message);
                                            }}
                                        >
                                            <MessageCircle className="w-5 h-5" /> Share via WhatsApp
                                        </Button>

                                        <div className="grid grid-cols-2 gap-3">
                                            <Button 
                                                variant="outline"
                                                onClick={() => {
                                                    if (inv.shareUrl) {
                                                        window.open(inv.shareUrl, '_blank', 'noopener,noreferrer');
                                                    } else {
                                                        alert('Invoice link not available.');
                                                    }
                                                }}
                                                className="h-14 rounded-2xl border-border font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-secondary font-calibri-bold"
                                            >
                                                <Printer className="w-4 h-4 text-blue-500" /> View / Print PDF
                                            </Button>
                                            <Button 
                                                variant="outline"
                                                onClick={async () => {
                                                    if (inv.shareUrl) {
                                                        await navigator.clipboard.writeText(inv.shareUrl);
                                                        setCopiedInvoiceLink(true);
                                                        setTimeout(() => setCopiedInvoiceLink(false), 2000);
                                                    }
                                                }}
                                                className="h-14 rounded-2xl border-border font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-secondary font-calibri-bold"
                                            >
                                                {copiedInvoiceLink ? (
                                                    <>
                                                        <Check className="w-4 h-4 text-emerald-500" /> Link Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Share2 className="w-4 h-4 text-sky-500" /> Copy Link
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-6 border-t bg-muted/20 flex flex-wrap gap-3 justify-between items-center">
                                    <Button 
                                        variant="secondary" 
                                        onClick={() => {
                                            if (isReturn) createReturnInvoice({ openDialog: false });
                                            else createUpfrontInvoice({ openDialog: false });
                                        }}
                                        disabled={invoiceLoading}
                                        className="h-10 rounded-xl px-6 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2"
                                    >
                                        <Plus className={cn("w-4 h-4", invoiceLoading && "animate-spin")} /> 
                                        {invoiceLoading ? 'Refreshing...' : 'Refresh Data'}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => setInvoiceDialogOpen(false)}
                                        className="h-10 rounded-xl text-muted-foreground hover:text-foreground font-bold uppercase tracking-widest text-[10px]"
                                    >
                                        Close Wizard
                                    </Button>
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            <LocationManager isOpen={isLocationManagerOpen} onClose={() => setIsLocationManagerOpen(false)} />

            <div className="bg-card rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Contract No</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Active Vehicle</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-32 text-center py-10">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        <p className="font-black uppercase tracking-widest text-[10px] text-muted-foreground animate-pulse">Loading Contracts...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredContracts.map(contract => (
                                <TableRow
                                    key={contract.id}
                                    className="cursor-pointer"
                                    onClick={() => handleEditClick(contract)}
                                >
                                    <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                                        {contract.contractNo || '-'}
                                    </TableCell>
                                    <TableCell>{contract.customer?.name}</TableCell>
                                    <TableCell>{contract.vehicle?.licensePlate}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {contract.vehicle?.fleetCategory?.name || '—'}
                                    </TableCell>
                                    <TableCell>
                                        {(() => {
                                            const lastEx = contract.vehicleExchanges?.length > 0 ? contract.vehicleExchanges[contract.vehicleExchanges.length - 1] : null;
                                            const activeVehicle = lastEx ? (lastEx.newVehicle || lastEx.oldVehicle) : contract.vehicle;
                                            return activeVehicle?.id !== contract.vehicle?.id ?
                                                <span className="text-blue-600 font-medium">{activeVehicle?.licensePlate}</span> :

                                                <span className="text-muted-foreground">-</span>;
                                        })()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs">
                                            {formatDate(contract.pickupDate)} {contract.pickupTime}
                                            <br />
                                            {formatDate(contract.dropoffDate)} {contract.dropoffTime}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium 
                                            ${contract.status === 'UPCOMING' ? 'bg-blue-100 text-blue-800' :
                                                contract.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                                    contract.status === 'RETURN' ? 'bg-sky-100 text-sky-800' :
                                                        contract.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {contract.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {contract.isDelivery ? (
                                            <span className="text-xs">{contract.city?.name}, {contract.city?.district?.name}</span>
                                        ) : 'Pickup'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => { e.stopPropagation(); handleView(contract); }}
                                                title="View Contract"
                                            >
                                                <Eye className="w-4 h-4 text-cyan-400" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => { e.stopPropagation(); handleEditClick(contract); }}
                                                title="Edit Contract"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600"
                                                onClick={(e) => { e.stopPropagation(); handleDelete(contract.id); }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                
                <Pagination
                    pagination={pagination}
                    onPageChange={(p) => setPage(p)}
                />
            </div>

            {/* Advance Receipt Success Wizard */}
            <Dialog open={receiptSuccessOpen} onOpenChange={setReceiptSuccessOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
                    <div className="bg-gradient-to-br from-emerald-500/10 via-background to-background p-8">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
                                <div className="relative h-20 w-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-in zoom-in duration-500">
                                    <CheckCircle2 className="h-10 w-10 text-white" />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black tracking-tight text-foreground font-calibri-bold uppercase">Receipt Issued</h2>
                                <p className="text-muted-foreground text-sm font-medium">
                                    Advance receipt <span className="text-foreground font-bold">{currentSavedReceipt?.receiptNo}</span> has been successfully posted to the ledger.
                                </p>
                            </div>

                            <div className="w-full p-4 rounded-2xl bg-muted/50 border border-border/50 flex flex-col items-center gap-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount Posted</span>
                                <span className="text-2xl font-black text-emerald-600 font-mono">
                                    LKR {Number(currentSavedReceipt?.amount || 0).toLocaleString()}
                                </span>
                            </div>

                            <div className="grid w-full gap-3 pt-2">
                                <Button 
                                    className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#22c35e] text-white font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-[#25D366]/20 transition-all active:scale-95 font-calibri-bold"
                                    onClick={async () => {
                                        if (!currentSavedReceipt) return;
                                        const rawPhone = pickCustomerWhatsAppPhone(currentSavedReceipt.contract?.customer);
                                        const phone = normalizePhoneForWhatsApp(rawPhone);
                                        if (!phone) {
                                            alert('No mobile number found for this customer.');
                                            return;
                                        }
                                        let shareUrl = currentSavedReceipt.shareUrl;
                                        try {
                                            const { data: linkData } = await api.get(
                                                `/advance-receipts/${currentSavedReceipt.id}/share-link`
                                            );
                                            if (linkData?.shareUrl) shareUrl = linkData.shareUrl;
                                        } catch {
                                            /* use link from issue response */
                                        }
                                        if (!shareUrl) {
                                            alert('Share link not available.');
                                            return;
                                        }
                                        const message = buildAdvanceReceiptWhatsAppMessage(currentSavedReceipt, shareUrl);
                                        openWhatsAppWeb(phone, message);
                                    }}
                                >
                                    <MessageCircle className="w-5 h-5" /> Send via WhatsApp
                                </Button>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <Button 
                                        variant="outline"
                                        onClick={() => printAdvanceReceipt()}
                                        className="h-14 rounded-2xl border-border font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-secondary font-calibri-bold"
                                    >
                                        <Printer className="w-4 h-4 text-rose-500" /> Print / Save PDF
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        onClick={async () => {
                                            if (!currentSavedReceipt?.id) return;
                                            try {
                                                const { data: linkData } = await api.get(
                                                    `/advance-receipts/${currentSavedReceipt.id}/share-link`
                                                );
                                                const url = linkData?.shareUrl || currentSavedReceipt.shareUrl;
                                                if (!url) {
                                                    alert('Share link not available.');
                                                    return;
                                                }
                                                await navigator.clipboard.writeText(url);
                                                setCopiedReceiptLink(true);
                                                setTimeout(() => setCopiedReceiptLink(false), 2000);
                                            } catch (e) {
                                                alert(e.response?.data?.message || 'Could not copy link.');
                                            }
                                        }}
                                        className="h-14 rounded-2xl border-border font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-secondary font-calibri-bold"
                                    >
                                        {copiedReceiptLink ? (
                                            <>
                                                <Check className="w-4 h-4 text-emerald-500" /> Link Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4 text-blue-500" /> Copy Link
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <Button 
                                variant="ghost" 
                                onClick={() => setReceiptSuccessOpen(false)}
                                className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground font-bold uppercase tracking-widest text-[10px] font-calibri"
                            >
                                Close Wizard
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Contracts;
