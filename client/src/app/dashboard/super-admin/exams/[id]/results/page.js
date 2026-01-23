"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import API_URL from '@/config';
import { ChevronLeft, Download, Search, CheckCircle, XCircle, Trash2, Eye, FileText, Mail, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import Swal from 'sweetalert2';

export default function ExamResultsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [submissions, setSubmissions] = useState([]);
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL'); // ALL, SUSPICIOUS, ENDED_BY_POLICY

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };

                // Fetch Exam Details & Submissions
                const [examRes, subsRes] = await Promise.all([
                    axios.get(`${API_URL}/exams/${id}`, { headers }),
                    axios.get(`${API_URL}/submissions/exam/${id}`, { headers })
                ]);

                setExam(examRes.data.exam);
                setQuestions(examRes.data.questions || []);
                setSubmissions(subsRes.data);
            } catch (error) {
                console.error("Failed to fetch results:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    const filteredSubmissions = submissions.filter(sub => {
        const matchesSearch = sub.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sub.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase());

        if (filterType === 'SUSPICIOUS') return matchesSearch && sub.metadata?.tabSwitchCount > 0;
        if (filterType === 'ENDED_BY_POLICY') return matchesSearch && sub.metadata?.endedByPolicy;

        return matchesSearch;
    });

    const handleViewDetails = (submission) => {
        const detailsHtml = questions.map((q, idx) => {
            const candidateAnswer = submission.answers.find(a => a.questionId.toString() === q._id.toString());
            const marks = candidateAnswer?.marksObtained;
            const isGraded = candidateAnswer?.isGraded;
            const isCorrect = isGraded && marks > 0;

            return `
                <div class="mb-6 p-4 bg-white rounded-xl border border-slate-100 shadow-sm text-left">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Question ${idx + 1}</span>
                        ${isGraded ? `
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                ${marks} / ${q.marks} Marks
                            </span>
                        ` : `
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 italic">
                                Pending Review
                            </span>
                        `}
                    </div>
                    <p class="text-sm font-bold text-slate-800 mb-3">${q.text}</p>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Candidate's Answer:</p>
                        <p class="text-sm text-slate-700 font-medium">${candidateAnswer?.answer || '<span class="italic opacity-50">No Answer</span>'}</p>
                    </div>
                    
                    ${(!isGraded || q.type !== 'MCQ') ? `
                        <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                            <label class="text-[10px] font-bold text-slate-400 uppercase">Assign Marks (Max ${q.marks}):</label>
                            <input 
                                type="number" 
                                class="manual-mark-input w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-primary"
                                data-q-id="${q._id}"
                                max="${q.marks}"
                                placeholder="Marks"
                                value="${isGraded ? marks : ''}"
                            />
                        </div>
                    ` : `
                        <div class="mt-2 flex items-center gap-2">
                             <p class="text-[10px] font-bold text-slate-400 uppercase">Correct Answer:</p>
                             <p class="text-[10px] font-bold text-green-600">${q.correctAnswer}</p>
                        </div>
                    `}
                </div>
            `;
        }).join('');

        Swal.fire({
            title: '',
            html: `
                <div class="text-left border-b border-slate-100 pb-3 mb-4 -mt-2">
                    <p class="text-[10px] uppercase tracking-wider text-slate-400 font-black mb-0.5">Submission Review</p>
                    <p class="text-xl font-black text-slate-900 leading-tight">${submission.candidateName}</p>
                    ${submission.metadata?.endedByPolicy ? `
                        <div class="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 border border-red-100 text-red-600">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            <span class="text-[10px] font-black uppercase">Terminated by Policy</span>
                        </div>
                    ` : ''}
                </div>

                ${submission.metadata?.violationLogs?.length > 0 ? `
                    <div class="mb-6 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                        <div class="flex justify-between items-center mb-3">
                            <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Violation Timeline (${submission.metadata.tabSwitchCount})</p>
                            ${submission.metadata.totalAwayTime ? `
                                <span class="text-[10px] font-black text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                                    Total Away: ${Math.floor(submission.metadata.totalAwayTime / 60)}m ${submission.metadata.totalAwayTime % 60}s
                                </span>
                            ` : ''}
                        </div>
                        <div class="space-y-2">
                            ${submission.metadata.violationLogs.map(log => {
                const isReturned = log.type === 'RETURNED';
                const durationText = log.duration ? ` (Away for ${log.duration}s)` : '';
                return `
                                    <div class="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-50 shadow-sm ${isReturned ? 'opacity-60 grayscale' : ''}">
                                        <div class="flex items-center gap-2">
                                            <div class="w-2 h-2 rounded-full ${log.type === 'TAB_HIDDEN' ? 'bg-orange-400' :
                        log.type === 'WINDOW_BLUR' ? 'bg-amber-400' :
                            log.type === 'RETURNED' ? 'bg-slate-400' : 'bg-red-400'
                    }"></div>
                                            <span class="text-xs font-bold text-slate-700 uppercase tracking-tighter">
                                                ${log.type.replace('_', ' ')} ${durationText}
                                            </span>
                                        </div>
                                        <span class="text-[10px] font-medium text-slate-400 font-mono">${new Date(log.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                `;
            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="max-h-[50vh] overflow-y-auto pr-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 custom-scrollbar">
                    ${detailsHtml}
                </div>
            `,
            width: '850px',
            padding: '1.25rem',
            showCloseButton: true,
            showCancelButton: true,
            confirmButtonText: 'Save Manual Grading',
            cancelButtonText: 'Close',
            confirmButtonColor: '#1565C0',
            cancelButtonColor: '#6B7280',
            customClass: {
                htmlContainer: 'text-left m-0 p-0',
                popup: 'rounded-3xl',
            },
            preConfirm: () => {
                const updates = [];
                let hasError = false;
                const inputs = document.querySelectorAll('.manual-mark-input');

                inputs.forEach(input => {
                    // Reset previous error styling
                    input.classList.remove('border-red-500', 'ring-2', 'ring-red-100');
                    input.classList.add('border-slate-200');

                    const rawValue = input.value.trim();
                    const val = rawValue === "" ? 0 : parseFloat(rawValue);
                    const max = parseFloat(input.getAttribute('max'));
                    const qIdx = input.closest('.bg-white').querySelector('.text-slate-400').textContent;

                    if (val > max) {
                        input.classList.add('border-red-500', 'ring-2', 'ring-red-100');
                        input.classList.remove('border-slate-200');
                        Swal.showValidationMessage(`${qIdx}: Marks cannot exceed ${max}`);
                        hasError = true;
                    }

                    updates.push({
                        questionId: input.dataset.qId,
                        marksObtained: val
                    });
                });

                if (hasError) return false;
                return updates;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');

                    Swal.fire({
                        title: 'Updating Grade...',
                        didOpen: () => Swal.showLoading(),
                        allowOutsideClick: false
                    });

                    await axios.patch(`${API_URL}/submissions/${submission._id}/grade`,
                        { gradedAnswers: result.value },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    Swal.fire({
                        title: 'Success!',
                        text: 'Grading updated and status synchronized.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });

                    // Refresh page data
                    window.location.reload();
                } catch (error) {
                    console.error("Grading failed:", error);
                    const errorMessage = error.response?.data?.error || error.message || "An unknown error occurred";
                    Swal.fire({
                        html: `
                            <div class="flex flex-col items-center">
                                <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                                    <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </div>
                                <h2 class="text-2xl font-bold text-slate-800 mb-2">Grading Failed</h2>
                                <p class="text-slate-500 text-center">${errorMessage}</p>
                            </div>
                        `,
                        showConfirmButton: true,
                        confirmButtonText: 'Try Again',
                        confirmButtonColor: '#1565C0',
                        customClass: {
                            popup: 'rounded-3xl p-8',
                            confirmButton: 'rounded-xl px-8 py-3 text-sm font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-xl transition-all duration-300'
                        }
                    });
                }
            }
        });
    };

    const handleSendBulkResults = async () => {
        if (submissions.length === 0) {
            Swal.fire({
                title: 'No Submissions',
                text: 'There are no submissions to send results for.',
                icon: 'info',
                confirmButtonColor: '#1565C0',
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Send Bulk Emails?',
            text: `Are you sure you want to send result emails to all ${submissions.length} candidates?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, send to all',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#1565C0',
            cancelButtonColor: '#6B7280',
            customClass: {
                popup: 'rounded-[32px] p-8',
                confirmButton: 'rounded-2xl px-8 py-3 font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-xl transition-all duration-300',
                cancelButton: 'rounded-2xl px-8 py-3 font-bold text-slate-500 bg-slate-50 border border-slate-100'
            },
        });

        if (!result.isConfirmed) return;

        try {
            const token = localStorage.getItem('token');

            Swal.fire({
                title: 'Sending Emails...',
                text: 'Please wait while we process the bulk delivery.',
                didOpen: () => Swal.showLoading(),
                allowOutsideClick: false,
                customClass: { popup: 'rounded-[32px] p-10' }
            });

            const res = await axios.post(`${API_URL}/exams/${id}/send-results-bulk`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const { summary } = res.data;

            Swal.fire({
                title: 'Campaign Completed',
                html: `
                    <div class="text-left space-y-2 mt-4">
                        <div class="flex justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                            <span class="text-green-700 font-bold">Successfully Sent:</span>
                            <span class="text-green-700 font-black">${summary.success}</span>
                        </div>
                        <div class="flex justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                            <span class="text-red-700 font-bold">Failed:</span>
                            <span class="text-red-700 font-black">${summary.failed}</span>
                        </div>
                    </div>
                `,
                icon: 'success',
                confirmButtonColor: '#1565C0',
                customClass: {
                    popup: 'rounded-[32px] p-10',
                    confirmButton: 'w-full rounded-2xl py-4 font-bold shadow-lg'
                }
            });
        } catch (error) {
            console.error("Bulk send failed:", error);
            Swal.fire({
                title: 'Operation Failed',
                text: error.response?.data?.error || 'Could not send bulk emails.',
                icon: 'error',
                confirmButtonColor: '#1565C0',
                customClass: { popup: 'rounded-[32px] p-10' }
            });
        }
    };

    const handleExportCSV = () => {
        if (!submissions.length || !questions.length) return;

        // 1. Prepare Headers
        const questionHeaders = questions.map(q => `"${q.text.replace(/"/g, '""')}"`).join(',');
        const headers = `Rank,Candidate Name,Candidate Email,Total Score,Status,Submitted At,${questionHeaders}`;

        // 2. Prepare Rows
        const rows = filteredSubmissions.map((sub, index) => {
            let status = 'Graded';
            if (sub.status === 'PENDING') {
                status = 'Pending Review';
            } else if (exam?.settings?.enablePassFail && sub.totalScore >= (exam?.passingMarks || 0)) {
                status = 'Passed';
            }
            const date = new Date(sub.submittedAt).toLocaleString().replace(/,/g, '');

            const questionMarks = questions.map(q => {
                const ans = sub.answers.find(a => a.questionId === q._id);
                if (ans && !ans.isGraded) return 'Pending';
                return ans?.marksObtained || 0;
            }).join(',');

            return `${index + 1},"${sub.candidateName}","${sub.candidateEmail}",${sub.status === 'PENDING' ? 'Pending' : sub.totalScore},${status},"${date}",${questionMarks}`;
        });

        // 3. Combine and download
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${exam?.title.replace(/\s+/g, '_')}_Results.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDelete = async (submissionId, candidateName) => {
        const result = await Swal.fire({
            html: `
                <div class="flex flex-col items-center">
                    <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 relative">
                        <div class="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20"></div>
                        <svg class="w-10 h-10 text-red-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-black text-slate-900 mb-2">Action Needed!</h2>
                    <p class="text-slate-500 mb-2 text-center">Are you sure you want to delete <strong>${candidateName}'s</strong> submission?</p>
                    <p class="text-xs text-red-400 font-medium">This action can't be undone.</p>
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
            await axios.delete(`${API_URL}/submissions/${submissionId}`, {
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
                        <p class="text-slate-500 text-center">Submission removed successfully.</p>
                    </div>
                `,
                timer: 2000,
                showConfirmButton: false,
                customClass: {
                    popup: 'rounded-3xl p-8'
                }
            });
            // Refresh submissions
            setSubmissions(submissions.filter(s => s._id !== submissionId));
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
                        <p class="text-slate-500 text-center">${error.response?.data?.error || error.message}</p>
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

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/super-admin/results" className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500">
                            <ChevronLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900">{exam?.title} - Results</h1>
                            <p className="text-slate-500 text-sm">Total Submissions: {submissions.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <button
                            onClick={handleSendBulkResults}
                            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold text-xs md:text-sm px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-sm whitespace-nowrap"
                            title="Send Result Emails to All"
                        >
                            <Mail size={18} className="text-primary" />
                            Send Results
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="bg-primary hover:opacity-95 text-white font-bold text-xs md:text-sm px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg shadow-primary/20 whitespace-nowrap"
                        >
                            <Download size={18} /> Export CSV
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                        <Search className="text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            className="flex-1 outline-none text-slate-700 font-medium w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-1 justify-center md:justify-start">
                        <button
                            onClick={() => setFilterType('ALL')}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex-1 md:flex-none text-center",
                                filterType === 'ALL' ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilterType('SUSPICIOUS')}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 flex-1 md:flex-none",
                                filterType === 'SUSPICIOUS' ? "bg-amber-100 text-amber-700 border border-amber-200" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            Suspicious
                        </button>
                        <button
                            onClick={() => setFilterType('ENDED_BY_POLICY')}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 flex-1 md:flex-none",
                                filterType === 'ENDED_BY_POLICY' ? "bg-red-100 text-red-700 border border-red-200" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            Policy Ended
                        </button>
                    </div>
                </div>

                {/* Results Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[800px] md:min-w-full">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">No.</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Candidate</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Score</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Status</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Security</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right whitespace-nowrap">Submitted At</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredSubmissions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                        No submissions found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredSubmissions.map((sub, index) => (
                                    <tr key={sub._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-400">{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="min-w-[150px]">
                                                <p className="font-bold text-slate-800">{sub.candidateName}</p>
                                                <p className="text-xs text-slate-500">{sub.candidateEmail}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-black text-slate-900">
                                                    {sub.status === 'PENDING' ? '—' : sub.totalScore}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400">Marks</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold">
                                            {sub.status === 'PENDING' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 italic whitespace-nowrap">
                                                    Pending Review
                                                </span>
                                            ) : (exam?.settings?.enablePassFail && sub.totalScore >= (exam?.passingMarks || 0)) ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
                                                    <CheckCircle size={12} /> Passed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 whitespace-nowrap">
                                                    <CheckCircle size={12} /> Graded
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {sub.metadata?.tabSwitchCount > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase w-fit ${sub.metadata.isFlagged ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                        {sub.metadata.tabSwitchCount} Switches
                                                    </span>
                                                    {sub.metadata.totalAwayTime > 0 && (
                                                        <span className="text-[10px] font-bold text-slate-500">
                                                            Away: {Math.floor(sub.metadata.totalAwayTime / 60)}m {sub.metadata.totalAwayTime % 60}s
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Clean</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-500 font-medium whitespace-nowrap">
                                            {new Date(sub.submittedAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 text-right">
                                                <button
                                                    onClick={() => handleViewDetails(sub)}
                                                    className="text-primary hover:text-primary-dark font-medium text-xs border border-primary/20 hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                                                    title="View Detailed Results"
                                                >
                                                    <Eye size={14} /> Details
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(sub._id, sub.candidateName)}
                                                    className="text-red-600 hover:text-red-700 font-medium text-xs border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                                                    title="Delete Submission"
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
