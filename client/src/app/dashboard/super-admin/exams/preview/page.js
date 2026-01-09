"use client";
import { useState, useEffect } from "react";
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle, ShieldCheck, Mail, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ExamPreviewPage() {
    const router = useRouter();
    const [assessment, setAssessment] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);

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

    const currentQuestion = questions[currentQ];

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
                <main className="flex-1 overflow-y-auto p-12">
                    <div className="max-w-3xl mx-auto space-y-12">
                        {/* Cover Image Preview */}
                        {assessment.coverImage && (
                            <div className="rounded-3xl overflow-hidden h-48 w-full shadow-sm mb-6">
                                <img src={assessment.coverImage} className="w-full h-full object-cover" alt="Cover" />
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-sm font-black text-primary uppercase tracking-widest">Question {currentQ + 1} of {questions.length}</span>
                                <div className="flex gap-2">
                                    <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-full text-slate-500">{currentQuestion?.marks} Marks</span>
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold leading-tight text-slate-800">{currentQuestion?.text}</h2>
                        </div>

                        <div className="pt-8">
                            {currentQuestion?.type === "MCQ" ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {currentQuestion.options.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswer(currentQuestion.id, opt)}
                                            className={cn(
                                                "p-6 rounded-2xl border-2 text-left transition-all flex items-center gap-4",
                                                answers[currentQuestion.id] === opt ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/30"
                                            )}
                                        >
                                            <div className={cn("w-5 h-5 rounded-full border-2", answers[currentQuestion.id] === opt ? "border-primary bg-primary" : "border-slate-300")} />
                                            <span className="text-lg font-medium">{opt}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : currentQuestion?.type === "SHORT_ANSWER" ? (
                                <textarea
                                    className="w-full glass p-8 rounded-3xl border border-border focus:ring-4 focus:ring-primary/10 outline-none min-h-[200px] text-lg"
                                    placeholder="Type your explanation..."
                                    value={answers[currentQuestion?.id] || ""}
                                    onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                                />
                            ) : (
                                <div className="p-10 text-center text-gray-400">Question content placeholder</div>
                            )}
                        </div>

                        <div className="flex justify-between pt-12">
                            <button
                                disabled={currentQ === 0}
                                onClick={() => setCurrentQ(currentQ - 1)}
                                className="flex items-center gap-2 px-8 py-4 font-bold text-slate-400 disabled:opacity-30"
                            >
                                <ChevronLeft /> Previous
                            </button>
                            {currentQ < questions.length - 1 ? (
                                <button
                                    onClick={() => setCurrentQ(currentQ + 1)}
                                    className="btn-primary px-10 py-4 flex items-center gap-2"
                                >
                                    Next <ChevronRight />
                                </button>
                            ) : (
                                <div className="opacity-50">End of Preview</div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
