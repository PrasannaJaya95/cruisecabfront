import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
    Car, Calendar as CalendarIcon, User, Mail, Phone, MapPin,
    CreditCard, Landmark, Upload, CheckCircle2, AlertCircle,
    ArrowLeft, ChevronRight, Info, ShieldCheck, Wallet, Coins
} from 'lucide-react';
import { format, addDays, differenceInDays } from "date-fns";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import api, { resolveServerUrl } from '@/lib/api';
import { useAuth } from '../../context/AuthContext';
import { Checkbox } from "@/components/ui/checkbox";
import axios from 'axios';

const Checkout = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Booking State
    const defaultDate = {
        from: new Date(),
        to: addDays(new Date(), 3),
    };

    const [date, setDate] = useState(() => {
        if (location.state?.date?.from && location.state?.date?.to) {
            return location.state.date;
        }
        return defaultDate;
    });

    const [customerData, setCustomerData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: '',
        address: ''
    });

    const [paymentMethod, setPaymentMethod] = useState('TRANSFER'); // GATEWAY, TRANSFER, LOYALTY
    const [selectedGateway, setSelectedGateway] = useState(null);
    const [availableGateways, setAvailableGateways] = useState([]);
    const [paymentCriteria, setPaymentCriteria] = useState('FULL'); // FULL, DEPOSIT, CUSTOM

    // Added Missing States
    const [clientId, setClientId] = useState(null);
    const [clientLoyaltyPoints, setClientLoyaltyPoints] = useState(0);
    const [pointsToRedeem, setPointsToRedeem] = useState(0);
    const [customAmount, setCustomAmount] = useState('');
    const [paymentSlip, setPaymentSlip] = useState(null);
    const [slipPreview, setSlipPreview] = useState(null);
    const [policyAccepted, setPolicyAccepted] = useState(false);
    const [password, setPassword] = useState('');

    useEffect(() => {
        const fetchVehicleAndClient = async () => {
            try {
                const { data } = await api.get(`/vehicles/${id}`);
                setVehicle(data);

                if (user) {
                    const { data: clients } = await api.get('/clients');
                    const myClient = clients.find(c => c.userId === user.id || c.email === user.email);
                    if (myClient) {
                        setClientId(myClient.id);
                        setClientLoyaltyPoints(myClient.loyaltyPoints || 0);
                        setCustomerData(prev => ({
                            ...prev,
                            phone: myClient.phone || prev.phone,
                            address: myClient.address || prev.address
                        }));
                    }
                }

                // Fetch Payment Gateways
                const gatewayKeys = ['payhere', 'webexpay', 'onepay', 'directpay', 'genie', 'koko', 'mintpay'];
                const gatewayPromises = gatewayKeys.map(key => api.get(`/settings/payment_gateway_${key}`).catch(() => ({ data: { value: 'false' } })));
                const gatewayResponses = await Promise.all(gatewayPromises);

                const activeGateways = [];
                gatewayResponses.forEach((res, index) => {
                    if (res.data.value && res.data.value !== 'false') {
                        try {
                            const settings = JSON.parse(res.data.value);
                            if (settings.enabled) {
                                activeGateways.push({
                                    id: gatewayKeys[index],
                                    name: gatewayKeys[index].charAt(0).toUpperCase() + gatewayKeys[index].slice(1),
                                    settings
                                });
                            }
                        } catch (e) {
                            console.error("Failed to parse gateway settings", e);
                        }
                    }
                });

                setAvailableGateways(activeGateways);
                if (activeGateways.length > 0) {
                    setPaymentMethod('GATEWAY');
                    setSelectedGateway(activeGateways[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchVehicleAndClient();
    }, [id, user]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setCustomerData(prev => ({ ...prev, [id]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPaymentSlip(file);
            setSlipPreview(URL.createObjectURL(file));
        }
    };

    const calculateTotal = (criteria = paymentCriteria) => {
        if (!vehicle || !date?.from || !date?.to) return 0;
        const days = differenceInDays(date.to, date.from) || 1;
        const subtotal = (vehicle.dailyRentalRate || 0) * days;
        const fee = criteria === 'FULL' ? 0 : (vehicle.bookingFee || 0);
        return subtotal + fee;
    };

    const handleCheckout = async () => {
        if (!date.from || !date.to) return alert("Please select dates");
        if (!customerData.phone || !customerData.address) return alert("Please fill in all contact details");
        if (!policyAccepted) return alert("Please accept the Privacy Policy and Terms & Conditions");
        if (paymentMethod === 'TRANSFER' && !paymentSlip) return alert("Please upload your payment slip");

        const bookingFee = vehicle.bookingFee || 0;
        const totalAmount = calculateTotal(paymentCriteria);
        const discountFromPoints = pointsToRedeem;
        const finalTotal = totalAmount - discountFromPoints;

        let paidAmountNow = 0;
        if (paymentCriteria === 'FULL') paidAmountNow = finalTotal;
        else if (paymentCriteria === 'DEPOSIT') paidAmountNow = vehicle.bookingFee || 0;
        else if (paymentCriteria === 'CUSTOM') {
            paidAmountNow = parseFloat(customAmount);
            if (isNaN(paidAmountNow) || paidAmountNow < bookingFee) {
                return alert(`Custom amount must be at least Rs. ${bookingFee}`);
            }
            if (paidAmountNow > finalTotal) {
                return alert(`Custom amount cannot exceed Rs. ${finalTotal}`);
            }
        }

        setSubmitting(true);
        try {
            // 2. Unified Checkout
            const bookingPayload = {
                vehicleId: id,
                startDate: date.from,
                endDate: date.to,
                totalAmount: finalTotal,
                paidAmount: paidAmountNow,
                paymentMethod,
                customerInfo: customerData,
                password: !user ? password : null
            };

            const { data } = await api.post('/bookings', bookingPayload);
            const bookingId = data.booking.id;

            navigate('/thank-you', { state: { booking: data } });
        } catch (error) {
            console.error("Checkout Failed:", error);
            const msg = error.response?.data?.message || error.response?.data?.error || error.message || "Checkout failed. Please try again.";
            alert(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !vehicle) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-[2rem] animate-spin mb-6 shadow-2xl shadow-primary/20"></div>
            <p className="text-muted-foreground font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Initializing your journey / Rentix</p>
        </div>
    );



    const days = date?.from && date?.to ? differenceInDays(date.to, date.from) : 1;
    const total = calculateTotal();

    return (
        <div className="min-h-screen bg-background pt-32 pb-20 px-6 lg:px-12 font-sans selection:bg-primary/30 transition-colors duration-300">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-bold px-4 py-2 bg-card rounded-full shadow-sm border border-border">
                        <ArrowLeft className="w-4 h-4" /> Back to Vehicle
                    </button>
                    <div className="text-right hidden sm:block">
                        <h1 className="text-3xl font-black text-foreground tracking-tight">Secure Checkout</h1>
                        <p className="text-muted-foreground font-medium">Complete your reservation in minutes</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                    {/* Left Side: Forms */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* 1. Date Selection */}
                        <section className="bg-card rounded-[2.5rem] p-8 md:p-10 border border-border shadow-xl shadow-primary/5">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold text-xl">1</div>
                                <div>
                                    <h2 className="text-2xl font-black text-foreground">Rental Period</h2>
                                    <p className="text-muted-foreground text-sm font-medium">Choose when you'll be driving</p>
                                </div>
                            </div>

                            <div className="grid gap-6">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-black border-border bg-card/50 hover:bg-secondary hover:text-foreground py-10 rounded-[2rem] px-8 transition-all border-2 focus-visible:ring-primary shadow-lg shadow-primary/5",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-6 h-8 w-8 text-primary" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Pick-up & Drop-off</span>
                                                <span className="text-xl tracking-tight text-foreground">
                                                    {date?.from ? (
                                                        date.to ? (
                                                            <>{format(date.from, "PPP")} — {format(date.to, "PPP")}</>
                                                        ) : (
                                                            format(date.from, "PPP")
                                                        )
                                                    ) : (
                                                        <span>Select your journey dates</span>
                                                    )}
                                                </span>
                                            </div>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-card border-border shadow-2xl rounded-[2rem] overflow-hidden" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={date?.from}
                                            selected={date}
                                            onSelect={(newDateRange) => {
                                                if (!newDateRange) {
                                                    setDate(undefined);
                                                    return;
                                                }
                                                // If we already have a full range, and the user clicks a new date,
                                                // react-day-picker range mode behavior can be confusing.
                                                // Let's force reset to the new start date.
                                                if (date?.from && date?.to && newDateRange.from && !newDateRange.to) {
                                                    setDate({ from: newDateRange.from, to: undefined });
                                                } else {
                                                    setDate(newDateRange);
                                                }
                                            }}
                                            numberOfMonths={2}
                                            className="text-foreground font-black"
                                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                        />
                                    </PopoverContent>
                                </Popover>

                                <div className="flex items-center gap-4 p-5 bg-primary/10 rounded-2xl border border-primary/20 text-primary text-xs font-black uppercase tracking-widest">
                                    <Info className="w-5 h-5 shrink-0" />
                                    <span>Total duration: {days} day{days > 1 ? 's' : ''}</span>
                                </div>
                            </div>
                        </section>

                        {/* 2. Customer Info */}
                        <section className="bg-card rounded-[2.5rem] p-8 md:p-10 border border-border shadow-xl shadow-primary/5">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold text-xl">2</div>
                                <div>
                                    <h2 className="text-2xl font-black text-foreground">Your Information</h2>
                                    <p className="text-muted-foreground text-sm font-medium">Where we can contact you</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <Label className="text-muted-foreground font-black uppercase tracking-widest text-[10px] ml-1">Full Name</Label>
                                    <Input id="name" value={customerData.name} onChange={handleInputChange} className="h-14 rounded-2xl border-border bg-secondary/30 px-6 font-black tracking-tight text-foreground focus:bg-card transition-all border-2 focus:ring-primary/20" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-muted-foreground font-black uppercase tracking-widest text-[10px] ml-1">Email Address</Label>
                                    <Input id="email" type="email" value={customerData.email} onChange={handleInputChange} className="h-14 rounded-2xl border-border bg-secondary/30 px-6 font-black tracking-tight text-foreground focus:bg-card transition-all border-2 focus:ring-primary/20" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-muted-foreground font-black uppercase tracking-widest text-[10px] ml-1">Mobile Number</Label>
                                    <Input id="phone" value={customerData.phone} onChange={handleInputChange} placeholder="+94 7X XXX XXXX" className="h-14 rounded-2xl border-border bg-secondary/30 px-6 font-black tracking-tight text-foreground focus:bg-card transition-all border-2 focus:ring-primary/20" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-muted-foreground font-black uppercase tracking-widest text-[10px] ml-1">Address</Label>
                                    <Input id="address" value={customerData.address} onChange={handleInputChange} className="h-14 rounded-2xl border-border bg-secondary/30 px-6 font-black tracking-tight text-foreground focus:bg-card transition-all border-2 focus:ring-primary/20" />
                                </div>
                                {!user && (
                                    <div className="space-y-3 md:col-span-2">
                                        <Label className="text-muted-foreground font-black uppercase tracking-widest text-[10px] ml-1">Create Account Password (Optional)</Label>
                                        <Input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter a password to create an account"
                                            className="h-14 rounded-2xl border-border bg-secondary/30 px-6 font-black tracking-tight text-foreground focus:bg-card transition-all border-2 focus:ring-primary/20"
                                        />
                                        <p className="text-[10px] text-muted-foreground ml-1">If provided, we will create a portal account for you.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 2.5 Loyalty Points Redemption */}
                        {user && clientLoyaltyPoints > 0 && (
                            <section className="bg-card rounded-[2.5rem] p-8 md:p-10 border border-border shadow-xl shadow-primary/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8">
                                    <Badge className="bg-primary/20 text-primary border-transparent font-black">
                                        REWARD SYSTEM
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold text-xl">
                                        <Wallet className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-foreground">Loyalty Rewards</h2>
                                        <p className="text-muted-foreground text-sm font-medium">Redeem your available points for a discount</p>
                                    </div>
                                </div>

                                <div className="bg-secondary/30 rounded-3xl p-8 border border-border">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Available Balance</p>
                                            <p className="text-3xl font-black text-primary tracking-tight">{clientLoyaltyPoints.toLocaleString()} Points</p>
                                            <p className="text-xs text-muted-foreground mt-2">1 Point = Rs. 1.00</p>
                                        </div>
                                        <div className="w-full md:w-64 space-y-3">
                                            <Label className="text-muted-foreground font-black uppercase tracking-widest text-[10px] ml-1">Points to Redeem</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={pointsToRedeem}
                                                    onChange={(e) => {
                                                        const val = Math.min(clientLoyaltyPoints, Math.max(0, parseInt(e.target.value) || 0));
                                                        setPointsToRedeem(val);
                                                    }}
                                                    className="h-14 rounded-2xl border-border bg-card px-6 font-black tracking-tight text-foreground border-2 focus:ring-primary/20"
                                                />
                                                <Button
                                                    size="sm"
                                                    className="absolute right-2 top-2 h-10 rounded-xl"
                                                    onClick={() => setPointsToRedeem(clientLoyaltyPoints)}
                                                >
                                                    MAX
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 3. Payment Criteria & Selection */}
                        <section className="bg-card rounded-[2.5rem] p-8 md:p-10 border border-border shadow-xl shadow-primary/5">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold text-xl">3</div>
                                <div>
                                    <h2 className="text-2xl font-black text-foreground">Payment Criteria</h2>
                                    <p className="text-muted-foreground text-sm font-medium">Decide how much to pay today</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                {[
                                    { id: 'FULL', label: 'Full Payment', icon: ShieldCheck, desc: 'Pay entire rental + fee' },
                                    { id: 'DEPOSIT', label: 'Booking Fee', icon: CreditCard, desc: 'Pay only mandatory fee' },
                                    { id: 'CUSTOM', label: 'Custom Amount', icon: Wallet, desc: 'Pay what you want' }
                                ].map((c) => (
                                    <div
                                        key={c.id}
                                        onClick={() => setPaymentCriteria(c.id)}
                                        className={cn(
                                            "p-6 rounded-3xl border-2 transition-all cursor-pointer group",
                                            paymentCriteria === c.id
                                                ? "border-primary bg-primary/5 text-primary"
                                                : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                                        )}
                                    >
                                        <c.icon className={cn("w-6 h-6 mb-3 transition-transform group-hover:scale-110", paymentCriteria === c.id ? "text-primary" : "text-muted-foreground")} />
                                        <h4 className="font-black text-sm tracking-tight mb-1">{c.label}</h4>
                                        <p className="text-[10px] font-medium leading-relaxed opacity-60">{c.desc}</p>
                                    </div>
                                ))}
                            </div>

                            {paymentCriteria === 'CUSTOM' && (
                                <div className="mb-8 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Label className="text-muted-foreground font-black uppercase tracking-widest text-[10px] ml-1">Enter Custom Amount (Min Rs. {(vehicle?.bookingFee || 0).toLocaleString()})</Label>
                                    <Input
                                        type="number"
                                        placeholder={`Minimum Rs. ${vehicle?.bookingFee || 0}`}
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                        className="h-14 rounded-2xl border-border bg-secondary/30 px-6 font-black tracking-tight text-foreground focus:bg-card transition-all border-2 focus:ring-primary/20"
                                    />
                                </div>
                            )}

                            <div className="border-t border-border pt-8 mt-8">
                                <h4 className="text-sm font-black text-foreground mb-4 uppercase tracking-widest">Select Payment Method</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* <h4 className="font-black text-xl tracking-tight text-foreground">Integrated Gateway</h4>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Secure Online Payment</p> */}

                                    {availableGateways.map((gw) => (
                                        <div
                                            key={gw.id}
                                            onClick={() => {
                                                setPaymentMethod('GATEWAY');
                                                setSelectedGateway(gw.id);
                                            }}
                                            className={cn(
                                                "p-8 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col items-center gap-4 text-center group shadow-xl",
                                                (paymentMethod === 'GATEWAY' && selectedGateway === gw.id)
                                                    ? "border-primary bg-primary text-primary-foreground shadow-primary/20 scale-[1.02]"
                                                    : "border-border bg-secondary/30 hover:border-primary/50 text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-1", (paymentMethod === 'GATEWAY' && selectedGateway === gw.id) ? "bg-white/20" : "bg-primary/10")}>
                                                <CreditCard className={cn("w-8 h-8 transition-transform group-hover:scale-110", (paymentMethod === 'GATEWAY' && selectedGateway === gw.id) ? "text-primary-foreground" : "text-primary")} />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-black text-lg tracking-tight uppercase">{gw.name}</h4>
                                                <p className={cn("text-[9px] font-black uppercase tracking-[0.2em]", (paymentMethod === 'GATEWAY' && selectedGateway === gw.id) ? "text-primary-foreground/70" : "text-muted-foreground/50")}>Online Payment</p>
                                            </div>
                                        </div>
                                    ))}

                                    <div
                                        onClick={() => setPaymentMethod('TRANSFER')}
                                        className={cn(
                                            "p-8 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col items-center gap-4 text-center group shadow-xl",
                                            paymentMethod === 'TRANSFER'
                                                ? "border-primary bg-primary text-primary-foreground shadow-primary/20 scale-[1.02]"
                                                : "border-border bg-secondary/30 hover:border-primary/50 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <Landmark className={cn("w-12 h-12 mb-2 transition-transform group-hover:scale-110", paymentMethod === 'TRANSFER' ? "text-primary-foreground" : "text-primary")} />
                                        <div className="space-y-2">
                                            <h4 className="font-black text-xl tracking-tight">Bank Transfer</h4>
                                            <p className={cn("text-[10px] font-black uppercase tracking-widest", paymentMethod === 'TRANSFER' ? "text-primary-foreground/80" : "text-muted-foreground/60")}>Direct Wire / Deposit</p>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setPaymentMethod('LOYALTY')}
                                        className={cn(
                                            "p-8 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col items-center gap-4 text-center group shadow-xl",
                                            paymentMethod === 'LOYALTY'
                                                ? "border-primary bg-primary text-primary-foreground shadow-primary/20 scale-[1.02]"
                                                : (clientLoyaltyPoints < (paymentCriteria === 'FULL' ? (calculateTotal() - pointsToRedeem) : paymentCriteria === 'DEPOSIT' ? (vehicle?.bookingFee || 0) : (parseFloat(customAmount) || 0))
                                                    ? "opacity-50 cursor-not-allowed border-dashed bg-secondary/10"
                                                    : "border-border bg-secondary/30 hover:border-primary/50 text-muted-foreground hover:text-foreground")
                                        )}
                                    >
                                        <Wallet className={cn("w-12 h-12 mb-2 transition-transform group-hover:scale-110", paymentMethod === 'LOYALTY' ? "text-primary-foreground" : "text-primary")} />
                                        <div className="space-y-2">
                                            <h4 className="font-black text-xl tracking-tight">Loyalty Points</h4>
                                            <p className={cn("text-[10px] font-black uppercase tracking-widest", paymentMethod === 'LOYALTY' ? "text-primary-foreground/80" : "text-muted-foreground/60")}>Use your rewards</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {paymentMethod === 'LOYALTY' && (
                            <div className="p-10 rounded-[2.5rem] border-2 border-primary/10 bg-primary/5 flex flex-col items-center text-center animate-in fade-in slide-in-from-top-4 duration-500 shadow-inner mt-8">
                                <div className="w-24 h-24 bg-card rounded-[2rem] shadow-2xl flex items-center justify-center mb-8 border border-border">
                                    <Coins className="w-12 h-12 text-primary" />
                                </div>
                                <h4 className="text-3xl font-black text-foreground tracking-tight mb-4">Pay with Rewards</h4>
                                <p className="text-muted-foreground max-w-sm mb-10 font-medium leading-relaxed italic">
                                    "Your current balance is {clientLoyaltyPoints.toLocaleString()} points. This will be deducted from your account balance."
                                </p>
                            </div>
                        )}

                        {paymentMethod === 'TRANSFER' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="bg-primary/5 dark:bg-foreground rounded-[2.5rem] p-10 text-foreground dark:text-background relative overflow-hidden shadow-2xl border border-primary/10 dark:border-white/10 mt-8">
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-3xl -mr-24 -mt-24"></div>
                                    <h4 className="flex items-center gap-3 text-primary font-black mb-10 text-[10px] uppercase tracking-[0.3em]">
                                        <Landmark className="w-4 h-4" /> Company Bank Details
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-muted-foreground/60 text-[10px] uppercase font-black mb-2 tracking-widest">Bank Name</p>
                                                <p className="font-black text-xl tracking-tight">Commercial Bank PLC</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground/60 text-[10px] uppercase font-black mb-2 tracking-widest">Account Name</p>
                                                <p className="font-black text-xl tracking-tight leading-tight">Rentix Premium Rentals (PVT) LTD</p>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-muted-foreground/60 text-[10px] uppercase font-black mb-2 tracking-widest">Account Number</p>
                                                <p className="font-black text-3xl tracking-tighter text-primary">8010 4422 9300</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground/60 text-[10px] uppercase font-black mb-2 tracking-widest">Branch</p>
                                                <p className="font-black text-xl tracking-tight">Colombo City Office</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-slate-600 font-bold text-lg">Upload Payment Slip</Label>
                                        <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 px-3 py-1 rounded-full text-xs font-bold">Mandatory for Bank Transfers</Badge>
                                    </div>

                                    <div className="relative group/upload h-64">
                                        <input
                                            type="file"
                                            id="slip-upload"
                                            className="hidden"
                                            onChange={handleFileChange}
                                            accept="image/*"
                                        />
                                        <label
                                            htmlFor="slip-upload"
                                            className={cn(
                                                "flex flex-col items-center justify-center w-full h-full border-4 border-dashed rounded-[2rem] cursor-pointer transition-all duration-300 relative overflow-hidden",
                                                slipPreview
                                                    ? "border-emerald-500 bg-emerald-50/10"
                                                    : "border-slate-100 bg-slate-50 hover:border-indigo-400 hover:bg-slate-100"
                                            )}
                                        >
                                            {slipPreview ? (
                                                <>
                                                    <img src={slipPreview} alt="Slip Preview" className="w-full h-full object-cover opacity-80" />
                                                    <div className="absolute inset-0 bg-emerald-900/40 backdrop-blur-sm flex flex-col items-center justify-center text-white opacity-0 group-hover/upload:opacity-100 transition-opacity">
                                                        <CheckCircle2 className="w-12 h-12 mb-4" />
                                                        <span className="font-black text-lg">Click to replace slip</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                                        <Upload className="w-8 h-8 text-indigo-600" />
                                                    </div>
                                                    <span className="text-xl font-black text-slate-900 mb-2">Upload Slip Image</span>
                                                    <span className="text-slate-500 text-sm font-medium">Drag & drop or click to browse</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'GATEWAY' && (
                            <div className="p-10 rounded-[2.5rem] border-2 border-primary/10 bg-primary/5 flex flex-col items-center text-center animate-in fade-in slide-in-from-top-4 duration-500 shadow-inner">
                                <div className="w-24 h-24 bg-card rounded-[2rem] shadow-2xl flex items-center justify-center mb-8 border border-border">
                                    <CreditCard className="w-12 h-12 text-primary" />
                                </div>
                                <h4 className="text-3xl font-black text-foreground tracking-tight mb-4">Instant Confirmation</h4>
                                <p className="text-muted-foreground max-w-sm mb-10 font-medium leading-relaxed italic">
                                    "Pay securely and receive your booking confirmation instantly via email."
                                </p>
                                <div className="flex gap-6 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg" alt="Visa" className="h-6" />
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-10" />
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="Paypal" className="h-8" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Order Summary */}
                    <div className="lg:col-span-1 border-slate-200">
                        <div className="sticky top-28 space-y-8">
                            {/* Summary Card */}
                            <div className="bg-card dark:bg-card border border-border rounded-[2.5rem] p-10 text-foreground shadow-2xl shadow-primary/5 relative overflow-hidden transition-all duration-500">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-primary mb-10">Reservation Summary</h3>

                                <div className="flex items-center gap-6 mb-12">
                                    <div className="w-24 h-24 rounded-3xl overflow-hidden bg-secondary/50 dark:bg-white/10 shrink-0 border border-border dark:border-white/10 transition-colors">
                                        <img
                                            src={resolveServerUrl(vehicle?.imageUrl) || "https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=300"}
                                            className="w-full h-full object-cover"
                                            alt="Vehicle"
                                            decoding="async"
                                        />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black leading-tight mb-2">
                                            {vehicle?.vehicleModel?.brand?.name} <br />
                                            <span className="text-primary">{vehicle?.vehicleModel?.name}</span>
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-primary/10 dark:bg-primary/20 text-primary border-transparent text-[10px] uppercase px-3 font-bold">
                                                {vehicle?.year} Model
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-10 border-t border-border/50 dark:border-border">
                                    <div className="flex justify-between items-center group">
                                        <span className="text-muted-foreground font-bold group-hover:text-foreground transition-colors">Daily Rate (×{days})</span>
                                        <span className="font-bold text-lg">Rs. {((vehicle?.dailyRentalRate || 0) * days).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground font-bold group-hover:text-foreground transition-colors">Booking Fee</span>
                                        </div>
                                        <span className={cn("font-bold text-lg", paymentCriteria === 'FULL' ? "text-muted-foreground line-through opacity-50" : "text-emerald-500")}>
                                            {paymentCriteria === 'FULL' ? (
                                                <Badge variant="outline" className="text-[10px] font-black uppercase text-emerald-500 border-emerald-500/50 bg-emerald-500/10">Waived</Badge>
                                            ) : `Rs. ${(vehicle?.bookingFee || 0).toLocaleString()}`}
                                        </span>
                                    </div>

                                    {pointsToRedeem > 0 && (
                                        <div className="flex justify-between items-center group text-primary animate-in fade-in duration-300">
                                            <span className="font-bold">Loyalty Discount</span>
                                            <span className="font-bold text-lg">- Rs. {pointsToRedeem.toLocaleString()}</span>
                                        </div>
                                    )}

                                    <div className="pt-10 flex flex-col border-t-2 border-dashed border-border transition-all">
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Final Total</span>
                                            <span className="text-2xl font-black text-foreground tracking-tighter">Rs. {(total - pointsToRedeem).toLocaleString()}</span>
                                        </div>

                                        <div className="flex justify-between items-end mb-2 bg-primary/10 p-4 rounded-2xl border border-primary/20">
                                            <span className="text-[10px] uppercase font-black text-primary tracking-wider">Pay Today</span>
                                            <span className="text-4xl font-black text-primary tracking-tighter">
                                                Rs. {(
                                                    paymentCriteria === 'FULL' ? (total - pointsToRedeem) :
                                                        paymentCriteria === 'DEPOSIT' ? (vehicle?.bookingFee || 0) :
                                                            parseFloat(customAmount) || 0
                                                ).toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-end mb-4 px-4">
                                            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Due Amount</span>
                                            <span className="text-xl font-black text-foreground tracking-tighter">
                                                Rs. {Math.max(0, (total - pointsToRedeem) - (
                                                    paymentCriteria === 'FULL' ? (total - pointsToRedeem) :
                                                        paymentCriteria === 'DEPOSIT' ? (vehicle?.bookingFee || 0) :
                                                            parseFloat(customAmount) || 0
                                                )).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 dark:text-muted-foreground text-right italic font-medium">Final balance payable upon vehicle collection</p>
                                    </div>
                                </div>
                            </div>

                            {/* Trust Markers */}
                            <div className="space-y-4 px-2">
                                <div className="flex items-start gap-4 p-5 rounded-3xl bg-emerald-50 border border-emerald-100">
                                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                                    <div>
                                        <h5 className="font-black text-emerald-950 text-sm mb-1 uppercase tracking-tight">Secured Reservation</h5>
                                        <p className="text-emerald-800 text-xs font-medium leading-normal">Your reservation is instantly blocked in our fleet upon successful payment.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Policy Acceptance */}
                            <div className="flex items-start space-x-3 p-6 bg-secondary/20 rounded-3xl border border-border/50">
                                <Checkbox
                                    id="policy-acceptance"
                                    checked={policyAccepted}
                                    onCheckedChange={(checked) => setPolicyAccepted(checked === true)}
                                    className="mt-1 border-primary data-[state=checked]:bg-primary"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor="policy-acceptance"
                                        className="text-xs font-bold leading-relaxed text-muted-foreground cursor-pointer select-none"
                                    >
                                        I have read and agree to the <Link to="/terms" className="text-primary hover:underline">Terms & Conditions</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                                        I understand that my booking is subject to availability and verification.
                                    </label>
                                </div>
                            </div>

                            {/* Final Action */}
                            <Button
                                onClick={handleCheckout}
                                disabled={submitting || !policyAccepted}
                                className="w-full h-24 rounded-[2.5rem] bg-primary hover:bg-primary/90 text-primary-foreground font-black text-2xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 border-b-8 border-primary/20"
                            >
                                {submitting ? (
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 border-4 border-primary-foreground border-t-transparent rounded-[1rem] animate-spin"></div>
                                        <span className="uppercase tracking-[0.2em] text-sm">Processing Journey...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 uppercase tracking-[0.2em] text-sm">
                                        Secure & Pay Now
                                        <ChevronRight className="w-6 h-6" />
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>
                </div >
            </div >
        </div >
    );
};

export default Checkout;
