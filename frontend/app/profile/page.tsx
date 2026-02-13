'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Mail, Calendar, Shield, Settings, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Mock user data - replace with actual user data from backend
    const user = {
        name: "Jaswanth",
        email: "jaswanth@example.com",
        memberSince: "February 2026",
        accountTier: "Free Tier"
    };

    const handleLogout = () => {
        // TODO: Implement logout logic
        router.push('/');
    };

    return (
        <div className="min-h-screen relative flex flex-col overflow-hidden font-sans bg-slate-50 dark:bg-slate-950">
            {/* Background Image */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: 'url(/bg2.jpg)',
                    }}
                ></div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
                {/* Back Button */}
                <div className="w-full max-w-2xl mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="text-foreground dark:text-white hover:bg-white/10"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                </div>

                {/* Profile Card */}
                <div className="w-full max-w-2xl bg-white/40 dark:bg-black/30 backdrop-blur-[60px] border border-white/30 dark:border-white/10 rounded-[32px] shadow-2xl p-8 md:p-12 animate-in fade-in slide-in-from-bottom-8 duration-700">

                    {/* Profile Header */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-24 h-24 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-xl border-4 border-white/50 dark:border-white/20">
                            <User className="w-12 h-12 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-foreground dark:text-white mb-2">{user.name}</h1>
                        <p className="text-sm text-muted-foreground dark:text-white/60">{user.accountTier}</p>
                    </div>

                    {/* Profile Information */}
                    <div className="space-y-4">
                        {/* Email */}
                        <div className="bg-white/30 dark:bg-white/10 backdrop-blur-xl border border-white/30 dark:border-white/20 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground dark:text-white/50 uppercase tracking-wider font-semibold">Email</p>
                                <p className="text-sm font-medium text-foreground dark:text-white">{user.email}</p>
                            </div>
                        </div>

                        {/* Member Since */}
                        <div className="bg-white/30 dark:bg-white/10 backdrop-blur-xl border border-white/30 dark:border-white/20 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground dark:text-white/50 uppercase tracking-wider font-semibold">Member Since</p>
                                <p className="text-sm font-medium text-foreground dark:text-white">{user.memberSince}</p>
                            </div>
                        </div>

                        {/* Account Tier */}
                        <div className="bg-white/30 dark:bg-white/10 backdrop-blur-xl border border-white/30 dark:border-white/20 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground dark:text-white/50 uppercase tracking-wider font-semibold">Account Status</p>
                                <p className="text-sm font-medium text-foreground dark:text-white">Active</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 flex flex-col sm:flex-row gap-3">
                        <Button
                            className="flex-1 bg-white/60 dark:bg-white/20 hover:bg-white/80 dark:hover:bg-white/30 backdrop-blur-xl border border-white/40 dark:border-white/30 text-indigo-600 dark:text-white rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Edit Profile
                        </Button>
                        <Button
                            onClick={handleLogout}
                            variant="destructive"
                            className="flex-1 bg-red-500/80 hover:bg-red-600 text-white rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95 backdrop-blur-xl"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
