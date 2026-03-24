import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    MapPin, Calendar as CalendarIcon, Clock, ChevronDown, CheckCircle2,
    Shield, Star, Menu, X, ArrowRight, Check, Car, Zap, HeartHandshake, Phone, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '../lib/api';
import VehicleDetailModal from '../components/VehicleDetailModal';
import { useAuth } from '../context/AuthContext';

const FEATURED_CARS = [
    { id: 1, name: "BMW M4 Competition", specs: "Sports Coupe · 2024", price: 150, image: "/cars/car_bmw_m4_1772427427098.png" },
    { id: 2, name: "Tesla Model Y", specs: "Electric SUV · 2024", price: 129, image: "/cars/car_tesla_y_1772427444137.png" },
    { id: 3, name: "Mercedes GLE 450", specs: "Luxury SUV · 2023", price: 180, image: "/cars/car_mercedes_gle_1772427462925.png" },
    { id: 4, name: "Porsche 911 Carrera", specs: "Sports Car · 2024", price: 250, image: "/cars/car_porsche_911_1772427477881.png" },
    { id: 5, name: "Range Rover Sport", specs: "Premium SUV · 2024", price: 190, image: "/cars/car_range_rover_1772427490667.png" },
    { id: 6, name: "Audi RS6 Avant", specs: "Performance Wagon · 2023", price: 160, image: "/cars/car_audi_rs6_1772427651620.png" }
];

const LandingPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenu, setMobileMenu] = useState(false);
    const [websiteLogo, setWebsiteLogo] = useState(null);
    const [featuredVehicles, setFeaturedVehicles] = useState([]);

    // Category States
    const [date, setDate] = useState({
        from: new Date(),
        to: addDays(new Date(), 3),
    });

    // Category States
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Detail Modal States
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailCar, setDetailCar] = useState(null);

    const handleCarClick = (car) => {
        setDetailCar(car);
        setDetailModalOpen(true);
    };

    const handleBookClick = (car) => {
        navigate(`/checkout/${car.id}`, { state: { date } });
    };

    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const { data } = await api.get('/vehicles');
                setFeaturedVehicles(data.slice(0, 6)); // Display up to 6 vehicles
            } catch (err) {
                console.error("Failed to fetch featured vehicles", err);
            }
        };

        // There is no DB layer for categories, using static internal categories
        const internalCategories = [
            { id: "suv", name: "SUVs & Crossovers" },
            { id: "sedan", name: "Luxury Sedans" },
            { id: "sports", name: "Sports Cars" },
            { id: "electric", name: "Electric Vehicles" },
            { id: "convertible", name: "Convertibles" }
        ];
        setCategories(internalCategories);

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

        fetchVehicles();
        fetchSettings();

        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const Navbar = () => (
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-background/80 backdrop-blur-md shadow-md py-4 border-b border-border' : 'bg-transparent py-6'}`}>
            <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                <div className="flex items-center cursor-pointer group" onClick={() => navigate('/')}>
                    {websiteLogo ? (
                        <img src={websiteLogo} alt="Rentix" className="h-10 w-auto group-hover:scale-105 transition-transform" />
                    ) : (
                        <>
                            <div className="w-8 h-8 bg-[#FA5A28] rounded flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform">R</div>
                            <span className={`ml-2 text-xl font-bold tracking-tight uppercase ${scrolled ? 'text-foreground' : 'text-white'}`}>Rentix</span>
                        </>
                    )}
                </div>

                <div className="hidden md:flex items-center gap-8">
                    {['Home', 'Vehicles', 'Process', 'Contact'].map(item => (
                        <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className={`text-sm font-black uppercase tracking-widest hover:text-[#FA5A28] transition-colors ${scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-slate-200'}`}>
                            {item}
                        </a>
                    ))}
                    {user ? (
                        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 bg-[#FA5A28]/10 hover:bg-[#FA5A28]/20 text-[#FA5A28] px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-[#FA5A28]/20 backdrop-blur-sm group/btn">
                            <Users size={16} className="group-hover:scale-110 transition-transform" />
                            My Dashboard
                        </button>
                    ) : (
                        <button onClick={() => navigate('/login')} className="bg-[#FA5A28] hover:bg-[#e04a1e] text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-[#FA5A28]/30 hover:scale-105 active:scale-95">
                            Log In
                        </button>
                    )}
                </div>

                <div className="md:hidden flex items-center">
                    <button onClick={() => setMobileMenu(!mobileMenu)} className={scrolled ? 'text-foreground' : 'text-white'}>
                        {mobileMenu ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenu && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-full left-0 w-full bg-background border-b border-border shadow-xl py-4 flex flex-col px-6 md:hidden">
                        {['Home', 'Vehicles', 'Process', 'Contact'].map(item => (
                            <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setMobileMenu(false)} className="py-3 text-foreground font-bold border-b border-border last:border-0 hover:text-[#FA5A28]">
                                {item}
                            </a>
                        ))}
                        {user ? (
                            <button onClick={() => navigate('/dashboard')} className="mt-4 w-full bg-[#FA5A28]/10 text-[#FA5A28] py-4 rounded-xl font-black uppercase text-xs tracking-widest border border-[#FA5A28]/20">My Dashboard</button>
                        ) : (
                            <button onClick={() => navigate('/login')} className="mt-4 w-full bg-[#FA5A28] text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest">Log In</button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );

    const Hero = () => (
        <section id="home" className="relative min-h-screen flex flex-col justify-center pt-20">
            {/* Background Image & Overlay */}
            <div className="absolute inset-0 z-0">
                <img src="https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=2070&auto=format&fit=crop" alt="Hero Tesla" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/60 to-slate-950/40 dark:from-slate-950/95 dark:via-slate-900/80 dark:to-slate-900/40" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 w-full mt-10 lg:mt-0">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-2xl text-white text-center lg:text-left mt-12 lg:mt-0">
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
                            Discover Sri Lanka In <br className="hidden sm:block" /> <span className="text-[#FA5A28]">Ultimate Comfort</span>
                        </h1>
                        <p className="text-base sm:text-lg md:text-xl text-slate-300 font-light mb-10 max-w-xl mx-auto lg:mx-0">
                            Get behind the wheel of top-tier vehicles designed for your perfect getaway. Enjoy clear upfront pricing, instant reservations, and a seamless travel experience.
                        </p>
                    </motion.div>

                    {/* New Vertical Booking Widget */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="w-full max-w-md bg-slate-950/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl shrink-0"
                    >
                        <h2 className="text-2xl font-bold text-white mb-8">Find Your Ideal Vehicle</h2>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-white uppercase tracking-widest mb-2">Where to Pick Up?</label>
                                <div className="flex items-center border border-white/20 rounded-xl p-4 bg-white/10 text-white hover:border-white/30 transition-colors">
                                    <MapPin className="text-white/70 w-5 h-5 mr-3 shrink-0" />
                                    <input type="text" placeholder="City, Airport, or Address" className="w-full bg-transparent outline-none text-white placeholder:text-white/60 text-sm font-bold" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-white uppercase tracking-widest mb-3">Starting Date</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <div className="flex items-center border border-white/20 rounded-2xl p-4 bg-white/10 text-white justify-between cursor-pointer hover:border-white/30 transition-all group">
                                                <span className="text-white text-sm font-black">
                                                    {date?.from ? format(date.from, "dd/MM/yyyy") : "dd/mm/yyyy"}
                                                </span>
                                                <CalendarIcon className="text-white/70 w-4 h-4 ml-2 shrink-0 group-hover:text-primary transition-colors" />
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-card border-border shadow-2xl rounded-[1.5rem]" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="single"
                                                defaultMonth={date?.from}
                                                selected={date?.from}
                                                onSelect={(newDate) => {
                                                    // If new start date is AFTER the current end date, reset the end date
                                                    if (newDate && date?.to && newDate > date.to) {
                                                        setDate({ from: newDate, to: undefined });
                                                    } else {
                                                        setDate({ ...date, from: newDate });
                                                    }
                                                }}
                                                numberOfMonths={1}
                                                className="text-foreground font-black"
                                                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-white uppercase tracking-widest mb-3">Drop-off Date</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <div className="flex items-center border border-white/20 rounded-2xl p-4 bg-white/10 text-white justify-between cursor-pointer hover:border-white/30 transition-all group">
                                                <span className="text-white text-sm font-black">
                                                    {date?.to ? format(date.to, "dd/MM/yyyy") : "dd/mm/yyyy"}
                                                </span>
                                                <CalendarIcon className="text-white/70 w-4 h-4 ml-2 shrink-0 group-hover:text-primary transition-colors" />
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-card border-border shadow-2xl rounded-[1.5rem]" align="end">
                                            <Calendar
                                                initialFocus
                                                mode="single"
                                                defaultMonth={date?.to || date?.from}
                                                selected={date?.to}
                                                onSelect={(newDate) => setDate({ ...date, to: newDate })}
                                                numberOfMonths={1}
                                                className="text-foreground font-black"
                                                disabled={(d) => d < (date?.from || new Date(new Date().setHours(0, 0, 0, 0)))}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-white uppercase tracking-widest mb-2">Vehicle Category</label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="w-full border-white/20 rounded-2xl p-4 bg-white/10 text-white hover:border-white/30 transition-all h-auto focus:ring-0 focus:ring-offset-0 font-black text-sm">
                                        <SelectValue placeholder="Any Category" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card text-foreground border-border shadow-2xl rounded-2xl overflow-hidden">
                                        <SelectItem value="all" className="focus:bg-primary focus:text-primary-foreground cursor-pointer py-3 font-black text-xs uppercase tracking-widest">
                                            Any Category
                                        </SelectItem>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id} className="focus:bg-primary focus:text-primary-foreground cursor-pointer py-3 font-black text-xs uppercase tracking-widest">
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <button onClick={() => navigate('/portal/vehicle')} className="w-full bg-[#FA5A28] hover:bg-[#e04a1e] text-white py-4 rounded-xl font-bold transition-all shadow-[0_0_30px_rgba(250,90,40,0.3)] mt-2 flex items-center justify-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                Find Your Ideal Vehicle
                            </button>

                            <div className="flex items-center justify-between pt-8 mt-4 border-t border-white/10 text-center">
                                <div className="flex flex-col w-1/3">
                                    <span className="text-white font-black text-lg flex items-center justify-center gap-1">4.9<Star className="w-4 h-4 fill-white text-white" /></span>
                                    <span className="text-[9px] text-white/80 font-bold uppercase tracking-widest mt-1">Star Rating</span>
                                </div>
                                <div className="w-px h-8 bg-white/20"></div>
                                <div className="flex flex-col w-1/3">
                                    <span className="text-white font-black text-lg">50K+</span>
                                    <span className="text-[9px] text-white/80 font-bold uppercase tracking-widest mt-1">Satisfied Drivers</span>
                                </div>
                                <div className="w-px h-8 bg-white/20"></div>
                                <div className="flex flex-col w-1/3">
                                    <span className="text-white font-black text-lg">500+</span>
                                    <span className="text-[9px] text-white/80 font-bold uppercase tracking-widest mt-1">Active Vehicles</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );

    const Fleet = () => (
        <section id="our-fleet" className="py-16 md:py-32 bg-secondary/30">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-6xl font-black text-foreground mb-6 tracking-tight">Select Your <span className="text-[#FA5A28]">Premium Vehicle</span></h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-medium">Check out our high-end automotive lineup and drive away in absolute luxury.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(featuredVehicles.length > 0 ? featuredVehicles : FEATURED_CARS).map((car, idx) => {
                        const isReal = !!car.vehicleModel;
                        const carId = isReal ? car.id : car.id;
                        const carName = isReal ? `${car.vehicleModel?.brand?.name} ${car.vehicleModel?.name}` : car.name;
                        const carSpecs = isReal ? `${car.fuelType || ''} ${car.year}` : car.specs;
                        const carPrice = isReal ? (car.dailyRentalRate || '25000') : car.price;
                        const carImg = isReal ? (car.imageUrl || "https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=800") : car.image;

                        const carStatus = isReal ? car.status : 'AVAILABLE';

                        return (
                            <motion.div key={isReal ? car.id : car.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="bg-card rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all border border-border group cursor-pointer flex flex-col relative" onClick={() => { if (carStatus === 'AVAILABLE') { isReal ? handleCarClick(car) : navigate('/portal/vehicle'); } }}>
                                <div className="absolute top-4 left-4 z-10">
                                    <div className={`text-white text-xs font-bold px-3 py-1 rounded-full shadow-md ${carStatus === 'AVAILABLE' ? 'bg-emerald-500' : carStatus === 'MAINTENANCE' ? 'bg-rose-500' : 'bg-blue-500'}`}>
                                        {carStatus === 'AVAILABLE' ? 'Available' : carStatus === 'MAINTENANCE' ? 'Maintenance' : 'Rented'}
                                    </div>
                                </div>
                                <div className="relative h-64 overflow-hidden bg-secondary shrink-0">
                                    <img src={carImg} alt={carName} referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=Rentix+Car&background=random&size=800`; }} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${carStatus !== 'AVAILABLE' ? 'grayscale opacity-80' : ''}`} />
                                </div>
                                <div className="p-8 flex flex-col flex-1">
                                    <h3 className="text-2xl font-black text-foreground mb-2 group-hover:text-[#FA5A28] transition-colors leading-tight">{carName}</h3>
                                    <p className="text-sm font-bold text-muted-foreground mb-6 uppercase tracking-widest">{carSpecs}</p>
                                    <div className="mt-auto pt-6 border-t border-border border-dashed flex items-end justify-between">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mb-1">From</p>
                                            <p className="text-3xl font-black text-[#FA5A28]">Rs. {carPrice}<span className="text-xs text-muted-foreground font-bold ml-1 uppercase tracking-widest">/day</span></p>
                                        </div>
                                        <button
                                            disabled={carStatus !== 'AVAILABLE'}
                                            onClick={(e) => { e.stopPropagation(); isReal ? handleBookClick(car) : navigate('/portal/vehicle'); }}
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary shadow-lg shadow-primary/20"
                                        >
                                            {carStatus === 'AVAILABLE' ? 'Book Now' : 'Unavailable'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="mt-12 text-center">
                    <button onClick={() => navigate('/portal/vehicle')} className="inline-flex items-center justify-center gap-3 border-2 border-foreground hover:bg-foreground hover:text-background text-foreground px-10 py-4 rounded-full font-black text-lg transition-all hover:-translate-y-1">
                        View All Vehicles <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </section>
    );

    const HowItWorks = () => (
        <section id="how-it-works" className="py-16 md:py-32 bg-background">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-6xl font-black text-foreground mb-6 tracking-tight">The Rental <span className="text-[#FA5A28]">Process</span></h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-medium">We've made securing a vehicle incredibly quick and completely stress-free.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                    <div className="hidden md:block absolute top-[45px] left-[15%] right-[15%] h-0.5 bg-border z-0 border-t-2 border-dashed border-border/50"></div>

                    {[
                        { icon: Car, title: "Pick Your Car", desc: "Find the perfect automobile from our extensive garage that matches your trip." },
                        { icon: CalendarIcon, title: "Set Your Schedule", desc: "Use our safe online platform to quickly confirm the days you need the car." },
                        { icon: MapPin, title: "Start Driving", desc: "Collect the vehicle from our central location or let us drop it off right where you are." }
                    ].map((step, idx) => (
                        <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-white border-4 border-[#FA5A28]/20 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-[#FA5A28]/5 mx-auto group hover:border-[#FA5A28] transition-colors">
                                <div className="w-16 h-16 bg-[#FA5A28] rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                    <step.icon size={32} strokeWidth={1.5} />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                            <p className="text-slate-500">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );

    const Pricing = () => (
        <section id="pricing-plans" className="py-24 bg-card dark:bg-slate-900 text-foreground dark:text-white border-y border-border">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple <span className="text-[#FA5A28]">Pricing</span></h2>
                    <p className="text-slate-400 max-w-2xl mx-auto text-lg">Choose the plan that fits your journey. No surprises, no hidden charges.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { name: "Economy", desc: "Perfect for budget-conscious travelers", price: "Rs. 100", features: ["Economy & compact cars", "200 km/day included", "Basic insurance", "Roadside assistance"] },
                        { name: "Standard", desc: "For most travelers seeking comfort", price: "Rs. 150", featured: true, features: ["Sedans & SUVs", "Unlimited kilometers", "Full insurance coverage", "24/7 roadside assistance", "GPS navigation included"] },
                        { name: "Luxury", desc: "The ultimate luxury experience", price: "Rs. 250", features: ["Luxury & sport cars", "Unlimited kilometers", "Zero deductible insurance", "Priority roadside assistance", "Chauffeur delivery option"] }
                    ].map((plan, idx) => (
                        <div key={idx} className={`rounded-[2.5rem] p-10 border transition-all ${plan.featured ? 'border-[#FA5A28] bg-secondary/50 dark:bg-slate-800 shadow-2xl shadow-[#FA5A28]/10 relative transform md:-translate-y-4' : 'border-border bg-card dark:bg-slate-900/50'}`}>
                            {plan.featured && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FA5A28] text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full">Most Popular</div>}
                            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                            <p className="text-slate-400 text-sm mb-6 h-10">{plan.desc}</p>
                            <div className="mb-8">
                                <span className="text-4xl font-bold">{plan.price}</span><span className="text-slate-500">/day</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, fidx) => (
                                    <li key={fidx} className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-[#FA5A28] shrink-0" />
                                        <span className="text-slate-300 text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button className={`w-full py-3 rounded-xl font-bold transition-colors ${plan.featured ? 'bg-[#FA5A28] hover:bg-[#e04a1e] text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}>
                                Select Plan
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );

    const WhyChooseUs = () => (
        <section className="py-16 md:py-32 bg-background relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-6xl font-black text-foreground mb-6 tracking-tight">The Rentix <span className="text-[#FA5A28]">Advantage</span></h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-medium">Our focus is entirely on delivering a secure, comfortable, and elite driving experience across your entire trip.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { icon: Phone, title: "Always Available Help", desc: "Reach out to our round-the-clock staff whenever you need guidance during your travels." },
                        { icon: HeartHandshake, title: "Clear Upfront Pricing", desc: "We guarantee that the final quote has zero surprise fees or unexpected surcharges." },
                        { icon: Shield, title: "Flawless Maintenance", desc: "We rigorously inspect and detail every single automobile before handing over the keys." },
                        { icon: Zap, title: "Lightning Fast Booking", desc: "Bypass the long forms. Get authorization immediately through our modernized web system." }
                    ].map((feature, idx) => (
                        <div key={idx} className="bg-secondary/30 p-10 rounded-[2.5rem] hover:bg-card hover:shadow-2xl hover:shadow-primary/5 transition-all border border-border group">
                            <div className="w-16 h-16 bg-card rounded-2xl shadow-lg flex items-center justify-center mb-8 group-hover:bg-[#FA5A28] transition-all transform group-hover:rotate-6">
                                <feature.icon className="w-8 h-8 text-[#FA5A28] group-hover:text-white" />
                            </div>
                            <h3 className="text-xl font-black text-foreground mb-4 tracking-tight">{feature.title}</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed font-medium">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );

    const Footer = () => (
        <footer id="contact" className="bg-secondary/50 dark:bg-slate-950 text-muted-foreground dark:text-slate-300 pt-20 pb-10 border-t border-border">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-[#FA5A28] rounded flex items-center justify-center text-white font-bold text-xl">R</div>
                            <span className="text-xl font-bold tracking-tight text-foreground dark:text-white">Rentix</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-medium">
                            Rentix stands as the leading elite automotive service in the region, bridging the gap between luxury and reliable transportation.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-foreground dark:text-white font-bold mb-6 uppercase tracking-wider text-sm">Quick Links</h4>
                        <ul className="space-y-3 text-sm">
                            {['Home', 'Vehicles', 'Process', 'Contact'].map(link => (
                                <li key={link}><a href={`#${link.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-[#FA5A28] transition-colors">{link}</a></li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-foreground dark:text-white font-bold mb-6 uppercase tracking-wider text-sm">Vehicle Types</h4>
                        <ul className="space-y-3 text-sm">
                            {['Economy Cars', 'Sedans', 'SUVs & 4x4', 'Luxury Cars', 'Vans & Minivans'].map(link => (
                                <li key={link}><a href="#" className="hover:text-[#FA5A28] transition-colors">{link}</a></li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-foreground dark:text-white font-black mb-10 text-[10px] uppercase tracking-[0.3em]">Contact Us</h4>
                        <ul className="space-y-6 text-sm">
                            <li className="flex items-start gap-4">
                                <MapPin className="w-5 h-5 text-[#FA5A28] shrink-0 mt-1" />
                                <span className="font-black text-foreground/80 dark:text-white/80 leading-relaxed">1234 Galle Road, <br />Colombo 03, Sri Lanka</span>
                            </li>
                            <li className="flex items-center gap-4">
                                <Phone className="w-5 h-5 text-[#FA5A28] shrink-0" />
                                <span className="font-black text-foreground/80 dark:text-white/80">+94 11 234 5678</span>
                            </li>
                            <li className="flex items-center gap-4">
                                <Star className="w-5 h-5 text-[#FA5A28] shrink-0 fill-[#FA5A28]" />
                                <span className="font-black text-foreground/80 dark:text-white/80">hello@rentix.lk</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground font-bold uppercase tracking-widest">
                    <p>© 2026 Rentix Rentals. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                    </div>
                </div>
            </div>
        </footer>
    );

    return (
        <div className="font-sans bg-background selection:bg-[#FA5A28]/30 transition-colors duration-300">
            {Navbar()}
            {Hero()}
            {Fleet()}
            {HowItWorks()}
            {/* {Pricing()} */}
            {WhyChooseUs()}

            {/* CTA Section */}
            <section className="bg-[#FA5A28] py-32 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight">Begin Your Adventure Now</h2>
                    <p className="text-white/90 text-xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
                        Upgrade your travel expectations. Reserve the ultimate driving machine and explore the island without compromises.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button onClick={() => navigate('/portal/vehicle')} className="w-full sm:w-auto bg-black hover:bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xl transition-all hover:scale-105 shadow-2xl">
                            Book Your Car Now
                        </button>
                    </div>
                </div>
            </section>


            <VehicleDetailModal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                car={detailCar}
                onBookClick={(car) => handleBookClick(car)}
            />

            {Footer()}
        </div>
    );
};

export default LandingPage;
