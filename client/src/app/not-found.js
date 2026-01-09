"use client";
import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden font-sans">
            {/* Grid Background Pattern */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: `radial-gradient(#1565C0 0.5px, transparent 0.5px)`,
                    backgroundSize: '24px 24px'
                }}>
            </div>

            {/* Subtle Gradient Overlays */}
            <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-white/50 to-transparent z-0"></div>

            <div className="relative z-10 text-center px-6">
                <h2 className="text-xl font-black text-slate-900 tracking-[0.2em] mb-4">ERROR</h2>

                {/* 404 Graphic */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    <span className="text-9xl font-black text-primary drop-shadow-[0_10px_10px_rgba(21,101,192,0.2)]">4</span>

                    {/* The Sad Face Circle/Box */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-primary rounded-[2.5rem] flex flex-col items-center justify-center gap-3 shadow-xl shadow-primary/30">
                        <div className="flex gap-4">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                        <div className="w-10 h-1.5 bg-white rounded-full opacity-80"></div>
                        <div className="flex gap-6 -mt-1">
                            <div className="w-1.5 h-3 bg-white/40 rounded-full"></div>
                            <div className="w-1.5 h-3 bg-white/40 rounded-full"></div>
                        </div>
                    </div>

                    <span className="text-9xl font-black text-primary drop-shadow-[0_10px_10px_rgba(21,101,192,0.2)]">4</span>
                </div>

                <p className="text-slate-500 font-medium text-lg mb-10 max-w-md mx-auto leading-relaxed">
                    We can't seem to find the page you are looking for!
                </p>

                <Link
                    href="/"
                    className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:text-primary px-8 py-3.5 rounded-2xl font-bold shadow-sm hover:shadow-lg transition-all duration-300"
                >
                    <Home size={18} />
                    Back to Home Page
                </Link>
            </div>

            {/* Footer */}
            <div className="absolute bottom-10 left-0 w-full text-center text-slate-400 font-medium text-sm tracking-wide">
                © {new Date().getFullYear()} - ExamFlow
            </div>
        </div>
    );
}
