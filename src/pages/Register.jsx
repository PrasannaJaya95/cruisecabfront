import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Car, ArrowRight, Loader2 } from 'lucide-react';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();
    const [showHomeLink, setShowHomeLink] = useState(false);

    useEffect(() => {
        const checkWebsiteEnabled = async () => {
            try {
                const { data } = await api.get('/settings/website_enabled');
                setShowHomeLink(data.value === 'true');
            } catch (error) {
                console.error("Failed to check website status", error);
            }
        };
        checkWebsiteEnabled();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const result = await register(email, password, name);
        setIsLoading(false);
        if (result.success) {
            navigate('/login');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="flex-1 w-full flex bg-white min-h-[100vh]">
            {/* Left Side: Branding / Image */}
            <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=2070&auto=format&fit=crop"
                        alt="Rentix Luxury Fleet"
                        className="w-full h-full object-cover opacity-50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
                </div>

                {/* Branding Content */}
                <div className="relative z-10 max-w-lg p-12 text-white">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 bg-[#FA5A28] rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-[#FA5A28]/20">R</div>
                        <span className="text-3xl font-bold tracking-tight">Rentix</span>
                    </div>

                    <h1 className="text-5xl font-bold tracking-tight leading-[1.1] mb-6">
                        Join the <br /> <span className="text-[#FA5A28]">Experience.</span>
                    </h1>
                    <p className="text-lg text-slate-300 font-light mb-12">
                        Create your account to start managing your fleet or to unlock your next premium mobility solution.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-slate-300">
                            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-md">
                                <span className="font-bold text-white text-lg">FAST</span>
                            </div>
                            <div className="text-sm font-medium">Quick Registration</div>
                        </div>
                        <div className="flex items-center gap-4 text-slate-300">
                            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-md">
                                <span className="font-bold text-white text-lg">100%</span>
                            </div>
                            <div className="text-sm font-medium">Secure Platform</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Register Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative">
                <div className="w-full max-w-md">
                    {/* Mobile Logo Only */}
                    <div className="flex lg:hidden items-center gap-3 mb-12">
                        <div className="w-10 h-10 bg-[#FA5A28] rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-[#FA5A28]/20">R</div>
                        <span className="text-3xl font-bold tracking-tight text-slate-900">Rentix</span>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900 mb-3">Create an Account</h2>
                        <p className="text-slate-500 font-medium">Fill in your details below to get started.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2 relative">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Full Name</label>
                            <input
                                id="name"
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FA5A28]/20 focus:border-[#FA5A28] transition-all text-slate-900 placeholder:text-slate-400"
                                required
                            />
                        </div>

                        <div className="space-y-2 relative">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="hello@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FA5A28]/20 focus:border-[#FA5A28] transition-all text-slate-900 placeholder:text-slate-400"
                                required
                            />
                        </div>

                        <div className="space-y-2 relative">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Password</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FA5A28]/20 focus:border-[#FA5A28] transition-all text-slate-900 placeholder:text-slate-400"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100 flex items-start gap-2">
                                <span className="shrink-0">⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-[#FA5A28] hover:bg-[#e04a1e] text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(250,90,40,0.39)] hover:shadow-[0_6px_20px_rgba(250,90,40,0.23)] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>Sign Up <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-slate-500 font-medium">
                            Already have an account?{' '}
                            <Link to="/login" className="text-[#FA5A28] font-bold hover:underline transition-all">
                                Login here
                            </Link>
                        </p>
                    </div>

                    {showHomeLink && (
                        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                            <Link to="/" className="inline-flex items-center justify-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors group">
                                <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                                Return to Homepage
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Register;
