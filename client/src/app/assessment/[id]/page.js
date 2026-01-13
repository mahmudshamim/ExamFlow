"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from 'next/link';
import API_URL from '@/config';
import axios from 'axios';
import { Clock, Send, AlertTriangle, ShieldCheck, Mail, Info, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Swal from 'sweetalert2';

export default function AssessmentInterface() {
    const { id } = useParams();
    const router = useRouter();
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(null);
    const [assessment, setAssessment] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showConfirm, setShowConfirm] = useState(false);
    const [candidateInfo, setCandidateInfo] = useState({ name: "", email: "" });
    const [hasStarted, setHasStarted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [warningShown, setWarningShown] = useState(false);
    const [error, setError] = useState(null);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [emailAllowed, setEmailAllowed] = useState(true);
    const [attemptError, setAttemptError] = useState("");

    useEffect(() => {
        const fetchAssessment = async () => {
            try {
                const res = await axios.get(`${API_URL}/exams/${id}`);
                if (res.data) {
                    setAssessment(res.data.exam);
                    setQuestions(res.data.questions);
                    setTimeLeft(res.data.exam.duration * 60);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Failed to fetch assessment:', err);
                setError(err.response?.data?.error || 'Failed to load assessment. Please check the link and try again.');
                setLoading(false);
            }
        };
        fetchAssessment();
    }, [id]);

    useEffect(() => {
        if (!hasStarted || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [hasStarted, timeLeft]);

    // Check attempts in real-time
    useEffect(() => {
        const checkAttempts = async () => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(candidateInfo.email)) {
                setCheckingEmail(true);
                setAttemptError("");
                try {
                    const res = await axios.get(`${API_URL}/submissions/check-attempts`, {
                        params: { examId: id, email: candidateInfo.email }
                    });
                    setEmailAllowed(res.data.allowed);
                    if (!res.data.allowed) {
                        setAttemptError(`Maximum attempts (${res.data.maxAttempts}) reached for this email.`);
                    }
                } catch (err) {
                    console.error('Attempt check failed:', err);
                } finally {
                    setCheckingEmail(false);
                }
            } else {
                setEmailAllowed(true);
                setAttemptError("");
            }
        };

        const timeoutId = setTimeout(checkAttempts, 500);
        return () => clearTimeout(timeoutId);
    }, [candidateInfo.email, id]);

    useEffect(() => {
        if (timeLeft <= 60 && timeLeft > 0 && !warningShown && hasStarted && !submitted) {
            Swal.fire({
                title: '1 Minute Left!',
                text: 'The assessment will end in 1 minute. Please finalize your answers and prepare to submit.',
                icon: 'warning',
                confirmButtonText: 'I Understand',
                confirmButtonColor: '#1565C0',
                timer: 10000,
                timerProgressBar: true,
            });
            setWarningShown(true);
        }
    }, [timeLeft, warningShown, hasStarted, submitted]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ":" : ""}${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
    };

    const handleAnswer = (questionId, answer) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    };

    const showShieldWarning = (message = 'This action is disabled for security') => {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
        });

        Toast.fire({
            icon: 'warning',
            title: message
        });
    };

    const preventCheating = (e) => {
        e.preventDefault();
        showShieldWarning('Please type your answers manually. Copy-pasting is restricted.');
    };

    // Global Anti-Cheat Listeners
    useEffect(() => {
        if (!hasStarted || submitted) return;

        const handleContextMenu = (e) => {
            e.preventDefault();
            showShieldWarning('Right-click is restricted to maintain a secure testing environment.');
        };

        const handleKeyDown = (e) => {
            // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
            if (
                e.keyCode === 123 ||
                (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
                (e.ctrlKey && e.keyCode === 85) ||
                (e.metaKey && e.altKey && e.keyCode === 73) // Mac Opt+Cmd+I
            ) {
                e.preventDefault();
                showShieldWarning('Access to developer tools is restricted during the assessment.');
            }

            // Block Ctrl+C, Ctrl+V, Ctrl+X
            if ((e.ctrlKey || e.metaKey) && (e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88)) {
                // We'll let the input-level handlers handle the message for clarity, 
                // but this acts as a secondary global catch.
                e.preventDefault();
                showShieldWarning('Keyboard shortcuts are restricted to ensure exam integrity.');
            }
        };

        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [hasStarted, submitted]);

    const handleFinish = () => {
        const unrespondedVars = questions.filter(q => q.required && (!answers[q._id] || answers[q._id].trim() === ""));
        if (unrespondedVars.length > 0) {
            setShowErrors(true);
            // Scroll to the first unanswered required question
            const firstErrorId = unrespondedVars[0]._id;
            const qIdx = questions.findIndex(q => q._id === firstErrorId);
            const element = document.getElementById(`question-${qIdx}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
        setShowErrors(false);
        setShowConfirm(true);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const submissionData = {
                examId: id,
                candidateEmail: candidateInfo.email,
                candidateName: candidateInfo.name,
                answers: Object.keys(answers).map(qId => ({
                    questionId: qId,
                    answer: answers[qId]
                }))
            };

            const res = await axios.post(`${API_URL}/submissions`, submissionData);

            if (res.data) {
                setScore(res.data);
                setSubmitted(true);
                setShowConfirm(false);
                Swal.fire({
                    title: 'Submitted!',
                    text: 'Your assessment has been recorded.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    confirmButtonColor: '#1565C0',
                });
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                title: 'Submission Failed',
                text: err.response?.data?.error || 'Something went wrong',
                icon: 'error',
                confirmButtonColor: '#1565C0',
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">
                LOADING ASSESSMENT...
            </div>
        );
    }

    if (error || !assessment) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="glass max-w-lg w-full p-10 rounded-[2.5rem] shadow-2xl text-center space-y-6">
                    <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto">
                        <AlertTriangle className="text-red-600" size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800">Assessment Not Found</h2>
                    <p className="text-slate-600">
                        {error || 'The assessment you are looking for does not exist or has been removed.'}
                    </p>
                    <p className="text-sm text-slate-400">Please check the link and try again.</p>
                </div>
            </div>
        );
    }

    // Check if exam is within valid time window
    if (assessment) {
        const now = new Date();
        const startTime = new Date(assessment.startTime);
        const endTime = new Date(assessment.endTime);

        if (now < startTime) {
            return (
                <UpcomingExamCountdown startTime={startTime} title={assessment.title} />
            );
        }

        if (now > endTime) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                    <div className="glass max-w-lg w-full p-10 rounded-[2.5rem] shadow-2xl text-center space-y-6">
                        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto">
                            <AlertTriangle className="text-red-600" size={40} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800">Exam Has Ended</h2>
                        <p className="text-slate-600">
                            This exam ended on:<br />
                            <span className="font-bold text-red-600">{endTime.toLocaleString()}</span>
                        </p>
                        <p className="text-sm text-slate-400">You can no longer submit answers for this exam.</p>
                    </div>
                </div>
            );
        }
    }

    if (submitted) {
        // Check if exam contains any short answer questions
        const hasShortAnswers = questions.some(q => q.type === "SHORT_ANSWER" || q.type === "SHORT_TEXT");

        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden font-outfit text-center">
                {/* Square Grid Background */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}></div>

                <div className="max-w-xl w-full space-y-8 animate-in fade-in zoom-in duration-700 relative z-10 py-20">
                    {/* Custom Jagged Badge Icon */}
                    <div className="flex justify-center">
                        <div className="relative w-32 h-32 text-[#3b82f6] drop-shadow-2xl">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.7 3.1 5.52l.34 3.69L1 12l2.44 2.79-.34 3.69 3.61.82 1.89 3.2L12 21.04l3.4 1.46 1.89-3.2 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z" />
                            </svg>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-5xl md:text-7xl font-black text-[#1e293b] tracking-wider uppercase">SUCCESS !</h2>
                        <p className="text-base md:text-lg text-slate-600 font-medium max-w-md mx-auto leading-relaxed px-4">
                            Awesome! your assessment has been sent successfully.
                        </p>
                    </div>

                    {/* Only show score if all questions are MCQ */}
                    {score && !hasShortAnswers && (
                        <div className="inline-block bg-[#f8fafc] px-8 py-4 rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Marks Obtained</p>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-3xl font-black text-primary">{score.score}</span>
                                <span className="text-lg font-bold text-slate-300">/ {score.totalMarks}</span>
                            </div>
                        </div>
                    )}

                    {/* Show message for manual evaluation if short answers exist */}
                    {hasShortAnswers && (
                        <div className="inline-block bg-amber-50 px-8 py-4 rounded-3xl border border-amber-100 shadow-sm">
                            <p className="text-sm font-medium text-amber-800">
                                Your responses are under review. Results will be available shortly.
                            </p>
                        </div>
                    )}

                    <div className="pt-4 px-4">
                        <button
                            onClick={() => {
                                window.close();
                                // Fallback for browsers that block window.close
                                setTimeout(() => {
                                    window.location.href = '/';
                                }, 500);
                            }}
                            className="w-full md:w-auto px-12 py-4 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl font-bold text-sm transition-all duration-300 shadow-sm hover:shadow-md active:scale-95"
                        >
                            Close Window
                        </button>
                    </div>

                    <div className="pt-20">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">© 2025 - ExamFlow</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!hasStarted) {
        // ... (existing welcome screen)
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="glass max-w-lg w-full rounded-[2.5rem] shadow-2xl text-center overflow-hidden">
                    {assessment.coverImage ? (
                        <div className="w-full h-48 overflow-hidden relative group border-b border-slate-100">
                            <img src={assessment.coverImage} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60" />
                        </div>
                    ) : (
                        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto border border-primary/20 mb-8 mt-10">
                            <ShieldCheck className="text-primary" size={40} />
                        </div>
                    )}
                    <div className={cn("px-10 space-y-8 pb-10", !assessment.coverImage && "pt-0", assessment.coverImage && "pt-8")}>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">{assessment.title}</h2>
                            <p className="text-slate-500 mt-2 font-medium line-clamp-2">{assessment.description}</p>
                        </div>

                        <div className="bg-slate-100/50 p-6 rounded-3xl text-left space-y-4">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Assessment Rules</p>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                <RuleItem icon={<Clock size={14} />} label="Duration" value={`${assessment.duration} Mins`} />
                                <RuleItem icon={<AlertTriangle size={14} />} label="Neg. Marking" value={assessment.settings?.negativeMarkingEnabled ? "Enabled" : "Disabled"} />
                                <RuleItem icon={<Send size={14} />} label="Attempts" value={`Max ${assessment.settings?.maxAttempts}`} />
                                <RuleItem icon={<Info size={14} />} label="Questions" value={`${questions.length} Items`} />
                            </div>
                        </div>

                        <div className="space-y-4 text-left">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold placeholder:text-slate-300"
                                    placeholder="Enter your full name"
                                    value={candidateInfo.name}
                                    onChange={(e) => setCandidateInfo({ ...candidateInfo, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                                <input
                                    type="email"
                                    className={`w-full px-5 py-4 bg-white border rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold placeholder:text-slate-300 ${candidateInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateInfo.email)
                                        ? 'border-red-300 text-red-500 focus:ring-red-100'
                                        : 'border-slate-200'
                                        }`}
                                    placeholder="name@company.com"
                                    value={candidateInfo.email}
                                    onChange={(e) => setCandidateInfo({ ...candidateInfo, email: e.target.value })}
                                />
                                {candidateInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateInfo.email) && (
                                    <p className="text-[10px] text-red-500 font-bold ml-1 uppercase tracking-wider">Invalid email format</p>
                                )}
                                {attemptError && (
                                    <p className="text-[10px] text-red-500 font-bold ml-1 uppercase tracking-wider animate-pulse">{attemptError}</p>
                                )}
                                {checkingEmail && (
                                    <p className="text-[10px] text-primary font-bold ml-1 uppercase tracking-wider">Checking attempts...</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                if (candidateInfo.name && emailRegex.test(candidateInfo.email) && emailAllowed) {
                                    setHasStarted(true);
                                }
                            }}
                            disabled={!candidateInfo.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateInfo.email) || !emailAllowed || checkingEmail}
                            className="w-full btn-primary py-5 text-xl flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {checkingEmail ? 'Processing...' : 'Start Assessment'} <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-[#f0ebf8] flex flex-col">
            <nav className="glass sticky top-0 z-50 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center border-b border-[#dadce0]">
                <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                    {assessment.coverImage ? (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl overflow-hidden border border-slate-200 shrink-0">
                            <img src={assessment.coverImage} alt="Logo" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                            <ShieldCheck className="text-white" size={20} />
                        </div>
                    )}
                    <div className="overflow-hidden">
                        <h1 className="font-bold text-sm md:text-lg leading-tight truncate">{assessment.title}</h1>
                        <p className="hidden md:block text-[10px] text-muted-foreground font-bold uppercase tracking-wider">SECURE ASSESSMENT MODE</p>
                    </div>
                </div>

                <div className={cn(
                    "flex items-center gap-2 md:gap-3 px-3 md:px-6 py-1.5 md:py-2.5 rounded-full font-mono text-sm md:text-xl font-black transition-all border shrink-0",
                    timeLeft < 300 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-white text-foreground border-slate-200"
                )}>
                    <Clock size={16} className="md:w-5 md:h-5" />
                    {formatTime(timeLeft)}
                </div>
            </nav>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-3xl mx-auto space-y-4">
                        {/* Continuous Header Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                            {/* Integrated Cover Image */}
                            {assessment.coverImage && (
                                <div className="w-full h-32 md:h-64 border-b border-slate-100">
                                    <img src={assessment.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                </div>
                            )}

                            <div className="p-5 md:p-8 space-y-3 md:space-y-4">
                                <h2 className="text-xl md:text-3xl font-bold text-slate-800">{assessment.title}</h2>
                                <p className="text-sm md:text-base text-slate-600 font-medium">{assessment.description}</p>
                                <div className="pt-3 md:pt-4 border-t border-slate-100 flex flex-wrap items-center gap-y-2 gap-x-4 md:gap-x-6 text-slate-500">
                                    <div className="flex items-center gap-1.5 font-bold text-[11px] md:text-xs">
                                        <Info size={13} className="text-slate-400" /> {questions.length} Questions
                                    </div>
                                    <div className="w-1 h-1 bg-slate-200 rounded-full hidden sm:block" />
                                    <div className="flex items-center gap-1.5 font-bold text-[11px] md:text-xs">
                                        <Clock size={13} className="text-slate-400" /> {assessment.duration} Mins
                                    </div>
                                    <div className="w-1 h-1 bg-slate-200 rounded-full hidden sm:block" />
                                    <div className="flex items-center gap-1.5 font-bold text-[11px] md:text-xs">
                                        <Send size={13} className="text-slate-400" /> Max {assessment.settings?.maxAttempts || 1} {assessment.settings?.maxAttempts > 1 ? 'Attempts' : 'Attempt'}
                                    </div>
                                    {assessment.settings?.negativeMarkingEnabled && (
                                        <>
                                            <div className="w-1 h-1 bg-slate-200 rounded-full hidden sm:block" />
                                            <div className="flex items-center gap-1.5 font-bold text-[11px] md:text-xs text-orange-500">
                                                <AlertTriangle size={13} /> Neg. Marking
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-slate-100 text-red-500 text-[11px] md:text-xs font-medium">
                                    * Indicates required question
                                </div>
                            </div>
                        </div>

                        {/* Sticky Progress Bar (Subtle) */}
                        <div className="sticky top-2 z-40 bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-4">
                                <div className="flex-1 flex gap-1 h-2 bg-slate-100 rounded-full overflow-hidden p-0.5">
                                    {questions.map((_, idx) => {
                                        const isAnswered = answers[questions[idx]._id] && answers[questions[idx]._id].trim() !== "";
                                        return (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    "flex-1 rounded-full transition-all duration-300",
                                                    isAnswered ? "bg-primary" : "bg-slate-200"
                                                )}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex gap-1">
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-md border border-green-100">
                                            <span className="text-xs font-black font-mono">
                                                {Object.values(answers).filter(a => a && a.trim() !== "").length}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md border border-slate-100">
                                            <span className="text-xs font-black font-mono">
                                                {questions.length}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pb-6">
                            {questions.map((q, qIdx) => {
                                const isUnanswered = q.required && (!answers[q._id] || answers[q._id].trim() === "");
                                const hasError = showErrors && isUnanswered;

                                return (
                                    <div key={q._id} id={`question-${qIdx}`} className={cn(
                                        "bg-white rounded-xl shadow-sm border p-5 md:p-8 space-y-4 md:space-y-6 animate-in slide-in-from-bottom-2 duration-500 transition-all",
                                        hasError ? "border-red-500" : "border-slate-200"
                                    )}>
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="space-y-2 md:space-y-3">
                                                <span className="text-[10px] md:text-xs font-black text-primary uppercase tracking-widest">Question {qIdx + 1}</span>
                                                <h2 className="text-[16px] md:text-xl font-medium leading-tight text-slate-800">{q.text} {q.required && <span className="text-red-500 ml-1">*</span>}</h2>
                                            </div>
                                            <div className="shrink-0 flex gap-2">
                                                <span className="text-[9px] font-black px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md border border-slate-100 uppercase whitespace-nowrap">
                                                    {q.marks} Marks
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-1 md:pt-2">
                                            {q.type === "MCQ" ? (
                                                <div className="space-y-2 md:space-y-3">
                                                    {q.options.map((opt, idx) => (
                                                        <label
                                                            key={idx}
                                                            className={cn(
                                                                "w-full p-3 md:p-4 rounded-xl border border-transparent transition-all flex items-center gap-3 md:gap-4 cursor-pointer hover:bg-slate-50",
                                                                answers[q._id] === opt && "bg-blue-50/50 border-blue-100"
                                                            )}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`question-${q._id}`}
                                                                checked={answers[q._id] === opt}
                                                                onChange={() => handleAnswer(q._id, opt)}
                                                                className="w-4 h-4 md:w-5 md:h-5 accent-primary cursor-pointer shrink-0"
                                                            />
                                                            <span className="text-[14px] md:text-base text-slate-700 font-medium leading-tight">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            ) : q.type === "SHORT_ANSWER" ? (
                                                <textarea
                                                    className={cn(
                                                        "w-full bg-transparent border-b outline-none py-2 text-sm md:text-lg transition-all min-h-[80px] md:min-h-[100px]",
                                                        hasError ? "border-red-500 focus:border-red-600" : "border-slate-200 focus:border-primary focus:border-b-2"
                                                    )}
                                                    placeholder="Your answer"
                                                    value={answers[q._id] || ""}
                                                    onChange={(e) => handleAnswer(q._id, e.target.value)}
                                                    onPaste={preventCheating}
                                                    onCopy={preventCheating}
                                                    onCut={preventCheating}
                                                    onDrop={preventCheating}
                                                />
                                            ) : (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        className={cn(
                                                            "w-full bg-transparent border-b outline-none py-2 text-sm md:text-lg transition-all",
                                                            hasError ? "border-red-500 focus:border-red-600" : "border-slate-200 focus:border-primary focus:border-b-2"
                                                        )}
                                                        placeholder="Short answer text"
                                                        value={answers[q._id] || ""}
                                                        onChange={(e) => handleAnswer(q._id, e.target.value)}
                                                        onPaste={preventCheating}
                                                        onCopy={preventCheating}
                                                        onCut={preventCheating}
                                                        onDrop={preventCheating}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {hasError && (
                                            <div className="flex items-center gap-2 text-red-500 mt-3 md:mt-4 animate-in fade-in slide-in-from-top-1">
                                                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full border border-red-500 flex items-center justify-center text-[9px] md:text-[10px] font-bold shrink-0">!</div>
                                                <span className="text-xs md:text-sm leading-none">This is a required question</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex flex-col items-center pt-4 pb-12">
                            <button onClick={handleFinish} className="btn-primary bg-primary px-12 py-3 text-lg shadow-md hover:shadow-lg transition-all">
                                Submit
                            </button>
                            <p className="text-slate-400 text-xs mt-4">Please review your answers carefully before submitting. Good luck!</p>
                        </div>
                    </div>
                </main>
            </div>
            {showConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="glass max-w-md w-full p-10 rounded-3xl text-center space-y-6">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-2xl font-bold">Submit Final Answers?</h3>
                        <p className="text-muted-foreground">You've answered {Object.keys(answers).length} of {questions.length} questions.</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="btn-primary py-4 disabled:opacity-50"
                            >
                                {submitting ? "Submitting..." : "Yes, Submit Now"}
                            </button>
                            <button onClick={() => setShowConfirm(false)} className="glass py-4 font-bold text-slate-500">Go Back</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function RuleItem({ icon, label, value }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase leading-none mb-1 truncate">{label}</p>
                <p className="text-xs md:text-sm font-bold text-slate-800 truncate">{value}</p>
            </div>
        </div>
    );
}

function UpcomingExamCountdown({ startTime, title }) {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(startTime));

    useEffect(() => {
        const timer = setInterval(() => {
            const left = calculateTimeLeft(startTime);
            setTimeLeft(left);
            if (left.total <= 0) {
                window.location.reload();
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [startTime]);

    function calculateTimeLeft(target) {
        const difference = +new Date(target) - +new Date();
        if (difference <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

        return {
            total: difference,
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60),
        };
    }

    const pad = (n) => n.toString().padStart(2, "0");

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
            {/* Background elements */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: `radial-gradient(#1565C0 1px, transparent 1px)`,
                    backgroundSize: '32px 32px'
                }}>
            </div>

            <div className="relative z-10 max-w-2xl w-full space-y-10">
                <div className="space-y-4">
                    <h1 className="text-6xl sm:text-7xl font-black text-slate-900 tracking-tight">
                        Coming Soon
                    </h1>
                    <p className="text-slate-500 text-lg sm:text-xl font-medium max-w-lg mx-auto leading-relaxed">
                        The assessment <span className="text-primary font-bold">"{title}"</span> is scheduled.
                        Please wait for the live session to begin.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="text-5xl sm:text-7xl font-black text-primary flex items-center justify-center gap-2 sm:gap-4 font-mono tracking-tighter">
                        <span>{pad(timeLeft.days)}</span>
                        <span className="text-slate-200 animate-pulse">:</span>
                        <span>{pad(timeLeft.hours)}</span>
                        <span className="text-slate-200 animate-pulse">:</span>
                        <span>{pad(timeLeft.minutes)}</span>
                        <span className="text-slate-200 animate-pulse">:</span>
                        <span>{pad(timeLeft.seconds)}</span>
                    </div>

                    <div className="text-slate-400 font-bold text-lg uppercase tracking-[0.2em] flex items-center justify-center gap-12 sm:gap-16 pl-2">
                        <span className="w-10">DAYS</span>
                        <span className="w-10">HRS</span>
                        <span className="w-10">MINS</span>
                        <span className="w-10">SECS</span>
                    </div>
                </div>

                <div className="pt-8">
                    <div className="inline-flex flex-col items-center gap-3">
                        <div className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 font-bold shadow-sm">
                            {timeLeft.days > 0 ? `${timeLeft.days} days left` : timeLeft.hours > 0 ? `${timeLeft.hours} hours left` : "Starting very soon"}
                        </div>
                        <p className="text-xs text-slate-300 font-bold uppercase tracking-widest">Starts at {new Date(startTime).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

