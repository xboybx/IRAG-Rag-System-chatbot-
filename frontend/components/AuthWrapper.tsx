'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/Redux/hooks';
import { checkAuth } from '@/Redux/Features/UserSlice';
import { useRouter, usePathname } from 'next/navigation';
import AppLoader from './AppLoader';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            if (!isAuthenticated && !user) {
                try {
                    await dispatch(checkAuth()).unwrap();
                } catch (error) {
                    // Suppress error logging for guests (no session found)
                    if (error !== "No active session") {
                        console.error("Auth check failed:", error);
                    }
                }
            }
            setIsChecking(false);
        };
        initAuth();
    }, [dispatch, isAuthenticated, user]);

    useEffect(() => {
        if (!isChecking) {
            // Protected Routes
            // Protected Routes
            // We want /chat to be accessible, but specific actions (like sending) to be protected.
            // So we REMOVE '/chat' from here.
            const protectedRoutes: string[] = []; // Empty for now, add others if needed (e.g. /profile)
            const isProtected = protectedRoutes.some(route => pathname?.startsWith(route));

            // Auth Routes (login/register) - Redirect if already logged in
            const authRoutes = ['/login', '/register'];
            const isAuthRoute = authRoutes.includes(pathname || '');

            if (isProtected && !isAuthenticated) {
                router.push('/login');
            }

            if (isAuthRoute && isAuthenticated) {
                // Redirect to chat if logged in and trying to access login/register
                router.push('/chat');
            }
        }
    }, [isChecking, isAuthenticated, pathname, router]);

    // Don't block public pages enabling faster LCP (Largest Contentful Paint)
    // The auth check will happen in background and update UI when ready
    const publicRoutes = ['/', '/login', '/register'];
    if (!publicRoutes.includes(pathname || '') && (isChecking || (isLoading && !user))) {
        return <AppLoader />;
    }

    return <>{children}</>;
}
