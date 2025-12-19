export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-auto w-full px-6 pb-6">
            <div className="max-w-[1440px] mx-auto pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                <div className="mb-2 md:mb-0">GlobalPhone, an ETHGlobal-started project ❤️</div>
                <div>Copyright © {currentYear} · All rights reserved.</div>
            </div>
        </footer>
    );
}
