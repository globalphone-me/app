"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { UserCard } from "./user-card";
import { useUsers } from "@/hooks/useUsers";

export function UserGrid() {
    const [searchQuery, setSearchQuery] = useState("");
    const { data: users = [], isLoading, error } = useUsers();

    // Filter users based on search query
    const filteredUsers = users.filter(
        (user) =>
            user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full">
            {/* Search Section */}
            <div className="mb-8 relative max-w-[800px] mx-auto">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="text-gray-400 h-5 w-5" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search for users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-base transition-shadow"
                    />
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="text-center py-12 text-red-500">
                    <p>Failed to load users. Please try again.</p>
                </div>
            )}

            {/* User Grid */}
            {!isLoading && !error && (
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredUsers.map((user) => (
                        <UserCard
                            key={user.address}
                            address={user.address}
                            handle={user.handle}
                            name={user.displayName}
                            bio={user.bio || ""}
                            price={parseFloat(user.price)}
                            availability={user.availability}
                            avatarUrl={user.avatarUrl}
                        />
                    ))}
                </section>
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredUsers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    {searchQuery ? (
                        <p>No users found matching &quot;{searchQuery}&quot;</p>
                    ) : (
                        <p>No users registered yet.</p>
                    )}
                </div>
            )}
        </div>
    );
}
