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
    Mail,
    Info,
    Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logoPng from '../assets/logo.png';
import logoWhitePng from '../assets/rentix_logo_white.png';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import { isAdminOrSuperAdmin as checkAdminOrSuperAdmin } from '../lib/roles';

const DashboardLayout = () => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        // Sync theme with localStorage changes (e.g. from ThemeToggle)
        const handleThemeChange = () => {
            setTheme(localStorage.getItem('theme') || 'light');
        };
        window.addEventListener('storage', handleThemeChange);
        
        // Also check for class changes on documentElement
        const observer = new MutationObserver(() => {
            const isDark = document.documentElement.classList.contains('dark');
            setTheme(isDark ? 'dark' : 'light');
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => {
            window.removeEventListener('storage', handleThemeChange);
            observer.disconnect();
        };
    }, []);

    const isAdminOrSuperAdmin = checkAdminOrSuperAdmin(user?.role);

    const settingsMenuChildren = [
        { label: 'General Settings', path: '/settings/general' },
        { label: 'Company Profile Setup', path: '/settings/company' },
        { label: 'User Registry', path: '/settings/users' },
        { label: 'Security Policies', path: '/settings/permissions' },
        { label: 'Email Notifications', path: '/settings/email' },
        ...(isAdminOrSuperAdmin
            ? [{ label: 'System Backup', path: '/settings/system-backup' }]
            : []),
    ];

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
                { label: 'Fleet Categories', path: '/fleet/categories' },
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
                {
                    label: 'Accounting',
                    children: [
                        { label: 'P&L Reports', path: '/fleet/reports-pl' },
                        { label: 'Customer payment due (aging)', path: '/reports/customer-aging' },
                    ],
                },
                {
                    label: 'Operation',
                    children: [
                        { label: 'Overdue rental contracts', path: '/reports/overdue-contracts' },
                        { label: 'Vehicle contract expiry details', path: '/reports/contract-expiry' },
                    ],
                },
            ]
        },
        {
            label: 'Booking',
            icon: CalendarDays,
            children: [
                { label: 'Quotations', path: '/bookings/quotations' },
                { label: 'Contracts', path: '/bookings/contracts' },
                { label: 'Invoices', path: '/bookings/invoices' },
                { label: 'Advance receipts', path: '/bookings/advance-receipts' },
                { label: 'Agreements', path: '/bookings/agreements' },
                { label: 'Payments', path: '/bookings/payments' }
            ]
        },
        {
            label: 'Settings',
            icon: Settings,
            children: settingsMenuChildren,
        },
        { label: 'About', icon: Info, path: '/about' },
    ];

    const customerNavItems = [
        { label: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Browse Vehicles', icon: Car, path: '/portal/vehicle' },
        { label: 'My Bookings', icon: CalendarDays, path: '/my-bookings' },
        { label: 'My Account', icon: Users, path: '/my-profile' },
        { label: 'About', icon: Info, path: '/about' },
    ];

    const navItems = user?.role === 'CUSTOMER' ? customerNavItems : adminNavItems;
    const [expandedMenus, setExpandedMenus] = useState([]);

    const toggleMenu = (label) => {
        setExpandedMenus(prev => {
            if (prev.includes(label)) {
                return prev.filter(item => item !== label);
            }
            
            // If it's a top-level menu (no colon), collapse everything else
            if (!label.includes(':')) {
                return [label];
            }

            // If it's a nested menu, collapse its siblings at the same level
            const parts = label.split(':');
            const parentPath = parts.slice(0, -1).join(':') + ':';
            return [...prev.filter(item => !item.startsWith(parentPath)), label];
        });
    };

    const handleLinkClick = (lineage = []) => {
        setExpandedMenus(lineage);
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    };

    const isPathActive = (item) => {
        if (location.pathname === item.path) return true;
        if (item.children) {
            return item.children.some(child => {
                if (child.path === location.pathname) return true;
                if (child.children) {
                    return child.children.some(grandChild => grandChild.path === location.pathname);
                }
                return false;
            });
        }
        return false;
    };

    const activeStyles = "bg-[#3B82F6] text-white shadow-lg shadow-primary/20";
    const inactiveStyles = "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white";

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950 text-foreground flex font-sans selection:bg-primary/30">
            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 border-r border-border/50 print:hidden",
                !sidebarOpen && "-translate-x-full"
            )}
            >
                <div className="h-full flex flex-col relative overflow-hidden">

                    <div className="p-6 pb-4 flex flex-col gap-6 relative z-10">
                        <div className="flex items-center justify-between w-full">
                            <Link to="/" className="flex items-center w-full group">
                                <div className="w-full transition-all group-hover:scale-105">
                                    <img
                                        src={theme === 'dark' ? logoWhitePng : logoPng}
                                        alt="Rentix"
                                        className="w-full h-auto object-contain max-h-18"
                                    />
                                </div>
                            </Link>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                        {import.meta.env.DEV && (
                            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300">
                                Cruise Cabs · :5174 · API :5004
                            </div>
                        )}
                    </div>


                    <nav className="flex-1 px-6 py-4 space-y-1 overflow-y-auto relative z-10 custom-scrollbar">
                        {navItems.map((item, index) => (
                            <div key={index}>
                                {item.children ? (
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => toggleMenu(item.label)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-all duration-150 group",
                                                isPathActive(item) ? activeStyles : inactiveStyles
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className={cn("h-5 w-5 transition-colors", isPathActive(item) ? "text-white" : "text-slate-400 group-hover:text-[#3B82F6]")} />
                                                {item.label}
                                            </div>
                                            <motion.div 
                                                animate={{ rotate: expandedMenus.includes(item.label) ? 90 : 0 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95695 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95695 3.32394 6.1584 3.13508Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                                </svg>
                                            </motion.div>
                                        </button>

                                        <AnimatePresence initial={false}>
                                            {expandedMenus.includes(item.label) && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                                    className="pl-4 space-y-1 mt-2 relative overflow-hidden"
                                                >
                                                    <div className="absolute left-6 top-0 bottom-4 w-[1px] bg-primary/20"></div>
                                                    {item.children.map((child) => {
                                                        if (child.children) {
                                                            const groupKey = `${item.label}:${child.label}`;
                                                            const isGroupOpen = expandedMenus.includes(groupKey);
                                                            const isChildActive = child.children.some(gc => gc.path === location.pathname);

                                                            return (
                                                                <div key={groupKey} className="space-y-1">
                                                                    <button
                                                                        onClick={() => toggleMenu(groupKey)}
                                                                        className={cn(
                                                                            "w-full flex items-center justify-between pl-10 pr-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-150",
                                                                            isChildActive ? "text-[#3B82F6] bg-[#3B82F6]/5" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                                                                        )}
                                                                    >
                                                                        <span>{child.label}</span>
                                                                        <motion.span 
                                                                            animate={{ rotate: isGroupOpen ? 90 : 0 }}
                                                                            transition={{ duration: 0.15 }}
                                                                        >
                                                                            <svg width="10" height="10" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                <path d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95695 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95695 3.32394 6.1584 3.13508Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                                                            </svg>
                                                                        </motion.span>
                                                                    </button>
                                                                    <AnimatePresence initial={false}>
                                                                        {isGroupOpen && (
                                                                            <motion.div 
                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                                                                className="pl-3 space-y-1 overflow-hidden"
                                                                            >
                                                                                {child.children.map((grandChild) => (
                                                                                    <Link
                                                                                        key={grandChild.path}
                                                                                        to={grandChild.path}
                                                                                        onClick={() => handleLinkClick([item.label, groupKey])}
                                                                                        className={cn(
                                                                                            "block pl-10 pr-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 relative",
                                                                                            location.pathname === grandChild.path
                                                                                                ? "bg-[#3B82F6] text-white shadow-md"
                                                                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                                                                                        )}

                                                                                    >
                                                                                        {grandChild.label}
                                                                                    </Link>
                                                                                ))}
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <Link
                                                                key={child.path}
                                                                to={child.path}
                                                                onClick={() => handleLinkClick([item.label])}
                                                                className={cn(
                                                                    "block pl-10 pr-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 relative",
                                                                    location.pathname === child.path
                                                                        ? "bg-[#3B82F6] text-white shadow-md"
                                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                                                                )}
                                                            >

                                                                {child.label}
                                                            </Link>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <Link
                                        to={item.path}
                                        onClick={() => handleLinkClick([])}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 group",
                                            isPathActive(item) ? activeStyles : inactiveStyles
                                        )}
                                    >
                                        <item.icon className={cn("h-5 w-5 transition-colors", isPathActive(item) ? "text-white" : "text-slate-400 group-hover:text-[#3B82F6]")} />
                                        {item.label}
                                    </Link>

                                )}
                            </div>
                        ))}
                    </nav>

                    <div className="p-6 border-t border-border/50">
                        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                            <div className="h-9 w-9 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white font-bold shadow-sm">
                                {user?.name?.[0] || 'U'}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate uppercase font-medium tracking-wider">
                                    {user?.role?.replace('_', ' ').toLowerCase()}
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg font-bold text-xs" onClick={logout}>
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </Button>

                        <div className="mt-8 px-4 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 dark:text-slate-700">Powered by Rentix</p>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1">Codebraze PVT LTD</p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#F3F4F6] dark:bg-slate-950 relative">

                <header className="h-24 sticky top-0 z-40 px-10 flex items-center justify-between print:hidden">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground" onClick={() => setSidebarOpen(true)}>
                            <Menu className="h-6 w-6" />
                        </Button>
                        <div className="flex flex-col">
                            {/* Intentionally blank: avoid repeating "Dashboard" on every page */}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 pr-4 rounded-xl shadow-sm">
                        <div className="relative hidden lg:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search everything..."
                                className="h-9 pl-10 pr-4 bg-transparent border-none rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400 w-64 transition-all"
                            />
                        </div>
                        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 hidden lg:block"></div>
                        <ThemeToggle />
                        <button className="relative p-2 text-slate-500 hover:text-[#3B82F6] transition-colors">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 h-2 w-2 bg-[#EF4444] rounded-full border-2 border-white dark:border-slate-900"></span>
                        </button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                    <Settings className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-xl mt-2" align="end">
                                <div className="space-y-1">
                                    <div className="px-3 py-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Settings</p>
                                    </div>
                                    <Link to="/settings/general" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#3B82F6] hover:bg-[#3B82F6]/5 transition-colors group">
                                        <Settings className="h-4 w-4" /> Infrastructure
                                    </Link>
                                    <Link to="/settings/users" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#3B82F6] hover:bg-[#3B82F6]/5 transition-colors group">
                                        <Users className="h-4 w-4" /> Personnel
                                    </Link>
                                    <Link to="/settings/permissions" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#3B82F6] hover:bg-[#3B82F6]/5 transition-colors group">
                                        <ShieldCheck className="h-4 w-4" /> Security
                                    </Link>
                                    <Link to="/settings/email" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#3B82F6] hover:bg-[#3B82F6]/5 transition-colors group">
                                        <Mail className="h-4 w-4" /> Email
                                    </Link>
                                    <Link to="/settings/company" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#3B82F6] hover:bg-[#3B82F6]/5 transition-colors group">
                                        <FileText className="h-4 w-4" /> Company
                                    </Link>
                                    {isAdminOrSuperAdmin && (
                                        <Link to="/settings/system-backup" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#3B82F6] hover:bg-[#3B82F6]/5 transition-colors group">
                                            <Database className="h-4 w-4" /> System Backup
                                        </Link>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                </header>

                <main className="flex-1 p-10 overflow-auto relative z-10 custom-scrollbar print:p-6">
                    <Outlet />

                    <footer className="mt-20 py-8 border-t border-border/50 text-center space-y-2 opacity-50 print:hidden">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Powered by Rentix</p>
                        <p className="text-[9px] font-bold text-muted-foreground italic">All rights reserved. Codebraze PVT LTD | 070 2 78 78 73 | www.codebraze.lk</p>
                    </footer>
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
