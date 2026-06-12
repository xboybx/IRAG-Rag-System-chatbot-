'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAppDispatch, useAppSelector } from '@/Redux/hooks';
import { addMessage, setLoading, setModel, setConversationId, fetchMessages, clearMessages, uploadFile, clearUploadedFile, updateLastMessageContent, fetchAvailableModels } from '@/Redux/Features/Chatslice';
import { fetchConversations, createConversation } from '@/Redux/Features/ConversationHistorySlice';
import { toggleSidebar, setUploadModalOpen } from '@/Redux/Features/UIslice';
import { logoutUser } from '@/Redux/Features/UserSlice';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConversationSidebar from "@/components/ConversationSidebar";
import {
    Search, Moon, Sun, ArrowUp, Plus, Globe,
    ChevronDown, Wrench,
    FileText, Image as UploadCloud, X, Menu, User, LogOut, Square,
    Info, Github
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import MessageContent from '@/components/MessageContent';



export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    // Normalize params.id: it can be string, string[], or undefined.
    // For optional catch-all [[...id]], it is usually an array if present.
    const rawId = params?.id;
    const conversationIdParam = Array.isArray(rawId) ? rawId[0] : rawId;

    // Redux Hooks
    const dispatch = useAppDispatch();
    const { messages, isLoading, model, currentConversationId, isUploading, uploadedFile, isFetchingMessages, availableModels } = useAppSelector((state) => state.chat);
    const { isSidebarOpen, isUploadModalOpen } = useAppSelector((state) => state.ui);
    const { isAuthenticated, token } = useAppSelector((state) => state.auth);

    // Local State (Input is fine to keep local as it's transient)
    const [input, setInput] = useState('');//the user input message
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    // Additional Local Options (Can be moved to Redux later if needed globally)
    // const [ragEnabled, setRagEnabled] = useState(true); // Commented out: Using Query Router in backend
    const [webSearch, setWebSearch] = useState(false);

    // Ref for auto-scrolling to bottom
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Ref for tracking the very first render to prevent overwriting localStorage
    const isInitialMount = useRef(true);

    // Persistence: Load Web Search preference ONLY once on mount
    useEffect(() => {
        const saved = localStorage.getItem('irag_web_search');
        if (saved !== null) {
            setWebSearch(saved === 'true');
        }
        // After loading, allow future saves
        setTimeout(() => {
            isInitialMount.current = false;
        }, 100);
    }, []);

    // Persistence: Save Web Search preference ONLY when user changes it
    useEffect(() => {
        if (!isInitialMount.current) {
            localStorage.setItem('irag_web_search', webSearch.toString());
        }
    }, [webSearch]);

    useEffect(() => {
        setMounted(true);
        dispatch(fetchAvailableModels());
    }, [dispatch]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            // Use 'instant' during active loading/typing to prevent jitter
            // Smooth behavior fights itself when called every few milliseconds
            messagesEndRef.current.scrollIntoView({
                behavior: isLoading ? 'auto' : 'smooth',
                block: 'end'
            });
        }
    }, [messages, isLoading]);

    // Sync URL ID with Redux and Load Messages
    useEffect(() => {
        if (conversationIdParam) {
            // If URL has an ID (Viewing a conversation)
            if (conversationIdParam !== currentConversationId) {
                dispatch(setConversationId(conversationIdParam));
                dispatch(fetchMessages(conversationIdParam));
            }
        } else {
            // If URL has NO ID (New Chat / Root /chat)
            // Ensure state is cleared only if it's not already null
            if (currentConversationId !== null) {
                dispatch(setConversationId(null));
                dispatch(clearMessages());
            }
        }
    }, [conversationIdParam, currentConversationId, dispatch]);

    //sending user messgae
    const handleSend = async () => {
        console.log("First Request")
        if (!input.trim()) return;

        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        const userMessage = input;
        setInput('');

        // 1. Add User Message
        dispatch(addMessage({ role: 'user', content: userMessage }));

        // 2. Set Loading
        dispatch(setLoading(true));

        // 3. Add Placeholder Assistant Message
        dispatch(addMessage({ role: 'system', content: '' }));

        // 4. Prepare Payload
        let backendModelName = model;

        // Create new AbortController
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            const urlId = currentConversationId || 'new';
            // IMPORTANT: Call backend DIRECTLY (not via /api proxy) for streaming.
            // Next.js rewrites proxy buffers the entire response before forwarding it,
            // which kills the real-time streaming effect in the browser.
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

            const response = await fetch(`${BACKEND_URL}/ai/chat/${urlId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: userMessage,
                    selectedModel: backendModelName,
                    conversationId: currentConversationId,
                    history: messages, // Send history
                    // useRag: ragEnabled,
                    useWebSearch: webSearch
                }),
                // IMPORTANT: Send cookies for auth
                credentials: 'include',
                signal: abortControllerRef.current.signal
            });


            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to fetch");
            }

            // Check for new conversation ID in headers
            const newConversationId = response.headers.get('x-conversation-id');
            if (newConversationId && newConversationId !== currentConversationId) {
                dispatch(setConversationId(newConversationId));
                dispatch(fetchConversations());
                router.replace(`/chat/${newConversationId}`, { scroll: false }); // Update URL correctly with Next.js router
            }


            //Response Streaming
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedResponse = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    accumulatedResponse += chunk;

                    // Dispatch update to Redux (Stream effect)
                    dispatch(updateLastMessageContent(accumulatedResponse));
                }
            }

            dispatch(setLoading(false));
            abortControllerRef.current = null;

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log("Fetch aborted");
            } else {
                console.error("Failed to send message:", error);
                // dispatch(setError(error.message)); // Optional: Set error state
            }
            dispatch(setLoading(false));
            // Maybe remove the placeholder message?
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        dispatch(setLoading(false));
    };

    // Handle File Upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        try {
            let targetConversationId = currentConversationId;

            // 1. Create Conversation if needed
            if (!targetConversationId) {
                const result = await dispatch(createConversation("New Chat")).unwrap();
                targetConversationId = result.id;

                // Update URL and State
                dispatch(setConversationId(targetConversationId));
                router.push(`/chat/${targetConversationId}`);
            }

            // 2. Upload File
            if (targetConversationId) {
                await dispatch(uploadFile({ file, conversationId: targetConversationId })).unwrap();

                // Success: Close Modal & Refresh
                dispatch(setUploadModalOpen(false));
                dispatch(fetchMessages(targetConversationId)); // Refresh messages (maybe system msg added?)
                alert("File uploaded successfully!");
            }

        } catch (error: any) {
            console.error("Upload failed:", error);
            alert(`Upload failed: ${error}`);
        } finally {
            // Reset input
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div className="h-dvh w-screen relative flex font-sans overflow-hidden selection:bg-indigo-500/30 bg-[#faf9f6] dark:bg-zinc-950">

            {/* Premium Blurred Glowing Blobs Background */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#faf9f6] dark:bg-zinc-950 transition-colors duration-500">
                {/* Blob 1 */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 dark:from-zinc-400 dark:to-transparent blur-[100px] md:blur-[150px] opacity-30 dark:opacity-15 animate-pulse" style={{ animationDuration: '8s' }}></div>
                {/* Blob 2 */}
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-pink-300 via-purple-300 to-blue-300 dark:from-zinc-500 dark:to-transparent blur-[120px] md:blur-[180px] opacity-25 dark:opacity-15 animate-pulse" style={{ animationDuration: '12s' }}></div>
                {/* Blob 3 */}
                <div className="absolute top-[30%] right-[20%] w-[35%] h-[35%] rounded-full bg-gradient-to-bl from-blue-300 to-indigo-400 dark:from-zinc-300 dark:to-transparent blur-[100px] md:blur-[150px] opacity-20 dark:opacity-10 animate-pulse" style={{ animationDuration: '10s' }}></div>
            </div>



            {/* Main Layout with Sidebar */}
            <div className="relative z-10 w-full h-full overflow-hidden flex">

                {/* Sidebar - Desktop: Relative/Translated, Mobile: Absolute/Overlay */}
                <div
                    className={`
                        fixed inset-y-0 left-0 z-30 w-72 md:w-72
                        transform transition-all duration-300 ease-in-out
                        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                        md:relative md:translate-x-0 md:shrink-0
                        ${!isSidebarOpen && "md:-ml-72!"} 
                    `}
                >
                    <ConversationSidebar
                        isOpen={isSidebarOpen}
                        currentConversationId={currentConversationId || undefined}
                    />
                </div>

                {/* Mobile Overlay for Sidebar */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 md:hidden"
                        onClick={() => dispatch(toggleSidebar())}
                    />
                )}

                {/* Main Chat Container */}
                <div className="flex-1 flex flex-col h-full w-full min-w-0 transition-all duration-300 ease-in-out py-2 md:pl-0">

                    {/* Header */}
                    <header className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 shrink-0 gap-2">
                        <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                            {/* Sidebar Toggle */}
                            <button
                                onClick={() => dispatch(toggleSidebar())}
                                className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center group hover:scale-105 transition-transform duration-300 md:hidden"
                            >
                                <Menu className="w-5 h-5 text-black dark:text-white transition-colors duration-300" />
                            </button>
                            {/* Desktop Toggle (only if closed, or just keep it simple) */}
                            <button
                                onClick={() => dispatch(toggleSidebar())}
                                className="hidden md:flex w-10 h-10 items-center justify-center group hover:scale-105 transition-transform duration-300"
                            >
                                <Menu className="w-5 h-5 text-black dark:text-white transition-colors duration-300" />
                            </button>

                            <span className="text-base md:text-lg font-bold tracking-tight text-foreground/90 dark:text-white font-mono truncate">IRAG</span>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 shrink-0">
                            {/* RAG Master Toggle - Commented out: Transitioned to Query Router */}
                            {/* 
                            <button
                                onClick={() => setRagEnabled(!ragEnabled)}
                                className={`
                      group relative flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full border transition-all duration-300 backdrop-blur-md cursor-pointer
                      ${ragEnabled
                                        ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-500 dark:text-indigo-400 shadow-indigo-500/10'
                                        : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'}
                  `}
                            >
                                <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-colors duration-300 ${ragEnabled ? 'bg-indigo-500 animate-pulse' : 'bg-zinc-400'}`}></div>
                                <span className="text-[10px] md:text-xs font-bold tracking-wide">RAG</span>
                            </button>
                            */}

                            {/* Developer Info Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className="text-muted-foreground/60 hover:text-foreground dark:text-white/40 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center p-1.5 active:scale-95"
                                    >
                                        <Info className="w-3.5 h-3.5" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 mt-2 mr-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-white/20 shadow-xl rounded-xl p-3" side="bottom" align="end">
                                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                                        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-indigo-500/10 to-purple-500/10 dark:from-white/10 dark:to-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center backdrop-blur-md">
                                            <Github className="w-5 h-5 text-indigo-600 dark:text-white" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h3 className="text-sm font-bold tracking-tight text-foreground dark:text-white">Jaswanth</h3>
                                            <p className="text-muted-foreground dark:text-white/60 text-[10px] max-w-[180px] leading-snug">
                                                Developer of IRAG Chatbot
                                            </p>
                                        </div>
                                        <a
                                            href="https://github.com/xboybx"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1.5 py-1.5 px-3 w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-all hover:scale-[1.02] shadow-sm cursor-pointer"
                                        >
                                            <Github className="w-3.5 h-3.5" />
                                            <span>GitHub Profile</span>
                                        </a>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Web Search Master Toggle - Compact on Mobile */}
                            <button
                                onClick={() => setWebSearch(!webSearch)}
                                className={`
                                    group relative flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full border transition-all duration-300 backdrop-blur-md cursor-pointer
                                    ${webSearch
                                        ? 'bg-blue-500/20 border-blue-500/30 text-blue-500 dark:text-blue-400 shadow-blue-500/10'
                                        : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'}
                                `}
                            >
                                <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-colors duration-300 ${webSearch ? 'bg-blue-500 animate-pulse' : 'bg-zinc-400'}`}></div>
                                <span className="text-[10px] md:text-xs font-bold tracking-wide">WEB</span>
                            </button>

                            {mounted && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className="hidden md:flex w-10 h-10 transition-all hover:scale-110 text-foreground/70 hover:text-foreground"
                                >
                                    {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-indigo-300" />}
                                </Button>
                            )}

                            {/* File Indicator (Desktop) */}
                            {uploadedFile && (
                                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full animate-in fade-in zoom-in duration-300">
                                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 max-w-[150px] truncate">
                                        {uploadedFile.name}
                                    </span>
                                    <button
                                        onClick={() => dispatch(clearUploadedFile())}
                                        className="ml-1 p-0.5 rounded-full hover:bg-blue-500/20 text-blue-500 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            {/* Profile Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 md:w-10 md:h-10 transition-all hover:scale-110 text-foreground/70 dark:text-white hover:text-foreground dark:hover:text-white"
                                    >
                                        <User className="w-4 h-4 md:w-5 md:h-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-48 mt-2 mr-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-white/20 shadow-xl rounded-xl p-2" side="bottom" align="end">
                                    {/* Mobile Theme Toggle inside Dropdown */}
                                    <div className="md:hidden px-2 py-2 flex items-center justify-between">
                                        <span className="text-sm font-medium">Theme</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => { e.preventDefault(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
                                            className="w-8 h-8"
                                        >
                                            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-300" />}
                                        </Button>
                                    </div>
                                    <DropdownMenuSeparator className="bg-white/20 md:hidden" />

                                    {isAuthenticated ? (
                                        <>
                                            <DropdownMenuItem
                                                onClick={() => router.push('/profile')}
                                                className="cursor-pointer rounded-lg py-2.5 dark:text-white"
                                            >
                                                <User className="w-4 h-4 mr-2 text-indigo-500" />
                                                Profile
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-white/20" />
                                            <DropdownMenuItem
                                                onClick={async () => {
                                                    await dispatch(logoutUser());
                                                    router.replace('/login');
                                                }}
                                                className="cursor-pointer rounded-lg py-2.5 dark:text-white text-red-600 hover:text-red-700 dark:hover:text-red-300"
                                            >
                                                <LogOut className="w-4 h-4 mr-2" />
                                                Logout
                                            </DropdownMenuItem>
                                        </>
                                    ) : (
                                        <>
                                            <DropdownMenuItem
                                                onClick={() => router.push('/login')}
                                                className="cursor-pointer rounded-lg py-2.5 dark:text-white"
                                            >
                                                <User className="w-4 h-4 mr-2 text-indigo-500" />
                                                Log in
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => router.push('/register')}
                                                className="cursor-pointer rounded-lg py-2.5 dark:text-white"
                                            >
                                                <User className="w-4 h-4 mr-2 text-indigo-500" />
                                                Sign up
                                            </DropdownMenuItem>
                                        </>
                                    )}

                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>

                    {/* Chat Area */}
                    <main className="flex-1 flex flex-col relative overflow-hidden rounded-lg md:rounded-[30px] mx-2 mb-2 border border-white/20 dark:border-0 shadow-2xl bg-white/30 dark:bg-black/20 backdrop-blur-xl ring-1 ring-white/20 dark:ring-0">

                        {/* Messages */}
                        <ScrollArea className="flex-1 px-2 md:px-0 scroll-smooth scrollbar-hide" showScrollBar={false}>
                            <div className="w-full max-w-[1600px] mx-auto space-y-6 md:space-y-8 py-4 md:py-8 pb-32 md:pb-64">
                                {isFetchingMessages ? (
                                    <div className="h-[50vh] flex flex-col items-center justify-center animate-in fade-in duration-500">
                                        <div className="flex items-center gap-3">
                                            <span className="text-base md:text-lg font-bold bg-gradient-to-r from-black via-gray-500 to-black dark:from-white dark:via-gray-400 dark:to-white bg-clip-text text-transparent animate-pulse tracking-wide">
                                                Loading Messages...
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {messages.length === 0 && (
                                            <div className="h-[40vh] md:h-[50vh] flex flex-col items-center justify-center text-muted-foreground/60 animate-in fade-in zoom-in duration-700 px-4">
                                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-[32px] bg-linear-to-br from-white/10 to-transparent dark:from-white/5 dark:to-white/5 dark:bg-white/5 backdrop-blur-2xl flex items-center justify-center mb-6 md:mb-8 shadow-xl border border-white/10 ring-1 ring-white/5 group hover:scale-105 transition-all duration-500">
                                                    <Search className="w-8 h-8 md:w-10 md:h-10 opacity-40 dark:opacity-60 group-hover:opacity-60 dark:group-hover:opacity-80 transition-opacity duration-300" />
                                                </div>
                                                <h2 className="text-2xl md:text-3xl font-semibold text-foreground/80 dark:text-white mb-2 md:mb-3 tracking-tight text-center">Ready to research?</h2>
                                                <p className="text-base md:text-lg text-muted-foreground/60 dark:text-white/70 max-w-lg text-center leading-relaxed">
                                                    IRAG is your AI research assistant. Use it like ChatGPT for normal chat, enable <b>Web Search</b> for live info, or upload documents to auto-activate <b>RAG</b> for answering from your files.
                                                    <br className="hidden md:block" />
                                                    Web Search can be toggled manually, while RAG is now handled automatically for you.
                                                </p>
                                            </div>
                                        )}

                                        {messages.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start w-full'} animate-in slide-in-from-bottom-4 duration-500 px-1 md:px-4 mb-2 md:mb-0 max-w-full`}>
                                                <div className={`text-sm md:text-base lg:text-lg leading-relaxed tracking-wide min-w-0 break-words overflow-x-auto max-w-full ${msg.role === 'user'
                                                    ? 'max-w-[92%] sm:max-w-[85%] md:max-w-[70%] bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/30 dark:border-white/20 text-foreground dark:text-white rounded-[18px] md:rounded-[24px] rounded-br-sm px-6 py-2 shadow-md md:shadow-lg w-fit'
                                                    : 'w-full bg-transparent text-foreground/90 dark:text-white/90 px-0 sm:px-1 md:px-2 py-1 md:py-2 mx-0 sm:mx-1 md:mx-0'
                                                    }`}>
                                                    <MessageContent content={msg.content} />
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* Material 3-style Bouncing Wave Dots Loader */}
                                {isLoading && (
                                    <div className="flex justify-start animate-in slide-in-from-bottom-4 duration-500 px-1 md:px-4 mt-2 mb-4">
                                        <style>{`
                                            @keyframes wave-bounce {
                                                0%, 100% { transform: translateY(0); }
                                                50% { transform: translateY(-5px); }
                                            }
                                            .animate-wave-dot {
                                                animation: wave-bounce 0.8s infinite ease-in-out;
                                            }
                                        `}</style>
                                        <div className="flex items-center space-x-1.5 py-1">
                                            <div className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-wave-dot" style={{ animationDelay: '-0.3s' }}></div>
                                            <div className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-wave-dot" style={{ animationDelay: '-0.15s' }}></div>
                                            <div className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-wave-dot" style={{ animationDelay: '0s' }}></div>
                                        </div>
                                    </div>
                                )}

                                {/* Scroll anchor */}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="absolute bottom-4 md:bottom-6 left-0 right-0 px-2 md:px-6 flex justify-center z-20 pointer-events-none">
                            <div className="w-full max-w-[1600px] relative group pointer-events-auto">

                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 dark:from-zinc-400/20 dark:via-zinc-500/20 dark:to-zinc-300/20 rounded-[30px] md:rounded-[35px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                                <div className="relative z-10 flex flex-col bg-white/40 dark:bg-neutral-900/40 backdrop-blur-[60px] saturate-150 border border-white/40 dark:border-white/10 rounded-[30px] md:rounded-[35px] shadow-2xl transition-all duration-300 hover:bg-white/50 dark:hover:bg-neutral-900/50 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)]">

                                    {/* Uploaded File Indicator (Inside Input Area for visibility) */}
                                    {uploadedFile && (
                                        <div className="absolute -top-8 md:-top-10 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-full shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-300 z-10 max-w-[90%]">
                                            <div className="w-5 h-5 shrink-0 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <span className="text-xs font-medium text-foreground/80 truncate">
                                                {uploadedFile.name}
                                            </span>
                                            <button
                                                onClick={() => dispatch(clearUploadedFile())}
                                                className="ml-1 p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="w-full px-1 md:px-2 pt-1 md:pt-2">
                                        <Input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder={webSearch ? "Search the Web..." : "Ask anything..."} // Removed ragEnabled check
                                            className="w-full bg-transparent border-none h-[44px] md:h-[50px] px-4 text-base md:text-lg text-foreground dark:text-white placeholder:text-muted-foreground/50 dark:placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0 font-medium tracking-normal"
                                            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between px-2 md:px-3 pb-2 md:pb-3 pt-1">

                                        <div className="flex items-center gap-1 md:gap-2">
                                            <DropdownMenu open={isUploadModalOpen} onOpenChange={(open) => dispatch(setUploadModalOpen(open))}>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-muted-foreground dark:text-white hover:text-foreground dark:hover:text-white transition-all border border-black/5 dark:border-white/5 active:scale-95"
                                                    >
                                                        <Plus className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5px]" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-64 mb-4 ml-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-white/20 shadow-xl rounded-2xl p-4" side="top" align="start">
                                                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                                                        <div className="w-12 h-12 rounded-full bg-linear-to-tr from-white/40 to-white/10 border border-white/50 shadow-inner flex items-center justify-center backdrop-blur-md">
                                                            <UploadCloud className="w-5 h-5 text-indigo-600 dark:text-white drop-shadow-sm animate-pulse" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h3 className="text-sm font-bold tracking-tight text-foreground dark:text-white">Upload Document</h3>
                                                            <p className="text-muted-foreground dark:text-white/60 text-[10px] max-w-[180px] leading-tight">
                                                                PDF, DOCX, XLSX, CSV, TXT, JSON
                                                            </p>
                                                        </div>
                                                        <div className="w-full">
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                id="file-upload-popup"
                                                                onChange={handleFileUpload}
                                                                disabled={isUploading}
                                                            />
                                                            <label
                                                                htmlFor="file-upload-popup"
                                                                className={`flex items-center justify-center gap-2 py-2 px-3 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold hover:scale-[1.02] transition-all cursor-pointer shadow-md ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                                                            >
                                                                {isUploading ? (
                                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <FileText className="w-4 h-4" />
                                                                )}
                                                                <span>{isUploading ? "Uploading..." : "Select File"}</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-muted-foreground dark:text-white hover:text-foreground dark:hover:text-white transition-all border border-black/5 dark:border-white/5"
                                                    >
                                                        <Wrench className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5px]" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-56 mb-4 ml-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-white/20 shadow-xl rounded-xl p-2" side="top" align="start">
                                                    <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2 py-2">Tools</DropdownMenuLabel>
                                                    <DropdownMenuCheckboxItem
                                                        checked={webSearch}
                                                        onCheckedChange={(checked) => setWebSearch(checked as boolean)}
                                                        className="cursor-pointer rounded-lg py-2.5 dark:text-white"
                                                    >
                                                        <Globe className="w-4 h-4 mr-2 text-indigo-500" />
                                                        Web Search
                                                    </DropdownMenuCheckboxItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="flex items-center gap-1 md:gap-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-7 md:h-8 px-2 md:px-3 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-muted-foreground dark:text-white hover:text-foreground dark:hover:text-white transition-colors border border-black/5 dark:border-white/5 text-[10px] md:text-xs font-medium flex items-center gap-1.5"
                                                    >
                                                        <span className="hidden sm:inline">
                                                            {model === 'auto' ? 'Auto' :
                                                                availableModels.find(m => m.id === model)?.name || model}
                                                        </span>
                                                        <span className="sm:hidden">
                                                            {model === 'auto' ? 'Auto' : 'Model'}
                                                        </span>
                                                        <ChevronDown className="w-3 h-3 opacity-50" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-56 mb-4 mr-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-white/20 shadow-xl rounded-xl p-1.5" side="top" align="end">
                                                    <DropdownMenuRadioGroup value={model} onValueChange={(val) => dispatch(setModel(val))}>
                                                        <DropdownMenuRadioItem value="auto" className="rounded-lg cursor-pointer py-2 dark:text-white text-xs">
                                                            Auto (Smart Select)
                                                        </DropdownMenuRadioItem>
                                                        {availableModels.map((m) => (
                                                            <DropdownMenuRadioItem key={m.id} value={m.id} className="rounded-lg cursor-pointer py-2 dark:text-white text-xs">
                                                                {m.name}
                                                            </DropdownMenuRadioItem>
                                                        ))}
                                                    </DropdownMenuRadioGroup>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <Button
                                                onClick={isLoading ? handleStop : handleSend}
                                                size="icon"
                                                disabled={!input.trim() && !isLoading}
                                                className={`h-9 w-9 md:h-10 md:w-10 rounded-full bg-white/60 dark:bg-white/20 hover:bg-white/80 dark:hover:bg-white/30 backdrop-blur-xl border border-white/40 dark:border-white/30 text-indigo-600 dark:text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${isLoading ? 'animate-pulse' : ''}`}
                                            >
                                                {isLoading ? (
                                                    <Square className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current stroke-[3px]" />
                                                ) : (
                                                    <ArrowUp className="w-4 h-4 md:w-5 md:h-5 stroke-[3px]" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center mt-2">
                                    <p className="text-[10px] md:text-xs text-muted-foreground/60 dark:text-white font-medium tracking-wide">
                                        IRAG can make mistakes. Please check important info.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div >
    );
}
