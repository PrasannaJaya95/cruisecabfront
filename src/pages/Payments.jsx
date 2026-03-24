import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { Plus, Trash2, Search, Filter, Coins, CreditCard, Receipt, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import PaymentWizard from '@/components/PaymentWizard';
import SuccessWizard from '@/components/SuccessWizard';
import { cn } from "@/lib/utils";

const Payments = () => {
    const [payments, setPayments] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Application Wizard State
    const [wizardOpen, setWizardOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });



    useEffect(() => {
        fetchPayments();
        fetchVehicles();
        fetchCustomers();
    }, []);

    const fetchPayments = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/payments`);
            setPayments(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching payments:', error);
            setLoading(false);
        }
    };

    const fetchVehicles = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/payments/vehicles`);
            setVehicles(response.data);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/clients`);
            setCustomers(response.data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const handleWizardSubmit = async (wizardData) => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/payments`, wizardData);
            setWizardOpen(false);
            setSuccessMessage({
                title: "Payment Recorded!",
                message: "The payment has been successfully added to the system."
            });
            setSuccessOpen(true);
            fetchPayments();
            fetchVehicles();
        } catch (error) {
            console.error('Error creating payment:', error);
            alert('Failed to create payment');
        }
    };



    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this payment?')) {
            try {
                await axios.delete(`${import.meta.env.VITE_API_URL}/payments/${id}`);
                fetchPayments();
                fetchVehicles();
            } catch (error) {
                console.error('Error deleting payment:', error);
            }
        }
    };

    const filteredPayments = payments.filter(payment =>
        (payment.booking?.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (payment.booking?.vehicle?.licensePlate || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-10 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative">
                    <h2 className="text-5xl font-black text-foreground tracking-tighter mb-2 italic">Financial Ledger</h2>
                    <p className="text-muted-foreground font-medium text-lg italic opacity-70">"Real-time transaction monitoring and revenue tracking."</p>
                </div>
                <Button
                    onClick={() => setWizardOpen(true)}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-black px-8 py-7 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs"
                >
                    <Plus className="h-5 w-5" /> Add New Payment
                </Button>
            </div>

            {/* Controls & Search Bar */}
            <div className="flex flex-wrap items-center gap-4 bg-card/50 backdrop-blur-md p-5 rounded-[2rem] border border-border shadow-sm">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Scan registry by name, credential, or contact..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 bg-secondary/50 border-border rounded-2xl h-12 text-sm font-medium focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Select value="all">
                        <SelectTrigger className="w-44 bg-secondary/50 border-border h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-secondary">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-primary" />
                                <SelectValue placeholder="Status" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border">
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="PAID">Paid</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <PaymentWizard
                open={wizardOpen}
                onOpenChange={setWizardOpen}
                vehicles={vehicles}
                customers={customers}
                onSubmit={handleWizardSubmit}
                loading={false}
            />

            <SuccessWizard
                open={successOpen}
                onOpenChange={setSuccessOpen}
                title={successMessage.title}
                message={successMessage.message}
                onAction={(action) => {
                    setSuccessOpen(false);
                    if (action === 'add_another') {
                        setTimeout(() => setWizardOpen(true), 200);
                    }
                }}
            />

            {/* Table Section */}
            <Card className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300">
                <Table>
                    <TableHeader className="bg-secondary/20">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6 pl-8">Client Detail</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Asset Reference</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Valuation</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Timeline</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">Protocol</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6">State</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-6 text-right pr-8">Control</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-20">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                        <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">Loading Records...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredPayments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2 opacity-40">
                                        <Search className="h-10 w-10 mb-2" />
                                        <span className="text-sm font-black uppercase tracking-widest">No payments found</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPayments.map((payment) => (
                                <TableRow key={payment.id} className="group border-border hover:bg-primary/[0.01] transition-colors">
                                    <TableCell className="py-6 px-8">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary font-black text-sm border border-primary/10 group-hover:scale-110 transition-transform">
                                                {(payment.booking?.client?.name || 'U')[0]}
                                            </div>
                                            <div className="font-bold text-foreground">
                                                {payment.booking?.client?.name || 'Unknown'}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-sm tracking-tight text-foreground uppercase">{payment.booking?.vehicle?.licensePlate || 'Unknown'}</span>
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{payment.booking?.vehicle?.vehicleModel?.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <span className="text-base font-black text-foreground">
                                            Rs. {parseFloat(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">
                                            {format(new Date(payment.date), 'MMM dd, yyyy')}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-secondary text-secondary-foreground border border-border">
                                            {payment.method.replace('_', ' ')}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <span className={cn("inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-sm border",
                                            payment.status === 'PAID' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                payment.status === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                    "bg-rose-50 text-rose-600 border-rose-100"
                                        )}>
                                            <span className={cn("mr-2 h-1.5 w-1.5 rounded-full",
                                                payment.status === 'PAID' ? "bg-emerald-500" :
                                                    payment.status === 'PENDING' ? "bg-amber-500" : "bg-rose-500"
                                            )}></span>
                                            {payment.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-6 px-8 text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all hover:-rotate-12"
                                            onClick={() => handleDelete(payment.id)}
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};

export default Payments;
