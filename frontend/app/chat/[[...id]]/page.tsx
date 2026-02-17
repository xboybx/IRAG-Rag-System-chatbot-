'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/Redux/Store';
import { addMessage, setLoading, setModel, setConversationId } from '@/Redux/Features/Chatslice';
import { toggleSidebar, setSidebarOpen, toggleUploadModal, setUploadModalOpen } from '@/Redux/Features/UIslice';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConversationSidebar from "@/components/ConversationSidebar";
import {
    Send, Sparkles, Search, Moon, Sun, ArrowUp, Plus, Globe,
    Bot, Cpu, Zap, ChevronDown, Check, Database, Layers, Paperclip, Wrench,
    FileText, Image as ImageIcon, Link2, UploadCloud, X, Menu, User, LogOut
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

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const conversationIdParam = params?.id as string | undefined;

    // Redux Hooks
    const dispatch = useDispatch();
    const { messages, isLoading, model, currentConversationId } = useSelector((state: RootState) => state.chat);
    const { isSidebarOpen, isUploadModalOpen } = useSelector((state: RootState) => state.ui);

    // Local State (Input is fine to keep local as it's transient)
    const [input, setInput] = useState('');
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Additional Local Options (Can be moved to Redux later if needed globally)
    const [ragEnabled, setRagEnabled] = useState(true);
    const [webSearch, setWebSearch] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Sync URL ID with Redux
    useEffect(() => {
        if (conversationIdParam && conversationIdParam !== currentConversationId) {
            dispatch(setConversationId(conversationIdParam));
            // TODO: Dispatch thunk to load conversation from backend
            console.log('Loading conversation:', conversationIdParam);
        }
    }, [conversationIdParam, currentConversationId, dispatch]);

    const handleSend = () => {
        if (!input.trim()) return;

        // 1. Add User Message
        dispatch(addMessage({ role: 'user', content: input }));

        // 2. Set Loading
        dispatch(setLoading(true));
        setInput('');

        // 3. Simulate Response (Replace with real API call later)
        setTimeout(() => {
            dispatch(addMessage({
                role: 'assistant',
                content: `[${model} | RAG: ${ragEnabled ? 'ON' : 'OFF'} | Web: ${webSearch ? 'ON' : 'OFF'}] I'm searching for that information...`
            }));
            dispatch(setLoading(false));
        }, 1000);
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
                                <button className="flex flex-col items-center justify-center gap-3 p-6 w-full rounded-3xl bg-white/20 border-2 border-dashed border-white/40 hover:bg-white/30 hover:border-white/60 transition-all hover:scale-[1.02] group cursor-pointer shadow-sm">
                                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                                        <FileText className="w-6 h-6 text-blue-600 drop-shadow-md" />
                                    </div>
                                    <span className="text-base font-semibold text-foreground/80">Select Document</span>
                                    <span className="text-xs text-foreground/50 uppercase tracking-widest font-bold">PDF, DOCX, TXT</span>
                                </button>
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
                                    <DropdownMenuItem
                                        onClick={() => router.push('/profile')}
                                        className="cursor-pointer rounded-lg py-2.5 dark:text-white"
                                    >
                                        <User className="w-4 h-4 mr-2 text-indigo-500" />
                                        Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-white/20" />
                                    <DropdownMenuItem
                                        onClick={() => {
                                            // TODO: Implement logout logic
                                            router.push('/');
                                        }}
                                        className="cursor-pointer rounded-lg py-2.5 dark:text-white text-red-600 hover:text-red-700 dark:hover:text-red-300"
                                    >
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>

                    {/* Chat Area */}
                    <main className="flex-1 flex flex-col relative overflow-hidden rounded-[40px] mx-2 mb-2 border border-white/20 dark:border-white/5 shadow-2xl bg-white/30 dark:bg-black/20 backdrop-blur-xl ring-1 ring-white/20">

                        {/* Messages */}
                        <ScrollArea className="flex-1 px-4 md:px-0 scroll-smooth">
                            <div className="w-full max-w-[1600px] mx-auto space-y-8 py-8 pb-32">
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
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-500 px-4`}>
                                        <div className={`max-w-[85%] md:max-w-[70%] text-[15px] md:text-base leading-relaxed tracking-wide ${msg.role === 'user'
                                            ? 'bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/30 dark:border-white/20 text-foreground dark:text-white rounded-[24px] rounded-br-sm px-6 py-4 shadow-lg'
                                            : 'bg-transparent text-foreground/90 dark:text-white/90 px-2 py-2'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="absolute bottom-6 left-0 right-0 px-4 md:px-6 flex justify-center z-20 pointer-events-none">
                            <div className="w-full max-w-[1600px] relative group pointer-events-auto">

                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-[35px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                                <div className="relative z-10 flex flex-col bg-white/40 dark:bg-neutral-900/40 backdrop-blur-[60px] saturate-150 border border-white/40 dark:border-white/10 rounded-[35px] shadow-2xl transition-all duration-300 hover:bg-white/50 dark:hover:bg-neutral-900/50 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)]">

                                    <div className="w-full px-2 pt-2">
                                        <Input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder={ragEnabled ? "Ask RAG Knowledge..." : webSearch ? "Search the Web..." : "Ask anything..."}
                                            className="w-full bg-transparent border-none h-[50px] px-4 text-lg text-foreground dark:text-white placeholder:text-muted-foreground/50 dark:placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0 font-medium tracking-normal"
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
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
                                                onClick={handleSend}
                                                size="icon"
                                                disabled={!input.trim()}
                                                className="h-10 w-10 rounded-full bg-white/60 dark:bg-white/20 hover:bg-white/80 dark:hover:bg-white/30 backdrop-blur-xl border border-white/40 dark:border-white/30 text-indigo-600 dark:text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                            >
                                                <ArrowUp className="w-5 h-5 stroke-[3px]" />
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
