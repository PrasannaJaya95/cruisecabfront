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
import { ShieldAlert, AlertTriangle, ArrowRight, ArrowLeft, CheckCircle2, Flame } from "lucide-react";
import api from '../lib/api';
import { cn } from "@/lib/utils";

const DeleteAllDataWizard = ({ open, onOpenChange }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [confirmationText, setConfirmationText] = useState('');

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleExecute = async () => {
        if (confirmationText.toLowerCase() !== 'delete all data') {
            setError('Please type the confirmation phrase exactly.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await api.delete('/system/wipe-all-data');
            setStep(4);
        } catch (err) {
            console.error('System wipe error:', err);
            setError(err.response?.data?.message || 'Failed to wipe system data');
            setStep(4);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep(1);
        setError(null);
        setLoading(false);
        setConfirmationText('');
    };

    const handleClose = () => {
        if (!loading) {
            onOpenChange(false);
            setTimeout(reset, 300);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[550px] rounded-[2rem] border-border bg-card shadow-2xl p-0 overflow-hidden font-calibri">
                {/* Danger Progress Bar */}
                <div className="h-1.5 w-full bg-rose-500/10">
                    <div
                        className="h-full bg-rose-600 transition-all duration-500 ease-in-out"
                        style={{ width: `${(step / 4) * 100}%` }}
                    />
                </div>
                <DialogTitle className="sr-only">Delete All System Data</DialogTitle>
                <DialogDescription className="sr-only">Permanent Wiping Protocol for purging all business records from the ecosystem.</DialogDescription>

                <div className="p-8 space-y-6">
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <DialogHeader>
                                <div className="p-4 w-fit bg-rose-600/10 rounded-2xl border border-rose-600/10 mb-4">
                                    <ShieldAlert className="w-8 h-8 text-rose-600" />
                                </div>
                                <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-foreground font-calibri-bold">
                                    Nuclear Option
                                </DialogTitle>
                                <DialogDescription className="text-sm font-bold opacity-70 mt-2 font-calibri text-muted-foreground">
                                    You are about to initiate a permanent, irreversible wipe of all business data.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="bg-rose-600/5 border border-rose-600/10 p-6 rounded-2xl mt-6">
                                <h4 className="text-xs font-black uppercase tracking-widest text-rose-700 mb-3 font-calibri-bold">Scope of Deletion:</h4>
                                <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    {[
                                        'All Vehicles', 'All Bookings', 'All Contracts', 'All Invoices',
                                        'All Payments', 'All Maintenance', 'All Clients', 'All Drivers',
                                        'All Vendors', 'Models & Brands'
                                    ].map((text, i) => (
                                        <li key={i} className="flex gap-2 items-center">
                                            <div className="w-1 h-1 rounded-full bg-rose-600" />
                                            <span className="text-[10px] font-bold text-rose-700/80 font-calibri">{text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <DialogHeader>
                                <div className="p-4 w-fit bg-rose-600/10 rounded-2xl border border-rose-600/10 mb-4">
                                    <AlertTriangle className="w-8 h-8 text-rose-600" />
                                </div>
                                <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-foreground font-calibri-bold">
                                    Preservation Check
                                </DialogTitle>
                                <DialogDescription className="text-sm font-bold opacity-70 mt-2 font-calibri">
                                    What remains after the purge?
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 mt-6">
                                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 group transition-all">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 font-calibri-bold">Administrative Safeguard</p>
                                    <p className="text-xs font-bold text-emerald-700/70 font-calibri mt-1">
                                        Users with <strong>ADMIN</strong> or <strong>SUPER_ADMIN</strong> roles are NOT deleted. Your account is safe.
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 group transition-all">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 font-calibri-bold">System Settings</p>
                                    <p className="text-xs font-bold text-amber-700/70 font-calibri mt-1">
                                        Branding, maintenance settings, and payment gateway configurations are preserved.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <DialogHeader>
                                <div className="p-4 w-fit bg-rose-600/10 rounded-2xl border border-rose-600/10 mb-4">
                                    <Flame className="w-8 h-8 text-rose-600" />
                                </div>
                                <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-foreground font-calibri-bold">
                                    Final Confirmation
                                </DialogTitle>
                                <DialogDescription className="text-sm font-bold opacity-70 mt-2 font-calibri">
                                    Type <span className="text-rose-600 font-black uppercase">delete all data</span> to confirm.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="mt-8 space-y-4">
                                <input
                                    type="text"
                                    className="w-full h-14 bg-secondary/30 border border-border rounded-2xl px-6 text-base font-bold text-foreground focus:ring-4 focus:ring-rose-500/10 transition-all outline-none text-center"
                                    placeholder="Confirmation Phrase"
                                    value={confirmationText}
                                    onChange={(e) => setConfirmationText(e.target.value)}
                                    autoFocus
                                />
                                {error && (
                                    <p className="text-xs font-bold text-rose-600 text-center animate-pulse">{error}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 py-4 text-center">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center space-y-6 py-8">
                                    <div className="relative">
                                        <div className="w-20 h-20 border-4 border-rose-600/10 rounded-full animate-spin border-t-rose-600" />
                                        <Flame className="w-8 h-8 text-rose-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black uppercase tracking-tighter font-calibri-bold">Incinerating Records</h3>
                                        <p className="text-sm font-bold text-muted-foreground font-calibri">Purging all business entities from the database...</p>
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center space-y-6 py-8">
                                    <div className="p-6 bg-rose-600/10 rounded-full border border-rose-600/20">
                                        <AlertTriangle className="w-12 h-12 text-rose-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-rose-600 font-calibri-bold">Purge Failed</h3>
                                        <p className="text-sm font-bold text-muted-foreground/60 max-w-xs font-calibri">{error}</p>
                                    </div>
                                    <Button
                                        onClick={() => setStep(3)}
                                        className="h-12 px-8 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-black uppercase tracking-widest text-xs font-calibri-bold"
                                    >
                                        Retry Confirmation
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center space-y-6 py-8">
                                    <div className="p-6 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black uppercase tracking-tighter text-emerald-600 font-calibri-bold">System Clean</h3>
                                        <p className="text-sm font-bold text-muted-foreground font-calibri">All business data has been permanently cleared.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="p-0 sm:justify-between gap-4">
                        {step < 3 && (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    disabled={step === 1}
                                    className={cn(
                                        "h-14 px-6 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-secondary font-calibri-bold",
                                        step === 1 && "opacity-0"
                                    )}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                </Button>
                                <Button
                                    onClick={handleNext}
                                    className="h-14 px-8 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-rose-600/20 font-calibri-bold"
                                >
                                    Analyze Impact <ArrowRight className="w-4 h-4" />
                                </Button>
                            </>
                        )}
                        {step === 3 && (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    className="h-14 px-6 rounded-2xl font-black uppercase tracking-widest text-xs gap-2 hover:bg-secondary font-calibri-bold"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Risks
                                </Button>
                                <Button
                                    onClick={handleExecute}
                                    disabled={confirmationText.toLowerCase() !== 'delete all data'}
                                    className="h-14 px-8 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:hover:bg-rose-600 text-white font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-rose-600/20 font-calibri-bold"
                                >
                                    Execute Wipe <Flame className="w-4 h-4" />
                                </Button>
                            </>
                        )}
                        {step === 4 && !loading && (
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

export default DeleteAllDataWizard;
