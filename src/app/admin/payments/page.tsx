"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ExternalLink } from "lucide-react";

interface Payment {
    id: string;
    amount: string;
    chainId: number;
    status: string;
    txHash: string | null;
    forwardTxHash: string | null;
    refundTxHash: string | null;
    createdAt: string;
    settledAt: string | null;
}

const statusColors: Record<string, string> = {
    HELD: "bg-yellow-100 text-yellow-800",
    FORWARDED: "bg-green-100 text-green-800",
    REFUNDED: "bg-blue-100 text-blue-800",
    STUCK: "bg-red-100 text-red-800",
};

const chainExplorers: Record<number, string> = {
    1: "https://etherscan.io/tx/",
    8453: "https://basescan.org/tx/",
    84532: "https://sepolia.basescan.org/tx/",
    480: "https://worldscan.org/tx/",
};

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/payments");
            if (res.ok) {
                setPayments(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch payments", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const updateStatus = async (paymentId: string, status: string) => {
        setUpdating(paymentId);
        try {
            const res = await fetch("/api/admin/payments", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId, status }),
            });
            if (res.ok) {
                await fetchPayments();
            }
        } catch (e) {
            console.error("Failed to update payment", e);
        } finally {
            setUpdating(null);
        }
    };

    const getExplorerUrl = (chainId: number, txHash: string) => {
        const base = chainExplorers[chainId] || `https://blockscan.com/tx/`;
        return `${base}${txHash}`;
    };

    const formatTxHash = (hash: string) => `${hash.slice(0, 10)}...`;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Payments ({payments.length})</h2>
                <Button variant="outline" size="sm" onClick={fetchPayments} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">All Payments</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-2 font-medium">Status</th>
                                    <th className="text-left py-2 px-2 font-medium">Amount</th>
                                    <th className="text-left py-2 px-2 font-medium">Chain</th>
                                    <th className="text-left py-2 px-2 font-medium">Tx Hash</th>
                                    <th className="text-left py-2 px-2 font-medium">Forward/Refund Tx</th>
                                    <th className="text-left py-2 px-2 font-medium">Created</th>
                                    <th className="text-left py-2 px-2 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((payment) => (
                                    <tr
                                        key={payment.id}
                                        className={`border-b hover:bg-zinc-50 dark:hover:bg-zinc-800 ${payment.status === "STUCK" ? "bg-red-50 dark:bg-red-950" : ""
                                            }`}
                                    >
                                        <td className="py-2 px-2">
                                            <Badge className={statusColors[payment.status] || "bg-gray-100"}>
                                                {payment.status}
                                            </Badge>
                                        </td>
                                        <td className="py-2 px-2 font-medium">${payment.amount}</td>
                                        <td className="py-2 px-2">{payment.chainId}</td>
                                        <td className="py-2 px-2">
                                            {payment.txHash ? (
                                                <a
                                                    href={getExplorerUrl(payment.chainId, payment.txHash)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline inline-flex items-center gap-1 font-mono text-xs"
                                                >
                                                    {formatTxHash(payment.txHash)} <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : "-"}
                                        </td>
                                        <td className="py-2 px-2">
                                            {payment.forwardTxHash ? (
                                                <a
                                                    href={getExplorerUrl(payment.chainId, payment.forwardTxHash)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-green-600 hover:underline inline-flex items-center gap-1 font-mono text-xs"
                                                >
                                                    Fwd <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : payment.refundTxHash ? (
                                                <a
                                                    href={getExplorerUrl(payment.chainId, payment.refundTxHash)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline inline-flex items-center gap-1 font-mono text-xs"
                                                >
                                                    Refund <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : "-"}
                                        </td>
                                        <td className="py-2 px-2 text-xs text-muted-foreground">
                                            {payment.createdAt ? new Date(payment.createdAt).toLocaleString() : "-"}
                                        </td>
                                        <td className="py-2 px-2">
                                            {payment.status === "STUCK" || payment.status === "HELD" ? (
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs"
                                                        disabled={updating === payment.id}
                                                        onClick={() => updateStatus(payment.id, "FORWARDED")}
                                                    >
                                                        Mark Forwarded
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs"
                                                        disabled={updating === payment.id}
                                                        onClick={() => updateStatus(payment.id, "REFUNDED")}
                                                    >
                                                        Mark Refunded
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">Settled</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {payments.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                            No payments found
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
