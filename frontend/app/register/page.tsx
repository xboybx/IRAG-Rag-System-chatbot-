'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail, Lock, User } from 'lucide-react';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/Redux/hooks';
import { registerUser } from '@/Redux/Features/UserSlice';
import { useRouter } from 'next/navigation';


export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [confirmPassword, setConfirmPassword] = useState('');
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { isLoading, isError, errorMessage } = useAppSelector((state) => state.auth);
    const [localError, setLocalError] = useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (password !== confirmPassword) {
            setLocalError("Passwords do not match");
            return;
        }

        const result = await dispatch(registerUser({ name, email, password, confirmPassword }));

        if (registerUser.fulfilled.match(result)) {
            router.push('/chat');
        }
    };

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
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-black font-bold text-xl tracking-tight px-4 py-2 rounded-lg bg-white/20 backdrop-blur-md border border-white/30">IRAG</span>
                </Link>

                <div className="flex items-center gap-3">
                    <span className="text-black/80 text-sm">Already have an account?</span>
                    <Link href="/login">
                        <Button className="bg-white/20 hover:bg-white/30 text-black border border-white/30 backdrop-blur-md">
                            Log in
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Register Form */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-32">
                <div className="w-full max-w-md">
                    {/* Glassmorphism Card */}
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] p-8 md:p-10 shadow-2xl">
                        <div className="text-center mb-8">
                            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                                Create account
                            </h1>
                            <p className="text-white/70">Start your research journey with IRAG</p>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-5">
                            {/* Name Field */}
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium text-white/90">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                                    <Input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="John Doe"
                                        className="pl-11 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-white/40 rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email Field */}
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-white/90">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="pl-11 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-white/40 rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium text-white/90">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="pl-11 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-white/40 rounded-xl"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-white/50 mt-1">Must be at least 8 characters</p>
                            </div>

                            {/* Confirm Password Field */}
                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="text-sm font-medium text-white/90">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="pl-11 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-white/40 rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Terms */}
                            <div className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    className="mt-1 w-4 h-4 rounded border-white/20 bg-white/10 text-indigo-600 focus:ring-indigo-500"
                                    required
                                />
                                <label htmlFor="terms" className="text-sm text-white/70">
                                    I agree to the{' '}
                                    <a href="#" className="text-white hover:underline">Terms of Service</a>
                                    {' '}and{' '}
                                    <a href="#" className="text-white hover:underline">Privacy Policy</a>
                                </label>
                            </div>

                            {/* Error Message */}
                            {(isError || localError) && (
                                <div className="text-red-400 text-sm text-center bg-red-400/10 p-2 rounded-lg border border-red-400/20">
                                    {localError || errorMessage}
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-base font-medium shadow-xl hover:scale-[1.02] transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating account...
                                    </span>
                                ) : (
                                    <>
                                        Create account
                                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/20"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white/5 text-white/60 rounded-full">or continue with</span>
                            </div>
                        </div>

                        {/* Social Login */}
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 bg-white/5 hover:bg-white/10 border-white/20 text-white"
                            >
                                Google
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 bg-white/5 hover:bg-white/10 border-white/20 text-white"
                            >
                                GitHub
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
