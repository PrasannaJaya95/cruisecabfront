import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Filter, Info, Heart, Share2, Search, SlidersHorizontal, Check, RefreshCw, MapPin, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
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
import VehicleDetailModal from '../../components/VehicleDetailModal';

const VehicleListing = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingOpen, setBookingOpen] = useState(false);
    const [selectedCar, setSelectedCar] = useState(null);
    const [date, setDate] = useState({
        from: new Date(),
        to: addDays(new Date(), 3),
    });
    const [websiteLogo, setWebsiteLogo] = useState(null);

    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailCar, setDetailCar] = useState(null);

    const handleCarClick = (car) => {
        setDetailCar(car);
        setDetailModalOpen(true);
    };

    const handleBookClick = (car) => {
        navigate(`/checkout/${car.id}`, { state: { date } });
    };

    const confirmBooking = () => {
        setBookingOpen(false);
        const name = selectedCar?.vehicleModel
            ? `${selectedCar.vehicleModel.brand?.name} ${selectedCar.vehicleModel.name}`
            : selectedCar?.name || 'Vehicle';
        alert(`Booking Confirmed for ${name}! Dates: ${date.from ? format(date.from, "PPP") : ''} - ${date.to ? format(date.to, "PPP") : ''}`);
    };

    // Filter States
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [selectedFuelTypes, setSelectedFuelTypes] = useState([]);
    const [selectedTransmissions, setSelectedTransmissions] = useState([]);
    const [availableBrands, setAvailableBrands] = useState([]);

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            selectedBrands.forEach(b => params.append('brand', b));
            selectedFuelTypes.forEach(f => params.append('fuelType', f));
            selectedTransmissions.forEach(t => params.append('transmission', t));

            console.log("Fetching vehicles from API...");
            const { data } = await api.get(`/vehicles?${params.toString()}`);
            console.log("Vehicles received:", data);
            setVehicles(data);

            if (availableBrands.length === 0 && data.length > 0) {
                const brands = [...new Set(data.map(v => v.vehicleModel?.brand?.name).filter(Boolean))];
                setAvailableBrands(brands);
            }
        } catch (error) {
            console.error("Failed to fetch vehicles:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();

        const fetchSettings = async () => {
            try {
                const { data } = await api.get('/settings/website_logo');
                if (data.value && data.value !== 'false') {
                    setWebsiteLogo(data.value);
                }
            } catch (err) {
                console.error("Failed to fetch website branding", err);
            }
        };
        fetchSettings();
    }, [selectedBrands, selectedFuelTypes, selectedTransmissions]);

    const toggleFilter = (setFilter, currentFilters, value) => {
        if (currentFilters.includes(value)) {
            setFilter(currentFilters.filter(item => item !== value));
        } else {
            setFilter([...currentFilters, value]);
        }
    };

    const clearFilters = () => {
        setSelectedBrands([]);
        setSelectedFuelTypes([]);
        setSelectedTransmissions([]);
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#FA5A28]/30 transition-colors duration-300">
            {/* Navbar */}
            <nav className="fixed top-0 inset-x-0 z-50 h-20 flex items-center justify-between px-6 lg:px-12 bg-background/80 backdrop-blur-md shadow-sm border-b border-border">
                <div className="flex items-center cursor-pointer group" onClick={() => navigate('/')}>
                    {websiteLogo ? (
                        <img src={websiteLogo} alt="Rentix" className="h-10 w-auto group-hover:scale-105 transition-transform" />
                    ) : (
                        <>
                            <div className="w-8 h-8 bg-[#FA5A28] rounded flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform">R</div>
                            <span className="ml-2 text-xl font-bold tracking-tight text-foreground uppercase">Rentix</span>
                        </>
                    )}
                </div>
                <div className="hidden md:flex items-center gap-8 font-black uppercase tracking-widest text-[10px]">
                    <Link to="/" className="text-muted-foreground hover:text-foreground transition-all">Home</Link>
                    <Link to="/portal/vehicle" className="text-primary transition-all">Vehicles</Link>
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

            {/* Main Content */}
            <div className="pt-32 pb-12 px-6 lg:px-12 max-w-[1440px] mx-auto flex flex-col md:flex-row gap-8">

                {/* Sidebar Filter */}
                <aside className="w-full md:w-72 shrink-0">
                    <div className="sticky top-28 space-y-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Filters</h2>
                            <button onClick={clearFilters} className="text-[10px] font-black text-muted-foreground hover:text-[#FA5A28] flex items-center gap-1.5 transition-colors uppercase tracking-[0.2em]">
                                <RefreshCw className="w-3 h-3" /> Reset
                            </button>
                        </div>

                        <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
                            <Accordion type="multiple" defaultValue={["brand", "transmission", "fuel"]} className="w-full">
                                <AccordionItem value="brand" className="border-b border-border">
                                    <AccordionTrigger className="text-xs font-black text-foreground hover:no-underline uppercase tracking-[0.2em]">Brand</AccordionTrigger>
                                    <AccordionContent className="space-y-3 pt-2">
                                        {availableBrands.length > 0 ? availableBrands.map((brand) => (
                                            <div key={brand} className="flex items-center space-x-3">
                                                <Checkbox
                                                    id={brand}
                                                    checked={selectedBrands.includes(brand)}
                                                    onCheckedChange={() => toggleFilter(setSelectedBrands, selectedBrands, brand)}
                                                    className="border-border data-[state=checked]:bg-[#FA5A28] data-[state=checked]:border-[#FA5A28] rounded-md"
                                                />
                                                <label htmlFor={brand} className="text-sm font-bold text-muted-foreground cursor-pointer hover:text-foreground transition-colors">{brand}</label>
                                            </div>
                                        )) : <p className="text-xs text-slate-400">Loading brands...</p>}
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="transmission" className="border-b border-border">
                                    <AccordionTrigger className="text-xs font-black text-foreground hover:no-underline uppercase tracking-[0.2em]">Transmission</AccordionTrigger>
                                    <AccordionContent className="pt-4 space-y-4">
                                        {['Automatic', 'Manual'].map((type) => (
                                            <div key={type} className="flex items-center space-x-4">
                                                <Checkbox
                                                    id={type}
                                                    checked={selectedTransmissions.includes(type)}
                                                    onCheckedChange={() => toggleFilter(setSelectedTransmissions, selectedTransmissions, type)}
                                                    className="border-border data-[state=checked]:bg-[#FA5A28] data-[state=checked]:border-[#FA5A28] rounded-md"
                                                />
                                                <label htmlFor={type} className="text-sm font-bold text-muted-foreground cursor-pointer hover:text-foreground transition-colors">{type}</label>
                                            </div>
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="fuel" className="border-none">
                                    <AccordionTrigger className="text-xs font-black text-foreground hover:no-underline uppercase tracking-[0.2em]">Fuel Type</AccordionTrigger>
                                    <AccordionContent className="pt-4 space-y-4">
                                        {['Petrol', 'Diesel', 'Electric', 'Hybrid'].map((type) => (
                                            <div key={type} className="flex items-center space-x-4">
                                                <Checkbox
                                                    id={type}
                                                    checked={selectedFuelTypes.includes(type)}
                                                    onCheckedChange={() => toggleFilter(setSelectedFuelTypes, selectedFuelTypes, type)}
                                                    className="border-border data-[state=checked]:bg-[#FA5A28] data-[state=checked]:border-[#FA5A28] rounded-md"
                                                />
                                                <label htmlFor={type} className="text-sm font-bold text-muted-foreground cursor-pointer hover:text-foreground transition-colors">{type}</label>
                                            </div>
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    </div>
                </aside>

                {/* Grid */}
                <main className="flex-1">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-foreground mb-3 tracking-tight leading-tight">Available Vehicles</h1>
                            <p className="text-muted-foreground font-medium text-lg">Find the perfect reliable vehicle for your journey.</p>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] bg-card px-6 py-3 rounded-full shadow-lg border border-border">
                            <span>{vehicles.length} Vehicles</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 text-muted-foreground">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
                            <p className="font-black uppercase tracking-widest text-xs">Loading Fleet...</p>
                        </div>
                    ) : vehicles.length === 0 ? (
                        <div className="text-center py-40 bg-card rounded-[2.5rem] border border-border shadow-2xl">
                            <Car className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-20" />
                            <h3 className="text-2xl font-black text-foreground mb-3 tracking-tight">No Vehicles Found</h3>
                            <p className="text-muted-foreground font-medium text-lg">Try adjusting your filters to find what you're looking for.</p>
                            <button onClick={clearFilters} className="mt-8 font-black text-[#FA5A28] hover:underline uppercase tracking-widest text-sm">Clear all filters</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {vehicles.map((car) => (
                                <div
                                    key={car.id}
                                    onClick={() => { if (car.status === 'AVAILABLE') handleCarClick(car); }}
                                    className={`group bg-card border border-border rounded-[2.5rem] overflow-hidden transition-all duration-500 flex flex-col ${car.status === 'AVAILABLE' ? 'cursor-pointer hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5' : 'opacity-90'}`}
                                >
                                    {/* Image Area */}
                                    <div className="aspect-[4/3] overflow-hidden relative bg-secondary/50 flex items-center justify-center">
                                        <div className="absolute top-3 left-3 z-10">
                                            <div className={`text-white text-xs font-bold px-3 py-1 rounded-full shadow-md ${car.status === 'AVAILABLE' ? 'bg-emerald-500' : car.status === 'MAINTENANCE' ? 'bg-rose-500' : 'bg-blue-500'}`}>
                                                {car.status === 'AVAILABLE' ? 'Available' : car.status === 'MAINTENANCE' ? 'Maintenance' : 'Rented'}
                                            </div>
                                        </div>
                                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                                            {car.fuelType && (
                                                <div className="bg-card/90 backdrop-blur text-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm border border-border/50">
                                                    {car.fuelType}
                                                </div>
                                            )}
                                            {car.transmission === 'Automatic' && (
                                                <div className="bg-card/90 backdrop-blur text-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm border border-border/50">
                                                    Auto
                                                </div>
                                            )}
                                        </div>
                                        <img
                                            src={resolveServerUrl(car.imageUrl) || "https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=800"}
                                            alt={car.vehicleModel?.name || 'Vehicle'}
                                            referrerPolicy="no-referrer"
                                            loading="lazy"
                                            decoding="async"
                                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${car.licensePlate || 'Car'}&background=random&size=800`; }}
                                            className={`w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ${car.status !== 'AVAILABLE' ? 'grayscale opacity-80' : ''}`}
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="p-8 flex flex-col flex-1">
                                        <div className="mb-6">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-2xl font-black text-foreground group-hover:text-primary transition-colors leading-tight tracking-tight">
                                                    {car.vehicleModel?.brand?.name} {car.vehicleModel?.name}
                                                </h3>
                                            </div>
                                            <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">{car.year} Model</p>
                                        </div>

                                        <div className="mt-auto pt-6 border-t border-border border-dashed flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Status</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${car.status === 'AVAILABLE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></span>
                                                    <span className="text-xs font-black text-foreground uppercase tracking-widest">{car.status}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleBookClick(car); }}
                                                disabled={car.status !== 'AVAILABLE'}
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.1em] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-primary/20"
                                            >
                                                {car.status === 'AVAILABLE' ? 'Book Now' : 'Unavailable'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                {/* Booking Dialog */}
                <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                    <DialogContent className="max-w-md bg-card border-border rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                        <DialogHeader className="p-8 pb-4">
                            <DialogTitle className="flex items-center gap-3 text-foreground text-2xl font-black tracking-tight leading-tight">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Car className="w-7 h-7 text-primary" />
                                </div>
                                Book Your Vehicle
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground font-medium text-base mt-2">
                                Select your dates to book the <span className="text-foreground font-black">{selectedCar?.vehicleModel?.brand?.name} {selectedCar?.vehicleModel?.name}</span>.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="px-8 py-8 space-y-6 border-y border-border bg-secondary/30">
                            <div className="grid gap-3 transition-colors">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Select Dates</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-bold border-border hover:bg-card hover:text-foreground py-8 rounded-2xl bg-card shadow-lg transition-all hover:border-primary/30",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-3 h-5 w-5 text-primary" />
                                            {date?.from ? (
                                                date.to ? (
                                                    <span className="text-base tracking-tight">
                                                        {format(date.from, "MMM dd, yyyy")} — {format(date.to, "MMM dd, yyyy")}
                                                    </span>
                                                ) : (
                                                    <span className="text-base tracking-tight">{format(date.from, "MMM dd, yyyy")}</span>
                                                )
                                            ) : (
                                                <span className="text-base tracking-tight">Pick your travel dates</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-card border-border shadow-2xl rounded-3xl" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={date?.from}
                                            selected={date}
                                            onSelect={setDate}
                                            numberOfMonths={2}
                                            className="text-foreground"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <DialogFooter className="p-8 gap-4 sm:justify-end bg-card">
                            <button onClick={() => setBookingOpen(false)} className="px-8 py-4 rounded-2xl font-black text-muted-foreground hover:bg-secondary transition-all uppercase tracking-widest text-xs">
                                Cancel
                            </button>
                            <button onClick={confirmBooking} className="px-10 py-4 rounded-2xl font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 uppercase tracking-widest text-xs">
                                Confirm Booking
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <VehicleDetailModal
                    isOpen={detailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    car={detailCar}
                    onBookClick={(car) => handleBookClick(car)}
                />
            </div>
            <footer className="py-12 border-t border-border bg-card text-center text-muted-foreground font-black uppercase tracking-[0.3em] text-[10px] mt-12">
                <p>© 2026 RENTIX. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default VehicleListing;
