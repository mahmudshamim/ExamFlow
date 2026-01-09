"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, LogOut, ShieldCheck, Menu, X, BarChart3 } from 'lucide-react';

export default function SuperAdminLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    const navItems = [
        { name: 'Overview', href: '/dashboard/super-admin', icon: LayoutDashboard },
        { name: 'Results', href: '/dashboard/super-admin/results', icon: BarChart3 },
        { name: 'Admins', href: '/dashboard/super-admin/admins/create', icon: Users },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                <div className="h-full flex flex-col">
                    {/* Logo */}
                    <div className="h-16 flex items-center px-6 border-b border-border">
                        <ShieldCheck className="w-8 h-8 text-primary mr-2" />
                        <span className="text-xl font-bold text-foreground">ExamFlow</span>
                    </div>

                    {/* Nav Items */}
                    <nav className="flex-1 px-4 py-6 space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                        }
                  `}
                                >
                                    <item.icon size={20} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile & Logout */}
                    <div className="p-4 border-t border-border">
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                SA
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">Super Admin</p>
                                <p className="text-xs text-muted-foreground">System Owner</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:ml-64 flex flex-col min-h-screen">
                {/* Mobile Header */}
                <header className="lg:hidden h-16 bg-white border-b border-border flex items-center px-4 justify-between">
                    <span className="font-bold text-lg">Dashboard</span>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 text-muted-foreground hover:bg-secondary rounded-lg"
                    >
                        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
