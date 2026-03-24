import { ShieldAlert, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MaintenanceMode = ({ heading, message, allowLogin }) => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
            <div className="relative">
                <div className="absolute -inset-4 bg-amber-500/20 rounded-full blur-xl animate-pulse"></div>
                <ShieldAlert className="w-24 h-24 text-amber-500 relative z-10" />
            </div>
            <h1 className="mt-8 text-4xl font-bold tracking-tight text-center">
                {heading || 'System Under Maintenance'}
            </h1>
            <p className="mt-4 text-slate-400 text-lg text-center max-w-md">
                {message || 'We are currently performing scheduled maintenance to improve our services. Please check back later.'}
            </p>

            {allowLogin && (
                <button
                    onClick={() => navigate('/login')}
                    className="mt-8 flex items-center gap-2 px-6 py-2 rounded-full border border-slate-700 bg-slate-900/50 hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
                >
                    <Lock className="w-4 h-4" />
                    <span>Admin Login</span>
                </button>
            )}
        </div >
    );
};

export default MaintenanceMode;
