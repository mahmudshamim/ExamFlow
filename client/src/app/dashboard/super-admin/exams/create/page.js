"use client";
import { useState, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import API_URL from '@/config';
import { ChevronLeft, Plus, Trash2, Save, Loader2, Clock, Calendar, Settings, GripVertical, X, FileText, Copy, Image as ImageIcon, Upload, Eye, Link as LinkIcon, ShieldCheck, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Swal from 'sweetalert2';

export default function CreateExamPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    // Drag & Drop State
    const [draggedItemIndex, setDraggedItemIndex] = useState(null);

    // Exam Details State
    const [examData, setExamData] = useState({
        title: '',
        description: '',
        coverImage: '',
        duration: 60,
        startTime: null,
        endTime: null,
        settings: {
            negativeMarkingEnabled: false,
            automatedEmail: true,
            maxAttempts: 1,
            tabSwitchLimit: 0,
            enableAntiCheat: false,
            requireFullscreen: false,
            antiCheatMode: 'STRICT'
        }
    });

    // Questions State
    const [questions, setQuestions] = useState([
        { id: 1, type: 'MCQ', text: 'Question 1', options: ['Option 1'], correctAnswer: 'Option 1', marks: 1, required: false }
    ]);

    // Helper: Add new question
    const addQuestion = (type = 'MCQ') => {
        const newQ = {
            id: Date.now(),
            type,
            text: `Question ${questions.length + 1}`,
            options: type === 'MCQ' ? ['Option 1'] : [],
            correctAnswer: '',
            marks: 1,
            required: false // Default to not required
        };
        setQuestions([...questions, newQ]);
    };

    // Helper: Update question field
    const updateQuestion = (id, field, value) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    // Helper: Add option to MCQ
    const addOption = (qId) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                const newOpt = `Option ${q.options.length + 1}`;
                return { ...q, options: [...q.options, newOpt] };
            }
            return q;
        }));
    };

    // Helper: Update option text
    const updateOption = (qId, idx, value) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                const newOpts = [...q.options];
                newOpts[idx] = value;
                return { ...q, options: newOpts };
            }
            return q;
        }));
    };

    // Helper: Remove option
    const removeOption = (qId, idx) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                const newOpts = q.options.filter((_, i) => i !== idx);
                return { ...q, options: newOpts };
            }
            return q;
        }));
    };

    // Helper: Delete question
    const deleteQuestion = (id) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    // Helper: Duplicate Question
    const duplicateQuestion = (id) => {
        const questionToClone = questions.find(q => q.id === id);
        if (questionToClone) {
            const newQ = {
                ...questionToClone,
                id: Date.now(),
                text: `${questionToClone.text} (Copy)`
            };
            // Insert after the original
            const index = questions.findIndex(q => q.id === id);
            const newQuestions = [...questions];
            newQuestions.splice(index + 1, 0, newQ);
            setQuestions(newQuestions);
        }
    };

    // --- Image Compression Helper ---
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions (max 800px width/height for better compression)
                    const maxDimension = 800;
                    if (width > height && width > maxDimension) {
                        height = (height / width) * maxDimension;
                        width = maxDimension;
                    } else if (height > maxDimension) {
                        width = (width / height) * maxDimension;
                        height = maxDimension;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Start with quality 0.7 and reduce if needed
                    let quality = 0.7;
                    let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

                    // Keep reducing quality until size is under 50KB
                    while (compressedDataUrl.length > 50 * 1024 && quality > 0.1) {
                        quality -= 0.05;
                        compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    }

                    console.log(`Image compressed to ${(compressedDataUrl.length / 1024).toFixed(2)}KB at quality ${quality.toFixed(2)}`);
                    resolve(compressedDataUrl);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // --- File Upload Handler (Base64 with Compression) ---
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check if it's an image
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        setUploading(true);
        setError('');

        try {
            const compressedImage = await compressImage(file);
            setExamData({ ...examData, coverImage: compressedImage });
        } catch (err) {
            console.error(err);
            setError('Failed to process image');
        } finally {
            setUploading(false);
        }
    };

    // --- Preview & Link Handlers ---
    const handlePreview = () => {
        // Save current state to session storage
        const previewData = {
            ...examData,
            questions
        };
        sessionStorage.setItem('exam_preview_data', JSON.stringify(previewData));
        // Open preview in new tab
        window.open('/dashboard/super-admin/exams/preview', '_blank');
    };

    const handleCopyLink = () => {
        Swal.fire({
            html: `
                <div class="flex flex-col items-center">
                    <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-slate-800 mb-2">Draft Exam</h2>
                    <p class="text-slate-500 text-center text-sm px-4">This is a draft exam. Please publish it to generate a public link for candidates.</p>
                </div>
            `,
            confirmButtonText: 'Got it',
            confirmButtonColor: '#1565C0',
            customClass: {
                popup: 'rounded-[32px] p-8',
                confirmButton: 'rounded-2xl px-8 py-3 font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-xl transition-all duration-300'
            }
        });
    };


    // --- Drag and Drop Handlers ---
    const handleDragStart = (index) => {
        setDraggedItemIndex(index);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDrop = (index) => {
        if (draggedItemIndex === null) return;

        const newQuestions = [...questions];
        const draggedItem = newQuestions[draggedItemIndex];

        // Remove from old position
        newQuestions.splice(draggedItemIndex, 1);
        // Insert at new position
        newQuestions.splice(index, 0, draggedItem);

        setQuestions(newQuestions);
        setDraggedItemIndex(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validation for Start and End Times
        if (!examData.startTime || !examData.endTime) {
            setError('Please select both Start and End times for the assessment');
            setLoading(false);
            return;
        }

        if (new Date(examData.endTime) <= new Date(examData.startTime)) {
            setError('End time must be after the start time');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');

            // Clean up questions before sending (remove temp IDs)
            const cleanQuestions = questions.map(({ id, ...rest }) => rest);

            const payload = {
                ...examData,
                questions: cleanQuestions
            };

            const res = await axios.post(`${API_URL}/exams`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const examId = res.data.exam._id;
            const liveLink = `${window.location.origin}/assessment/${examId}`;

            const swalResult = await Swal.fire({
                html: `
                    <div class="flex flex-col items-center">
                        <div class="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
                            <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <h2 class="text-3xl font-black text-slate-900 mb-2 leading-tight text-center">Successfully<br/>Published!</h2>
                        <p class="text-slate-500 mb-6 text-center text-sm">Your assessment is now live and ready to take.</p>
                        
                        <div class="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 text-left">
                            <p class="text-[10px] uppercase tracking-wider text-slate-400 font-black mb-2">Live Exam Link</p>
                            <div class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                                <code class="text-xs text-primary font-bold truncate flex-1 pl-2">${liveLink}</code>
                                <button 
                                    class="copy-btn bg-primary hover:bg-primary-dark text-white text-[10px] font-bold px-4 py-2 rounded-lg transition-all active:scale-95 shadow-md shadow-primary/20"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                `,
                showCloseButton: true,
                confirmButtonText: 'Go to Dashboard',
                confirmButtonColor: '#1565C0',
                allowOutsideClick: false,
                customClass: {
                    popup: 'rounded-[32px] p-10',
                    confirmButton: 'w-full mt-6 rounded-2xl py-4 text-sm font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-xl transition-all duration-300',
                    closeButton: 'absolute top-4 right-4 text-slate-400 hover:text-slate-600 border-none outline-none shadow-none'
                },
                didOpen: () => {
                    const copyBtn = Swal.getHtmlContainer().querySelector('.copy-btn');
                    if (copyBtn) {
                        copyBtn.addEventListener('click', () => {
                            navigator.clipboard.writeText(liveLink);
                            const originalText = copyBtn.innerHTML;
                            copyBtn.innerHTML = 'Copied!';
                            copyBtn.classList.remove('bg-primary');
                            copyBtn.classList.add('bg-green-500');

                            setTimeout(() => {
                                if (copyBtn) {
                                    copyBtn.innerHTML = originalText;
                                    copyBtn.classList.remove('bg-green-500');
                                    copyBtn.classList.add('bg-primary');
                                }
                            }, 2000);
                        });
                    }
                }
            });

            if (swalResult.isConfirmed) {
                router.push('/dashboard/super-admin');
            }
        } catch (err) {
            console.error('Exam Creation Error:', err);
            const errMsg = err.response?.data?.error || err.message || 'Failed to create exam';
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header / Nav */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 md:static z-20 bg-gray-50/90 backdrop-blur-md py-4 mb-6 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Link href="/dashboard/super-admin" className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600">
                        <ChevronLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Create Assessment</h1>
                        <p className="text-xs md:text-sm text-gray-500 hidden md:block">Design your exam questions and settings</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    {/* Preview Button */}
                    <button
                        onClick={handlePreview}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors tooltip-container"
                        title="Preview"
                    >
                        <Eye size={22} />
                    </button>

                    {/* Copy Link Button */}
                    <button
                        onClick={handleCopyLink}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors mr-2"
                        title="Get Link"
                    >
                        <LinkIcon size={22} />
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 flex items-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        <span className="hidden md:inline">Publish Exam</span>
                        <span className="md:hidden">Save</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2 font-medium animate-in fade-in slide-in-from-top-2">
                    <Settings size={18} /> {error}
                </div>
            )}

            <div className="space-y-6">
                {/* 1. Exam Title Card (Google Form Header Style) */}
                <div className="bg-white rounded-2xl shadow-sm border-t-8 border-t-primary border-x border-b border-gray-200 overflow-hidden relative group">
                    {/* Hidden File Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                    />

                    {/* Cover Image Display */}
                    {examData.coverImage && (
                        <div className="h-40 w-full overflow-hidden relative border-b border-gray-100 group">
                            <img src={examData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                            <button
                                onClick={() => setExamData({ ...examData, coverImage: '' })}
                                className="absolute top-2 right-2 bg-white/90 p-2 rounded-full hover:bg-white text-gray-600 hover:text-red-500 shadow-md transition-all"
                                title="Remove Cover Image"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}

                    {/* Add Cover Image Button (Always Visible if no image) */}
                    {!examData.coverImage && (
                        <div className="absolute top-4 right-4 z-10">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 shadow-sm disabled:opacity-50"
                            >
                                {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                                {uploading ? 'Uploading...' : 'Add Cover Image'}
                            </button>
                        </div>
                    )}

                    <div className="p-8 space-y-6">
                        <input
                            type="text"
                            value={examData.title}
                            onChange={e => setExamData({ ...examData, title: e.target.value })}
                            placeholder="Untitled Assessment"
                            className="w-full text-4xl font-bold placeholder-gray-300 border-b border-transparent focus:border-primary/30 outline-none pb-2 transition-colors hover:border-gray-200"
                        />
                        <textarea
                            value={examData.description}
                            onChange={e => setExamData({ ...examData, description: e.target.value })}
                            placeholder="Form description"
                            rows={2}
                            className="w-full text-base text-gray-600 placeholder-gray-400 border-b border-transparent focus:border-gray-300 outline-none resize-none transition-colors hover:border-gray-100"
                        />

                        {/* Quick Settings Row */}
                        <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg text-sm text-gray-600 w-full sm:w-auto">
                                <Clock size={16} />
                                <input
                                    type="number"
                                    value={isNaN(examData.duration) ? '' : examData.duration}
                                    onChange={e => {
                                        const val = parseInt(e.target.value);
                                        setExamData({ ...examData, duration: isNaN(val) ? 0 : val });
                                    }}
                                    className="w-12 bg-transparent outline-none font-bold text-gray-900 text-center border-b border-gray-300 focus:border-primary"
                                />
                                mins
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl text-sm text-gray-600 border border-gray-100 focus-within:border-primary/30 transition-all hover:bg-gray-100/80 cursor-pointer w-full sm:w-auto">
                                <Calendar size={16} className="text-primary/60" />
                                <div className="flex flex-col w-full">
                                    <span className="font-bold text-[9px] uppercase tracking-wider text-gray-400 leading-none mb-1">Start Time</span>
                                    <DatePicker
                                        selected={examData.startTime}
                                        onChange={(date) => setExamData({ ...examData, startTime: date })}
                                        showTimeSelect
                                        dateFormat="MMM d, yyyy h:mm aa"
                                        placeholderText="Pick start time"
                                        portalId="root-portal"
                                        popperPlacement="bottom-start"
                                        className="bg-transparent outline-none font-bold text-gray-900 text-xs w-full"
                                        wrapperClassName="w-full"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl text-sm text-gray-600 border border-gray-100 focus-within:border-primary/30 transition-all hover:bg-gray-100/80 cursor-pointer w-full sm:w-auto">
                                <Calendar size={16} className="text-primary/60" />
                                <div className="flex flex-col w-full">
                                    <span className="font-bold text-[9px] uppercase tracking-wider text-gray-400 leading-none mb-1">End Time</span>
                                    <DatePicker
                                        selected={examData.endTime}
                                        onChange={(date) => setExamData({ ...examData, endTime: date })}
                                        showTimeSelect
                                        dateFormat="MMM d, yyyy h:mm aa"
                                        placeholderText="Pick end time"
                                        portalId="root-portal"
                                        popperPlacement="bottom-start"
                                        className="bg-transparent outline-none font-bold text-gray-900 text-xs w-full"
                                        wrapperClassName="w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Security Settings Row */}
                        <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 transition-all hover:bg-slate-100/80">
                                <ShieldCheck size={18} className={examData.settings.enableAntiCheat ? "text-primary" : "text-slate-400"} />
                                <div className="flex flex-col">
                                    <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400 leading-none mb-1">Anti-Cheat Mode</span>
                                    <label className="flex items-center cursor-pointer gap-2">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={examData.settings.enableAntiCheat}
                                                onChange={e => setExamData({
                                                    ...examData,
                                                    settings: { ...examData.settings, enableAntiCheat: e.target.checked }
                                                })}
                                            />
                                            <div className={`block w-8 h-4 rounded-full transition-colors ${examData.settings.enableAntiCheat ? 'bg-primary' : 'bg-gray-300'}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-2 h-2 rounded-full transition-transform ${examData.settings.enableAntiCheat ? 'transform translate-x-4' : ''}`}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600">{examData.settings.enableAntiCheat ? "ENABLED" : "DISABLED"}</span>
                                    </label>
                                </div>
                            </div>

                            {examData.settings.enableAntiCheat && examData.settings.antiCheatMode === 'STRICT' && (
                                <div className="flex items-center gap-3 bg-red-50/50 px-4 py-2 rounded-xl border border-red-100 transition-all hover:bg-red-50/80 animate-in zoom-in duration-300">
                                    <AlertTriangle size={18} className="text-red-500" />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[9px] uppercase tracking-wider text-red-400 leading-none mb-1">Switch Limit</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={examData.settings.tabSwitchLimit}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value);
                                                    setExamData({
                                                        ...examData,
                                                        settings: { ...examData.settings, tabSwitchLimit: isNaN(val) ? 0 : val }
                                                    });
                                                }}
                                                className="w-8 bg-transparent outline-none font-bold text-red-600 text-xs border-b border-red-200 focus:border-red-500"
                                            />
                                            <span className="text-[10px] font-bold text-red-500 uppercase">Times</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3 bg-blue-50/50 px-4 py-2 rounded-xl border border-blue-100 transition-all hover:bg-blue-50/80">
                                <ShieldCheck size={18} className={examData.settings.requireFullscreen ? "text-blue-600" : "text-slate-400"} />
                                <div className="flex flex-col">
                                    <span className="font-bold text-[9px] uppercase tracking-wider text-blue-400 leading-none mb-1">Force Fullscreen</span>
                                    <label className="flex items-center cursor-pointer gap-2">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={examData.settings.requireFullscreen}
                                                onChange={e => setExamData({
                                                    ...examData,
                                                    settings: { ...examData.settings, requireFullscreen: e.target.checked }
                                                })}
                                            />
                                            <div className={`block w-8 h-4 rounded-full transition-colors ${examData.settings.requireFullscreen ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-2 h-2 rounded-full transition-transform ${examData.settings.requireFullscreen ? 'transform translate-x-4' : ''}`}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-blue-600">{examData.settings.requireFullscreen ? "ON" : "OFF"}</span>
                                    </label>
                                </div>
                            </div>

                            {examData.settings.enableAntiCheat && (
                                <div className="flex items-center gap-3 bg-purple-50/50 px-4 py-2 rounded-xl border border-purple-100 transition-all hover:bg-purple-50/80">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[9px] uppercase tracking-wider text-purple-400 leading-none mb-1">Monitoring Mode</span>
                                        <div className="flex bg-purple-100/50 p-0.5 rounded-lg border border-purple-100">
                                            <button
                                                type="button"
                                                onClick={() => setExamData({
                                                    ...examData,
                                                    settings: { ...examData.settings, antiCheatMode: 'STRICT' }
                                                })}
                                                className={`px-3 py-1 rounded-md text-[9px] font-black transition-all ${examData.settings.antiCheatMode === 'STRICT' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-400 hover:text-purple-600'}`}
                                            >
                                                STRICT
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setExamData({
                                                    ...examData,
                                                    settings: { ...examData.settings, antiCheatMode: 'SILENT' }
                                                })}
                                                className={`px-3 py-1 rounded-md text-[9px] font-black transition-all ${examData.settings.antiCheatMode === 'SILENT' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-400 hover:text-purple-600'}`}
                                            >
                                                SILENT
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Existing Settings Toggle (Negative Marking) */}
                            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 transition-all hover:bg-gray-100/80">
                                <AlertTriangle size={18} className={examData.settings.negativeMarkingEnabled ? "text-orange-500" : "text-gray-400"} />
                                <div className="flex flex-col">
                                    <span className="font-bold text-[9px] uppercase tracking-wider text-gray-400 leading-none mb-1">Negative Marking</span>
                                    <label className="flex items-center cursor-pointer gap-2">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={examData.settings.negativeMarkingEnabled}
                                                onChange={e => setExamData({
                                                    ...examData,
                                                    settings: { ...examData.settings, negativeMarkingEnabled: e.target.checked }
                                                })}
                                            />
                                            <div className={`block w-8 h-4 rounded-full transition-colors ${examData.settings.negativeMarkingEnabled ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-2 h-2 rounded-full transition-transform ${examData.settings.negativeMarkingEnabled ? 'transform translate-x-4' : ''}`}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-600">{examData.settings.negativeMarkingEnabled ? "ON" : "OFF"}</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Questions List (Draggable) */}
                {questions.map((q, index) => (
                    <div
                        key={q.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(index)}
                        className={`group relative bg - white rounded - 2xl shadow - sm border border - gray - 200 hover: shadow - md transition - all ${draggedItemIndex === index ? 'opacity-50 border-dashed border-primary' : ''} `}
                    >
                        {/* Drag Handle */}
                        <div
                            className="absolute top-0 inset-x-0 h-6 flex justify-center cursor-move opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            title="Drag to reorder"
                        >
                            <GripVertical className="text-gray-300 rotate-90" size={20} />
                        </div>

                        {/* Content */}
                        <div className="p-6 md:p-8 space-y-6">
                            <div className="flex flex-col md:flex-row gap-4 items-start">
                                {/* Question Text */}
                                <div className="flex-1 w-full bg-gray-50 rounded-xl p-2 border-b-2 border-gray-200 focus-within:border-primary focus-within:bg-blue-50/20 transition-colors">
                                    <input
                                        type="text"
                                        value={q.text}
                                        onChange={e => updateQuestion(q.id, 'text', e.target.value)}
                                        className="w-full bg-transparent p-2 outline-none text-lg font-medium text-gray-900"
                                        placeholder="Question"
                                    />
                                </div>

                                {/* Type Selector */}
                                <select
                                    value={q.type}
                                    onChange={e => updateQuestion(q.id, 'type', e.target.value)}
                                    className="p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 cursor-pointer"
                                >
                                    <option value="MCQ">Multiple Choice</option>
                                    <option value="SHORT_ANSWER">Short Answer</option>
                                </select>
                            </div>

                            {/* Options Area */}
                            {q.type === 'MCQ' && (
                                <div className="space-y-3 pl-1">
                                    {q.options.map((opt, optIdx) => (
                                        <div key={optIdx} className="flex items-center gap-3 group/opt">
                                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={e => updateOption(q.id, optIdx, e.target.value)}
                                                className="flex-1 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary outline-none py-1 text-gray-700 transition-colors"
                                            />
                                            {q.options.length > 1 && (
                                                <button onClick={() => removeOption(q.id, optIdx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-opacity">
                                                    <X size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-3 pt-1">
                                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 opacity-50 flex-shrink-0" />
                                        <button
                                            onClick={() => addOption(q.id)}
                                            className="text-gray-500 text-sm hover:text-primary font-medium hover:underline"
                                        >
                                            Add option
                                        </button>
                                    </div>

                                    {/* Correct Answer Selection */}
                                    <div className="mt-4 pt-4 border-t border-dashed border-gray-100">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Correct Answer</label>
                                        <select
                                            value={q.correctAnswer}
                                            onChange={e => updateQuestion(q.id, 'correctAnswer', e.target.value)}
                                            className="w-full md:w-1/2 p-2 bg-green-50/50 border border-green-100 rounded-lg text-sm text-green-700 outline-none focus:border-green-300"
                                        >
                                            <option value="">Select Correct Option</option>
                                            {q.options.map((opt, i) => (
                                                <option key={i} value={opt}>{opt || `Option ${i + 1} `}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {q.type === 'SHORT_ANSWER' && (
                                <div className="text-sm text-gray-400 italic px-4 py-3 border-b border-gray-200 w-full md:w-2/3">
                                    Short answer text will be entered here...
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                {/* Required Toggle */}
                                <div className="flex items-center gap-3 border-r border-gray-200 pr-4">
                                    <label className="flex items-center cursor-pointer gap-2">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={q.required}
                                                onChange={e => updateQuestion(q.id, 'required', e.target.checked)}
                                            />
                                            <div className={`block w-10 h-6 rounded-full transition-colors ${q.required ? 'bg-primary' : 'bg-gray-300'}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${q.required ? 'transform translate-x-4' : ''}`}></div>
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">Required</span>
                                    </label>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 border-r border-gray-200 pr-4 mr-1">
                                        <span>Points:</span>
                                        <input
                                            type="number"
                                            value={q.marks}
                                            onChange={e => updateQuestion(q.id, 'marks', parseInt(e.target.value) || 0)}
                                            className="w-12 p-1 text-center border-b border-gray-200 focus:border-primary outline-none font-bold text-gray-900"
                                        />
                                    </div>
                                    <button
                                        onClick={() => duplicateQuestion(q.id)}
                                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                                        title="Duplicate"
                                    >
                                        <Copy size={20} />
                                    </button>
                                    <button onClick={() => deleteQuestion(q.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors" title="Delete">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Floating Action Buttons */}
            <div className="fixed bottom-8 right-8 flex flex-col gap-3">
                <button
                    onClick={() => addQuestion('MCQ')}
                    className="p-4 bg-primary text-white rounded-full shadow-lg shadow-primary/30 transition-transform hover:scale-110 hover:rotate-90 group"
                    title="Add Question"
                >
                    <Plus size={24} />
                </button>
            </div>
        </div>
    );
}
