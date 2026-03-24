import React, { useMemo, useState, useEffect } from 'react';
import { format, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, isWithinInterval, addDays } from 'date-fns';
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from 'lucide-react';

const YearScheduler = ({ date, events, onSelectEvent, onNavigate, vehicles = [] }) => {

    // 1. Year State (driven by RBC date)
    const yearStart = startOfYear(date);
    const yearEnd = endOfYear(date);
    const currentYear = date.getFullYear();

    // 2. Generate Timeline Data
    const months = useMemo(() => eachMonthOfInterval({ start: yearStart, end: yearEnd }), [yearStart, yearEnd]);

    // Flatten days for the header
    const days = useMemo(() => {
        return eachDayOfInterval({ start: yearStart, end: yearEnd });
    }, [yearStart, yearEnd]);

    // 3. Helper to check booking for a specific vehicle & day
    const getEventForDay = (vehicleId, day) => {
        return events.find(ev => {
            const contract = ev.resource;
            // Determine active vehicle (latest in exchange list, or the primary vehicle)
            const exchangeList = contract.vehicleExchanges || [];
            const lastEx = exchangeList.length > 0 ? exchangeList[exchangeList.length - 1] : null;
            const activeVehId = lastEx ? (lastEx.newVehicle?.id || lastEx.oldVehicle?.id) : contract.vehicle?.id;

            // Only match if this is the active vehicle's row
            if (activeVehId !== vehicleId) return false;

            return isSameDay(new Date(ev.start), day) ||
                (new Date(ev.start) <= day && new Date(ev.end) >= day);
        });
    };

    // 4. Scroll Handler
    const handleYearChange = (delta) => {
        const newDate = new Date(date);
        newDate.setFullYear(newDate.getFullYear() + delta);
        onNavigate('DATE', newDate);
    };

    // Calculate dynamic height based on vehicle count
    const rowHeight = 48; // h-12 = 48px
    const headerHeight = 82; // Combined height of month + day headers (41px + 41px)
    const maxVisibleRows = 10; // Maximum rows before scrolling
    const visibleRows = Math.min(vehicles.length, maxVisibleRows);
    const containerHeight = visibleRows * rowHeight + headerHeight;
    const needsScroll = vehicles.length > maxVisibleRows;

    return (
        <div className="flex flex-col h-full bg-[#050b1d] text-slate-300 overflow-hidden font-['Exo_2']">

            {/* Header / Controls */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0f172a]">
                <div className="flex items-center gap-4">
                    <button onClick={() => handleYearChange(-1)} className="p-1 hover:bg-white/10 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
                    <span className="text-xl font-bold text-white tracking-wider">{currentYear}</span>
                    <button onClick={() => handleYearChange(1)} className="p-1 hover:bg-white/10 rounded-full"><ChevronRight className="w-5 h-5" /></button>
                </div>
                <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#ffff00]"></div> Upcoming</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#53FE5C]"></div> In Progress</div>
                </div>
            </div>

            {/* Timeline Container */}
            <div
                className={cn(
                    "relative custom-scrollbar",
                    needsScroll ? "overflow-auto" : "overflow-x-auto overflow-y-hidden"
                )}
                style={{
                    maxHeight: needsScroll ? `${containerHeight}px` : 'auto',
                    minHeight: vehicles.length > 0 ? `${Math.min(vehicles.length * rowHeight + headerHeight, containerHeight)}px` : '200px'
                }}
            >

                <div className="inline-block min-w-full">
                    {/* Header Row: Months */}
                    <div className="flex sticky top-0 z-20 border-b border-white/5">
                        <div className="sticky left-0 z-30 w-[200px] min-w-[200px] bg-[#0f172a] p-3 font-bold border-r border-white/5 text-center text-slate-100">
                            Vehicle
                        </div>
                        {months.map((m, idx) => {
                            const daysInMonth = eachDayOfInterval({ start: startOfMonth(m), end: endOfMonth(m) }).length;
                            // Alternating Month Colors
                            const bgClass = idx % 2 === 0 ? "bg-[#0f172a]" : "bg-[#1e293b]";
                            return (
                                <div key={m.toString()} className={`text-center border-r border-white/5 py-2 font-bold text-slate-200 ${bgClass}`} style={{ width: `${daysInMonth * 40}px` }}>
                                    {format(m, 'MMMM')}
                                </div>
                            );
                        })}
                    </div>

                    {/* Header Row: Days */}
                    <div className="flex sticky top-[41px] z-20 border-b border-white/5 text-xs text-slate-400">
                        <div className="sticky left-0 z-30 w-[200px] min-w-[200px] bg-[#1e293b] border-r border-white/5 flex items-center justify-center font-medium">
                            Days
                        </div>
                        {days.map((d) => {
                            // Alternating Date Row Colors based on Month
                            const monthIdx = d.getMonth();
                            const bgClass = monthIdx % 2 === 0 ? "bg-[#1e293b]" : "bg-[#283549]";

                            return (
                                <div key={d.toString()} className={`w-[40px] min-w-[40px] text-center py-1.5 border-r border-white/5 ${bgClass}`}>
                                    {format(d, 'd')}
                                </div>
                            );
                        })}
                    </div>

                    {/* Body Rows: Vehicles */}
                    <div className="relative">
                        {vehicles.map(veh => (
                            <div key={veh.id} className="flex border-b border-white/5 hover:bg-white/5 transition-colors group">
                                {/* Vehicle Name Sticky */}
                                <div className="sticky left-0 z-10 w-[200px] min-w-[200px] p-3 bg-[#050b1d] group-hover:bg-[#0f172a] border-r border-white/5 flex items-center gap-2 text-sm font-medium text-slate-200 truncate shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: veh.status === 'AVAILABLE' ? '#10b981' : veh.status === 'RENTED' ? '#ef4444' : '#64748b' }}></span>
                                    {veh.make} {veh.model}
                                    <span className="text-xs text-slate-500 ml-auto">{veh.licensePlate}</span>
                                </div>

                                {/* Days Grid */}
                                {days.map((d, index) => {
                                    let event = getEventForDay(veh.id, d);

                                    // Merging Logic
                                    // Check previous day (if exists) for same event
                                    const prevD = index > 0 ? days[index - 1] : null;
                                    const prevEvent = prevD ? getEventForDay(veh.id, prevD) : null;
                                    const isStart = !prevEvent || prevEvent.id !== event?.id;

                                    // Check next day
                                    const nextD = index < days.length - 1 ? days[index + 1] : null;
                                    const nextEvent = nextD ? getEventForDay(veh.id, nextD) : null;
                                    const isEnd = !nextEvent || nextEvent.id !== event?.id;

                                    let bgClass = "";
                                    let borderClass = "border-r border-white/5";
                                    let marginClass = "mx-0.5 rounded-sm"; // Default

                                    if (event) {
                                        // Skip rendering completed/return bookings
                                        if (event.status === 'RETURN' || event.status === 'COMPLETED') {
                                            event = null;
                                        } else {
                                            if (event.status === 'IN_PROGRESS') bgClass = "bg-[#53FE5C] shadow-[0_0_10px_#53FE5C] z-0";
                                            else if (event.status === 'UPCOMING') bgClass = "bg-[#ffff00] shadow-[0_0_10px_#ffff00] z-0";

                                            // Continuous Bar Logic
                                            if (!isStart && !isEnd) {
                                                marginClass = "mx-0 rounded-none";
                                            } else if (isStart && !isEnd) {
                                                marginClass = "ml-0.5 mr-0 rounded-l-sm rounded-r-none";
                                            } else if (!isStart && isEnd) {
                                                marginClass = "ml-0 mr-0.5 rounded-l-none rounded-r-sm";
                                            }
                                            // If isStart && isEnd (single day), keep default mx-0.5 rounded-sm
                                        }
                                    }

                                    return (
                                        <div
                                            key={d.toISOString()}
                                            className={cn(
                                                "w-[40px] min-w-[40px] h-12 flex items-center justify-center relative",
                                                borderClass,
                                                isSameDay(d, new Date()) && "bg-white/5" // Highlight today column
                                            )}
                                        >
                                            {event && (
                                                <div
                                                    className={cn("absolute inset-y-1 opacity-80 hover:opacity-100 cursor-pointer transition-all", marginClass, bgClass,
                                                        !isStart && !isEnd ? "inset-x-0" : "", // Full width for middle
                                                        isStart && !isEnd ? "left-0.5 right-0" : "", // Start piece
                                                        !isStart && isEnd ? "left-0 right-0.5" : "", // End piece
                                                        isStart && isEnd ? "inset-x-0 mx-0.5" : "" // Single piece
                                                    )}
                                                    onClick={() => onSelectEvent(event)}
                                                    title={event.title}
                                                >
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// RBC Static Properties
YearScheduler.range = (date) => {
    return [startOfYear(date), endOfYear(date)];
};

YearScheduler.navigate = (date, action) => {
    if (action === 'PREV') return new Date(date.setFullYear(date.getFullYear() - 1));
    if (action === 'NEXT') return new Date(date.setFullYear(date.getFullYear() + 1));
    return date;
};

YearScheduler.title = (date) => {
    return format(date, 'yyyy');
};

export default YearScheduler;
