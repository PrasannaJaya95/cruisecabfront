import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Car,
    CalendarDays,
    Users,
    LogOut,
    Settings,
    Menu,
    X,
    Bell,
    Search,
    ShieldCheck,
    FileText,
    Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logoInternal from '../assets/logo_internal.png';
import ThemeToggle from '../components/ThemeToggle';
import api, { resolveServerUrl } from '@/lib/api';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

const DashboardLayout = () => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [websiteLogo, setWebsiteLogo] = useState(null);
    const [companyName, setCompanyName] = useState('');
    const [companyLogo, setCompanyLogo] = useState(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const [websiteLogoRes, companyNameRes, companyLogoRes] = await Promise.all([
                    api.get('/settings/website_logo'),
                    api.get('/settings/company_name'),
                    api.get('/settings/company_logo'),
                ]);

                if (websiteLogoRes.data.value && websiteLogoRes.data.value !== 'false') {
                    setWebsiteLogo(resolveServerUrl(websiteLogoRes.data.value));
                }
                setCompanyName(companyNameRes.data.value !== 'false' ? (companyNameRes.data.value || '') : '');
                const rawCompanyLogo = companyLogoRes.data.value !== 'false' ? (companyLogoRes.data.value || null) : null;
                setCompanyLogo(rawCompanyLogo ? resolveServerUrl(rawCompanyLogo) : null);
            } catch (err) {
                console.error("Failed to fetch website branding", err);
            }
        };
        fetchSettings();
    }, []);

    const companyLogoToShow = companyLogo || websiteLogo;
    const showCompanyBrand = !!companyName?.trim();

    const adminNavItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        {
            label: 'Contacts',
            icon: Users,
            children: [
                { label: 'Customers', path: '/customers' },
                { label: 'Drivers', path: '/drivers' },
                { label: 'Vendors', path: '/vendors' }
            ]
        },
        {
            label: 'Fleet',
            icon: Car,
            children: [
                { label: 'Vehicle Brand', path: '/fleet/brands' },
                { label: 'Vehicle Model', path: '/fleet/models' },
                { label: 'Vehicle', path: '/vehicles' },
                { label: 'Odometer', path: '/fleet/odometers' },
                { label: 'Vehicle Repair', path: '/fleet/repairs' },
                { label: 'Vehicle Expenses', path: '/fleet/expenses' },
                { label: 'Vehicle Vendor Bill', path: '/fleet/vendor-bills' }
            ]
        },
        {
            label: 'Reports',
            icon: FileText,
            children: [
                { label: 'P&L Reports', path: '/fleet/reports-pl' }
            ]
        },
        {
            label: 'Booking',
            icon: CalendarDays,
            children: [
                { label: 'Quotations', path: '/bookings/quotations' },
                { label: 'Contracts', path: '/bookings/contracts' },
                { label: 'Invoices', path: '/bookings/invoices' },
                { label: 'Payments', path: '/bookings/payments' }
            ]
        },
        {
            label: 'System',
            icon: Settings,
            children: [
                { label: 'General Settings', path: '/settings/general' },
                { label: 'Company Profile Setup', path: '/settings/company' },
                { label: 'User Registry', path: '/settings/users' },
                { label: 'Security Policies', path: '/settings/permissions' },
                { label: 'Email Notifications', path: '/settings/email' }
            ]
        },
    ];

    const customerNavItems = [
        { label: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Browse Vehicles', icon: Car, path: '/portal/vehicle' },
        { label: 'My Bookings', icon: CalendarDays, path: '/my-bookings' },
        { label: 'My Account', icon: Users, path: '/my-profile' },
    ];

    const navItems = user?.role === 'CUSTOMER' ? customerNavItems : adminNavItems;
    const [expandedMenus, setExpandedMenus] = useState([]);

    const toggleMenu = (label) => {
        setExpandedMenus(prev =>
            prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]
        );
    };

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950 text-foreground flex font-sans selection:bg-primary/30">
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-4 z-50 w-72 my-4 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:bg-transparent",
                    !sidebarOpen && "-translate-x-[110%] md:hidden"
                )}
            >
                <div className="h-full flex flex-col relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] shadow-2xl shadow-black/[0.03]">
                    {/* Glow Effect */}
                    <div className="absolute top-0 left-0 w-full h-[300px] bg-primary/5 blur-[80px] pointer-events-none animate-pulse"></div>

                    <div className="p-8 flex items-center justify-between relative z-10">
                        <Link to="/" className="flex flex-col items-start group gap-1">
                            {showCompanyBrand ? (
                                <>
                                    {companyLogoToShow ? (
                                        <img
                                            src={companyLogoToShow}
                                            alt={companyName || 'Company Logo'}
                                            className="h-10 w-10 rounded object-contain bg-white/60"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded bg-secondary/40 flex items-center justify-center text-foreground font-black text-sm">
                                            C
                                        </div>
                                    )}

                                    <span className="text-[13px] md:text-sm font-black tracking-tight uppercase text-foreground">
                                        {companyName.trim()}
                                    </span>

                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="h-6 w-6 bg-[#FA5A28] rounded flex items-center justify-center text-white font-bold text-[12px]">
                                            R
                                        </div>
                                        <span className="text-[13px] md:text-sm font-black tracking-tight uppercase text-primary/90">
                                            Rentix
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="h-10 w-10 bg-[#FA5A28] rounded flex items-center justify-center text-white font-bold text-xl">
                                        R
                                    </div>
                                    <span className="text-[13px] md:text-sm font-black tracking-tight uppercase text-foreground">
                                        Rentix
                                    </span>
                                </div>
                            )}
                        </Link>
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                            <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <nav className="flex-1 px-6 py-4 space-y-1 overflow-y-auto relative z-10 custom-scrollbar">
                        <div className="mb-6 px-4" />
                        {navItems.map((item, index) => (
                            <div key={index}>
                                {item.children ? (
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => toggleMenu(item.label)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-4 py-4 text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all duration-300 group",
                                                expandedMenus.includes(item.label)
                                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className={cn("h-5 w-5 transition-colors", expandedMenus.includes(item.label) ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                                                {item.label}
                                            </div>
                                            <div className={cn("transition-transform duration-300", expandedMenus.includes(item.label) ? "rotate-90 text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                                                <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95695 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95695 3.32394 6.1584 3.13508Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                                </svg>
                                            </div>
                                        </button>

                                        {expandedMenus.includes(item.label) && (
                                            <div className="pl-4 space-y-1 mt-2 relative">
                                                <div className="absolute left-6 top-0 bottom-4 w-[1px] bg-primary/20"></div>
                                                {item.children.map((child) => (
                                                    <Link
                                                        key={child.path}
                                                        to={child.path}
                                                        className={cn(
                                                            "block pl-10 pr-4 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all duration-200 relative",
                                                            location.pathname === child.path
                                                                ? "text-primary bg-primary/5 shadow-sm"
                                                                : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                                        )}
                                                    >
                                                        {child.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Link
                                        to={item.path}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 group",
                                            location.pathname === item.path
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                        )}
                                    >
                                        <item.icon className={cn("h-5 w-5 transition-colors", location.pathname === item.path ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                                        {item.label}
                                    </Link>
                                )}
                            </div>
                        ))}
                    </nav>

                    <div className="p-6 border-t border-border/50 bg-primary/5">
                        <div className="flex items-center gap-3 px-4 py-4 mb-4 rounded-3xl bg-background/50 border border-border/50">
                            <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black shadow-lg shadow-primary/20">
                                {user?.name?.[0] || 'U'}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-[11px] font-black text-foreground uppercase tracking-tight truncate">{user?.name}</p>
                                <p className="text-[9px] text-muted-foreground truncate uppercase font-bold tracking-widest mt-0.5 opacity-60">
                                    {user?.role?.replace('_', ' ').toLowerCase()}
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" className="w-full justify-start gap-4 h-12 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em]" onClick={logout}>
                            <LogOut className="h-4 w-4" />
                            Logoff
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">
                {/* Background Accents */}
                <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-primary/5 blur-[150px] -z-10 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-orange-500/5 blur-[120px] -z-10 pointer-events-none"></div>

                <header className="h-24 sticky top-0 z-40 px-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground" onClick={() => setSidebarOpen(true)}>
                            <Menu className="h-6 w-6" />
                        </Button>
                        <div className="flex flex-col">
                            {/* Intentionally blank: avoid repeating "Dashboard" on every page */}
                        </div>
                    </div>

                    <div className="flex items-center gap-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-border/50 p-2 pr-6 rounded-3xl shadow-2xl shadow-black/[0.02]">
                        <div className="relative hidden lg:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                            <input
                                type="text"
                                placeholder="Global Registry Search..."
                                className="h-11 pl-11 pr-4 bg-transparent border-none rounded-2xl text-xs font-black uppercase tracking-widest text-foreground focus:outline-none placeholder:text-muted-foreground/50 w-64 transition-all"
                            />
                        </div>
                        <div className="h-8 w-[1px] bg-border/50 hidden lg:block"></div>
                        <ThemeToggle />
                        <button className="relative text-muted-foreground hover:text-primary transition-all hover:scale-110 active:scale-90">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-0 right-0 h-2 w-2 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"></span>
                        </button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-primary/5 rounded-2xl hover:scale-110 transition-all">
                                    <Settings className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-border rounded-[2rem] shadow-2xl mt-4" align="end">
                                <div className="space-y-1">
                                    <div className="px-4 py-2 mb-2">
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">System Matrix</p>
                                    </div>
                                    <Link to="/settings/general" className="flex items-center gap-4 px-4 py-3 rounded-2xl text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all group">
                                        <Settings className="h-4 w-4 opacity-50 group-hover:opacity-100" /> Infrastructure
                                    </Link>
                                    <Link to="/settings/users" className="flex items-center gap-4 px-4 py-3 rounded-2xl text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all group">
                                        <Users className="h-4 w-4 opacity-50 group-hover:opacity-100" /> Personnel
                                    </Link>
                                    <Link to="/settings/permissions" className="flex items-center gap-4 px-4 py-3 rounded-2xl text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all group">
                                        <ShieldCheck className="h-4 w-4 opacity-50 group-hover:opacity-100" /> Security
                                    </Link>
                                    <Link to="/settings/email" className="flex items-center gap-4 px-4 py-3 rounded-2xl text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all group">
                                        <Mail className="h-4 w-4 opacity-50 group-hover:opacity-100" /> Email
                                    </Link>
                                    <Link to="/settings/company" className="flex items-center gap-4 px-4 py-3 rounded-2xl text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all group">
                                        <FileText className="h-4 w-4 opacity-50 group-hover:opacity-100" /> Company Profile
                                    </Link>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </header>

                <main className="flex-1 p-10 overflow-auto relative z-10 custom-scrollbar">
                    <Outlet />
                </main>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(var(--foreground-rgb), 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(var(--foreground-rgb), 0.2);
                }
            `}</style>
        </div>
    );
};

export default DashboardLayout;
