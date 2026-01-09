"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, LayoutDashboard, FileText, Users, BarChart3, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar({ role = "hr" }) {
    const pathname = usePathname();

    const menuItems = {
        hr: [
            { icon: LayoutDashboard, label: "Overview", href: "/dashboard/hr" },
            { icon: FileText, label: "Assessments", href: "/dashboard/hr/assessments" },
            { icon: Users, label: "Employees", href: "/dashboard/hr/employees" },
            { icon: BarChart3, label: "Analytics", href: "/dashboard/hr/analytics" },
        ],
        it: [
            { icon: LayoutDashboard, label: "System Health", href: "/dashboard/it" },
            { icon: Users, label: "User Directory", href: "/dashboard/it/users" },
            { icon: FileText, label: "Assessments", href: "/dashboard/it/assessments" },
        ]
    };

    const currentMenu = menuItems[role] || menuItems.employee;

    return (
        <aside className="w-64 glass h-screen fixed left-0 top-0 border-r border-border/50 flex flex-col z-40">
            <div className="p-6 flex items-center gap-2 mb-8">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
                    <Zap className="text-white fill-white" size={18} />
                </div>
                <span className="text-xl font-bold tracking-tight">ExamFlow</span>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                {currentMenu.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all group",
                                isActive ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <Icon size={20} className={cn(isActive ? "text-white" : "group-hover:text-primary transition-colors")} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border/50 space-y-2">
                <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                >
                    <Settings size={20} />
                    Settings
                </Link>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all">
                    <LogOut size={20} />
                    Logout
                </button>
            </div>
        </aside>
    );
}
