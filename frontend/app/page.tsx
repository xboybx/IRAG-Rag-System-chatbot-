'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Wake up the backend server
    const wakeUpServer = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        await fetch(`${backendUrl}/`);
        console.log('Backend server woke up!');
      } catch (error) {
        console.error('Failed to wake up backend server:', error);
      }
    };

    wakeUpServer();
  }, []);

  return (
    <main className="min-h-screen relative flex flex-col overflow-hidden font-sans">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-sm"
          style={{
            backgroundImage: 'url(/bg2.jpg)',
          }}
        ></div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <span className="text-black font-bold text-xl tracking-tight px-4 py-2 rounded-lg bg-white/20 backdrop-blur-md border border-white/30">IRAG</span>
        </div>

        <nav className="hidden md:flex items-center">
          <p className="text-black/90 dark:text-white/90 text-sm font-medium">
            IRAG is a chat bot which is powered by RAG system efficiently
          </p>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-black hover:bg-white/10 hover:text-black">
              Log in
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-white/20 hover:bg-white/30 text-black border border-white/30 backdrop-blur-md">
              Sign up
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-32">
        <div className="max-w-4xl mx-auto">
          {/* Glassmorphism Card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] p-12 md:p-16 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">
                AI-Powered Research & Knowledge
                <br />
                <span className="text-white/90">that works everywhere</span>
              </h1>

              <Link href="/chat">
                <Button
                  size="lg"
                  className="h-14 px-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-base shadow-2xl hover:scale-105 transition-all group"
                >
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 pb-6 px-4 text-center">
        <div className="max-w-3xl mx-auto bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-lg">
          <p className="text-sm text-foreground/80 dark:text-white/80 mb-2">
            A developer project by <span className="font-bold text-foreground dark:text-white">Jaswanth</span>
          </p>
          <p className="text-xs text-foreground/60 dark:text-white/60 leading-relaxed">
            ⚠️ <span className="font-medium">Note:</span> The server takes a little time to respond for the first message due to server free tier. Please have patience!
          </p>
        </div>
      </footer>
    </main>
  );
}
