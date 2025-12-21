"use client";

import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import { Availability } from "@/lib/db";
import { isUserAvailable, getTimeUntilAvailable } from "@/lib/availability";

interface UserCardProps {
    address: string;
    handle?: string;
    name: string;
    bio: string;
    avatarUrl?: string;
    price: number;
    availability?: Availability;
}

export function UserCard({ address, handle, name, bio, avatarUrl, price, availability }: UserCardProps) {
    // Generate initials for fallback avatar
    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const isAvailable = isUserAvailable(availability);
    const timeUntilAvailable = getTimeUntilAvailable(availability);

    return (
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <Link href={`/u/${handle || address}`} className="flex items-start gap-4 mb-5 group">
                {/* Avatar with availability dot */}
                <div className="relative flex-shrink-0">
                    {avatarUrl ? (
                        <Image
                            src={avatarUrl}
                            alt={name}
                            width={60}
                            height={60}
                            className="w-[60px] h-[60px] min-w-[60px] min-h-[60px] rounded-full object-cover border border-gray-100"
                        />
                    ) : (
                        <div className="w-[60px] h-[60px] min-w-[60px] min-h-[60px] rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold border border-gray-100">
                            {initials || "?"}
                        </div>
                    )}
                    {/* Availability dot */}
                    <div
                        className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${isAvailable ? 'bg-green-500' : 'bg-gray-400'}`}
                        title={isAvailable ? "Available now" : (timeUntilAvailable ? (timeUntilAvailable.startsWith("Not") ? timeUntilAvailable : `Available ${timeUntilAvailable}`) : "Currently unavailable")}
                    />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                        {name}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-2">{bio}</p>
                </div>
            </Link>
            {isAvailable ? (
                <Link
                    href={`/u/${address}`}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                    <Phone className="h-4 w-4" />
                    <span>Call ${price}</span>
                </Link>
            ) : (
                <div className="w-full bg-gray-300 text-gray-500 font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed">
                    <Phone className="h-4 w-4" />
                    <span>{timeUntilAvailable
                        ? (timeUntilAvailable.startsWith("Not") ? timeUntilAvailable : `Available ${timeUntilAvailable.replace(/ at \d+:\d+ [AP]M/, '')}`)
                        : "Unavailable"}</span>
                </div>
            )}
        </article>
    );
}
