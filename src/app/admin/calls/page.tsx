"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ExternalLink } from "lucide-react";

interface Call {
    id: string;
    status: string;
    twilioCallSid: string | null;
    duration: number | null;
    createdAt: string;
    caller: { address: string; name: string | null } | null;
    callee: { address: string; name: string | null; phoneId: string | null } | null;
    payment: { amount: string; status: string; chainId: number } | null;
}

const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    VERIFIED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    VOICEMAIL: "bg-purple-100 text-purple-800",
};

export default function AdminCallsPage() {
    const [calls, setCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCalls = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/calls");
            if (res.ok) {
                setCalls(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch calls", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCalls();
    }, [fetchCalls]);

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const formatDuration = (seconds: number | null) => {
        if (!seconds) return "-";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Calls ({calls.length})</h2>
                <Button variant="outline" size="sm" onClick={fetchCalls} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Call Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-2 font-medium">Status</th>
                                    <th className="text-left py-2 px-2 font-medium">Caller</th>
                                    <th className="text-left py-2 px-2 font-medium">Callee</th>
                                    <th className="text-left py-2 px-2 font-medium">Duration</th>
                                    <th className="text-left py-2 px-2 font-medium">Amount</th>
                                    <th className="text-left py-2 px-2 font-medium">Date</th>
                                    <th className="text-left py-2 px-2 font-medium">Twilio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {calls.map((call) => (
                                    <tr key={call.id} className="border-b hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                        <td className="py-2 px-2">
                                            <Badge className={statusColors[call.status] || "bg-gray-100"}>
                                                {call.status}
                                            </Badge>
                                        </td>
                                        <td className="py-2 px-2">
                                            {call.caller ? (
                                                <span title={call.caller.address}>
                                                    {call.caller.name || formatAddress(call.caller.address)}
                                                </span>
                                            ) : "-"}
                                        </td>
                                        <td className="py-2 px-2">
                                            {call.callee ? (
                                                <span title={call.callee.address}>
                                                    {call.callee.name || formatAddress(call.callee.address)}
                                                </span>
                                            ) : "-"}
                                        </td>
                                        <td className="py-2 px-2">{formatDuration(call.duration)}</td>
                                        <td className="py-2 px-2">{call.payment ? `$${call.payment.amount}` : "-"}</td>
                                        <td className="py-2 px-2 text-xs text-muted-foreground">
                                            {call.createdAt ? new Date(call.createdAt).toLocaleString() : "-"}
                                        </td>
                                        <td className="py-2 px-2">
                                            {call.twilioCallSid ? (
                                                <a
                                                    href={`https://console.twilio.com/us1/monitor/logs/calls/${call.twilioCallSid}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                                                >
                                                    View <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : "-"}
                                        </td>
                                    </tr>
                                ))}
                                {calls.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                            No calls found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
