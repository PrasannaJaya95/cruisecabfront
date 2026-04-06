import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Dialog,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { User, Building2, Globe, CheckCircle, ChevronRight, ChevronLeft, Upload, FileText, AlertCircle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageUploadPreview from './ImageUploadPreview';
import axios from 'axios';
import api from '../lib/api';

const steps = [
    { id: 'type', title: 'Customer Type' },
    { id: 'basic', title: 'Basic Info' },
    { id: 'contact', title: 'Contact Details' },
    { id: 'relations', title: 'Relations' }, // Or Corporate Contact
    { id: 'documents', title: 'Documents' },
    { id: 'review', title: 'Review' }
];

const CustomerWizard = ({
    open,
    onOpenChange,
    onSubmit,
    initialData = null,
    isReadOnly = false,
    editingCustomerId = null,
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(0);
    const [customerType, setCustomerType] = useState('local');
    const [errors, setErrors] = useState({});
    const [nicError, setNicError] = useState(null);
    const [emailError, setEmailError] = useState(null);
    const [passportError, setPassportError] = useState(null);
    const [brError, setBrError] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [globalLoyaltyEnabled, setGlobalLoyaltyEnabled] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        email: '', address: '', phone: '', mobile: '', description: '',
        name: '', nicOrPassport: '', drivingLicenseNo: '', passportNo: '',
        companyName: '', brNumber: '', contactPersonName: '', contactPersonMobile: '',
        closeRelationName: '', closeRelationMobile: '',
        userId: '',
        loyaltyPoints: 0,
        loyaltyEnabled: true,
        loyaltyEarnRate: '',
        loyaltyRedeemRate: ''
    });

    const [files, setFiles] = useState({
        doc1: null, doc2: null, utilityBill: null, drivingLicenseFront: null, drivingLicenseBack: null,
        support1: null, support2: null, passport: null, otherDoc: null, brDoc: null, corporateOtherDoc: null,
        intlDrivingLicenseFront: null, intlDrivingLicenseBack: null, aaPermit: null
    });

    const emptyFilesState = () => ({
        doc1: null, doc2: null, utilityBill: null, drivingLicenseFront: null, drivingLicenseBack: null,
        support1: null, support2: null, passport: null, otherDoc: null, brDoc: null, corporateOtherDoc: null,
        intlDrivingLicenseFront: null, intlDrivingLicenseBack: null, aaPermit: null
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                userId: initialData.userId || '',
                drivingLicenseNo: initialData.drivingLicenseNo || '',
                loyaltyEarnRate: initialData.loyaltyEarnRate || '',
                loyaltyRedeemRate: initialData.loyaltyRedeemRate || ''
            });
            setCustomerType(initialData.type?.toLowerCase() || 'local');
            setFiles({
                ...emptyFilesState(),
                doc1: initialData.doc1Url || null,
                doc2: initialData.doc2Url || null,
                utilityBill: initialData.utilityBillUrl || null,
                drivingLicenseFront: initialData.drivingLicenseFrontUrl || null,
                drivingLicenseBack: initialData.drivingLicenseBackUrl || null,
                intlDrivingLicenseFront: initialData.intlDrivingLicenseFrontUrl || null,
                intlDrivingLicenseBack: initialData.intlDrivingLicenseBackUrl || null,
                aaPermit: initialData.aaPermitUrl || null,
            });
        } else {
            setCurrentStep(0);
            setFormData({
                email: '', address: '', phone: '', mobile: '', description: '',
                name: '', nicOrPassport: '', drivingLicenseNo: '', passportNo: '',
                companyName: '', brNumber: '', contactPersonName: '', contactPersonMobile: '',
                closeRelationName: '', closeRelationMobile: '',
                userId: ''
            });
            setFiles(emptyFilesState());
        }
    }, [open, initialData]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const [usersRes, loyaltyRes] = await Promise.all([
                    api.get('/users?all=true'),
                    api.get('/settings/loyalty_enabled')
                ]);
                console.log('CustomerWizard: Fetched users:', usersRes.data.length);
                setAvailableUsers(usersRes.data);
                setGlobalLoyaltyEnabled(loyaltyRes.data.value === 'true');
            } catch (error) {
                console.error('Failed to fetch data', error);
            }
        };
        if (open) fetchUsers();
    }, [open]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
        if (errors[id]) setErrors(prev => ({ ...prev, [id]: null }));
        // Clear validation errors when user starts typing
        if (id === 'nicOrPassport' && nicError) setNicError(null);
        if (id === 'passportNo' && passportError) setPassportError(null);
        if (id === 'brNumber' && brError) setBrError(null);
    };

    const handleFileChange = (e, key) => {
        const file = e.target.files[0];
        if (file) {
            setFiles(prev => ({ ...prev, [key]: file }));
            const docErrorKeys = ['doc1', 'doc2', 'drivingLicenseFront', 'drivingLicenseBack'];
            if (docErrorKeys.includes(key)) {
                setErrors(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
            }
        }
    };

    const handleFileRemove = (key) => {
        setFiles(prev => ({ ...prev, [key]: null }));
    };

    const handleViewImage = (imageUrl) => {
        setPreviewImage(imageUrl);
        setShowPreviewModal(true);
    };

    const handleDownloadImage = () => {
        if (!previewImage) return;

        // Determine file extension
        let fileExtension = 'jpg';
        if (previewImage.toLowerCase().includes('.pdf') || previewImage.startsWith('blob:')) {
            // Check if it's a PDF from the files state
            const pdfFile = Object.values(files).find(f => f && f.type === 'application/pdf');
            if (pdfFile) {
                fileExtension = 'pdf';
            }
        }

        const link = document.createElement('a');
        link.href = previewImage;
        link.download = `document_${Date.now()}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const checkNicDuplicate = async (nicValue) => {
        if (!nicValue) {
            setNicError(null);
            return true;
        }

        try {
            const params = new URLSearchParams({ nicOrPassport: nicValue });
            if (editingCustomerId) {
                params.append('excludeId', editingCustomerId);
            }

            const response = await api.get(`/clients/check-nic?${params}`);

            if (response.data.exists) {
                const customer = response.data.customer;
                setNicError(`This NIC is already registered to ${customer.name} (${customer.code})`);
                return false;
            }

            setNicError(null);
            return true;
        } catch (error) {
            console.error('NIC check error:', error);
            return true; // Allow submission if check fails
        }
    };

    const checkPassportDuplicate = async (passportValue) => {
        if (!passportValue) {
            setPassportError(null);
            return true;
        }

        try {
            const params = new URLSearchParams({ passportNo: passportValue });
            if (editingCustomerId) {
                params.append('excludeId', editingCustomerId);
            }

            const response = await api.get(`/clients/check-passport?${params}`);

            if (response.data.exists) {
                const customer = response.data.customer;
                setPassportError(`This Passport is already registered to ${customer.name} (${customer.code})`);
                return false;
            }

            setPassportError(null);
            return true;
        } catch (error) {
            console.error('Passport check error:', error);
            return true;
        }
    };

    const checkBrDuplicate = async (brValue) => {
        if (!brValue) {
            setBrError(null);
            return true;
        }

        try {
            const params = new URLSearchParams({ brNumber: brValue });
            if (editingCustomerId) {
                params.append('excludeId', editingCustomerId);
            }

            const response = await api.get(`/clients/check-br?${params}`);

            if (response.data.exists) {
                const customer = response.data.customer;
                const label = customer.companyName || customer.name || 'another company';
                setBrError(`This BR Number is already registered to ${label} (${customer.code})`);
                return false;
            }

            setBrError(null);
            return true;
        } catch (error) {
            console.error('BR check error:', error);
            return true;
        }
    };

    const checkEmailDuplicate = async (emailValue) => {
        if (!emailValue) {
            setEmailError(null);
            return true;
        }

        try {
            const params = new URLSearchParams({ email: emailValue });
            if (editingCustomerId) {
                params.append('excludeId', editingCustomerId);
            }

            const response = await api.get(`/clients/check-email?${params}`);

            if (response.data.exists) {
                const customer = response.data.customer;
                setEmailError(`This Email is already registered to ${customer.name} (${customer.code})`);
                return false;
            }

            setEmailError(null);
            return true;
        } catch (error) {
            console.error('Email check error:', error);
            return true;
        }
    };

    const validateStep = (step) => {
        const newErrors = {};
        let isValid = true;
        const currentId = steps[step].id;

        if (currentId === 'basic') {
            if (customerType === 'corporate') {
                if (!formData.companyName) newErrors.companyName = 'Company Name is required';
                if (!formData.brNumber) newErrors.brNumber = 'BR Number is required';
            } else {
                if (!formData.name) newErrors.name = 'Full Name is required';
                if (customerType === 'local' && !formData.nicOrPassport) newErrors.nicOrPassport = 'NIC/Passport is required';
                if (customerType === 'local' && !String(formData.drivingLicenseNo || '').trim()) {
                    newErrors.drivingLicenseNo = 'Driving license number is required';
                }
                if (customerType === 'foreign' && !formData.passportNo) newErrors.passportNo = 'Passport Number is required';
            }
        } else if (currentId === 'contact') {
            // Email optional for all customer types
            // Landline is optional for Local and Foreign customers
            if (customerType === 'corporate' && !formData.phone) {
                newErrors.phone = 'Phone is required';
            }
            // Mobile is required for Local and Foreign, optional for Corporate (2nd landline)
            if (customerType !== 'corporate' && !formData.mobile) {
                newErrors.mobile = 'Mobile is required';
            }
            // Address is optional for Foreign customers
            if (customerType !== 'foreign' && !formData.address) {
                newErrors.address = 'Address is required';
            }
        } else if (currentId === 'relations') {
            if (customerType === 'corporate') {
                if (!formData.contactPersonName) newErrors.contactPersonName = 'Contact Person Name is required';
                if (!formData.contactPersonMobile) newErrors.contactPersonMobile = 'Contact Person Mobile is required';
            }
            // Emergency contact (local / foreign) is optional
        }
        else if (currentId === 'documents' && customerType === 'local') {
            const hasDoc1 = files.doc1 || initialData?.doc1Url;
            const hasDoc2 = files.doc2 || initialData?.doc2Url;
            const hasDlFront = files.drivingLicenseFront || initialData?.drivingLicenseFrontUrl;
            const hasDlBack = files.drivingLicenseBack || initialData?.drivingLicenseBackUrl;
            if (!hasDoc1) newErrors.doc1 = 'NIC front is required';
            if (!hasDoc2) newErrors.doc2 = 'NIC back is required';
            if (!hasDlFront) newErrors.drivingLicenseFront = 'Driving license front is required';
            if (!hasDlBack) newErrors.drivingLicenseBack = 'Driving license back is required';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            isValid = false;
        }

        return isValid;
    };

    const handleStepClick = (index) => {
        // Allow free navigation backwards
        if (index < currentStep) {
            setDirection(-1);
            setCurrentStep(index);
            return;
        }

        // Allow navigation forward only if current step is valid, OR if we are just exploring (but user wants clickable steps)
        // Let's enforce that to jump forward, the CURRENT step must be valid.
        // We won't enforce that intermediate steps are valid to jump over them, 
        // BUT strict wizard usually requires sequential.
        // However, "click wizard number and go there" implies random access.
        // Random access forward is risky if intermediate data is missing.
        // Let's allow it but validate on submit.

        // Actually, let's just stick to: You can click any step, but if you go forward, we validate the current step first.
        if (validateStep(currentStep)) {
            setDirection(1);
            setCurrentStep(index);
        }
    };

    const validateAllSteps = () => {
        for (let i = 0; i < steps.length - 1; i++) {
            // We use the same validation logic but we need to ensure we catch the first invalid step
            // validateStep uses 'currentId' which comes from steps[step].id, so passing index 'i' works.
            if (!validateStep(i)) {
                setCurrentStep(i); // Jump to the first invalid step
                return false;
            }
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setDirection(1);
            setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
        }
    };

    const prevStep = () => {
        setDirection(-1);
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    const handleFinalSubmit = async (status) => {
        console.log('CustomerWizard: handleFinalSubmit triggered with status:', status);
        if (submitting) return;

        setSubmitting(true);
        try {
            // Check for duplicates before submission
            if (formData.email) {
                const isEmailValid = await checkEmailDuplicate(formData.email);
                if (!isEmailValid) {
                    alert(`Submission failed: ${emailError || 'This email is already in use.'}`);
                    setCurrentStep(2); // Contact step
                    setSubmitting(false);
                    return;
                }
            }

            if (customerType === 'local' && formData.nicOrPassport) {
                const isNicValid = await checkNicDuplicate(formData.nicOrPassport);
                if (!isNicValid) {
                    alert(`Submission failed: ${nicError || 'This NIC is already in use.'}`);
                    setCurrentStep(1); // Basic Info step
                    setSubmitting(false);
                    return;
                }
            }

            if (customerType === 'foreign' && formData.passportNo) {
                const isPassportValid = await checkPassportDuplicate(formData.passportNo);
                if (!isPassportValid) {
                    alert(`Submission failed: ${passportError || 'This Passport number is already in use.'}`);
                    setCurrentStep(1); // Basic Info step
                    setSubmitting(false);
                    return;
                }
            }

            if (customerType === 'corporate' && formData.brNumber) {
                const isBrValid = await checkBrDuplicate(formData.brNumber);
                if (!isBrValid) {
                    alert(`Submission failed: ${brError || 'This BR Number is already in use.'}`);
                    setCurrentStep(1); // Basic Info step
                    setSubmitting(false);
                    return;
                }
            }

            if (status === 'DRAFT') {
                if (onSubmit) {
                    await onSubmit(formData, files, customerType, status);
                }
            } else {
                if (validateAllSteps()) {
                    if (onSubmit) {
                        await onSubmit(formData, files, customerType, status);
                    }
                } else {
                    alert("Please fill in all mandatory fields before submitting.");
                }
            }
        } catch (error) {
            console.error('Error in handleFinalSubmit:', error);
            alert('An unexpected error occurred during submission. Please check your network connection.');
        } finally {
            setSubmitting(false);
        }
    };

    const variants = {
        enter: (direction) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            x: direction > 0 ? -50 : 50,
            opacity: 0
        })
    };

    return (
        <DialogContent className="max-w-4xl h-[85vh] overflow-hidden bg-card border-border text-foreground flex flex-col p-0 rounded-[2.5rem] shadow-2xl">
            {/* Header */}
            <div className="p-8 border-b border-border bg-card/50 backdrop-blur-xl z-10 transition-colors">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-black flex justify-between items-center tracking-tight">
                        <span className="text-foreground">
                            {initialData ? 'Edit Customer' : 'Customer Wizard'}
                        </span>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-4 py-2 bg-secondary/50 rounded-full">
                            Step {currentStep + 1} of {steps.length}
                        </span>
                    </DialogTitle>
                    <DialogDescription className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                        {initialData ? 'Update existing customer registration details' : 'Complete the multi-step form to register a new customer'}
                    </DialogDescription>
                </DialogHeader>

                {/* Progress Bar */}
                <div className="mt-10 relative px-2">
                    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-border -translate-y-1/2 rounded-full" />
                    <div
                        className="absolute top-1/2 left-0 h-[2px] bg-primary -translate-y-1/2 rounded-full transition-all duration-500"
                        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                    />
                    <div className="relative flex justify-between">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className="flex flex-col items-center gap-3 cursor-pointer group"
                                onClick={() => handleStepClick(index)}
                            >
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black border-2 transition-all group-hover:scale-110",
                                        index <= currentStep
                                            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                            : "bg-card border-border text-muted-foreground group-hover:border-primary/50 group-hover:text-primary"
                                    )}
                                >
                                    {index + 1}
                                </div>
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-[0.2em] hidden sm:block transition-colors",
                                    index <= currentStep ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground"
                                )}>
                                    {step.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 overflow-y-auto relative custom-scrollbar">
                <AnimatePresence custom={direction} mode="wait">
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {currentStep === 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full content-center max-w-4xl mx-auto px-4">
                                {[
                                    { id: 'local', label: 'Local Customer', icon: User, desc: 'For local residents with NIC' },
                                    { id: 'foreign', label: 'Foreign Customer', icon: Globe, desc: 'For international visitors' },
                                    { id: 'corporate', label: 'Corporate', icon: Building2, desc: 'For registered companies' },
                                ].map(type => (
                                    <div
                                        key={type.id}
                                        onClick={() => { setCustomerType(type.id); nextStep(); }}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-10 rounded-[2rem] border-2 transition-all cursor-pointer hover:scale-105 shadow-xl",
                                            customerType === type.id
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border bg-secondary/30 hover:border-primary/50 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <type.icon className="w-16 h-16 mb-6 opacity-80" />
                                        <span className="text-xl font-black mb-3 tracking-tight">{type.label}</span>
                                        <span className="text-xs text-center font-black uppercase tracking-widest text-muted-foreground/60">{type.desc}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {currentStep === 1 && (
                            <div className="space-y-8 max-w-2xl mx-auto py-4">
                                <h3 className="text-2xl font-black text-foreground tracking-tight mb-8">Basic Information</h3>
                                {customerType === 'corporate' ? (
                                    <>
                                        <div className="space-y-3">
                                            <Label htmlFor="companyName" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Company Name *</Label>
                                            <Input id="companyName" value={formData.companyName} onChange={handleInputChange} className={cn("bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20", errors.companyName && "border-red-500")} />
                                            {errors.companyName && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">{errors.companyName}</span>}
                                        </div>
                                        <div className="space-y-3">
                                            <Label htmlFor="brNumber" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Business Registration Number *</Label>
                                            <Input
                                                id="brNumber"
                                                value={formData.brNumber}
                                                onChange={handleInputChange}
                                                onBlur={(e) => checkBrDuplicate(e.target.value)}
                                                className={cn("bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20", (errors.brNumber || brError) && "border-red-500")}
                                            />
                                            {errors.brNumber && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">{errors.brNumber}</span>}
                                            {brError && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1 ml-1"><AlertCircle className="w-3 h-3" />{brError}</span>}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-3">
                                            <Label htmlFor="name" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Full Name *</Label>
                                            <Input id="name" value={formData.name} onChange={handleInputChange} className={cn("bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20", errors.name && "border-red-500")} />
                                            {errors.name && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">{errors.name}</span>}
                                        </div>
                                        {customerType === 'local' && (
                                            <>
                                                <div className="space-y-3">
                                                    <Label htmlFor="nicOrPassport" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">NIC Number *</Label>
                                                    <Input
                                                        id="nicOrPassport"
                                                        value={formData.nicOrPassport}
                                                        onChange={handleInputChange}
                                                        onBlur={(e) => checkNicDuplicate(e.target.value)}
                                                        className={cn("bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20", (errors.nicOrPassport || nicError) && "border-red-500")}
                                                    />
                                                    {errors.nicOrPassport && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">{errors.nicOrPassport}</span>}
                                                    {nicError && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1 ml-1"><AlertCircle className="w-3 h-3" />{nicError}</span>}
                                                </div>
                                                <div className="space-y-3">
                                                    <Label htmlFor="drivingLicenseNo" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Driving License Number *</Label>
                                                    <Input
                                                        id="drivingLicenseNo"
                                                        value={formData.drivingLicenseNo}
                                                        onChange={handleInputChange}
                                                        className={cn("bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20", errors.drivingLicenseNo && "border-red-500")}
                                                    />
                                                    {errors.drivingLicenseNo && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">{errors.drivingLicenseNo}</span>}
                                                </div>
                                            </>
                                        )}
                                        {customerType === 'foreign' && (
                                            <div className="space-y-3">
                                                <Label htmlFor="passportNo" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Passport Number *</Label>
                                                <Input
                                                    id="passportNo"
                                                    value={formData.passportNo}
                                                    onChange={handleInputChange}
                                                    onBlur={(e) => checkPassportDuplicate(e.target.value)}
                                                    className={cn("bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20", (errors.passportNo || passportError) && "border-red-500")}
                                                />
                                                {errors.passportNo && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">{errors.passportNo}</span>}
                                                {passportError && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1 ml-1"><AlertCircle className="w-3 h-3" />{passportError}</span>}
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="space-y-4 pt-8 border-t border-border mt-8">
                                    <Label htmlFor="userId" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Related User Account (Optional)</Label>
                                    <Select
                                        value={formData.userId || "none"}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, userId: val === "none" ? "" : val }))}
                                    >
                                        <SelectTrigger className="bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20">
                                            <SelectValue placeholder="Select user account" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border text-foreground">
                                            <SelectItem value="none">None (No User Account)</SelectItem>
                                            {availableUsers.map(u => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.name} ({u.email}) - {u.role}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground italic font-black uppercase tracking-widest ml-1">
                                        Linking a user account allows the customer to log in and see their history.
                                    </p>
                                </div>

                                <div className="space-y-6 pt-8 border-t border-border mt-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                            <AlertCircle className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black tracking-tight text-foreground">Loyalty Program</h4>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Configure customer rewards</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label htmlFor="loyaltyPoints" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Loyalty Points Balance</Label>
                                            <Input
                                                id="loyaltyPoints"
                                                type="number"
                                                value={formData.loyaltyPoints}
                                                onChange={handleInputChange}
                                                className="bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <Label htmlFor="loyaltyEarnRate" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Custom Earn Rate (Optional)</Label>
                                            <Input
                                                id="loyaltyEarnRate"
                                                type="number"
                                                step="0.01"
                                                placeholder="Global Default"
                                                value={formData.loyaltyEarnRate}
                                                onChange={handleInputChange}
                                                className="bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <Label htmlFor="loyaltyRedeemRate" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Custom Redeem Rate (Optional)</Label>
                                            <Input
                                                id="loyaltyRedeemRate"
                                                type="number"
                                                step="0.01"
                                                placeholder="Global Default"
                                                value={formData.loyaltyRedeemRate}
                                                onChange={handleInputChange}
                                                className="bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20"
                                            />
                                        </div>

                                        {!globalLoyaltyEnabled && (
                                            <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border">
                                                <div className="space-y-0.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Enable Manually</Label>
                                                    <p className="text-[9px] text-muted-foreground font-medium">Override global off setting</p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.loyaltyEnabled}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, loyaltyEnabled: e.target.checked }))}
                                                    className="w-5 h-5 accent-primary"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-8 max-w-2xl mx-auto py-4">
                                <h3 className="text-2xl font-black text-foreground tracking-tight mb-8">Contact Details</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="email" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">
                                            Email Address (optional)
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            onBlur={(e) => checkEmailDuplicate(e.target.value)}
                                            className={cn("bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20", (errors.email || emailError) && "border-red-500")}
                                        />
                                        {errors.email && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">{errors.email}</span>}
                                        {emailError && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1 ml-1"><AlertCircle className="w-3 h-3" />{emailError}</span>}
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="phone" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Landline Number {customerType === 'corporate' && '*'}</Label>
                                        <Input id="phone" value={formData.phone} onChange={handleInputChange} className={cn("bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20", errors.phone && "border-red-500")} />
                                        {errors.phone && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">{errors.phone}</span>}
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="mobile" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">
                                            {customerType === 'corporate' ? '2nd Landline Number (optional)' : 'Mobile Number *'}
                                        </Label>
                                        <Input id="mobile" value={formData.mobile} onChange={handleInputChange} className={cn("bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20", errors.mobile && "border-red-500")} />
                                        {errors.mobile && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">{errors.mobile}</span>}
                                    </div>
                                    <div className="space-y-3 col-span-2">
                                        <Label htmlFor="address" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Address {customerType !== 'foreign' && '*'}</Label>
                                        <Input id="address" value={formData.address} onChange={handleInputChange} className={cn("bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20", errors.address && "border-red-500")} />
                                        {errors.address && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">{errors.address}</span>}
                                    </div>
                                    <div className="space-y-3 col-span-2">
                                        <Label htmlFor="description" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Description (optional)</Label>
                                        <Textarea
                                            id="description"
                                            value={formData.description || ''}
                                            onChange={handleInputChange}
                                            placeholder="Internal notes, preferences, or other context…"
                                            rows={4}
                                            disabled={isReadOnly}
                                            className="bg-secondary/30 border-border rounded-xl min-h-[100px] focus:ring-primary/20 resize-y"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="space-y-8 max-w-2xl mx-auto py-4">
                                <h3 className="text-2xl font-black text-foreground tracking-tight mb-8">
                                    {customerType === 'corporate' ? 'Company Contact Person' : 'Emergency Contact'}
                                    {(customerType === 'local' || customerType === 'foreign') && (
                                        <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest ml-4">(Optional)</span>
                                    )}
                                </h3>
                                {(customerType === 'local' || customerType === 'foreign') && (
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label htmlFor="closeRelationName" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Relation Name (optional)</Label>
                                            <Input id="closeRelationName" value={formData.closeRelationName} onChange={handleInputChange} className={cn("bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20", errors.closeRelationName && "border-red-500")} />
                                            {errors.closeRelationName && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">{errors.closeRelationName}</span>}
                                        </div>
                                        <div className="space-y-3">
                                            <Label htmlFor="closeRelationMobile" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Relation Mobile (optional)</Label>
                                            <Input id="closeRelationMobile" value={formData.closeRelationMobile} onChange={handleInputChange} className={cn("bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20", errors.closeRelationMobile && "border-red-500")} />
                                            {errors.closeRelationMobile && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">{errors.closeRelationMobile}</span>}
                                        </div>
                                    </div>
                                )}
                                {customerType === 'corporate' && (
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label htmlFor="contactPersonName" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Contact Person Name *</Label>
                                            <Input id="contactPersonName" value={formData.contactPersonName} onChange={handleInputChange} className={cn("bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20", errors.contactPersonName && "border-red-500")} />
                                            {errors.contactPersonName && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">{errors.contactPersonName}</span>}
                                        </div>
                                        <div className="space-y-3">
                                            <Label htmlFor="contactPersonMobile" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Contact Person Mobile *</Label>
                                            <Input id="contactPersonMobile" value={formData.contactPersonMobile} onChange={handleInputChange} className={cn("bg-secondary/30 border-border rounded-xl h-12 focus:ring-primary/20", errors.contactPersonMobile && "border-red-500")} />
                                            {errors.contactPersonMobile && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">{errors.contactPersonMobile}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentStep === 4 && (
                            <div className="space-y-8 max-w-4xl mx-auto py-4">
                                <h3 className="text-2xl font-black text-foreground tracking-tight mb-8">Upload Documents</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {customerType === 'local' && (errors.doc1 || errors.doc2 || errors.drivingLicenseFront || errors.drivingLicenseBack) && (
                                        <div className="col-span-2 rounded-2xl border border-red-500/40 bg-red-500/5 p-4 space-y-1 mb-2">
                                            {[errors.doc1, errors.doc2, errors.drivingLicenseFront, errors.drivingLicenseBack].filter(Boolean).map((msg, idx) => (
                                                <p key={`${msg}-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-red-500">{msg}</p>
                                            ))}
                                        </div>
                                    )}
                                    <ImageUploadPreview
                                        id="utilityBill"
                                        label={customerType === 'local' ? 'Utility Bill / Visa (optional)' : 'Utility Bill / Visa'}
                                        file={files.utilityBill}
                                        onChange={(e) => handleFileChange(e, 'utilityBill')}
                                        onView={handleViewImage}
                                        onRemove={() => handleFileRemove('utilityBill')}
                                        required={customerType !== 'local'}
                                    />
                                    {customerType === 'foreign' && (
                                        <>
                                            <ImageUploadPreview
                                                id="passport"
                                                label="Passport"
                                                file={files.passport}
                                                onChange={(e) => handleFileChange(e, 'passport')}
                                                onView={handleViewImage}
                                                onRemove={() => handleFileRemove('passport')}
                                                required
                                            />
                                            <ImageUploadPreview
                                                id="intlDrivingLicenseFront"
                                                label="Intl. Driving License (Front)"
                                                file={files.intlDrivingLicenseFront}
                                                onChange={(e) => handleFileChange(e, 'intlDrivingLicenseFront')}
                                                onView={handleViewImage}
                                                onRemove={() => handleFileRemove('intlDrivingLicenseFront')}
                                                required
                                            />
                                            <ImageUploadPreview
                                                id="intlDrivingLicenseBack"
                                                label="Intl. Driving License (Back)"
                                                file={files.intlDrivingLicenseBack}
                                                onChange={(e) => handleFileChange(e, 'intlDrivingLicenseBack')}
                                                onView={handleViewImage}
                                                onRemove={() => handleFileRemove('intlDrivingLicenseBack')}
                                                required
                                            />
                                            <ImageUploadPreview
                                                id="aaPermit"
                                                label="Automobile Association Permit (Optional)"
                                                file={files.aaPermit}
                                                onChange={(e) => handleFileChange(e, 'aaPermit')}
                                                onView={handleViewImage}
                                                onRemove={() => handleFileRemove('aaPermit')}
                                                required={false}
                                            />
                                        </>
                                    )}
                                    {customerType === 'corporate' && (
                                        <ImageUploadPreview
                                            id="brDoc"
                                            label="BR (Business Registration)"
                                            file={files.brDoc}
                                            onChange={(e) => handleFileChange(e, 'brDoc')}
                                            onView={handleViewImage}
                                            onRemove={() => handleFileRemove('brDoc')}
                                            required
                                        />
                                    )}

                                    <ImageUploadPreview
                                        id="doc1"
                                        label={customerType === 'local' ? 'NIC Front' : 'NIC Front (optional)'}
                                        file={files.doc1}
                                        onChange={(e) => handleFileChange(e, 'doc1')}
                                        onView={handleViewImage}
                                        onRemove={() => handleFileRemove('doc1')}
                                        required={customerType === 'local'}
                                    />
                                    <ImageUploadPreview
                                        id="doc2"
                                        label={customerType === 'local' ? 'NIC Back' : 'NIC Back (optional)'}
                                        file={files.doc2}
                                        onChange={(e) => handleFileChange(e, 'doc2')}
                                        onView={handleViewImage}
                                        onRemove={() => handleFileRemove('doc2')}
                                        required={customerType === 'local'}
                                    />
                                    {customerType === 'local' && (
                                        <>
                                            <ImageUploadPreview
                                                id="drivingLicenseFront"
                                                label="Driving License (Front)"
                                                file={files.drivingLicenseFront}
                                                onChange={(e) => handleFileChange(e, 'drivingLicenseFront')}
                                                onView={handleViewImage}
                                                onRemove={() => handleFileRemove('drivingLicenseFront')}
                                                required
                                            />
                                            <ImageUploadPreview
                                                id="drivingLicenseBack"
                                                label="Driving License (Back)"
                                                file={files.drivingLicenseBack}
                                                onChange={(e) => handleFileChange(e, 'drivingLicenseBack')}
                                                onView={handleViewImage}
                                                onRemove={() => handleFileRemove('drivingLicenseBack')}
                                                required
                                            />
                                        </>
                                    )}
                                    <ImageUploadPreview
                                        id="otherDoc"
                                        label="Other Document"
                                        file={files.otherDoc}
                                        onChange={(e) => handleFileChange(e, 'otherDoc')}
                                        onView={handleViewImage}
                                        onRemove={() => handleFileRemove('otherDoc')}
                                        required={false}
                                    />
                                    {customerType === 'corporate' && (
                                        <ImageUploadPreview
                                            id="corporateOtherDoc"
                                            label="Other Doc (optional)"
                                            file={files.corporateOtherDoc}
                                            onChange={(e) => handleFileChange(e, 'corporateOtherDoc')}
                                            onView={handleViewImage}
                                            onRemove={() => handleFileRemove('corporateOtherDoc')}
                                            required={false}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {currentStep === 5 && (
                            <div className="space-y-10 max-w-2xl mx-auto text-center py-10">
                                <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-500/10">
                                    <CheckCircle className="w-12 h-12" />
                                </div>
                                <h3 className="text-4xl font-black text-foreground tracking-tight mb-4">Ready to Submit?</h3>
                                <p className="text-muted-foreground font-medium text-lg leading-relaxed">
                                    You have completed all the steps. Please review your information before submitting.
                                </p>

                                <div className="bg-secondary/30 p-10 rounded-[2.5rem] border border-border text-left space-y-4 shadow-xl mt-10">
                                    <div className="flex justify-between items-center"><span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Name</span> <span className="text-lg font-black text-foreground">{formData.name || formData.companyName}</span></div>
                                    {customerType === 'local' && String(formData.drivingLicenseNo || '').trim() ? (
                                        <div className="flex justify-between items-center"><span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Driving License No.</span> <span className="text-lg font-black text-foreground">{formData.drivingLicenseNo.trim()}</span></div>
                                    ) : null}
                                    <div className="flex justify-between items-center"><span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Email</span> <span className="text-lg font-black text-foreground">{formData.email?.trim() || '—'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mobile</span> <span className="text-lg font-black text-foreground">{formData.mobile}</span></div>
                                    {formData.description?.trim() ? (
                                        <div className="pt-2 border-t border-border/60">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Description</span>
                                            <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{formData.description.trim()}</p>
                                        </div>
                                    ) : null}
                                    <div className="flex justify-between items-center"><span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Registration</span> <span className="text-xs font-black px-4 py-2 bg-primary/10 text-primary rounded-full uppercase tracking-widest">{customerType}</span></div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-border bg-card/50 backdrop-blur-xl flex justify-between items-center">
                <Button
                    variant="ghost"
                    onClick={currentStep === 0 ? () => onOpenChange(false) : prevStep}
                    className="text-muted-foreground hover:text-foreground font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl hover:bg-secondary/50"
                >
                    {currentStep === 0 ? 'Cancel' : 'Previous Step'}
                </Button>

                {currentStep < steps.length - 1 ? (
                    <Button onClick={nextStep} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20">
                        Next Step <ChevronRight className="w-4 h-4" />
                    </Button>
                ) : (
                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            disabled={submitting}
                            onClick={() => handleFinalSubmit('DRAFT')}
                            className="border-border hover:bg-secondary/50 text-muted-foreground font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl transition-all"
                        >
                            {submitting ? 'Saving...' : 'Save Draft'}
                        </Button>
                        <Button
                            disabled={submitting}
                            onClick={() => handleFinalSubmit('SUBMIT')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                        >
                            {submitting ? 'Submitting...' : 'Confirm Registration'} <CheckCircle className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Image Preview Modal */}
            <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
                <DialogContent className="max-w-4xl bg-card border-border rounded-[2.5rem] shadow-2xl p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-foreground tracking-tight">Document Preview</DialogTitle>
                        <DialogDescription className="font-black uppercase tracking-widest text-[10px] text-muted-foreground mt-1">
                            Full-size document preview
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative bg-secondary/30 rounded-[2rem] p-6 min-h-[400px] flex items-center justify-center border border-border mt-6">
                        {previewImage && (
                            <>
                                {previewImage.toLowerCase().includes('.pdf') ||
                                    (files && Object.values(files).find(f => f && f.type === 'application/pdf' && URL.createObjectURL(f) === previewImage)) ? (
                                    <iframe
                                        src={previewImage}
                                        className="w-full h-[60vh] rounded-2xl border border-border"
                                        title="PDF Preview"
                                    />
                                ) : (
                                    <img
                                        src={previewImage}
                                        alt="Document Preview"
                                        className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl"
                                    />
                                )}
                            </>
                        )}
                    </div>
                    <DialogFooter className="gap-4 mt-8">
                        <Button
                            variant="outline"
                            onClick={() => setShowPreviewModal(false)}
                            className="border-border text-muted-foreground hover:bg-secondary/50 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl"
                        >
                            Close
                        </Button>
                        <Button
                            onClick={handleDownloadImage}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl gap-3 shadow-lg shadow-primary/20"
                        >
                            <Download className="w-4 h-4" />
                            Download Document
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DialogContent>
    );
};

export default CustomerWizard;
