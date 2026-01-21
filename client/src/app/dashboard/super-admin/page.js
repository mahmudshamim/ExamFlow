"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import API_URL from '@/config';
import { Users, FileText, CheckCircle, XCircle, TrendingUp, Shield, Mail, Trash2, Calendar, Clock, ChevronRight, Search, Layout, LogOut, Copy, Plus } from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { getAuthHeaders, handleAuthError, isAuthenticated } from '@/utils/authHelper';

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState({
        totalExams: 0,
        totalCandidates: 0,
        totalAdmins: 0,
        passFail: { passed: 0, failed: 0 },
        avgScore: 0
    });
    const [loading, setLoading] = useState(true);

    const [exams, setExams] = useState([]);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // Check if user is authenticated before making requests
            if (!isAuthenticated()) {
                console.warn('User not authenticated. Redirecting to login...');
                window.location.href = '/login';
                return;
            }

            const headers = getAuthHeaders();

            const [statsRes, examsRes] = await Promise.all([
                axios.get(`${API_URL}/analytics/global`, { headers }),
                axios.get(`${API_URL}/exams`, { headers })
            ]);

            setStats(statsRes.data);
            setExams(examsRes.data);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);

            // Handle authentication errors (will auto-logout if token is invalid)
            try {
                handleAuthError(error);
            } catch (authError) {
                // If handleAuthError doesn't redirect, show user-friendly message
                console.error("Authentication error:", authError);
            }
        } finally {
            setLoading(false);
        }
    };

    const copyLink = (examId) => {
        const link = `${window.location.origin}/assessment/${examId}`;
        navigator.clipboard.writeText(link);
        Swal.fire({
            title: 'Link Copied!',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end',
            customClass: {
                popup: 'rounded-xl shadow-xl border border-slate-100'
            }
        });
    };

    const handleDelete = async (examId, examTitle) => {
        const result = await Swal.fire({
            html: `
                <div class="flex flex-col items-center">
                    <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 relative">
                        <div class="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20"></div>
                        <svg class="w-10 h-10 text-red-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-black text-slate-900 mb-2">Destructive Action!</h2>
                    <p class="text-slate-500 mb-2 text-center text-sm">Are you sure you want to delete <strong>"${examTitle}"</strong>? All associated questions and data will be lost.</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Yes, delete it",
            cancelButtonText: "No, cancel",
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#F8FAFC',
            customClass: {
                popup: 'rounded-[32px] p-10',
                confirmButton: 'rounded-2xl px-8 py-4 text-sm font-bold bg-red-500 text-white shadow-lg shadow-red-200/50 hover:shadow-xl hover:bg-red-600 transition-all duration-300 order-2',
                cancelButton: 'rounded-2xl px-8 py-4 text-sm font-bold text-slate-500 bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all duration-300 order-1 mr-3'
            },
            buttonsStyling: false,
            showCloseButton: true
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            const headers = getAuthHeaders();

            await axios.delete(`${API_URL}/exams/${examId}`, { headers });

            Swal.fire({
                html: `
                    <div class="flex flex-col items-center">
                        <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <h2 class="text-2xl font-bold text-slate-800 mb-1">Deleted!</h2>
                        <p class="text-slate-500 text-center text-sm">Exam removed successfully.</p>
                    </div>
                `,
                timer: 2000,
                showConfirmButton: false,
                customClass: {
                    popup: 'rounded-3xl p-8'
                }
            });
            fetchStats(); // Refresh the list
        } catch (error) {
            console.error('Delete failed:', error);

            // Handle auth errors
            try {
                handleAuthError(error);
            } catch (authError) {
                // Show user-friendly error if not an auth issue
                Swal.fire({
                    html: `
                        <div class="flex flex-col items-center">
                            <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                                <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </div>
                            <h2 class="text-2xl font-bold text-slate-800 mb-2">Error</h2>
                            <p class="text-slate-500 text-center text-sm">Failed to delete exam: ${error.response?.data?.error || error.message}</p>
                        </div>
                    `,
                    confirmButtonColor: '#1565C0',
                    customClass: {
                        popup: 'rounded-3xl p-8',
                        confirmButton: 'rounded-xl px-8 py-3 bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all duration-300'
                    }
                });
            }
        }
    };

    const getExamStatus = (startTime, endTime) => {
        const now = new Date();
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (now < start) {
            return {
                label: 'Upcoming',
                className: 'bg-amber-50 text-amber-600 border border-amber-100',
            };
        } else if (now >= start && now <= end) {
            return {
                label: 'Live now',
                className: 'bg-green-50 text-green-600 border border-green-100 font-bold',
            };
        } else {
            return {
                label: 'Ended',
                className: 'bg-slate-50 text-slate-500 border border-slate-100',
            };
        }
    };

    if (loading) {
        return (
            <div className="space-y-8 animate-in fade-in duration-300 pb-10">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center">
                    <div>
                        <div className="h-9 w-64 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-5 w-96 bg-gray-100 rounded mt-2 animate-pulse"></div>
                    </div>
                    <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse"></div>
                </div>

                {/* Stats Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                                <div className="flex-1">
                                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
                                    <div className="h-7 w-16 bg-gray-300 rounded animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Table Skeleton */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="h-4 flex-1 bg-gray-100 rounded animate-pulse"></div>
                                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse"></div>
                                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse"></div>
                                <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse"></div>
                                <div className="h-8 w-32 bg-gray-100 rounded-lg animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">System Overview</h1>
                    <p className="text-muted-foreground mt-2">Welcome back to the command center.</p>
                </div>
                <Link
                    href="/dashboard/super-admin/exams/create"
                    className="group relative overflow-hidden bg-gradient-to-r from-primary to-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                    <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm group-hover:bg-white/30 transition-colors border border-white/10">
                        <Plus size={18} strokeWidth={3} />
                    </div>
                    <span className="tracking-wide">Create Exam</span>
                </Link>
            </div>

            {/* Primary Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Admins" value={stats.totalAdmins} icon={Shield} color="bg-primary/10 text-primary" />
                <StatCard title="Active Exams" value={stats.totalExams} icon={FileText} color="bg-accent/10 text-accent" />
                <StatCard title="Candidates" value={stats.totalCandidates} icon={Users} color="bg-orange-100 text-orange-600" />
                <StatCard title="Avg. Score" value={`${Math.round(stats.avgScore)}%`} icon={TrendingUp} color="bg-green-100 text-green-600" />
            </div>

            {/* Secondary Stats & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pass/Fail Ratio */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-border shadow-sm">
                    <h2 className="text-lg font-bold mb-6">Performance Metrics</h2>
                    <div className="flex items-center gap-8">
                        <div className="flex-1 p-4 rounded-xl bg-green-50 border border-green-100 flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-lg text-green-600"><CheckCircle size={24} /></div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Passed Candidates</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.passFail.passed}</p>
                            </div>
                        </div>
                        <div className="flex-1 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-4">
                            <div className="p-3 bg-red-100 rounded-lg text-red-600"><XCircle size={24} /></div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Failed Candidates</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.passFail.failed}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-primary to-blue-700 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-xl font-bold mb-2">Invite New Admin</h2>
                        <p className="text-blue-100 text-sm mb-6">Grant access to HR managers to create exams and view detailed reports.</p>
                        <a href="/dashboard/super-admin/admins/create" className="inline-flex items-center gap-2 bg-white text-primary px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors">
                            <Mail size={16} /> Send Invite
                        </a>
                    </div>
                    <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-24 h-24 bg-accent/20 rounded-full blur-2xl"></div>
                </div>
            </div>

            {/* Recent Exams List */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h2 className="text-lg font-bold">Recent Exams</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">Exam Title</th>
                                <th className="px-6 py-4 font-medium">Created By</th>
                                <th className="px-6 py-4 font-medium">Duration</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {exams.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                                        No exams found. Create your first one above!
                                    </td>
                                </tr>
                            ) : (
                                exams.slice(0, 5).map((exam) => (
                                    <tr key={exam._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate" title={exam.title}>{exam.title}</td>
                                        <td className="px-6 py-4 text-gray-500">{exam.hrId?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-gray-500">{exam.duration} mins</td>
                                        <td className="px-6 py-4">
                                            {(() => {
                                                const status = getExamStatus(exam.startTime, exam.endTime);
                                                return (
                                                    <span className={`inline-flex items-center justify-center px-4 py-1 rounded-full text-[11px] font-bold whitespace-nowrap min-w-[80px] ${status.className}`}>
                                                        {status.label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    href={`/dashboard/super-admin/exams/${exam._id}/results`}
                                                    className="text-white bg-primary hover:bg-primary/90 font-medium text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                                >
                                                    <FileText size={14} /> Results
                                                </Link>
                                                <button
                                                    onClick={() => copyLink(exam._id)}
                                                    className="text-primary hover:text-primary/80 font-medium text-xs border border-primary/20 hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    Copy Link
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(exam._id, exam.title)}
                                                    className="text-red-600 hover:text-red-700 font-medium text-xs border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                                    title="Delete Exam"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4 transition-all hover:translate-y-[-2px] hover:shadow-md">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <h3 className="text-2xl font-bold text-foreground">{value}</h3>
            </div>
        </div>
    );
}
