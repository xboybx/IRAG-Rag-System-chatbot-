'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAppDispatch, useAppSelector } from '@/Redux/hooks';
import { RootState } from '@/Redux/Store';
import { addMessage, setLoading, setModel, setConversationId, fetchMessages, clearMessages, uploadFile, clearUploadedFile, updateLastMessageContent } from '@/Redux/Features/Chatslice';
import { fetchConversations, createConversation } from '@/Redux/Features/ConversationHistorySlice';
import { toggleSidebar, setSidebarOpen, toggleUploadModal, setUploadModalOpen } from '@/Redux/Features/UIslice';
import { logoutUser } from '@/Redux/Features/UserSlice';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConversationSidebar from "@/components/ConversationSidebar";
import {
    Send, Sparkles, Search, Moon, Sun, ArrowUp, Plus, Globe,
    Bot, Cpu, Zap, ChevronDown, Check, Database, Layers, Paperclip, Wrench,
    FileText, Image as ImageIcon, Link2, UploadCloud, X, Menu, User, LogOut, Square
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { sendMessage } from '@/Redux/Features/Chatslice';
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
    const { messages, isLoading, model, currentConversationId, isUploading, uploadedFile } = useAppSelector((state) => state.chat);
    const { isSidebarOpen, isUploadModalOpen } = useAppSelector((state) => state.ui);
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    // Local State (Input is fine to keep local as it's transient)
    const [input, setInput] = useState('');//the user input message
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    // Additional Local Options (Can be moved to Redux later if needed globally)
    const [ragEnabled, setRagEnabled] = useState(true);
    const [webSearch, setWebSearch] = useState(false);

    // Ref for auto-scrolling to bottom
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Sync URL ID with Redux and Load Messages
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
        dispatch(addMessage({ role: 'assistant', content: '' }));

        // 4. Prepare Payload
        let backendModelName = model;
        if (model === "arcee-ai/trinity-large-preview:free") backendModelName = "Arce-Large";
        else if (model === "upstage/solar-pro-3:free") backendModelName = "Solar-Pro-3";
        else if (model === "liquid/lfm-2.5-1.2b-thinking:free") backendModelName = "LFM-2.5-1.2B-Thinking";

        // Create new AbortController
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            const urlId = currentConversationId || 'new';
            // Use proxy path /api which Next.js rewrites to backend
            const response = await fetch(`/api/ai/chat/${urlId}`, { // Direct fetch for streaming
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add Auth Token - Assuming it's in localStorage or cookie.
                    // Since we use httpOnly cookies, credentials: 'include' is needed.
                },
                body: JSON.stringify({
                    message: userMessage,
                    selectedModel: backendModelName,
                    conversationId: currentConversationId,
                    history: messages, // Send history
                    useRag: ragEnabled,
                    useWebSearch: webSearch
                }),
                // IMPORTANT: Send cookies
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
                window.history.pushState({}, '', `/chat/${newConversationId}`); // Update URL silently
            }

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
        <div className="h-screen w-screen relative flex font-sans overflow-hidden selection:bg-indigo-500/30 bg-slate-50 dark:bg-slate-950">

            {/* Background Image */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: 'url(/bg2.jpg)',
                    }}
                ></div>
            </div>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[4px] animate-in fade-in duration-300">
                    <div className="relative w-full max-w-sm mx-4 bg-white/30 backdrop-blur-[40px] saturate-200 border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] rounded-[32px] p-8 animate-in zoom-in-95 duration-300 overflow-hidden ring-1 ring-white/50">
                        <button
                            onClick={() => dispatch(setUploadModalOpen(false))}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                        >
                            <X className="w-5 h-5 text-foreground/70" />
                        </button>

                        <div className="flex flex-col items-center justify-center text-center space-y-6">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-white/40 to-white/10 border border-white/50 shadow-inner flex items-center justify-center mb-2 backdrop-blur-md">
                                <UploadCloud className="w-8 h-8 text-indigo-600 drop-shadow-sm" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold tracking-tight text-foreground drop-shadow-sm">Upload File</h2>
                                <p className="text-foreground/70 text-sm max-w-xs mx-auto font-medium">
                                    Select a document to enhance your knowledge base.
                                </p>
                            </div>

                            <div className="w-full">
                                <input
                                    type="file"
                                    className="hidden"
                                    id="file-upload"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className={`flex flex-col items-center justify-center gap-3 p-6 w-full rounded-3xl bg-white/20 border-2 border-dashed border-white/40 hover:bg-white/30 hover:border-white/60 transition-all hover:scale-[1.02] group cursor-pointer shadow-sm ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                                        {isUploading ? (
                                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <FileText className="w-6 h-6 text-blue-600 drop-shadow-md" />
                                        )}
                                    </div>
                                    <span className="text-base font-semibold text-foreground/80">
                                        {isUploading ? "Uploading..." : "Select Document"}
                                    </span>
                                    <span className="text-xs text-foreground/50 uppercase tracking-widest font-bold">PDF, DOCX, TXT</span>
                                </label>
                            </div>
                        </div>

                        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-b from-white/10 via-transparent to-transparent rotate-45 pointer-events-none"></div>
                    </div>
                </div>
            )}

            {/* Main Layout with Sidebar */}
            <div className="relative z-10 w-full h-full overflow-hidden">

                {/* Sidebar - Slides from left */}
                <div className={`absolute top-0 left-0 h-full z-20 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <ConversationSidebar
                        isOpen={isSidebarOpen}
                        currentConversationId={currentConversationId || undefined}
                    />
                </div>

                {/* Main Chat Container - Shifts right when sidebar opens */}
                <div className={`flex flex-col h-full transition-all duration-300 ease-in-out py-2 ${isSidebarOpen ? 'ml-64 w-[calc(100%-16rem)]' : 'ml-0 w-full'}`}>

                    {/* Header */}
                    <header className="flex items-center justify-between px-4 py-3 shrink-0">
                        <div className="flex items-center gap-3">
                            {/* Sidebar Toggle (replaces Sparkles icon) */}
                            <button
                                onClick={() => dispatch(toggleSidebar())}
                                className="w-10 h-10 flex items-center justify-center group hover:scale-105 transition-transform duration-300"
                            >
                                <Menu className="w-5 h-5 text-black dark:text-white transition-colors duration-300" />
                            </button>
                            <span className="text-lg font-bold tracking-tight text-foreground/90 font-mono">IRAG</span>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* RAG Master Toggle */}
                            <button
                                onClick={() => setRagEnabled(!ragEnabled)}
                                className={`
                      group relative flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 backdrop-blur-md cursor-pointer
                      ${ragEnabled
                                        ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-500 dark:text-indigo-400 shadow-indigo-500/10'
                                        : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'}
                  `}
                            >
                                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${ragEnabled ? 'bg-indigo-500 animate-pulse' : 'bg-slate-400'}`}></div>
                                <span className="text-xs font-bold tracking-wide">RAG {ragEnabled ? 'ON' : 'OFF'}</span>
                            </button>

                            {/* Web Search Master Toggle */}
                            <button
                                onClick={() => setWebSearch(!webSearch)}
                                className={`
                                    group relative flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 backdrop-blur-md cursor-pointer
                                    ${webSearch
                                        ? 'bg-blue-500/20 border-blue-500/30 text-blue-500 dark:text-blue-400 shadow-blue-500/10'
                                        : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'}
                                `}
                            >
                                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${webSearch ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`}></div>
                                <span className="text-xs font-bold tracking-wide">WEB {webSearch ? 'ON' : 'OFF'}</span>
                            </button>

                            {mounted && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className="w-10 h-10 transition-all hover:scale-110 text-foreground/70 hover:text-foreground"
                                >
                                    {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-indigo-300" />}
                                </Button>
                            )}

                            {/* File Indicator (Desktop) - Optional placement in header or near input */}
                            {uploadedFile && (
                                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full animate-in fade-in zoom-in duration-300">
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
                                        className="w-10 h-10 transition-all hover:scale-110 text-foreground/70 hover:text-foreground"
                                    >
                                        <User className="w-5 h-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-48 mt-2 mr-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-white/20 shadow-xl rounded-xl p-2" side="bottom" align="end">
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
                                                    router.push('/login');
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
                    <main className="flex-1 flex flex-col relative overflow-hidden rounded-[40px] mx-2 mb-2 border border-white/20 dark:border-white/5 shadow-2xl bg-white/30 dark:bg-black/20 backdrop-blur-xl ring-1 ring-white/20">

                        {/* Messages */}
                        <ScrollArea className="flex-1 px-4 md:px-0 scroll-smooth">
                            <div className="w-full max-w-[1600px] mx-auto space-y-8 py-8 pb-64">
                                {messages.length === 0 && (
                                    <div className="h-[50vh] flex flex-col items-center justify-center text-muted-foreground/60 animate-in fade-in zoom-in duration-700">
                                        <div className="w-24 h-24 rounded-[32px] bg-linear-to-br from-white/10 to-transparent dark:from-white/5 dark:to-white/5 dark:bg-white/5 backdrop-blur-2xl flex items-center justify-center mb-8 shadow-xl border border-white/10 ring-1 ring-white/5 group hover:scale-105 transition-all duration-500">
                                            <Search className="w-10 h-10 opacity-40 dark:opacity-60 group-hover:opacity-60 dark:group-hover:opacity-80 transition-opacity duration-300" />
                                        </div>
                                        <h2 className="text-3xl font-semibold text-foreground/80 dark:text-white mb-3 tracking-tight">Ready to research?</h2>
                                        <p className="text-lg text-muted-foreground/50 dark:text-white/70 max-w-md text-center">
                                            Toggle RAG or Web Search to enhance your answers.
                                        </p>
                                    </div>
                                )}

                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start w-full'} animate-in slide-in-from-bottom-4 duration-500 px-4`}>
                                        <div className={`text-base md:text-lg leading-relaxed tracking-wide ${msg.role === 'user'
                                            ? 'max-w-[85%] md:max-w-[70%] bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/30 dark:border-white/20 text-foreground dark:text-white rounded-[24px] rounded-br-sm px-6 py-4 shadow-lg'
                                            : 'w-full bg-transparent text-foreground/90 dark:text-white/90 px-2 py-2'
                                            }`}>
                                            <MessageContent content={msg.content} />
                                        </div>
                                    </div>
                                ))}

                                {/* Thinking Gradient Loader */}
                                {isLoading && (
                                    <div className="flex justify-start animate-in slide-in-from-bottom-4 duration-500 px-4 mt-2">
                                        <div className="relative overflow-hidden rounded-[24px] rounded-tl-none px-6 py-4 bg-white/5 border border-white/10 w-fit shadow-lg shadow-indigo-500/5">
                                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
                                            <div className="relative flex items-center gap-3">
                                                <div className="flex gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-[bounce_1s_infinite_0ms]"></div>
                                                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-[bounce_1s_infinite_200ms]"></div>
                                                    <div className="w-2 h-2 rounded-full bg-pink-400 animate-[bounce_1s_infinite_400ms]"></div>
                                                </div>
                                                <span className="text-sm font-semibold bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent animate-pulse tracking-wide">
                                                    AI is thinking...
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Scroll anchor */}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="absolute bottom-6 left-0 right-0 px-4 md:px-6 flex justify-center z-20 pointer-events-none">
                            <div className="w-full max-w-[1600px] relative group pointer-events-auto">

                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-[35px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                                <div className="relative z-10 flex flex-col bg-white/40 dark:bg-neutral-900/40 backdrop-blur-[60px] saturate-150 border border-white/40 dark:border-white/10 rounded-[35px] shadow-2xl transition-all duration-300 hover:bg-white/50 dark:hover:bg-neutral-900/50 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)]">

                                    {/* Uploaded File Indicator (Inside Input Area for visibility) */}
                                    {uploadedFile && (
                                        <div className="absolute -top-10 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-full shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-300 z-10">
                                            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <span className="text-xs font-medium text-foreground/80 max-w-[200px] truncate">
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

                                    <div className="w-full px-2 pt-2">
                                        <Input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder={ragEnabled ? "Ask RAG Knowledge..." : webSearch ? "Search the Web..." : "Ask anything..."}
                                            className="w-full bg-transparent border-none h-[50px] px-4 text-lg text-foreground dark:text-white placeholder:text-muted-foreground/50 dark:placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0 font-medium tracking-normal"
                                            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between px-3 pb-3 pt-1">

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => dispatch(setUploadModalOpen(true))}
                                                className="h-9 w-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-muted-foreground dark:text-white hover:text-foreground dark:hover:text-white transition-all border border-black/5 dark:border-white/5 active:scale-95"
                                            >
                                                <Plus className="w-5 h-5 stroke-[2.5px]" />
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-muted-foreground dark:text-white hover:text-foreground dark:hover:text-white transition-all border border-black/5 dark:border-white/5"
                                                    >
                                                        <Wrench className="w-4 h-4 stroke-[2.5px]" />
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

                                        <div className="flex items-center gap-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-8 px-3 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-muted-foreground dark:text-white hover:text-foreground dark:hover:text-white transition-colors border border-black/5 dark:border-white/5 text-xs font-medium flex items-center gap-1.5"
                                                    >
                                                        {model === 'auto' ? 'Auto' :
                                                            model === 'arcee-ai/trinity-large-preview:free' ? 'Arce-Large' :
                                                                model === 'upstage/solar-pro-3:free' ? 'Solar-Pro-3' :
                                                                    model === 'liquid/lfm-2.5-1.2b-thinking:free' ? 'LFM Thinking' :
                                                                        model}
                                                        <ChevronDown className="w-3 h-3 opacity-50" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-56 mb-4 mr-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-white/20 shadow-xl rounded-xl p-1.5" side="top" align="end">
                                                    <DropdownMenuRadioGroup value={model} onValueChange={(val) => dispatch(setModel(val))}>
                                                        <DropdownMenuRadioItem value="auto" className="rounded-lg cursor-pointer py-2 dark:text-white text-xs">
                                                            Auto (Smart Select)
                                                        </DropdownMenuRadioItem>
                                                        <DropdownMenuRadioItem value="arcee-ai/trinity-large-preview:free" className="rounded-lg cursor-pointer py-2 dark:text-white text-xs">
                                                            Arce-Large
                                                        </DropdownMenuRadioItem>
                                                        <DropdownMenuRadioItem value="upstage/solar-pro-3:free" className="rounded-lg cursor-pointer py-2 dark:text-white text-xs">
                                                            Solar-Pro-3
                                                        </DropdownMenuRadioItem>
                                                        <DropdownMenuRadioItem value="liquid/lfm-2.5-1.2b-thinking:free" className="rounded-lg cursor-pointer py-2 dark:text-white text-xs">
                                                            LFM Thinking (1.2B)
                                                        </DropdownMenuRadioItem>
                                                    </DropdownMenuRadioGroup>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <Button
                                                onClick={isLoading ? handleStop : handleSend}
                                                size="icon"
                                                disabled={!input.trim() && !isLoading}
                                                className={`h-10 w-10 rounded-full bg-white/60 dark:bg-white/20 hover:bg-white/80 dark:hover:bg-white/30 backdrop-blur-xl border border-white/40 dark:border-white/30 text-indigo-600 dark:text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${isLoading ? 'animate-pulse' : ''}`}
                                            >
                                                {isLoading ? (
                                                    <Square className="w-4 h-4 fill-current stroke-[3px]" />
                                                ) : (
                                                    <ArrowUp className="w-5 h-5 stroke-[3px]" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
