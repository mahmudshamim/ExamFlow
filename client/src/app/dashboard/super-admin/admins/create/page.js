'use client';
import { useState } from 'react';
import axios from 'axios';
import API_URL from '@/config';
import { UserPlus, Mail, Lock, User, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function CreateAdminPage() {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [status, setStatus] = useState({ loading: false, error: '', success: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, error: '', success: '' });

        try {
            const token = localStorage.getItem('token');

            await axios.post(
                `${API_URL}/auth/create-admin`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setStatus({ loading: false, error: '', success: 'Admin account created successfully!' });
            setFormData({ name: '', email: '', password: '' });
        } catch (err) {
            setStatus({
                loading: false,
                error: err.response?.data?.error || 'Failed to create admin.',
                success: ''
            });
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">Create New Admin</h1>
                <p className="text-slate-600 text-center">Add a new HR Manager or Administrator to the system.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                    {/* Status Messages */}
                    {status.error && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p>{status.error}</p>
                        </div>
                    )}
                    {status.success && (
                        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            <p>{status.success}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="admin@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">Initial Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="Min. 6 characters"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={status.loading}
                            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {status.loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Create Admin Account
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
