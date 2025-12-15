"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, Phone, CreditCard, AlertTriangle, DollarSign } from "lucide-react";

interface Stats {
    totalUsers: number;
    totalCalls: number;
    totalPayments: number;
    totalRevenue: string;
    paymentsByStatus: Record<string, number>;
    callsByStatus: Record<string, number>;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/stats");
            if (res.ok) {
                setStats(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch stats", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const stuckPayments = stats?.paymentsByStatus?.STUCK || 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Overview</h2>
                <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalUsers ?? "-"}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                        <Phone className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalCalls ?? "-"}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalPayments ?? "-"}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue (USDC)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats?.totalRevenue ?? "-"}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Alerts */}
            {stuckPayments > 0 && (
                <Card className="border-red-500 bg-red-50 dark:bg-red-950">
                    <CardContent className="flex items-center gap-3 py-4">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="text-red-700 dark:text-red-400 font-medium">
                            {stuckPayments} payment{stuckPayments > 1 ? "s" : ""} stuck - requires manual review
                        </span>
                        <Button variant="destructive" size="sm" className="ml-auto" asChild>
                            <a href="/admin/payments">View Payments</a>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Status Breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Calls by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.callsByStatus ? (
                            <div className="space-y-2">
                                {Object.entries(stats.callsByStatus).map(([status, count]) => (
                                    <div key={status} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{status}</span>
                                        <span className="font-medium">{count}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Payments by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.paymentsByStatus ? (
                            <div className="space-y-2">
                                {Object.entries(stats.paymentsByStatus).map(([status, count]) => (
                                    <div key={status} className="flex justify-between text-sm">
                                        <span className={`${status === "STUCK" ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                                            {status}
                                        </span>
                                        <span className={`font-medium ${status === "STUCK" ? "text-red-600" : ""}`}>{count}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
