'use client';

import { useEffect, useState, useCallback } from 'react';
import { Brain, FileText, Search, Sparkles, Shield, Zap, MessageSquare, Globe } from 'lucide-react';

const featureCards = [
    {
        icon: Brain,
        title: "AI-Powered Answers",
        description: "Get intelligent responses powered by advanced language models",
        gradient: "from-white/80 to-white/40",
    },
    {
        icon: FileText,
        title: "Document Analysis",
        description: "Upload PDFs, docs & more — IRAG reads and understands them for you",
        gradient: "from-gray-300 to-gray-500",
    },
    {
        icon: Search,
        title: "RAG Technology",
        description: "Retrieval-Augmented Generation finds the most relevant context",
        gradient: "from-slate-300 to-slate-500",
    },
    {
        icon: Shield,
        title: "Secure & Private",
        description: "Your documents and conversations are encrypted and protected",
        gradient: "from-zinc-300 to-zinc-500",
    },
    {
        icon: Zap,
        title: "Lightning Fast",
        description: "Optimized pipeline for quick responses even on complex queries",
        gradient: "from-neutral-300 to-neutral-500",
    },
    {
        icon: MessageSquare,
        title: "Conversational Memory",
        description: "IRAG remembers context across your entire conversation",
        gradient: "from-stone-300 to-stone-500",
    },
    {
        icon: Globe,
        title: "Multi-Model Support",
        description: "Powered by multiple AI models with intelligent fallback",
        gradient: "from-gray-200 to-gray-400",
    },
];

// positions in the visible stack
const STACK_POSITIONS = [
    { y: 0, scale: 1, opacity: 1, zIndex: 30 },       // front
    { y: 12, scale: 0.95, opacity: 0.7, zIndex: 20 },    // middle
    { y: 24, scale: 0.90, opacity: 0.4, zIndex: 10 },    // back
];

function CardContent({ card }: { card: typeof featureCards[0] }) {
    const Icon = card.icon;
    return (
        <div className={`relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl bg-white/10 p-6 shadow-2xl`}>
            {/* Card gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${card.gradient}`} />
            <div className="flex items-start gap-4">
                <div className={`shrink-0 p-3 rounded-xl bg-linear-to-br from-white/20 to-white/5 border border-white/10 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-semibold text-white">
                        {card.title}
                    </h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                        {card.description}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function AppLoader() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [swiping, setSwiping] = useState(false);
    const [dots, setDots] = useState('');

    const getCardIndex = useCallback((offset: number) => {
        return (activeIndex + offset) % featureCards.length;
    }, [activeIndex]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSwiping(true);
            setTimeout(() => {
                setActiveIndex((prev) => (prev + 1) % featureCards.length);
                setSwiping(false);
            }, 500);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const dotInterval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
        }, 500);
        return () => clearInterval(dotInterval);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
            {/* Background Image (same as home page) */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-sm scale-105"
                style={{
                    backgroundImage: 'url(https://ik.imagekit.io/mtkm3escy/rag-system/Rag_BG_image/bg2.jpg)',
                }}
            />
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center gap-8 px-4 w-full max-w-lg">

                {/* Logo / Brand */}
                <div className="flex flex-col items-center gap-3">
                    <h1 className="text-2xl font-bold text-white tracking-tight">IRAG</h1>
                    <p className="text-sm text-white/50">Setting things up{dots}</p>
                </div>

                {/* Card Stack */}
                <div className="relative w-full h-44">
                    {/* Render 3 visible stack cards (back to front) */}
                    {[2, 1, 0].map((offset) => {
                        const cardIndex = getCardIndex(offset);
                        const card = featureCards[cardIndex];
                        const isFront = offset === 0;
                        const isMiddle = offset === 1;
                        const isBack = offset === 2;

                        // During swipe: front card goes to back, middle goes to front, back goes to middle
                        let y: number, scale: number, opacity: number, zIndex: number;

                        if (swiping) {
                            if (isFront) {
                                // Front → goes to back
                                y = 24; scale = 0.90; opacity = 0; zIndex = 5;
                            } else if (isMiddle) {
                                // Middle → becomes front
                                y = 0; scale = 1; opacity = 1; zIndex = 30;
                            } else {
                                // Back → becomes middle
                                y = 12; scale = 0.95; opacity = 0.7; zIndex = 20;
                            }
                        } else {
                            if (isFront) {
                                y = 0; scale = 1; opacity = 1; zIndex = 30;
                            } else if (isMiddle) {
                                y = 12; scale = 0.95; opacity = 0.7; zIndex = 20;
                            } else {
                                y = 24; scale = 0.90; opacity = 0.4; zIndex = 10;
                            }
                        }

                        return (
                            <div
                                key={`${activeIndex}-${offset}`}
                                className="absolute inset-x-0 top-0"
                                style={{
                                    zIndex,
                                    transform: `translateY(${y}px) scale(${scale})`,
                                    opacity,
                                    transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                            >
                                <CardContent card={card} />
                            </div>
                        );
                    })}
                </div>

                {/* Dot indicators */}
                <div className="flex items-center gap-2">
                    {featureCards.map((_, i) => (
                        <div
                            key={i}
                            className={`rounded-full transition-all duration-500 ${i === activeIndex
                                ? 'w-6 h-2 bg-linear-to-r from-white/90 to-gray-400'
                                : 'w-2 h-2 bg-white/20'
                                }`}
                        />
                    ))}
                </div>

                {/* Progress Bar */}
                <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full bg-linear-to-r from-white/80 via-gray-300 to-white/80"
                        style={{
                            animation: 'progressSlide 2s ease-in-out infinite',
                        }}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 text-xs text-white/30 z-10">
                Powered by Advanced RAG Technology
            </div>

            <style jsx>{`
                @keyframes progressSlide {
                    0% { width: 0%; margin-left: 0%; }
                    50% { width: 60%; margin-left: 20%; }
                    100% { width: 0%; margin-left: 100%; }
                }
            `}</style>
        </div>
    );
}

