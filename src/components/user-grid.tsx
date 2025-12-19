"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { UserCard } from "./user-card";

// Mock data - will be replaced with real data later
const MOCK_USERS = [
    { address: "0x1234567890abcdef1234567890abcdef12345678", name: "Alex Chen", bio: "Software Engineer", price: 2 },
    { address: "0x2234567890abcdef1234567890abcdef12345678", name: "Maria Rodriguez", bio: "Digital Artist", price: 2 },
    { address: "0x3234567890abcdef1234567890abcdef12345678", name: "Kenji Tanaka", bio: "Blockchain Consultant", price: 2 },
    { address: "0x4234567890abcdef1234567890abcdef12345678", name: "Chloe Dubois", bio: "Content Creator", price: 2 },
    { address: "0x5234567890abcdef1234567890abcdef12345678", name: "David Lee", bio: "Product Manager", price: 2 },
    { address: "0x6234567890abcdef1234567890abcdef12345678", name: "Sarah Jones", bio: "UX Designer", price: 2 },
    { address: "0x7234567890abcdef1234567890abcdef12345678", name: "Ahmed Khan", bio: "Developer", price: 2 },
    { address: "0x8234567890abcdef1234567890abcdef12345678", name: "Emily White", bio: "Marketing", price: 2 },
    { address: "0x9234567890abcdef1234567890abcdef12345678", name: "Michael Brown", bio: "Data Scientist", price: 2 },
    { address: "0xa234567890abcdef1234567890abcdef12345678", name: "Jessica Kim", bio: "Founder", price: 2 },
    { address: "0xb234567890abcdef1234567890abcdef12345678", name: "Chris Green", bio: "Investor", price: 2 },
    { address: "0xc234567890abcdef1234567890abcdef12345678", name: "Laura Davis", bio: "Architect", price: 2 },
];

export function UserGrid() {
    const [searchQuery, setSearchQuery] = useState("");

    // Filter users based on search query
    const filteredUsers = MOCK_USERS.filter(
        (user) =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.bio.toLowerCase().includes(searchQuery.toLowerCase())
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

            {/* User Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredUsers.map((user) => (
                    <UserCard
                        key={user.address}
                        address={user.address}
                        name={user.name}
                        bio={user.bio}
                        price={user.price}
                    />
                ))}
            </section>

            {/* Empty State */}
            {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <p>No users found matching &quot;{searchQuery}&quot;</p>
                </div>
            )}
        </div>
    );
}
