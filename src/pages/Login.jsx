import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Car, ArrowRight, Loader2 } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
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
        const result = await login(email, password);
        setIsLoading(false);
        if (result.success) {
            navigate('/dashboard');
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
                        Your Journey <br /> <span className="text-[#FA5A28]">Starts Here.</span>
                    </h1>
                    <p className="text-lg text-slate-300 font-light mb-12">
                        Access your command center to manage bookings, oversee your fleet, and provide premium mobility solutions to your clients.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-slate-300">
                            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-md">
                                <span className="font-bold text-white text-lg">5K+</span>
                            </div>
                            <div className="text-sm font-medium">Successful Rentals</div>
                        </div>
                        <div className="flex items-center gap-4 text-slate-300">
                            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-md">
                                <span className="font-bold text-white text-lg">99%</span>
                            </div>
                            <div className="text-sm font-medium">Customer Satisfaction</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative">
                <div className="w-full max-w-md">
                    {/* Mobile Logo Only */}
                    <div className="flex lg:hidden items-center gap-3 mb-12">
                        <div className="w-10 h-10 bg-[#FA5A28] rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-[#FA5A28]/20">R</div>
                        <span className="text-3xl font-bold tracking-tight text-slate-900">Rentix</span>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900 mb-3">Welcome Back</h2>
                        <p className="text-slate-500 font-medium">Enter your credentials to securely log into your account.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-xl text-sm font-medium flex items-start gap-3">
                                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                {error}
                            </div>
                        )}

                        <div className="space-y-5 border-t border-slate-100 pt-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="admin@rentix.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-[#FA5A28]/50 focus:border-[#FA5A28] transition-all font-medium placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-bold text-slate-700">Password</label>
                                    <a href="#" className="text-sm font-bold text-[#FA5A28] hover:underline">Forgot password?</a>
                                </div>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-[#FA5A28]/50 focus:border-[#FA5A28] transition-all font-medium placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#FA5A28] hover:bg-[#e04a1e] text-white py-4 rounded-xl font-bold transition-all shadow-[0_8px_20px_rgba(250,90,40,0.25)] hover:shadow-[0_8px_30px_rgba(250,90,40,0.35)] hover:-translate-y-0.5 mt-8 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            {isLoading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Signing In...</>
                            ) : (
                                <>Sign In to Dashboard <ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-slate-500 font-medium">
                            Don't have an account? <Link to="/register" className="text-[#FA5A28] font-bold hover:underline">Register now</Link>
                        </p>

                        {showHomeLink && (
                            <Link to="/" className="inline-flex items-center gap-2 mt-8 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                                <ArrowRight className="w-4 h-4 rotate-180" /> Back to Home
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
