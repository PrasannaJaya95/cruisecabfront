import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Users, Settings, Fuel, Calendar, Map, Shield, Star, ChevronLeft, ChevronRight } from 'lucide-react';

const VehicleDetailModal = ({ car, isOpen, onClose, onBookClick }) => {
    if (!car) return null;

    const isReal = !!car.vehicleModel;
    const carName = isReal ? `${car.vehicleModel?.brand?.name} ${car.vehicleModel?.name}` : car.name;
    const carPrice = isReal ? (car.dailyRentalRate || '25000') : car.price;
    const carImage = isReal ? (car.imageUrl || "https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=800") : car.image;
    const specs = isReal ? `${car.fuelType || ''} ${car.vehicleModel?.type || 'SUV'} · ${car.year}` : car.specs;

    // Default info for UI
    const year = isReal ? car.year : '2024';
    const transmission = isReal ? (car.transmission || 'Auto') : 'Auto';
    const fuelType = isReal ? (car.fuelType || 'Petrol') : (carName.includes('Tesla') ? 'Electric' : 'Petrol');
    const seats = isReal ? (car.seatingCapacity || '5') : '5';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md w-full p-0 bg-card border-border rounded-[2.5rem] overflow-hidden shadow-2xl gap-0 max-h-[90vh] overflow-y-auto [&>button]:right-6 [&>button]:top-6 [&>button]:text-foreground [&>button]:bg-background/80 [&>button]:backdrop-blur [&>button]:rounded-full [&>button]:p-2 [&>button]:shadow-lg [&>button]:transition-all [&>button:hover]:scale-110">
                <DialogTitle className="sr-only">Vehicle Details for {carName}</DialogTitle>
                <DialogDescription className="sr-only">Detailed specifications and pricing for {carName}</DialogDescription>

                {/* Image Section */}
                <div className="relative h-64 sm:h-72 w-full bg-secondary/50 shrink-0 overflow-hidden">
                    <img src={carImage} alt={carName} className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />

                    {/* Simulated Slider Arrows (Visual Only for now) */}
                    <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg text-foreground hover:bg-background transition-all hover:scale-110">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg text-foreground hover:bg-background transition-all hover:scale-110">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Section */}
                <div className="p-8 bg-card">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-2xl font-black text-foreground tracking-tight">{carName}</h2>
                            <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px] mt-1">{specs}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-black text-primary">
                                {typeof carPrice === 'number' ? `Rs. ${carPrice.toLocaleString()}` : carPrice.startsWith('Rs') ? carPrice : `Rs. ${carPrice}`}
                            </div>
                            <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">per day</p>
                        </div>
                    </div>

                    {/* Ratings */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="flex text-primary">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-primary" />
                            ))}
                        </div>
                        <span className="text-foreground font-black text-sm">4.8</span>
                        <span className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">(342 reviews)</span>
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground leading-relaxed mb-10 font-medium italic">
                        "The {carName} combines cutting-edge technology with practical driving experience. Enjoy zero compromises on your journey with maximum comfort and premium performance."
                    </p>

                    {/* 6-Grid Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
                        {/* Passengers */}
                        <div className="border border-border rounded-2xl p-4 bg-secondary/30 flex flex-col gap-2 transition-all hover:bg-secondary/50">
                            <Users className="w-5 h-5 text-primary" />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Seats</span>
                            <span className="font-black text-foreground text-sm">{seats}</span>
                        </div>

                        {/* Transmission */}
                        <div className="border border-border rounded-2xl p-4 bg-secondary/30 flex flex-col gap-2 transition-all hover:bg-secondary/50">
                            <Settings className="w-5 h-5 text-primary" />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mode</span>
                            <span className="font-black text-foreground text-sm">{transmission}</span>
                        </div>

                        {/* Fuel Type */}
                        <div className="border border-border rounded-2xl p-4 bg-secondary/30 flex flex-col gap-2 transition-all hover:bg-secondary/50">
                            <Fuel className="w-5 h-5 text-primary" />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Fuel</span>
                            <span className="font-black text-foreground text-sm">{fuelType}</span>
                        </div>

                        {/* Year */}
                        <div className="border border-border rounded-2xl p-4 bg-secondary/30 flex flex-col gap-2 transition-all hover:bg-secondary/50">
                            <Calendar className="w-5 h-5 text-primary" />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Year</span>
                            <span className="font-black text-foreground text-sm">{year}</span>
                        </div>

                        {/* Mileage */}
                        <div className="border border-border rounded-2xl p-4 bg-secondary/30 flex flex-col gap-2 transition-all hover:bg-secondary/50">
                            <Map className="w-5 h-5 text-primary" />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mileage</span>
                            <span className="font-black text-foreground text-sm">Unlimited</span>
                        </div>

                        {/* Insurance */}
                        <div className="border border-border rounded-2xl p-4 bg-secondary/30 flex flex-col gap-2 transition-all hover:bg-secondary/50">
                            <Shield className="w-5 h-5 text-primary" />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cover</span>
                            <span className="font-black text-foreground text-sm">Premium</span>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            onClose();
                            onBookClick(car);
                        }}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-5 rounded-2xl font-black transition-all shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 uppercase tracking-[0.2em] text-xs"
                    >
                        Secure Reservation
                    </button>

                </div>
            </DialogContent>
        </Dialog>
    );
};

export default VehicleDetailModal;
