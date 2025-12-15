"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface User {
    id: string;
    name: string;
    address: string;
    realPhoneNumber?: string;
    phoneId?: string;
    price: string;
    onlyHumans?: boolean;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch users", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Users ({users.length})</h2>
                <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">All Users</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-2 font-medium">Name</th>
                                    <th className="text-left py-2 px-2 font-medium">Address</th>
                                    <th className="text-left py-2 px-2 font-medium">Phone ID</th>
                                    <th className="text-left py-2 px-2 font-medium">Price</th>
                                    <th className="text-left py-2 px-2 font-medium">Only Humans</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                        <td className="py-2 px-2">{user.name || "-"}</td>
                                        <td className="py-2 px-2 font-mono text-xs">{formatAddress(user.address)}</td>
                                        <td className="py-2 px-2 font-mono text-xs">{user.phoneId || "-"}</td>
                                        <td className="py-2 px-2">${user.price}</td>
                                        <td className="py-2 px-2">{user.onlyHumans ? "Yes" : "No"}</td>
                                    </tr>
                                ))}
                                {users.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                            No users found
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
