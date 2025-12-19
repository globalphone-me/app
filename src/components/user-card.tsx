"use client";

import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";

interface UserCardProps {
    address: string;
    name: string;
    bio: string;
    avatarUrl?: string;
    price: number;
}

export function UserCard({ address, name, bio, avatarUrl, price }: UserCardProps) {
    // Generate initials for fallback avatar
    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <Link href={`/u/${address}`} className="flex items-start gap-4 mb-5 group">
                {avatarUrl ? (
                    <Image
                        src={avatarUrl}
                        alt={name}
                        width={60}
                        height={60}
                        className="w-[60px] h-[60px] min-w-[60px] min-h-[60px] rounded-full object-cover border border-gray-100 flex-shrink-0"
                    />
                ) : (
                    <div className="w-[60px] h-[60px] min-w-[60px] min-h-[60px] rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold border border-gray-100 flex-shrink-0">
                        {initials || "?"}
                    </div>
                )}
                <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                        {name}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-2">{bio}</p>
                </div>
            </Link>
            <Link
                href={`/u/${address}`}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
                <Phone className="h-4 w-4" />
                <span>Call ${price}</span>
            </Link>
        </article>
    );
}
