import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RefreshCw, Save, Hash, ShieldCheck, AlertCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const SequenceManager = () => {
    const [sequences, setSequences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingSeq, setEditingSeq] = useState(null);
    const [newValue, setNewValue] = useState('');
    const [password, setPassword] = useState('');
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchSequences();
    }, []);

    const fetchSequences = async () => {
        try {
            setLoading(true);
            const response = await api.get('/system/sequences');
            setSequences(response.data);
        } catch (err) {
            console.error('Failed to fetch sequences:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (seq) => {
        setEditingSeq(seq);
        setNewValue(seq.value);
        setPassword('');
        setError(null);
    };

    const handleUpdate = async () => {
        if (!password) {
            setError('Account password is required to change sequences.');
            return;
        }
        setUpdating(true);
        setError(null);
        try {
            await api.put('/system/sequences', {
                key: editingSeq.key,
                value: newValue,
                password
            });
            setEditingSeq(null);
            fetchSequences();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update sequence');
        } finally {
            setUpdating(false);
        }
    };

    const formatKey = (key) => {
        return key.replace(/_/g, ' ').replace('sequence', '').toUpperCase().trim();
    };

    return (
        <Card className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-10 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/10">
                            <Hash className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black uppercase tracking-tighter text-foreground font-calibri-bold">Sequence Engine</CardTitle>
                            <CardDescription className="font-medium text-muted-foreground font-calibri">Manual override for document numbering sequences</CardDescription>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={fetchSequences} disabled={loading} className="rounded-xl">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-10 pt-4 space-y-6">
                {loading ? (
                    <div className="py-20 text-center space-y-4">
                        <RefreshCw className="w-10 h-10 animate-spin mx-auto text-primary/20" />
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Querying registry...</p>
                    </div>
                ) : sequences.length === 0 ? (
                    <div className="py-20 text-center bg-secondary/10 rounded-[2rem] border border-dashed border-border">
                        <p className="text-sm font-bold text-muted-foreground font-calibri text-shadow-sm">No sequences initialized yet. Records must be created first.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sequences.map((seq) => (
                            <div key={seq.id} className="p-6 rounded-[2rem] bg-secondary/20 border border-border/50 flex items-center justify-between hover:bg-secondary/30 transition-all group">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1 group-hover:text-primary transition-colors">{formatKey(seq.key)}</p>
                                    <p className="text-3xl font-black text-foreground tracking-tighter tabular-nums font-calibri-bold">{seq.value}</p>
                                </div>
                                <Button 
                                    onClick={() => handleEdit(seq)}
                                    className="h-12 w-12 rounded-xl bg-card border border-border shadow-sm hover:bg-primary hover:text-white transition-all p-0"
                                >
                                    <Save className="w-5 h-5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <Dialog open={!!editingSeq} onOpenChange={() => !updating && setEditingSeq(null)}>
                    <DialogContent className="sm:max-w-[450px] rounded-[2rem] border-border bg-card shadow-2xl p-8 font-calibri">
                        <DialogHeader>
                            <div className="p-4 w-fit bg-primary/10 rounded-2xl border border-primary/10 mb-4">
                                <ShieldCheck className="w-8 h-8 text-primary" />
                            </div>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter font-calibri-bold">Modify Sequence</DialogTitle>
                            <DialogDescription className="text-sm font-bold opacity-70">
                                You are overriding {editingSeq && formatKey(editingSeq.key)}. The next record will start from your input value + 1.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Current Registry Value</Label>
                                <input
                                    type="number"
                                    className="w-full h-14 bg-secondary/30 border border-border rounded-2xl px-6 text-xl font-black text-foreground focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                    value={newValue}
                                    onChange={(e) => setNewValue(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Administrator Password</Label>
                                <input
                                    type="password"
                                    className="w-full h-14 bg-secondary/30 border border-border rounded-2xl px-6 text-base font-bold text-foreground focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/10 rounded-xl flex gap-3 items-center">
                                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                                    <p className="text-xs font-bold text-rose-700 font-calibri">{error}</p>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button 
                                onClick={handleUpdate} 
                                disabled={updating}
                                className="w-full h-14 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 transition-all flex justify-center items-center gap-2"
                            >
                                {updating ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm Registry Update'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default SequenceManager;
