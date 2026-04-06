import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Database, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react";
import api from '../lib/api';
import { cn } from "@/lib/utils";

const DemoDataWizard = ({ open, onOpenChange }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleExecute = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/system/load-demo-data');
            setResult(response.data.summary);
            setStep(3);
        } catch (err) {
            console.error('Demo data error:', err);
            setError(err.response?.data?.message || 'Failed to load demo data');
            setStep(3);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep(1);
        setResult(null);
        setError(null);
        setLoading(false);
    };

    const handleClose = () => {
        if (!loading) {
            onOpenChange(false);
            setTimeout(reset, 300);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-border bg-card shadow-2xl p-0 overflow-hidden font-calibri">
                {/* Header with Progress Bar */}
                <div className="h-1.5 w-full bg-secondary/30">
                    <div
                        className="h-full bg-primary transition-all duration-500 ease-in-out"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>
                <DialogTitle className="sr-only">Demo Data Loading Wizard</DialogTitle>
                <DialogDescription className="sr-only">Populates the rental system with simulated business data for testing.</DialogDescription>

                <div className="p-8 space-y-6">
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <DialogHeader>
                                <div className="p-4 w-fit bg-primary/10 rounded-2xl border border-primary/10 mb-4">
                                    <Database className="w-8 h-8 text-primary" />
                                </div>
                                <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-foreground font-calibri-bold">
                                    Demo Environment Setup
                                </DialogTitle>
                                <DialogDescription className="text-base font-bold opacity-70 mt-2 font-calibri">
                                    Ready to populate the rentix ecosystem with industrial-grade demo entities?
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                {[
                                    { label: 'Vehicles', count: 25, sub: '8 Brands / 16 Models' },
                                    { label: 'Vendors', count: 5, sub: 'Partner Fleet Owners' },
                                    { label: 'Repairs', count: 20, sub: 'Maintenance History' },
                                    { label: 'Expenses', count: 30, sub: 'Operational Costs' },
                                    { label: 'Bookings', count: 20, sub: 'Invoices & Payments' },
                                    { label: 'ODOMETERS', count: 60, sub: 'Distance Tracking' },
                                ].map((item, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-secondary/20 border border-border/50 group hover:bg-secondary/30 transition-all">
                                        <p className="text-2xl font-black text-primary font-calibri-bold">+{item.count}</p>
                                        <p className="text-xs font-black uppercase tracking-widest text-foreground font-calibri-bold">{item.label}</p>
                                        <p className="text-xs font-bold text-muted-foreground opacity-60 font-calibri">{item.sub}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <DialogHeader>
                                <div className="p-4 w-fit bg-amber-500/10 rounded-2xl border border-amber-500/10 mb-4">
                                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                                </div>
                                <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-foreground font-calibri-bold">
                                    Final Authorization
                                </DialogTitle>
                                <DialogDescription className="text-base font-bold opacity-70 mt-2 font-calibri">
                                    This action will write significant amounts of data to the primary repository.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-2xl mt-6">
                                <ul className="space-y-3">
                                    {[
                                        'New records will be appended to existing data.',
                                        'Unique constraints (NIC, Email) are preserved.',
                                        'Image assets are linked from cloud repositories.',
                                        'Operation cannot be automatically rolled back.'
                                    ].map((text, i) => (
                                        <li key={i} className="flex gap-3 items-start">
                                            <div className="w-1 h-1 rounded-full bg-amber-500 mt-2 shrink-0" />
                                            <p className="text-xs font-bold text-amber-700/80 font-calibri">{text}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 py-4 text-center">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center space-y-6 py-8">
                                    <div className="relative">
                                        <div className="w-20 h-20 border-4 border-primary/10 rounded-full animate-spin border-t-primary" />
                                        <Database className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black uppercase tracking-tighter font-calibri-bold">Synchronizing Assets</h3>
                                        <p className="text-sm font-bold text-muted-foreground font-calibri">Committing demo records to persistent storage...</p>
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center space-y-6 py-8">
                                    <div className="p-6 bg-rose-500/10 rounded-full border border-rose-500/20">
                                        <AlertTriangle className="w-12 h-12 text-rose-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-rose-600 font-calibri-bold">Sync Failure</h3>
                                        <p className="text-sm font-bold text-muted-foreground/60 max-w-xs font-calibri">{error}</p>
                                    </div>
                                    <Button
                                        onClick={reset}
                                        className="h-12 px-8 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-black uppercase tracking-widest text-xs font-calibri-bold"
                                    >
                                        Return to Source
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center space-y-6 py-8">
                                    <div className="p-6 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black uppercase tracking-tighter text-emerald-600 font-calibri-bold">Nexus Loaded</h3>
                                        <p className="text-sm font-bold text-muted-foreground font-calibri">Repository has been successfully populated.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-4">
                                        {result && Object.entries(result).map(([key, val], i) => (
                                            <div key={i} className="px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-calibri-bold mr-2">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </p>
                                                <p className="text-lg font-black text-emerald-600 font-calibri-bold">+{val}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="p-0 sm:justify-between gap-4">
                        {step === 1 && (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={handleClose}
                                    className="h-14 px-6 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-secondary font-calibri-bold"
                                >
                                    Abort
                                </Button>
                                <Button
                                    onClick={handleNext}
                                    className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-primary/20 font-calibri-bold"
                                >
                                    Proceed <ArrowRight className="w-4 h-4" />
                                </Button>
                            </>
                        )}
                        {step === 2 && (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    disabled={loading}
                                    className="h-14 px-6 rounded-2xl font-black uppercase tracking-widest text-xs gap-2 hover:bg-secondary font-calibri-bold"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Calibration
                                </Button>
                                <Button
                                    onClick={handleExecute}
                                    disabled={loading}
                                    className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-primary/20 font-calibri-bold"
                                >
                                    Flash Data <Database className="w-4 h-4" />
                                </Button>
                            </>
                        )}
                        {step === 3 && !loading && (
                            <Button
                                onClick={handleClose}
                                className="w-full h-14 rounded-2xl bg-foreground text-background font-black uppercase tracking-widest text-xs hover:bg-foreground/90 transition-all font-calibri-bold"
                            >
                                Terminate Protocol
                            </Button>
                        )}
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default DemoDataWizard;
