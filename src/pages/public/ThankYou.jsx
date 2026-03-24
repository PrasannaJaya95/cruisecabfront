import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
    CheckCircle2, Calendar, CreditCard,
    ArrowRight, Share2, Home, LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const ThankYou = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { booking } = location.state || {};

    if (!booking) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-black mb-4">No Booking Found</h1>
                <Link to="/">
                    <Button>Back to Home</Button>
                </Link>
            </div>
        );
    }

    const { client, booking: bookingData, contract, payment } = booking;

    return (
        <div className="min-h-screen bg-background pt-32 pb-20 px-6 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-[2rem] flex items-center justify-center mb-8 mx-auto shadow-2xl shadow-emerald-500/10">
                        <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <h1 className="text-5xl font-black text-foreground tracking-tight mb-4">You're all set, {client.name.split(' ')[0]}!</h1>
                    <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
                        Your reservation is confirmed. We've sent a detailed confirmation email to <span className="text-primary font-bold">{client.email}</span>.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    {/* Booking Details Card */}
                    <div className="bg-card rounded-[2.5rem] p-8 border border-border shadow-xl">
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-8">Reservation Summary</h3>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Rental Period</p>
                                    <p className="font-bold text-foreground">
                                        {format(new Date(bookingData.startDate), 'PPP')} - {format(new Date(bookingData.endDate), 'PPP')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Payment Status</p>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-foreground">Rs. {payment.amount.toLocaleString()}</p>
                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-transparent text-[10px] font-black uppercase tracking-widest">
                                            {payment.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-border mt-6">
                                <div className="flex justify-between items-center bg-secondary/30 p-4 rounded-2xl">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Booking ID</span>
                                    <span className="font-mono font-bold text-primary">{bookingData.id.substring(0, 8).toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Next Steps Card */}
                    <div className="bg-primary rounded-[2.5rem] p-8 border border-primary/20 shadow-2xl shadow-primary/20 text-primary-foreground relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <h3 className="text-sm font-black uppercase tracking-widest opacity-60 mb-8">What's Next?</h3>

                        <div className="space-y-8 relative z-10">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs shrink-0">1</div>
                                <p className="text-sm font-medium leading-relaxed">Present your NIC/Passport and Driver's License during vehicle collection.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs shrink-0">2</div>
                                <p className="text-sm font-medium leading-relaxed">Sign the digital contract and complete the vehicle inspection with our agent.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs shrink-0">3</div>
                                <p className="text-sm font-medium leading-relaxed">Drive away and enjoy your premium Sri Lankan journey with Rentix.</p>
                            </div>
                        </div>

                        <div className="mt-12">
                            <Link to="/dashboard">
                                <Button className="w-full h-14 bg-white text-primary hover:bg-white/90 rounded-2xl font-black uppercase tracking-widest text-xs">
                                    Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    <Button variant="outline" className="h-12 border-border font-bold rounded-xl gap-2">
                        <Home className="w-4 h-4" /> Back to Website
                    </Button>
                    <Button variant="outline" className="h-12 border-border font-bold rounded-xl gap-2">
                        <Share2 className="w-4 h-4" /> Share Journey
                    </Button>
                    <Link to="/dashboard">
                        <Button variant="ghost" className="h-12 font-bold rounded-xl gap-2">
                            <LayoutDashboard className="w-4 h-4" /> Client Portal
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ThankYou;
