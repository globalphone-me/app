import { Metadata } from "next";
import { db } from "@/lib/db";
import { isEthereumAddress } from "@/lib/handle";

interface ProfilePageProps {
    params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
    const { address: identifier } = await params;

    // Fetch user (identifier can be address or handle)
    let user;
    if (isEthereumAddress(identifier)) {
        user = await db.getByAddress(identifier);
    } else {
        user = await db.getByHandle(identifier);
    }

    if (!user) {
        return {
            title: "Profile Not Found | GlobalPhone",
            description: "This profile does not exist.",
        };
    }

    const displayName = user.name || "Anonymous User";
    const handle = user.handle ? `@${user.handle}` : "";
    const bio = user.bio || `Call ${displayName} on GlobalPhone`;
    const profileUrl = user.handle
        ? `https://globalphone.me/u/${user.handle}`
        : `https://globalphone.me/u/${user.address}`;

    return {
        title: `${displayName} ${handle} | GlobalPhone`,
        description: bio,
        openGraph: {
            title: `${displayName} ${handle}`,
            description: bio,
            url: profileUrl,
            siteName: "GlobalPhone",
            type: "profile",
            images: user.avatarUrl
                ? [
                    {
                        url: user.avatarUrl,
                        width: 256,
                        height: 256,
                        alt: `${displayName}'s profile picture`,
                    },
                ]
                : [],
        },
        twitter: {
            card: user.avatarUrl ? "summary" : "summary",
            title: `${displayName} ${handle}`,
            description: bio,
            images: user.avatarUrl ? [user.avatarUrl] : [],
        },
    };
}

// Re-export the client component as the default
export { default } from "./ProfilePage";
