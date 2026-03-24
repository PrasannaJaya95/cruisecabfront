import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Plus, X, ArrowRight } from 'lucide-react';

const SuccessWizard = ({ open, onOpenChange, title, message, onAction }) => {

    // Default actions if none provided
    const handleAction = (action) => {
        if (onAction) {
            onAction(action);
        } else {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 p-0 overflow-hidden shadow-2xl shadow-indigo-500/10">
                <div className="relative p-6 flex flex-col items-center justify-center text-center space-y-6">

                    {/* Background Glow Effect */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-indigo-500/20 to-transparent blur-3xl -z-10" />

                    {/* Animated Icon */}
                    <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: 0.1
                        }}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-30 rounded-full" />
                            <CheckCircle className="w-20 h-20 text-emerald-400 relative z-10" />
                        </div>
                    </motion.div>

                    {/* Text Content */}
                    <div className="space-y-2">
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400"
                        >
                            {title || "Success!"}
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-slate-400 max-w-[280px] mx-auto"
                        >
                            {message || "The operation was completed successfully."}
                        </motion.p>
                    </div>

                    {/* Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col w-full gap-3 pt-4"
                    >
                        <Button
                            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-500/20 border-0"
                            size="lg"
                            onClick={() => handleAction('close')}
                        >
                            <span className="mr-2">Great, Thanks!</span>
                        </Button>

                        <div className="flex gap-3 w-full">
                            <Button
                                variant="outline"
                                className="flex-1 border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white"
                                onClick={() => handleAction('add_another')}
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Another
                            </Button>
                            {/* Optional: Add more actions here dynamically if needed */}
                        </div>
                    </motion.div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SuccessWizard;
