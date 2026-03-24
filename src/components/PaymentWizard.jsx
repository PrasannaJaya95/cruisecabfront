import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar, CreditCard, User, Car, CheckCircle2, ChevronRight, ChevronLeft, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const PaymentWizard = ({ open, onOpenChange, vehicles, customers, onSubmit, loading }) => {
    const [step, setStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        bookingId: '', // If existing
        vehicleId: '', // If new
        amount: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'), // Next day default
        date: new Date().toISOString().split('T')[0],
        method: 'CASH',
        status: 'PAID'
    });

    // Selection state
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showAllVehicles, setShowAllVehicles] = useState(false);

    // Reset state when closing
    useEffect(() => {
        if (!open) {
            setStep(1);
            setSearchQuery('');
            setFormData({
                bookingId: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                method: 'CASH',
                status: 'PAID'
            });
            setSelectedCustomer(null);
            setSelectedBooking(null);
            setShowAllVehicles(false);
        }
    }, [open]);



    // Filter customers for Step 1
    const filteredCustomers = useMemo(() => {
        return customers.filter(customer =>
            customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [customers, searchQuery]);

    // Check if a vehicle is available for the selected dates
    const isVehicleAvailable = (vehicle, start, end) => {
        if (!vehicle.bookings || vehicle.bookings.length === 0) return true;

        const startDate = new Date(start);
        const endDate = new Date(end);

        return !vehicle.bookings.some(booking => {
            if (booking.status === 'CANCELLED') return false;

            const bookingStart = new Date(booking.startDate);
            const bookingEnd = new Date(booking.endDate);

            // Check overlap
            return (startDate <= bookingEnd && endDate >= bookingStart);
        });
    };

    // Filter vehicles for Step 2
    const filteredVehicles = useMemo(() => {
        if (!selectedCustomer && !showAllVehicles) return [];

        return vehicles.filter(v => {
            const licensePlate = v.licensePlate?.toLowerCase() || '';
            const modelName = v.vehicleModel?.name?.toLowerCase() || '';
            const search = searchQuery.toLowerCase();

            const matchesSearch = licensePlate.includes(search) || modelName.includes(search);

            if (showAllVehicles) {
                // Check availability if enabled
                const isAvailable = !v.bookings?.some(b => {
                    if (b.status === 'CANCELLED') return false;
                    const bookStart = new Date(b.startDate);
                    const bookEnd = new Date(b.endDate);
                    const reqStart = new Date(formData.startDate);
                    const reqEnd = new Date(formData.endDate);
                    return reqStart <= bookEnd && reqEnd >= bookStart;
                });
                return matchesSearch && isAvailable;
            }

            // If checking specific customer context, check if vehicle has active booking from this customer
            const hasBooking = v.bookings?.some(b => b.userId === selectedCustomer.id && b.status !== 'CANCELLED');
            return hasBooking && matchesSearch;
        });
    }, [vehicles, selectedCustomer, searchQuery, showAllVehicles, formData.startDate, formData.endDate]);

    const handleCustomerSelect = (customer) => {
        setSelectedCustomer(customer);
        setSearchQuery(''); // Reset search for next step
        setShowAllVehicles(false); // Reset toggle
        setStep(2);
    };

    const handleVehicleSelect = (vehicle) => {
        // Check for active booking for selected customer
        const activeBooking = vehicle.bookings?.find(b => b.userId === selectedCustomer?.id && b.status !== 'CANCELLED');

        setSelectedBooking(activeBooking || null); // Context for UI: If null, it's a new booking

        // If we selected a vehicle via "Show All" and it HAS a booking from another user, 
        // maybe we should switch customer?
        // User asked: "if selected customer havn't any booking i want to select vehicle".
        // Implies we stay with Selected Customer and creating a NEW booking for them on this vehicle.
        // So we do NOT switch customer unless the user explicitly wants to pay for THAT (existing) booking.
        // But if it's "Show All", it might list vehicles booked by OTHERS.

        // Let's assume: If user selects a vehicle, and it has NO booking for CURRENT customer, we treat as NEW booking/Advance.

        setFormData(prev => ({
            ...prev,
            vehicleId: vehicle.id,
            bookingId: activeBooking ? activeBooking.id : '', // Set if exists
            // Reset dates if new
            startDate: activeBooking ? format(new Date(activeBooking.startDate), 'yyyy-MM-dd') : prev.startDate,
            endDate: activeBooking ? format(new Date(activeBooking.endDate), 'yyyy-MM-dd') : prev.endDate,
        }));
    };

    const handleNext = () => {
        if (step === 2 && (!formData.bookingId && !formData.vehicleId)) return;
        if (step === 3 && (!formData.amount || !formData.date)) return;
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (step === 2) {
            setSelectedCustomer(null);
            setSearchQuery('');
        }
        setStep(prev => prev - 1);
    };

    const handleSubmit = () => {
        // Include userId for new bookings
        onSubmit({
            ...formData,
            userId: selectedCustomer?.id
        });
    };

    const handleStepClick = (stepIndex) => {
        const targetStep = stepIndex + 1;
        if (targetStep === step) return;

        // Validation logic for skipping forward
        if (targetStep > step) {
            if (step === 1 && !selectedCustomer) return;
            if (step === 2 && (!selectedBooking && !formData.vehicleId)) return;
            // Can't skip to 4 without 3 details
            if (targetStep === 4 && (!formData.amount || !formData.date)) return;
        }

        // Simpler validation: Can we go to targetStep? (for skipping backwards or slightly forwards)
        const canGoTo2 = selectedCustomer !== null;
        const canGoTo3 = canGoTo2 && (selectedBooking !== null || formData.vehicleId);
        const canGoTo4 = canGoTo3 && formData.amount && formData.date;

        if (targetStep > step) {
            // Forward check
            if (targetStep === 2 && canGoTo2) setStep(2);
            if (targetStep === 3 && canGoTo3) setStep(3);
            if (targetStep === 4 && canGoTo4) setStep(4);
        } else {
            // Backward is always allowed if we are past it? 
            // Actually we should allow backward navigation freely as long as current state allows re-entry?
            // Or simpler: Just setStep(targetStep) if we are going back. 
            // We can always go back to 1.
            setStep(targetStep);
        }
    };



    const STEPS = ['Select Customer', 'Select Vehicle', 'Payment Details', 'Review'];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-slate-950 border-slate-800 text-slate-100 p-0 overflow-hidden gap-0">
                {/* Header with Progress */}
                <div className="bg-slate-900/50 p-6 border-b border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                            New Payment
                        </DialogTitle>
                    </DialogHeader>

                    {/* Progress Steps */}
                    <div className="flex items-center mt-6 relative">
                        {/* Progress Bar Background */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10" />
                        {/* Progress Bar Active */}
                        <div
                            className="absolute top-1/2 left-0 h-1 bg-indigo-500 transition-all duration-300 -z-10"
                            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
                        />

                        {STEPS.map((label, idx) => {
                            const num = idx + 1;
                            const isActive = step >= num;
                            const isCurrent = step === num;

                            // Check if clickable
                            const canClick = num < step || (
                                (num === 2 && selectedCustomer) ||
                                (num === 3 && selectedBooking) ||
                                (num === 4 && selectedBooking && formData.amount && formData.date)
                            );

                            return (
                                <div
                                    key={num}
                                    className={cn(
                                        "flex-1 flex flex-col items-center gap-2 relative z-10",
                                        canClick ? "cursor-pointer group" : "opacity-70 cursor-not-allowed"
                                    )}
                                    onClick={() => canClick && handleStepClick(idx)}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 bg-slate-950",
                                        isActive ? "border-indigo-500 text-indigo-500" : "border-slate-700 text-slate-600",
                                        isCurrent && "bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.5)]",
                                        canClick && !isActive && "group-hover:border-indigo-400/50"
                                    )}>
                                        {isActive ? <CheckCircle2 className="w-4 h-4" /> : num}
                                    </div>
                                    <span className={cn(
                                        "text-xs font-medium transition-colors hidden sm:block",
                                        isActive ? "text-indigo-400" : "text-slate-600",
                                        canClick && "group-hover:text-indigo-300"
                                    )}>
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-4 h-full flex flex-col"
                            >
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search customer by name..."
                                        className="pl-10 bg-slate-900 border-slate-700"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className="flex-1 h-[300px] pr-4 overflow-y-auto">
                                    <div className="space-y-2">
                                        {filteredCustomers.length === 0 ? (
                                            <div className="text-center py-10 text-slate-500">
                                                No customers found.
                                            </div>
                                        ) : (
                                            filteredCustomers.map(customer => (
                                                <div
                                                    key={customer.id}
                                                    onClick={() => handleCustomerSelect(customer)}
                                                    className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 cursor-pointer transition-all group flex justify-between items-center"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                                            <User className="w-5 h-5 text-indigo-400" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-slate-200">{customer.name}</div>
                                                            <div className="text-sm text-slate-400">{customer.email}</div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-4 h-full flex flex-col"
                            >
                                <div className="flex items-center gap-2 text-sm text-slate-400 pb-2 border-b border-slate-800/50">
                                    <span className="text-slate-500">Selected Customer:</span>
                                    <span className="font-medium text-indigo-400">{selectedCustomer?.name}</span>
                                    <div className="ml-auto flex items-center gap-4">
                                        {/* Advance Payment Toggle */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="advancePay"
                                                className="accent-indigo-500 w-4 h-4 cursor-pointer"
                                                checked={showAllVehicles}
                                                onChange={(e) => setShowAllVehicles(e.target.checked)}
                                            />
                                            <Label htmlFor="advancePay" className="text-xs cursor-pointer select-none font-medium text-amber-500">
                                                Advance Payment / Show All
                                            </Label>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Date Range - Only for Show All / Advance */}
                                    <AnimatePresence>
                                        {showAllVehicles && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="grid grid-cols-2 gap-4 p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20"
                                            >
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-indigo-300">Start Date</Label>
                                                    <Input
                                                        type="date"
                                                        className="bg-slate-900 border-slate-700 h-9"
                                                        value={formData.startDate}
                                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-indigo-300">End Date</Label>
                                                    <Input
                                                        type="date"
                                                        className="bg-slate-900 border-slate-700 h-9"
                                                        value={formData.endDate}
                                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                                    />
                                                </div>
                                                <div className="col-span-2 text-xs text-center text-indigo-400">
                                                    <span className="opacity-70">Showing available vehicles for selected dates</span>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Search vehicle..."
                                            className="pl-10 bg-slate-900 border-slate-700"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 h-[250px] pr-4 overflow-y-auto">
                                    <div className="space-y-2">
                                        {filteredVehicles.length === 0 ? (
                                            <div className="text-center py-10 text-slate-500 flex flex-col items-center gap-3">
                                                <p>
                                                    {showAllVehicles
                                                        ? "No vehicles found matching your search."
                                                        : "No active vehicles found for this customer."}
                                                </p>
                                                {!showAllVehicles && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShowAllVehicles(true)}
                                                        className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
                                                    >
                                                        View All Vehicles
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            filteredVehicles.map(vehicle => {
                                                const activeBooking = vehicle.bookings?.find(b => b.userId === selectedCustomer?.id && b.status !== 'CANCELLED');
                                                const isSelected = formData.vehicleId === vehicle.id;

                                                return (
                                                    <div
                                                        key={vehicle.id}
                                                        onClick={() => handleVehicleSelect(vehicle)}
                                                        className={cn(
                                                            "p-4 rounded-xl border cursor-pointer hover:bg-slate-800/50 transition-all group",
                                                            isSelected
                                                                ? "bg-indigo-500/10 border-indigo-500/50 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]"
                                                                : "bg-slate-900/50 border-slate-800"
                                                        )}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 font-medium text-slate-200">
                                                                    <Car className="w-4 h-4 text-indigo-400" />
                                                                    {vehicle.vehicleModel.brand.name} {vehicle.vehicleModel.name}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-sm text-slate-400 ml-6">
                                                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-xs font-mono border border-slate-700">
                                                                        {vehicle.licensePlate}
                                                                    </span>
                                                                    {activeBooking && activeBooking.payments && activeBooking.payments.map((p, pIdx) => (
                                                                        <span key={pIdx} className={cn(
                                                                            "px-1.5 py-0.5 rounded text-xs font-bold border",
                                                                            p.status === 'PAID' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/50" :
                                                                                p.status === 'PENDING' ? "bg-amber-500/10 text-amber-400 border-amber-500/50" :
                                                                                    "bg-red-500/10 text-red-400 border-red-500/50"
                                                                        )}>
                                                                            {p.status}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                {activeBooking ? (
                                                                    <div className="flex items-center gap-2 text-xs text-emerald-500/80 ml-6 pt-1">
                                                                        <Calendar className="w-3 h-3" />
                                                                        {format(new Date(activeBooking.startDate), 'MMM dd')} - {format(new Date(activeBooking.endDate), 'MMM dd, yyyy')}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 text-xs text-amber-500/80 ml-6 pt-1">
                                                                        <Flag className="w-3 h-3" />
                                                                        <span>New Booking</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className={cn(
                                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                                                isSelected ? "border-indigo-500 bg-indigo-500" : "border-slate-600"
                                                            )}>
                                                                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >

                                <div className="space-y-6">
                                    {/* New Booking Dates Section - Only show if NO existing booking */}
                                    {!formData.bookingId && (
                                        <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 space-y-4">
                                            <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                                <Flag className="w-4 h-4" />
                                                <span className="text-sm font-medium">New Booking / Advance</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Start Date</Label>
                                                    <Input
                                                        type="date"
                                                        className="bg-slate-900 border-slate-700"
                                                        value={formData.startDate}
                                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>End Date</Label>
                                                    <Input
                                                        type="date"
                                                        className="bg-slate-900 border-slate-700"
                                                        value={formData.endDate}
                                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label>Payment Amount</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="pl-8 bg-slate-900 border-slate-700 text-lg font-medium"
                                                    value={formData.amount}
                                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Payment Date</Label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    type="date"
                                                    className="pl-10 bg-slate-900 border-slate-700"
                                                    value={formData.date}
                                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Method</Label>
                                            <Select
                                                value={formData.method}
                                                onValueChange={v => setFormData({ ...formData, method: v })}
                                            >
                                                <SelectTrigger className="bg-slate-900 border-slate-700">
                                                    <CreditCard className="w-4 h-4 mr-2 text-slate-400" />
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                                    <SelectItem value="CASH">Cash</SelectItem>
                                                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                                                    <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2 col-span-2">
                                            <Label>Status</Label>
                                            <Select
                                                value={formData.status}
                                                onValueChange={v => setFormData({ ...formData, status: v })}
                                            >
                                                <SelectTrigger className="bg-slate-900 border-slate-700">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                                    <SelectItem value="PAID">Paid</SelectItem>
                                                    <SelectItem value="PENDING">Pending</SelectItem>
                                                    <SelectItem value="FAILED">Failed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                                    <div className="p-4 bg-slate-900 border-b border-slate-800">
                                        <h3 className="font-semibold text-slate-300">Payment Summary</h3>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                                            <span className="text-slate-400">Customer</span>
                                            <span className="font-medium text-slate-200">{selectedCustomer?.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                                            <span className="text-slate-400">Vehicle</span>
                                            <span className="font-medium text-slate-200 flex items-center gap-2">
                                                {selectedBooking?.vehicle?.vehicleModel?.name}
                                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-xs font-mono border border-slate-700">
                                                    {selectedBooking?.vehicle?.licensePlate}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                                            <span className="text-slate-400">Date</span>
                                            <span className="font-medium text-slate-200">{format(new Date(formData.date), 'MMMM dd, yyyy')}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                                            <span className="text-slate-400">Method</span>
                                            <span className="font-medium text-slate-200 capitalize">{formData.method.replace('_', ' ').toLowerCase()}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-slate-400">Total Amount</span>
                                            <span className="text-xl font-bold text-emerald-400">${parseFloat(formData.amount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <DialogFooter className="p-6 bg-slate-900/50 border-t border-slate-800">
                    <div className="flex w-full justify-between">
                        {step > 1 ? (
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                className="border-slate-700 hover:bg-slate-800 text-slate-300"
                            >
                                <ChevronLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="hover:bg-slate-800 text-slate-400 hover:text-slate-300"
                            >
                                Cancel
                            </Button>
                        )}

                        {step < 4 ? (
                            <Button
                                onClick={handleNext}
                                disabled={
                                    (step === 1 && !selectedCustomer) ||
                                    (step === 2 && (!selectedBooking && !formData.vehicleId))
                                }
                                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]"
                            >
                                Next <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                            >
                                {loading ? 'Processing...' : 'Confirm Payment'}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PaymentWizard;
