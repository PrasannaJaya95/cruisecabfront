import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Car, Calendar as CalendarIcon, MapPin, Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from '../../context/AuthContext';

const BookingHome = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('cars');
    const [pickupDate, setPickupDate] = useState(new Date());
    const [returnDate, setReturnDate] = useState(new Date(new Date().setDate(new Date().getDate() + 3)));

    const DatePicker = ({ date, setDate, label }) => (
        <Popover>
            <PopoverTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer border border-border rounded-lg px-3 py-2 w-full hover:bg-white/10 transition-colors bg-white/10 backdrop-blur-md">
                    <CalendarIcon className="w-4 h-4 text-white/70" />
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">{label}</span>
                        <span className="text-sm font-medium text-white">
                            {date ? format(date, "MMM dd") : <span>Pick date</span>}
                        </span>
                    </div>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border text-foreground shadow-xl" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="p-3 pointer-events-auto bg-card text-foreground"
                />
            </PopoverContent>
        </Popover>
    );

    return (
        <div className="min-h-screen bg-background text-foreground font-sans relative overflow-x-hidden selection:bg-cyan-500/30 transition-colors duration-300">

            {/* Background Image */}
            <div className="fixed inset-0 z-0 overflow-hidden">
                <img
                    src="/hero-bg.png"
                    alt="Premium Car Background"
                    className="w-full h-full object-cover object-bottom scale-125"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-black/40"></div>
                {/* Overlay for glass pop */}
                <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay"></div>
            </div>

            {/* Navbar */}
            <nav className="relative z-50 h-20 flex items-center justify-between px-6 lg:px-12 border-b border-border bg-background/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <Car className="w-7 h-7 text-foreground drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
                    <span className="text-2xl font-black tracking-wider text-foreground">RENTIX</span>
                </div>
                <div className="hidden md:flex items-center gap-8 font-black uppercase tracking-widest text-[10px]">
                    <Link to="/" className="text-muted-foreground hover:text-foreground transition-all">Home</Link>
                    <Link to="/portal/vehicle" className="text-muted-foreground hover:text-foreground transition-all">Vehicles</Link>
                    <Link to="/about" className="text-muted-foreground hover:text-foreground transition-all">About</Link>
                </div>
                <div>
                    <div>
                        {user ? (
                            <Link to="/dashboard">
                                <Button className="ml-2 bg-white/90 hover:bg-white text-black backdrop-blur-md border border-white/20 rounded-full px-6 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                    My Account
                                </Button>
                            </Link>
                        ) : (
                            <>
                                <Link to="/login">
                                    <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10 font-medium">
                                        Sign in
                                    </Button>
                                </Link>
                                <Link to="/register">
                                    <Button className="ml-2 bg-white/90 hover:bg-white text-black backdrop-blur-md border border-white/20 rounded-full px-6 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                        Register
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Content */}
            <div className="relative z-20 pt-16 pb-20 px-4 md:px-0 flex flex-col items-center">

                {/* Search Widget Container - DUAL TONE GLASS */}
                <div className="w-full max-w-[95%] mt-10 animate-in fade-in slide-in-from-bottom-10 duration-700">

                    {/* Main Search Section */}
                    <div className="rounded-[2.5rem] overflow-hidden backdrop-blur-xl bg-card/40 border border-border shadow-2xl">
                        {/* Tabs */}
                        <div className="flex items-center gap-4 px-8 py-6 border-b border-border bg-secondary/30">
                            <button
                                onClick={() => setActiveTab('cars')}
                                className={cn(
                                    "px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 backdrop-blur-sm",
                                    activeTab === 'cars' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                                )}
                            >
                                <Car className="w-4 h-4" /> Cars
                            </button>
                        </div>

                        {/* Widget Content */}
                        <div className="p-6 bg-gradient-to-b from-white/5 to-transparent">
                            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_2fr_auto] gap-6 items-end">

                                {/* Location */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Pickup & return</label>
                                    <div className="flex flex-col lg:flex-row items-center gap-4">
                                        <div className="relative group flex-1 w-full">
                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                            <Input
                                                placeholder="Airport, city or address"
                                                className="pl-14 h-16 text-base border-border focus:border-primary/50 focus:ring-0 rounded-2xl bg-secondary/50 backdrop-blur-md text-foreground placeholder:text-muted-foreground transition-all hover:bg-secondary/80 font-bold"
                                            />
                                        </div>
                                        <div className="flex items-center text-muted-foreground text-xs font-bold uppercase tracking-widest cursor-pointer hover:text-primary transition-colors whitespace-nowrap px-4 py-2 bg-secondary/50 rounded-full border border-border">
                                            <span className="text-xl leading-none mr-2 font-light text-primary">+</span> Different return location
                                        </div>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Pickup */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Pickup date</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <DatePicker date={pickupDate} setDate={setPickupDate} label="Date" />
                                            </div>
                                            <div className="w-32 flex items-center border border-border rounded-2xl px-4 bg-secondary/50 backdrop-blur-md text-foreground hover:bg-secondary/80 transition-colors cursor-pointer font-bold h-[64px]">
                                                <span className="text-sm">12:00 PM</span>
                                                <ChevronDown className="ml-auto w-4 h-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Return */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Return date</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <DatePicker date={returnDate} setDate={setReturnDate} label="Date" />
                                            </div>
                                            <div className="w-32 flex items-center border border-border rounded-2xl px-4 bg-secondary/50 backdrop-blur-md text-foreground hover:bg-secondary/80 transition-colors cursor-pointer font-bold h-[64px]">
                                                <span className="text-sm">12:00 PM</span>
                                                <ChevronDown className="ml-auto w-4 h-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div className="pb-0">
                                    <Button className="h-16 w-full lg:w-auto px-12 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-black rounded-2xl shadow-xl shadow-primary/20 border border-primary/20 transition-all hover:scale-105 active:scale-95 uppercase tracking-widest">
                                        Show cars
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>


                </div>
            </div>

            {/* Spacer */}
            <div className="relative z-10 h-32 bg-gradient-to-t from-background to-transparent"></div>

        </div>
    );
};

export default BookingHome;
