"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Phone, CreditCard, Loader2, ArrowLeft } from "lucide-react";

const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/calls", label: "Calls", icon: Phone },
    { href: "/admin/payments", label: "Payments", icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        async function checkAdmin() {
            try {
                const res = await fetch("/api/admin/stats");
                if (res.status === 403) {
                    setIsAdmin(false);
                } else if (res.ok) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } catch {
                setIsAdmin(false);
            }
        }
        checkAdmin();
    }, []);

    if (isAdmin === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950">
                <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
                <p className="text-muted-foreground">You don't have permission to access the admin dashboard.</p>
                <Link href="/" className="text-blue-600 hover:underline flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Top Nav */}
            <header className="border-b bg-white dark:bg-zinc-900 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                            <ArrowLeft className="h-4 w-4" /> App
                        </Link>
                        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
                    </div>
                    <nav className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${isActive
                                            ? "bg-zinc-100 dark:bg-zinc-800 font-medium"
                                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground"
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-6">
                {children}
            </main>
        </div>
    );
}
