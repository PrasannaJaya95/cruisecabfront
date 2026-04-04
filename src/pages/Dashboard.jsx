import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreVertical, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Car, Clock, ShieldCheck, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Sector } from 'recharts';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../lib/api';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import YearScheduler from '@/components/calendar/YearScheduler';

const localizer = momentLocalizer(moment);

// Custom Toolbar Component
const CustomToolbar = (toolbar) => {
    const goToBack = () => {
        toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
        toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
        toolbar.onNavigate('TODAY');
    };

    const goToView = (view) => {
        toolbar.onView(view);
    };

    const label = () => {
        const date = moment(toolbar.date);
        return (
            <span className="text-lg font-bold text-foreground">
                {date.format('MMMM YYYY')}
            </span>
        );
    };

    const currentYear = toolbar.date.getFullYear();
    const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

    const handleYearChange = (e) => {
        const newYear = parseInt(e.target.value, 10);
        const newDate = new Date(toolbar.date);
        newDate.setFullYear(newYear);
        toolbar.onNavigate('DATE', newDate);
    };

    return (
        <div className="flex items-center justify-between mb-6 p-3 bg-secondary/50 dark:bg-black/20 rounded-2xl border border-border backdrop-blur-md">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={goToBack} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToCurrent} className="h-8 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 text-xs uppercase tracking-wider font-bold">
                    Today
                </Button>
                <Button variant="ghost" size="icon" onClick={goToNext} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10">
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="ml-4">{label()}</div>
            </div>

            <div className="flex items-center gap-4">
                {/* Year Filter */}
                <select
                    value={currentYear}
                    onChange={handleYearChange}
                    className="bg-card border border-border text-foreground text-xs rounded-xl px-4 py-2 focus:outline-none focus:ring-4 focus:ring-primary/5 appearance-none cursor-pointer hover:bg-secondary/80 transition-all font-black uppercase tracking-widest"
                >
                    {years.map(year => (
                        <option key={year} value={year} className="bg-background text-foreground">{year}</option>
                    ))}
                </select>

                <div className="flex bg-card rounded-xl p-1.5 border border-border shadow-sm">
                    {['month', 'week', 'day', 'year'].map((view) => (
                        <button
                            key={view}
                            onClick={() => goToView(view)}
                            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${toolbar.view === view
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                                }`}
                        >
                            {view}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('month'); // Controlled view state
    const [vehicles, setVehicles] = useState([]); // Vehicles State
    const [activeIndex, setActiveIndex] = useState(0); // State for Pie Chart Hover
    const [date, setDate] = useState(new Date()); // Calendar Date State

    // Handle View Change
    const handleViewChange = (newView) => {
        setView(newView);
    };

    // Fetch Contracts
    useEffect(() => {
        const fetchContracts = async () => {
            try {
                const res = await api.get('/contracts');
                const data = res.data;
                setContracts(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to fetch contracts", err);
                setContracts([]);
            } finally {
                setLoading(false);
            }
        };

        const fetchVehicles = async () => {
            try {
                const res = await api.get('/vehicles');
                const data = res.data;
                setVehicles(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to fetch vehicles", err);
                setVehicles([]);
            }
        };

        fetchContracts();
        fetchVehicles();
    }, []);

    // Transform Contracts to Events
    const events = contracts
        .filter(c => !['COMPLETED', 'RETURN'].includes(c.status)) // Hide Completed/Return
        .map(contract => {
            // Calculate Active Vehicle (handling exchanges)
            const lastEx = contract.vehicleExchanges?.length > 0 ? contract.vehicleExchanges[contract.vehicleExchanges.length - 1] : null;
            const activeVehicle = lastEx ? (lastEx.newVehicle || lastEx.oldVehicle) : contract.vehicle;
            const vehicleText = activeVehicle?.licensePlate || 'N/A';

            const title = `${vehicleText} | ${contract.customer?.name}`;

            let start;
            if (lastEx) {
                // Prioritize newVehicleStartDate for the active vehicle's timeline
                start = new Date(lastEx.newVehicleStartDate || lastEx.exchangeDate);
            } else {
                start = new Date(contract.pickupDate);
                if (contract.pickupTime) {
                    const [h, m] = contract.pickupTime.split(':');
                    start.setHours(h, m);
                }
            }

            let end = new Date(contract.dropoffDate);
            if (contract.dropoffTime) {
                const [h, m] = contract.dropoffTime.split(':');
                end.setHours(h, m);
            }

            return {
                id: contract.id,
                title: title,
                start: start,
                end: end,
                status: contract.status,
                resource: contract
            };
        });

    // --- Year View Wrapper ---
    const YearViewWrapper = (props) => {
        // Inject vehicles prop explicitly
        return <YearScheduler {...props} vehicles={vehicles} />;
    };
    // Re-expose static properties for RBC navigation
    YearViewWrapper.range = YearScheduler.range;
    YearViewWrapper.navigate = YearScheduler.navigate;
    YearViewWrapper.title = YearScheduler.title;

    const eventStyleGetter = (event) => {
        let baseColor = '#FA5A28'; // Rentix Orange
        let borderColor = '#FA5A28';
        let glowColor = 'rgba(250, 90, 40, 0.1)';

        if (event.status === 'UPCOMING') {
            baseColor = '#3b82f6'; // Blue 500
            borderColor = '#3b82f6';
            glowColor = 'rgba(59, 130, 246, 0.1)';
        }
        if (event.status === 'IN_PROGRESS') {
            baseColor = '#10b981'; // Emerald 500
            borderColor = '#10b981';
            glowColor = 'rgba(16, 185, 129, 0.1)';
        }

        return {
            style: {
                background: `rgba(255, 255, 255, 0.9)`,
                backdropFilter: 'blur(8px)',
                borderLeft: `4px solid ${borderColor}`,
                borderTop: '1px solid var(--border)',
                borderRight: '1px solid var(--border)',
                borderBottom: '2px solid rgba(0,0,0,0.05)',
                color: 'var(--foreground)',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontFamily: 'inherit',
                fontWeight: '800',
                padding: '6px 10px',
                marginBottom: '4px',
                boxShadow: `0 4px 6px -1px ${glowColor}, 0 2px 4px -1px ${glowColor}`,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
            }
        };
    };

    const handleSelectEvent = (event) => {
        navigate(`/bookings/contracts?id=${event.id}`);
    };

    // Mock Data for Charts
    const lineData = [
        { name: 'Sun', value: 30 },
        { name: 'Mon', value: 70 },
        { name: 'Tue', value: 45 },
        { name: 'Wed', value: 90 },
        { name: 'Thu', value: 65 },
        { name: 'Fri', value: 85 },
        { name: 'Sat', value: 100 },
    ];

    // --- Custom Active Shape for Pie Chart (Neon Popup Effect) ---
    const renderActiveShape = (props) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;

        return (
            <g>
                <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="currentColor" className="text-xl font-black text-foreground">
                    {value}
                </text>
                <text x={cx} y={cy} dy={15} textAnchor="middle" fill="currentColor" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                    {payload.name}
                </text>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
                <Sector
                    cx={cx}
                    cy={cy}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    innerRadius={outerRadius + 6}
                    outerRadius={outerRadius + 12} // Popup effect
                    fill={fill}
                    style={{ filter: `drop-shadow(0 0 8px ${fill})` }} // Neon Glow Fixed
                />
            </g>
        );
    };

    // Custom Tooltip for Pie Chart
    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-card/95 backdrop-blur-xl p-5 border border-border rounded-[1.5rem] shadow-2xl" style={{ borderLeft: `4px solid ${data.color}` }}>
                    <p className="font-black text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: data.color }}>{data.name} Status</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-foreground text-2xl font-black">{data.value}</span>
                        <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Vehicles</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    const onPieEnter = (_, index) => {
        setActiveIndex(index);
    };

    const handlePieClick = (data, index) => {
        let status = data.name.toUpperCase();
        if (status === 'MAINT.') status = 'MAINTENANCE';
        else if (status === 'CANCEL') status = 'CANCELLED';

        navigate(`/vehicles?status=${status}`);
    };

    // Calculate Vehicle Status Counts
    const statusCounts = {
        DRAFT: vehicles.filter(v => ['DRAFT', 'draft'].includes(v.status)).length,
        AVAILABLE: vehicles.filter(v => ['AVAILABLE', 'available'].includes(v.status)).length,
        RENTED: vehicles.filter(v => ['RENTED', 'rented'].includes(v.status)).length,
        MAINTENANCE: vehicles.filter(v => ['MAINTENANCE', 'maintenance'].includes(v.status)).length,
        CANCEL: vehicles.filter(v => ['CANCEL', 'cancel', 'CANCELLED', 'cancelled'].includes(v.status)).length
    };

    // Prevent crash if no vehicles
    const hasVehicles = vehicles.length > 0;

    const pieData = [
        { name: 'Draft', value: statusCounts.DRAFT, color: '#64748b' }, // Slate
        { name: 'Available', value: statusCounts.AVAILABLE, color: '#10b981' }, // Emerald
        { name: 'Rented', value: statusCounts.RENTED, color: '#3b82f6' }, // Blue
        { name: 'Maint.', value: statusCounts.MAINTENANCE, color: '#f59e0b' }, // Amber
        { name: 'Cancel', value: statusCounts.CANCEL, color: '#ef4444' } // Red
    ];

    const barData = [
        { name: 'Jan', val: 40 },
        { name: 'Feb', val: 75 },
        { name: 'Mar', val: 55 },
        { name: 'Apr', val: 80 },
        { name: 'May', val: 35 },
        { name: 'Jun', val: 90 },
        { name: 'Jul', val: 65 },
        { name: 'Aug', val: 45 },
        { name: 'Sep', val: 85 },
        { name: 'Oct', val: 60 },
    ];


    // Customer View
    if (user?.role === 'CUSTOMER') {
        return (
            <div className="space-y-8 font-sans animate-in fade-in duration-700">
                {/* Welcome Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-12 rounded-[2.5rem] border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden transition-all duration-300">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[100px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-5xl font-black text-foreground mb-3 tracking-tight">Welcome back, <span className="text-primary">{user?.name?.split(' ')[0]}</span>!</h2>
                        <p className="text-muted-foreground text-lg font-medium">Ready for your next adventure? Your premium dashboard awaits.</p>
                    </div>
                    <div className="relative z-10">
                        <Button onClick={() => navigate('/portal/vehicle')} className="bg-primary hover:bg-primary/95 text-primary-foreground font-black px-10 py-8 rounded-[1.5rem] shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 text-lg">
                            <Car className="w-6 h-6" /> Book a Vehicle
                        </Button>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { title: "Active Bookings", value: "1", icon: Clock, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
                        { title: "Upcoming Trips", value: "0", icon: CalendarIcon, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100" },
                        { title: "Loyalty Points", value: "1,250", icon: ShieldCheck, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100" },
                        { title: "Total Miles", value: "540", icon: MapPin, color: "text-indigo-500", bg: "bg-indigo-50", border: "border-indigo-100" }
                    ].map((stat, i) => (
                        <Card key={i} className="bg-card border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all group">
                            <CardContent className="p-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-[0.2em]">{stat.title}</p>
                                        <h3 className="text-4xl font-black text-foreground tracking-tight">{stat.value}</h3>
                                    </div>
                                    <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center ${stat.bg} ${stat.border} border-2 transition-all group-hover:bg-primary group-hover:border-primary group-hover:scale-110 shadow-sm`}>
                                        <stat.icon className={`w-7 h-7 ${stat.color} group-hover:text-white transition-colors`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Recent Activity */}
                <Card className="bg-card/80 backdrop-blur-md border border-border shadow-xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="border-b border-border bg-secondary/30 flex flex-row items-center justify-between py-6 px-8">
                        <CardTitle className="text-foreground text-xl font-black tracking-tight">Recent Activity</CardTitle>
                        <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/5 text-sm font-bold" onClick={() => navigate('/my-bookings')}>
                            View All Bookings
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-secondary/50">
                                    <tr className="border-b border-border text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                                        <th className="px-6 py-4 font-semibold">Vehicle</th>
                                        <th className="px-6 py-4 font-semibold">Dates</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                        <th className="px-6 py-4 font-semibold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-border">
                                    <tr className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-secondary overflow-hidden shrink-0 border border-border group-hover:border-primary/30 transition-colors">
                                                    <img src="https://ui-avatars.com/api/?name=Prius&background=random&size=200" alt="Car" className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-foreground">Toyota Prius 2023</p>
                                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">CAB-4921</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-foreground">Oct 25 - Oct 28</p>
                                            <span className="text-xs text-muted-foreground font-medium">3 Days</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary font-bold" onClick={() => navigate('/my-bookings')}>Details</Button>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-secondary overflow-hidden shrink-0 flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors">
                                                    <Car className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-foreground">Honda Vezel 2021</p>
                                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">CBE-1102</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-foreground">Sep 10 - Sep 12</p>
                                            <span className="text-xs text-muted-foreground font-medium">2 Days</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">Completed</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary font-bold" onClick={() => navigate('/my-bookings')}>Details</Button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Calculate Dynamic Height based on "busiest" day
    // This ensures we have enough space to show all events without "+ X more"
    const getMaxEventsPerDay = () => {
        const counts = {};
        events.forEach(ev => {
            const dateKey = moment(ev.start).format('YYYY-MM-DD');
            counts[dateKey] = (counts[dateKey] || 0) + 1;
        });
        return Math.max(0, ...Object.values(counts));
    };

    const maxEvents = getMaxEventsPerDay();
    // Base height (800) + (Max events * 40px estimated height * 5 weeks)
    // We cap it somewhat but ensure it grows.
    const calendarHeight = Math.max(800, maxEvents * 45 * 5 + 100);

    const handleLineClick = () => {
        navigate('/bookings/contracts?status=IN_PROGRESS');
    };

    return (
        <div className="space-y-8 font-sans transition-colors duration-300">

            {/* Header / Title */}
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-5xl font-black text-foreground tracking-tighter">Dashboard</h2>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground bg-secondary/80 px-5 py-2 rounded-full border border-border shadow-sm">Real-time status: Active</span>
                </div>
            </div>

            {/* Calendar Section - Redesigned */}
            <Card className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden transition-all duration-500">
                <CardHeader className="py-8 px-10 border-b border-border bg-secondary/20 flex flex-row items-center justify-between">
                    <CardTitle className="text-foreground font-black tracking-tight flex items-center gap-3 text-xl">
                        <CalendarIcon className="w-6 h-6 text-primary" />
                        Bookings Calendar
                    </CardTitle>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#ffff00]/10 border border-[#ffff00]/20 rounded-full text-[#ffff00] shadow-[0_0_15px_rgba(255,255,0,0.1)]">
                            <div className="w-2 h-2 rounded-full bg-[#ffff00] shadow-[0_0_8px_#ffff00]"></div> Upcoming
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#53FE5C]/10 border border-[#53FE5C]/20 rounded-full text-[#53FE5C] shadow-[0_0_15px_rgba(83,254,92,0.1)]">
                            <div className="w-2 h-2 rounded-full bg-[#53FE5C] shadow-[0_0_8px_#53FE5C]"></div> In Progress
                        </div>
                        <div className="text-muted-foreground ml-2 italic hidden md:block">* Click event to view contract</div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="min-h-[800px] p-6 text-foreground" style={{ height: calendarHeight }}>
                        <Calendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            eventPropGetter={eventStyleGetter}
                            components={{
                                toolbar: CustomToolbar
                            }}
                            views={{ month: true, week: true, day: true, year: YearViewWrapper }}
                            messages={{ year: 'Year Scheduler' }}
                            view={view}
                            onView={handleViewChange}
                            date={date}
                            onNavigate={setDate}
                            onSelectEvent={handleSelectEvent}
                            popup={false} // Disable popup to force 'Show All' behavior if height allows (or just list them)
                            showAllEvents={true}
                            className="saas-calendar"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Top Row: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Real-Time Fleet Activity (Line Chart) */}
                <Card className="lg:col-span-2 bg-card border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2.5rem] overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between py-8 px-10 border-b border-border bg-secondary/20">
                        <div>
                            <CardTitle className="text-foreground font-black tracking-tight text-xl">Real-Time Fleet Activity</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-sm group-hover:bg-primary/5 group-hover:text-primary transition-all">
                            <span>All days</span>
                            <MoreVertical className="w-3 h-3" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 pl-0">
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={lineData}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    onClick={handleLineClick}
                                    className="cursor-pointer"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
                                    <XAxis dataKey="name" stroke="currentColor" fontSize={10} tickLine={false} axisLine={false} strokeOpacity={0.5} />
                                    <YAxis stroke="currentColor" fontSize={10} tickLine={false} axisLine={false} strokeOpacity={0.5} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '1rem', border: '1px solid var(--border)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                                    />
                                    <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={4} dot={{ r: 6, fill: 'var(--background)', strokeWidth: 3, stroke: 'var(--primary)' }} activeDot={{ r: 8, fill: 'var(--primary)', stroke: 'white', strokeWidth: 2 }} />
                                    <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} strokeOpacity={0.2} activeDot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Maintenance Alerts (Pie Chart) */}
                <Card className="bg-card border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="py-8 px-10 border-b border-border bg-secondary/20">
                        <CardTitle className="text-foreground font-black tracking-tight text-xl">Fleet Status</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center pt-6">
                        <div className="h-[200px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    {hasVehicles ? (
                                        <Pie
                                            activeIndex={activeIndex}
                                            activeShape={renderActiveShape}
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                            onMouseEnter={onPieEnter}
                                            onClick={handlePieClick}
                                            className="cursor-pointer"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.color}
                                                    fillOpacity={0.8}
                                                    stroke="var(--border)"
                                                    strokeWidth={1}
                                                    className="cursor-pointer hover:opacity-100 transition-opacity"
                                                />
                                            ))}
                                        </Pie>
                                    ) : (
                                        <text x="50%" y="50%" textAnchor="middle" fill="currentColor" className="text-muted-foreground text-xs font-bold uppercase tracking-widest">No Data</text>
                                    )}
                                    <Tooltip content={<CustomPieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full mt-4 space-y-2">
                            {pieData.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                                        <span className="text-muted-foreground font-bold text-xs uppercase tracking-wider">{item.name}</span>
                                    </div>
                                    <span className="text-foreground font-black text-sm">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Row: Bar Chart & Map Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Maintenance Costs */}
                <Card className="bg-card border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="py-8 px-10 border-b border-border bg-secondary/20">
                        <CardTitle className="text-foreground font-black tracking-tight text-xl">Maintenance Costs</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-10 px-8">
                        <div className="h-[220px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 800 }}
                                        dy={10}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'var(--secondary)', opacity: 0.4 }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-card/95 backdrop-blur-xl p-4 border border-border rounded-2xl shadow-2xl">
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Maintenance</p>
                                                        <p className="text-xl font-black text-foreground">Rs. {payload[0].value.toLocaleString()}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="val" fill="#FA5A28" radius={[6, 6, 0, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Map Mockup */}
                <Card className="lg:col-span-2 bg-card border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2.5rem] overflow-hidden relative group">
                    <CardHeader className="pb-2 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-card to-transparent pointer-events-none">
                        <CardTitle className="text-foreground font-black tracking-tight text-xl px-10 py-8">Live Fleet Tracking</CardTitle>
                    </CardHeader>
                    <div className="w-full h-[350px] bg-secondary/30 relative overflow-hidden">
                        {/* Abstract Map Pattern */}
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

                        {/* Pulse Indicators */}
                        <div className="absolute top-[40%] left-[30%] group/pin">
                            <div className="absolute -inset-4 bg-orange-500/20 rounded-full animate-ping"></div>
                            <div className="relative w-4 h-4 bg-orange-500 rounded-full shadow-[0_0_20px_rgba(250,90,40,0.4)] border-2 border-white cursor-pointer group-hover/pin:scale-125 transition-transform"></div>
                        </div>

                        <div className="absolute top-[60%] left-[70%] group/pin">
                            <div className="absolute -inset-4 bg-primary/20 rounded-full animate-ping [animation-delay:1s]"></div>
                            <div className="relative w-4 h-4 bg-primary rounded-full shadow-[0_0_20px_rgba(250,90,40,0.4)] border-2 border-white cursor-pointer group-hover/pin:scale-125 transition-transform"></div>
                        </div>

                        <div className="absolute top-[20%] left-[60%] group/pin">
                            <div className="absolute -inset-4 bg-emerald-500/20 rounded-full animate-ping [animation-delay:0.5s]"></div>
                            <div className="relative w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] border-2 border-white cursor-pointer group-hover/pin:scale-125 transition-transform"></div>
                        </div>
                    </div>
                </Card>
            </div>

            <style>{`
                /* Calendar Theme Overrides */
                .saas-calendar .rbc-month-view, 
                .saas-calendar .rbc-time-view, 
                .saas-calendar .rbc-agenda-view {
                    border: 1px solid var(--border) !important;
                    background: transparent !important;
                }
                .saas-calendar .rbc-header {
                    border-bottom: 2px solid var(--border) !important;
                    padding: 16px 0;
                    color: var(--muted-foreground);
                    font-size: 0.65rem;
                    text-transform: uppercase;
                    letter-spacing: 0.25em;
                    font-weight: 900;
                    background: var(--secondary)/20;
                }
                .saas-calendar .rbc-day-bg {
                    border-left: 1px solid var(--border) !important;
                    transition: background 0.2s;
                }
                .saas-calendar .rbc-day-bg:hover {
                    background: var(--primary)/5 !important;
                }
                .saas-calendar .rbc-month-row {
                     overflow: visible !important; 
                }
                
                .saas-calendar .rbc-off-range-bg {
                    background: var(--secondary)/40 !important;
                    opacity: 0.5;
                }
                .saas-calendar .rbc-today {
                    background: var(--primary)/5 !important;
                }
                .saas-calendar .rbc-day-slot .rbc-time-slot {
                    border-top: 1px solid var(--border) !important; 
                }
                .saas-calendar .rbc-time-gutter .rbc-timeslot-group {
                    border-bottom: 1px solid var(--border) !important;
                }
                .saas-calendar .rbc-date-cell {
                    padding: 10px;
                    color: var(--foreground);
                    font-size: 0.85rem;
                    font-weight: 800;
                    opacity: 0.8;
                }
                .saas-calendar .rbc-event {
                    background: transparent;
                    padding: 0 !important;
                }
                .saas-calendar .rbc-event:hover {
                     transform: translateY(-2px);
                     z-index: 50;
                     filter: brightness(1.1);
                }
                .rbc-show-more {
                    font-weight: 800;
                    color: var(--primary);
                    background: var(--primary)/10;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    text-transform: uppercase;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(100, 100, 100, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(100, 100, 100, 0.2);
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
