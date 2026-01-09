"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import API_URL from '@/config';
import { Search, FileText, ChevronRight, Edit, Trash2, Link as LinkIcon, Copy, Check, MoreVertical, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function AllResultsPage() {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/exams`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExams(res.data);
        } catch (error) {
            console.error("Failed to fetch exams:", error);
        } finally {
            setLoading(false);
        }
    };

    const copyLink = (examId) => {
        const link = `${window.location.origin}/assessment/${examId}`;
        navigator.clipboard.writeText(link);
        setCopiedId(examId);
        setTimeout(() => setCopiedId(null), 2000);
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
                    <p class="text-slate-500 mb-2 text-center text-sm">Are you sure you want to delete <strong>"${examTitle}"</strong>? All questions and submissions will be gone forever.</p>
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
            const token = localStorage.getItem('token');

            await axios.delete(`${API_URL}/exams/${examId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                html: `
                    <div class="flex flex-col items-center">
                        <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <h2 class="text-2xl font-bold text-slate-800 mb-1">Deleted!</h2>
                        <p class="text-slate-500 text-center">Assessment removed successfully.</p>
                    </div>
                `,
                timer: 2000,
                showConfirmButton: false,
                customClass: {
                    popup: 'rounded-3xl p-8'
                }
            });
            fetchExams(); // Refresh the list
        } catch (error) {
            console.error('Delete failed:', error);
            Swal.fire({
                html: `
                    <div class="flex flex-col items-center">
                        <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </div>
                        <h2 class="text-2xl font-bold text-slate-800 mb-2">Error</h2>
                        <p class="text-slate-500 text-center">Failed to delete assessment. Please try again.</p>
                    </div>
                `,
                confirmButtonColor: '#1565C0',
                customClass: {
                    popup: 'rounded-3xl p-8',
                    confirmButton: 'rounded-xl px-8 py-3 bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all duration-300'
                }
            });
        }
    };

    const handleToggleEmail = async (examId, currentStatus) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/exams/${examId}/settings`, {
                settings: { automatedEmail: !currentStatus }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local state
            setExams(prevExams =>
                prevExams.map(exam =>
                    exam._id === examId
                        ? { ...exam, settings: { ...exam.settings, automatedEmail: !currentStatus } }
                        : exam
                )
            );

            Swal.fire({
                title: !currentStatus ? 'Auto-Email Enabled!' : 'Auto-Email Disabled!',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end',
                customClass: {
                    popup: 'rounded-xl shadow-xl border border-slate-100'
                }
            });
        } catch (error) {
            console.error('Failed to toggle email setting:', error);
            Swal.fire({
                title: 'Error',
                text: 'Could not update setting.',
                icon: 'error',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        }
    };

    // Enhanced Status Logic
    const getExamStatus = (startTime, endTime) => {
        const now = new Date();
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (now < start) {
            return {
                label: 'Upcoming',
                className: 'bg-amber-50 text-amber-700 border-amber-100',
            };
        } else if (now >= start && now <= end) {
            return {
                label: 'Live now',
                className: 'bg-green-50 text-green-700 border-green-100 font-bold',
            };
        } else {
            return {
                label: 'Ended',
                className: 'bg-slate-50 text-slate-500 border-slate-100',
            };
        }
    };

    // Compact Date Formatter
    const formatExamTime = (startStr, endStr) => {
        if (!startStr || !endStr) return { date: 'Not set', time: '' };

        const start = new Date(startStr);
        const end = new Date(endStr);

        const dateOptions = { month: 'short', day: 'numeric' };
        const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

        const startDate = start.toLocaleDateString([], dateOptions);
        const startTime = start.toLocaleTimeString([], timeOptions);
        const endTime = end.toLocaleTimeString([], timeOptions);

        // Check if same day
        if (start.toDateString() === end.toDateString()) {
            return {
                date: startDate,
                time: `${startTime} - ${endTime}`
            };
        } else {
            const endDate = end.toLocaleDateString([], dateOptions);
            return {
                date: `${startDate} - ${endDate}`,
                time: `${startTime} - ${endTime}`
            };
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const filteredExams = exams.filter(exam =>
        exam.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-1 space-y-8 animate-in fade-in duration-500 mb-10">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">All Exam Results</h1>
                <p className="text-slate-500 mt-2">Oversee all assessments and dive into detailed candidate submissions.</p>
            </div>

            {/* Search Bar - Larger and cleaner */}
            <div className="bg-white p-4.5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all duration-300">
                <Search className="text-slate-400" size={22} />
                <input
                    type="text"
                    placeholder="Search exams by title..."
                    className="flex-1 outline-none text-slate-700 font-medium placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
                {filteredExams.map(exam => (
                    <ExamCard
                        key={exam._id}
                        exam={exam}
                        status={getExamStatus(exam.startTime, exam.endTime)}
                        timeDisplay={formatExamTime(exam.startTime, exam.endTime)}
                        copyLink={copyLink}
                        handleDelete={handleDelete}
                        handleToggleEmail={handleToggleEmail}
                        copiedId={copiedId}
                    />
                ))}
            </div>

            {filteredExams.length === 0 && (
                <div className="text-center py-20">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <BarChart3 size={40} />
                    </div>
                    <h3 className="text-slate-400 font-bold text-lg">No exams found</h3>
                </div>
            )}
        </div>
    );
}

function ExamCard({ exam, status, timeDisplay, copyLink, handleDelete, handleToggleEmail, copiedId }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const truncatedTitle = exam.title.length > 45 ? exam.title.substring(0, 45) + "..." : exam.title;

    return (
        <div className="group bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 flex flex-col relative">
            {/* Card Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border ${status.className}`}>
                        {status.label}
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <MoreVertical size={20} />
                    </button>

                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)}></div>
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 py-2 animate-in fade-in zoom-in duration-200">
                                <button
                                    onClick={() => {
                                        copyLink(exam._id);
                                        setMenuOpen(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                >
                                    {copiedId === exam._id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                    {copiedId === exam._id ? 'Copied!' : 'Copy Link'}
                                </button>
                                <div className="h-px bg-slate-50 my-1"></div>
                                <button
                                    onClick={() => {
                                        handleDelete(exam._id, exam.title);
                                        setMenuOpen(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm font-semibold text-red-500 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    Delete Exam
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Card Body */}
            <div className="flex-1 mb-8">
                <h3 className="font-bold text-xl text-slate-900 mb-3 leading-tight group-hover:text-primary transition-colors duration-300 min-h-[50px]">
                    {truncatedTitle}
                </h3>

                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</span>
                        <span className="text-[13px] font-bold text-slate-700">{timeDisplay.date}</span>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div className="flex flex-col gap-1 items-end">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Window</span>
                        <span className="text-[13px] font-bold text-slate-700">{timeDisplay.time}</span>
                    </div>
                </div>
            </div>

            {/* Card Footer Actions */}
            <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
                <Link
                    href={`/dashboard/super-admin/exams/${exam._id}/edit`}
                    className="p-3 bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-300"
                    title="Edit Assessment"
                >
                    <Edit size={20} />
                </Link>
                <Link
                    href={`/dashboard/super-admin/exams/${exam._id}/results`}
                    className="flex-1 bg-primary border border-transparent text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:opacity-95 transition-all duration-300 flex items-center justify-center gap-2"
                >
                    <span>Details</span>
                </Link>

                {/* Email Toggle */}
                <div className="group/toggle relative">
                    <button
                        onClick={() => handleToggleEmail(exam._id, exam.settings?.automatedEmail)}
                        className={cn(
                            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                            exam.settings?.automatedEmail ? "bg-primary" : "bg-slate-200"
                        )}
                    >
                        <span
                            className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                exam.settings?.automatedEmail ? "translate-x-5" : "translate-x-0"
                            )}
                        />
                    </button>
                    {/* Tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover/toggle:opacity-100 transition-opacity pointer-events-none z-30 text-center shadow-xl">
                        {exam.settings?.automatedEmail
                            ? "Auto-email is ON. Candidates will receive results via email."
                            : "Auto-email is OFF. No results will be sent."
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}

const cn = (...classes) => classes.filter(Boolean).join(' ');
