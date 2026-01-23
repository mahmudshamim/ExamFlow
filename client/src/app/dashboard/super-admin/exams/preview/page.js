"use client";
import { useState, useEffect } from "react";
import { Clock, Send, ShieldCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ExamPreviewPage() {
    const router = useRouter();
    const [assessment, setAssessment] = useState(null);
    const [questions, setQuestions] = useState([]);


    // For preview, we don't need real timer/submission logic, just the UI
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        // Load data from session storage
        try {
            const data = sessionStorage.getItem('exam_preview_data');
            if (data) {
                const parsed = JSON.parse(data);
                setAssessment(parsed);
                setQuestions(parsed.questions || []);
            } else {
                // If no data, redirect back (or show error)
                // alert("No preview data found.");
                // window.close(); 
            }
        } catch (e) {
            console.error("Preview load error", e);
        }
    }, []);

    const handleAnswer = (qId, ans) => {
        setAnswers({ ...answers, [qId]: ans });
    };

    if (!assessment) return <div className="p-10 text-center">Loading Preview...</div>;



    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Preview Banner */}
            <div className="bg-orange-500 text-white text-center py-2 px-4 font-bold text-sm flex items-center justify-center gap-2">
                <Info size={16} />
                PREVIEW MODE - This is how candidates will see the assessment
                <button onClick={() => window.close()} className="ml-4 hover:bg-orange-600 p-1 rounded">Close Preview</button>
            </div>

            <nav className="glass sticky top-0 z-50 px-8 py-4 flex justify-between items-center border-b border-border/50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                        <ShieldCheck className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight truncate max-w-[200px]">{assessment.title || "Untitled Exam"}</h1>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">SECURE ASSESSMENT MODE</p>
                    </div>
                </div>

                <div className="bg-white text-foreground flex items-center gap-3 px-6 py-3 rounded-2xl font-mono text-xl font-black transition-all">
                    <Clock size={20} />
                    {assessment.duration || 60}:00
                </div>

                <div className="btn-primary px-8 py-3 flex items-center gap-2 opacity-50 cursor-not-allowed">
                    Submit <Send size={18} />
                </div>
            </nav>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-3xl mx-auto space-y-4">
                        {/* Header Card (Matching Assessment UI) */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            {assessment.coverImage && (
                                <div className="w-full h-32 md:h-64 border-b border-slate-100">
                                    <img src={assessment.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                </div>
                            )}

                            <div className="p-5 md:p-8 space-y-3 md:space-y-4">
                                <h2 className="text-xl md:text-3xl font-bold text-slate-800">{assessment.title || "Untitled Exam"}</h2>
                                <p className="text-sm md:text-base text-slate-600 font-medium">{assessment.description}</p>
                                <div className="pt-3 md:pt-4 border-t border-slate-100 flex flex-wrap items-center gap-y-2 gap-x-4 md:gap-x-6 text-slate-500">
                                    <div className="flex items-center gap-1.5 font-bold text-[11px] md:text-xs">
                                        <Info size={13} className="text-slate-400" /> {questions.length} Questions
                                    </div>
                                    <div className="w-1 h-1 bg-slate-200 rounded-full hidden sm:block" />
                                    <div className="flex items-center gap-1.5 font-bold text-[11px] md:text-xs">
                                        <Clock size={13} className="text-slate-400" /> {assessment.duration || 60} Mins
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Questions List */}
                        <div className="space-y-4 pb-6">
                            {questions.map((q, idx) => (
                                <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 md:p-8 space-y-4 md:space-y-6">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="space-y-2 md:space-y-3">
                                            <span className="text-[10px] md:text-xs font-black text-primary uppercase tracking-widest">Question {idx + 1}</span>
                                            <h2 className="text-[16px] md:text-xl font-medium leading-tight text-slate-800">{q.text}</h2>
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
                                                {q.options.map((opt, optIdx) => (
                                                    <label
                                                        key={optIdx}
                                                        className={cn(
                                                            "w-full p-3 md:p-4 rounded-xl border border-transparent transition-all flex items-center gap-3 md:gap-4 cursor-pointer hover:bg-slate-50",
                                                            answers[q.id || idx] === opt && "bg-blue-50/50 border-blue-100"
                                                        )}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`question-${idx}`}
                                                            checked={answers[q.id || idx] === opt}
                                                            onChange={() => handleAnswer(q.id || idx, opt)}
                                                            className="w-4 h-4 md:w-5 md:h-5 accent-primary cursor-pointer shrink-0"
                                                        />
                                                        <span className="text-[14px] md:text-base text-slate-700 font-medium leading-tight">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : q.type === "SHORT_ANSWER" ? (
                                            <textarea
                                                className="w-full bg-transparent border-b border-slate-200 outline-none py-2 text-sm md:text-lg transition-all min-h-[80px] md:min-h-[100px] focus:border-primary focus:border-b-2"
                                                placeholder="Your answer"
                                                value={answers[q.id || idx] || ""}
                                                onChange={(e) => handleAnswer(q.id || idx, e.target.value)}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                className="w-full bg-transparent border-b border-slate-200 outline-none py-2 text-sm md:text-lg transition-all focus:border-primary focus:border-b-2"
                                                placeholder="Short answer text"
                                                value={answers[q.id || idx] || ""}
                                                onChange={(e) => handleAnswer(q.id || idx, e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Submit Button Placeholder */}
                        <div className="flex flex-col items-center pt-4 pb-12">
                            <button className="btn-primary bg-primary px-12 py-3 text-lg shadow-md opacity-50 cursor-not-allowed">
                                Submit
                            </button>
                            <p className="text-slate-400 text-xs mt-4 italic">This is a preview. Results will not be recorded.</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
