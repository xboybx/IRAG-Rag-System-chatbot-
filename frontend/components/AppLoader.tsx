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
                <div className="relative w-full h-44 perspective-1000">
                    {featureCards.map((card, index) => {
                        // Calculate relative position based on activeIndex
                        // The tricky part is the wrap-around. 
                        // We want 0 (active), 1 (next), 2 (next next). Everything else is hidden.

                        let offset = (index - activeIndex + featureCards.length) % featureCards.length;

                        // Identify the "exiting" card (the one that was just active and is now moving to back)
                        // If we are swiping, the active index changes. 

                        // Let's stick to a simpler logic:
                        // Visual position: 0=Front, 1=Middle, 2=Back. Others hidden.

                        // We need to handle the animation state.
                        // When swiping=true, card at offset 0 moves to back (effectively becomes offset N-1 visually)
                        // card at offset 1 moves to 0
                        // card at offset 2 moves to 1

                        // However, standard React state updates might be instantaneous.
                        // To allow smooth CSS transition, we render based on current state, and the CSS transition handles the move.

                        // Let's refine the logic to match the previous "smooth" behavior but correct the loop.
                        // We can just render ALL cards, positioned absolutely.

                        // Only show cards that are close to the active index to save rendering?
                        // Actually, for smooth looping, we need to handle the "wrap around" visually.

                        // Let's go back to the "slot" based approach but make it robust.
                        // We render 3 SLOTS.
                        // Slot 0: Active Card
                        // Slot 1: Next Card
                        // Slot 2: Next Next Card

                        // Wait, the user said "cards going down and coming up... not smooth... struck at last".
                        // This usually means the index reset (from last to 0) causes a jump.

                        // To fix this, we shouldn't use `activeIndex` to map to slots directly if we want momentum.
                        // BUT, for a simple carousel, we can just compute styles for EVERY card ensuring cyclic distance.

                        const isActive = index === activeIndex;
                        const isNext = index === (activeIndex + 1) % featureCards.length;
                        const isNextNext = index === (activeIndex + 2) % featureCards.length;

                        // If it's none of the top 3, hide it or put it behind
                        let isVisible = isActive || isNext || isNextNext;

                        // If we are transitioning (swiping), we might need to show the one leaving?
                        // The swiping state was just a trigger for the effect.

                        // Let's try a pure CSS transform approach based on absolute index distance.

                        // We need a stable ordering.
                        // Let `dist` be the distance from activeIndex.
                        const dist = (index - activeIndex + featureCards.length) % featureCards.length;

                        // We only care about dist 0, 1, 2.
                        // Special case: When going from Last -> 0, the card at Last (dist 0) becomes hidden? No.

                        // Standard "Stack" Layout specs:
                        // 0: y=0, scale=1, op=1, z=30
                        // 1: y=12, scale=0.95, op=0.7, z=20
                        // 2: y=24, scale=0.90, op=0.4, z=10
                        // others: hidden/behind

                        let style = {
                            y: 48, scale: 0.85, opacity: 0, zIndex: 0
                        };

                        if (dist === 0) {
                            style = { y: 0, scale: 1, opacity: 1, zIndex: 30 };
                        } else if (dist === 1) {
                            style = { y: 12, scale: 0.95, opacity: 0.7, zIndex: 20 };
                        } else if (dist === 2) {
                            style = { y: 24, scale: 0.90, opacity: 0.4, zIndex: 10 };
                        } else if (dist === featureCards.length - 1) {
                            // This is the card "behind" the stack, ready to pop in, or the one leaving?
                            // Actually, if we just cycle 0->1->2, the one at 0 goes to "end".
                            // So the one at "end" (dist -1 or len-1) might be transitioning OUT.

                            // When activeIndex increments:
                            // Old 0 (now len-1) moves to back.
                            // Old 1 (now 0) moves to front.

                            // So we want the card at dist=len-1 to basically be "hidden behind 2" or "leaving 0"?
                            // Animation flow: 0 -> Back. 1 -> 0. 2 -> 1. 3 -> 2.

                            // The previous code had a specific "swiping" state to force manual interpolation.
                            // Let's try letting CSS handle it by position changes.

                            style = { y: 36, scale: 0.85, opacity: 0, zIndex: 5 };
                        }

                        // We can transition all properties.
                        // One catch: moving from "dist 0" to "dist len-1" (front to back) 
                        // usually needs to look like it drops down/fades out, not strictly fly across.

                        // If we use `swiping` state manually like before:
                        // The issue "struck at last" implies `(activeIndex + 1) % length` calculations were fine, 
                        // but maybe the key changes caused re-mounts?
                        // In the previous code: key={`${activeIndex}-${offset}`} 
                        // THIS WAS THE BUG. Changing key remounts the component, killing animation.
                        // We must use `key={index}` or `key={card.title}` to keep the same DOM element.

                        return (
                            <div
                                key={index}
                                className="absolute inset-x-0 top-0 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                                style={{
                                    zIndex: style.zIndex,
                                    transform: `translateY(${style.y}px) scale(${style.scale})`,
                                    opacity: style.opacity,
                                    // Hide cards that are far away from the stack to prevent paint overlap
                                    visibility: (dist <= 2 || dist === featureCards.length - 1) ? 'visible' : 'hidden'
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
            <div className="absolute bottom-6 text-xs text-white/50 z-10 text-center px-4 max-w-md">
                If loading takes a bit longer, the server is waking up. It takes time since it's a free server for this developer project.
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

