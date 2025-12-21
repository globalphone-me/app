"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Header } from "@/components/header";
import { Loader2 } from "lucide-react";

export default function TermsPage() {
    const [content, setContent] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/terms.md")
            .then((res) => res.text())
            .then((text) => {
                setContent(text);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <Header />
            <main className="container mx-auto px-4 py-12 max-w-3xl">
                <article className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 p-8 md:p-12">
                    <ReactMarkdown
                        components={{
                            h1: ({ children }) => <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900 dark:text-white">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-semibold mt-6 mb-2 text-gray-800 dark:text-gray-200">{children}</h3>,
                            p: ({ children }) => <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">{children}</ul>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                            hr: () => <hr className="my-8 border-gray-200 dark:border-zinc-700" />,
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </article>
            </main>
        </div>
    );
}
