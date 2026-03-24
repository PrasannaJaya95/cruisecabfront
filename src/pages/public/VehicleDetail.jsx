import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Car, Filter, Info, Heart, Share2, Search, SlidersHorizontal, Check, RefreshCw, MapPin, Calendar as CalendarIcon, ArrowRight, ArrowLeft, Fuel, Settings, Users, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays } from "date-fns";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import api, { resolveServerUrl } from '@/lib/api';
import { useAuth } from '../../context/AuthContext';

const VehicleDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [car, setCar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState({
        from: new Date(),
        to: addDays(new Date(), 3),
    });

    useEffect(() => {
        const fetchVehicle = async () => {
            try {
                const { data } = await api.get(`/vehicles/${id}`);
                setCar(data);
            } catch (error) {
                console.error("Failed to fetch vehicle details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchVehicle();
    }, [id]);

    const handleBookClick = () => {
        navigate(`/checkout/${id}`, { state: { date } });
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
                <div className="w-8 h-8 border-4 border-[#FA5A28] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-medium">Loading vehicle details...</p>
            </div>
        );
    }

    if (!car) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
                <Car className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Vehicle Not Found</h3>
                <p className="text-slate-500 mb-6">The vehicle you are looking for does not exist or has been removed.</p>
                <Link to="/portal/vehicle" className="text-[#FA5A28] font-bold hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Fleet
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#FA5A28]/30 transition-colors duration-300">
            {/* Navbar */}
            <nav className="fixed top-0 inset-x-0 z-50 h-20 flex items-center justify-between px-6 lg:px-12 bg-background/80 backdrop-blur-md shadow-sm border-b border-border">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-8 h-8 bg-[#FA5A28] rounded flex items-center justify-center text-white font-bold text-xl">R</div>
                    <span className="text-xl font-bold tracking-tight text-foreground">Rentix</span>
                </div>
                <div className="hidden md:flex items-center gap-8 font-black uppercase tracking-widest text-[10px]">
                    <Link to="/" className="text-muted-foreground hover:text-foreground transition-all">Home</Link>
                    <Link to="/portal/vehicle" className="text-muted-foreground hover:text-foreground transition-all">Vehicles</Link>
                </div>
                <div>
                    {user ? (
                        <Link to="/dashboard">
                            <button className="bg-secondary hover:bg-secondary/80 text-foreground font-bold rounded-full px-6 py-2.5 transition-colors text-xs uppercase tracking-widest">
                                My Account
                            </button>
                        </Link>
                    ) : (
                        <Link to="/login">
                            <button className="bg-[#FA5A28] hover:bg-[#e04a1e] text-white font-bold rounded-full px-6 py-2.5 transition-colors text-xs uppercase tracking-widest shadow-lg shadow-[#FA5A28]/20">
                                Sign In
                            </button>
                        </Link>
                    )}
                </div>
            </nav>

            <div className="pt-28 pb-12 px-6 lg:px-12 max-w-[1440px] mx-auto">
                {/* Back Button */}
                <button onClick={() => navigate('/portal/vehicle')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all font-black uppercase tracking-[0.2em] text-[10px] mb-8">
                    <ArrowLeft className="w-3 h-3" /> Back to all vehicles
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left Column: Image & Details */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Main Image Setup */}
                        <div className="bg-card rounded-[2.5rem] p-4 border border-border flex items-center justify-center aspect-[16/9] relative lg:p-12 overflow-hidden group shadow-2xl">
                            <div className="absolute top-8 right-8 z-10 flex gap-2">
                                <Badge className="bg-card/90 backdrop-blur text-foreground text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-sm hover:bg-card border border-border">
                                    {car.status}
                                </Badge>
                            </div>
                            <img
                                src={resolveServerUrl(car.imageUrl) || "https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=1200"}
                                alt={`${car.vehicleModel?.brand?.name} ${car.vehicleModel?.name}`}
                                referrerPolicy="no-referrer"
                                decoding="async"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${car.licensePlate || 'Car'}&background=random&size=1200`; }}
                                className="w-full h-full object-cover rounded-3xl transition-transform duration-700 group-hover:scale-110"
                            />
                        </div>

                        {/* Overview Section */}
                        <div className="bg-card rounded-[2.5rem] p-10 border border-border shadow-2xl">
                            <h2 className="text-2xl font-black text-foreground mb-8 tracking-tight">Vehicle Overview</h2>
                            <p className="text-muted-foreground leading-relaxed max-w-3xl mb-12 text-lg font-medium">
                                Experience premium driving with the {car.year} {car.vehicleModel?.brand?.name} {car.vehicleModel?.name}. This vehicle combines elegant design with outstanding performance, ensuring maximum comfort for all your journeys. Whether for business or leisure, it delivers reliability and style in equal measure.
                            </p>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="flex flex-col gap-3 p-6 bg-secondary/30 rounded-3xl border border-border transition-all hover:bg-secondary/50">
                                    <Fuel className="w-6 h-6 text-primary" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Fuel Type</span>
                                    <span className="text-lg font-black text-foreground">{car.fuelType}</span>
                                </div>
                                <div className="flex flex-col gap-3 p-6 bg-secondary/30 rounded-3xl border border-border transition-all hover:bg-secondary/50">
                                    <Settings className="w-6 h-6 text-primary" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Transmission</span>
                                    <span className="text-lg font-black text-foreground">{car.transmission}</span>
                                </div>
                                <div className="flex flex-col gap-3 p-6 bg-secondary/30 rounded-3xl border border-border transition-all hover:bg-secondary/50">
                                    <CalendarIcon className="w-6 h-6 text-primary" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Model Year</span>
                                    <span className="text-lg font-black text-foreground">{car.year}</span>
                                </div>
                                <div className="flex flex-col gap-3 p-6 bg-secondary/30 rounded-3xl border border-border transition-all hover:bg-secondary/50">
                                    <ShieldCheck className="w-6 h-6 text-primary" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Condition</span>
                                    <span className="text-lg font-black text-foreground capitalize">{car.status.toLowerCase()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Features Section */}
                        <div className="bg-card rounded-[2.5rem] p-10 border border-border shadow-2xl">
                            <h2 className="text-2xl font-black text-foreground mb-8 tracking-tight">Premium Features</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8">
                                {['Air Conditioning', 'Bluetooth Audio', 'GPS Navigation', 'Backup Camera', 'Cruise Control', 'Leather Seats', 'Keyless Entry', 'Heated Seats'].map((feature, i) => (
                                    <div key={i} className="flex items-center gap-4 text-foreground font-black uppercase tracking-widest text-xs">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sticky Booking Widget */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-28 bg-card rounded-[2.5rem] p-10 border border-border shadow-2xl">
                            <div className="mb-10">
                                <h1 className="text-4xl font-black text-foreground mb-4 leading-tight tracking-tight">
                                    {car.vehicleModel?.brand?.name} <br />
                                    <span className="text-primary">{car.vehicleModel?.name}</span>
                                </h1>
                                <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px] flex items-center gap-3 mt-6">
                                    <MapPin className="w-4 h-4 text-primary" /> Available at Rentix Hub (Colombo)
                                </p>
                            </div>

                            <div className="py-8 border-y border-border border-dashed my-8">
                                <div className="flex items-end justify-between mb-4">
                                    <span className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Daily Rate</span>
                                    <div className="text-right">
                                        <span className="text-4xl font-black text-foreground">Rs. {car.dailyRentalRate || '25,000'}</span>
                                        <span className="text-muted-foreground font-black uppercase tracking-widest text-[10px] ml-2">/day</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground/60 text-right font-black uppercase tracking-[0.2em]">*Includes {car.dailyAllocatedKm || '100'}km per day</p>
                            </div>

                            <div className="space-y-8">
                                <div className="bg-secondary/30 rounded-3xl p-6 border border-border flex items-start gap-5">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                        <ShieldCheck className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-foreground mb-1 uppercase tracking-widest text-xs">Fully Insured</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">Every rental includes comprehensive premium insurance coverage.</p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleBookClick}
                                    disabled={car.status !== 'AVAILABLE'}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-2xl font-black transition-all shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 uppercase tracking-widest text-sm"
                                >
                                    {car.status === 'AVAILABLE' ? 'Secure Your Booking' : 'Currently Unavailable'}
                                </button>

                                <p className="text-center text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">No credit card required for reservation.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <footer className="py-12 border-t border-border bg-card text-center text-muted-foreground font-black uppercase tracking-[0.3em] text-[10px] mt-12">
                <p>© 2026 RENTIX. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default VehicleDetail;
