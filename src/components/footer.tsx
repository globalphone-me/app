import Link from "next/link";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-auto w-full px-6 pb-6">
            <div className="max-w-[1440px] mx-auto pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 gap-2">
                <div>GlobalPhone, an ETHGlobal-started project ❤️</div>
                <div className="flex items-center gap-4">
                    <Link href="/terms" className="hover:text-gray-700 transition-colors">
                        Terms of Service
                    </Link>
                    <Link href="/privacy" className="hover:text-gray-700 transition-colors">
                        Privacy Policy
                    </Link>
                    <span>© {currentYear} · All rights reserved.</span>
                </div>
            </div>
        </footer>
    );
}
