import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';

const MyBookings = () => {
    // Mock data for now
    const bookings = [
        { id: 1, car: 'Toyota Prius', date: '2023-10-25', status: 'Confirmed' },
        { id: 2, car: 'Honda Vezel', date: '2023-11-12', status: 'Pending' },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-white">My Bookings</h2>
            <div className="grid gap-4">
                {bookings.length > 0 ? (
                    bookings.map((booking) => (
                        <Card key={booking.id} className="glass-card">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-200">
                                    {booking.car}
                                </CardTitle>
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{booking.date}</div>
                                <p className="text-xs text-slate-400">
                                    Status: <span className={booking.status === 'Confirmed' ? 'text-emerald-400' : 'text-amber-400'}>{booking.status}</span>
                                </p>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <p className="text-slate-400">No bookings found.</p>
                )}
            </div>
        </div>
    );
};

export default MyBookings;
