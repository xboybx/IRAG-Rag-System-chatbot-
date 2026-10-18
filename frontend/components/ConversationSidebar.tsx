'use client';

import { useRouter } from 'next/navigation';
import { Plus, Trash2, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { clearMessages, setConversationId } from '@/Redux/Features/Chatslice';
import { fetchConversations, deleteConversationThunk, addConversation } from '@/Redux/Features/ConversationHistorySlice';
import { useEffect } from 'react';
import axiosInstance from '@/Redux/axiosInstance';
import { useAppDispatch, useAppSelector } from '@/Redux/hooks';

interface ConversationSidebarProps {
    isOpen: boolean;
    currentConversationId?: string;
}

export default function ConversationSidebar({ isOpen, currentConversationId }: ConversationSidebarProps) {
    const router = useRouter();
    const conversations = useAppSelector((state) => state.conversationsHistory.conversations);
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchConversations());
        }
    }, [dispatch, isAuthenticated]);

    const handleNewConversation = async () => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        try {
            // 1. Clear current messages first for immediate feedback
            dispatch(clearMessages());

            // 2. Call Backend to create new conversation
            const response = await axiosInstance.post(`/ai/create-conversation`, {
                title: "New Chat"
            });

            const newConv = response.data.data;

            // 3. Update Redux State
            dispatch(setConversationId(newConv._id));
            dispatch(addConversation({
                id: newConv._id,
                title: newConv.title,
                timestamp: new Date().toLocaleDateString()
            }));

            // 4. Navigate
            router.push(`/chat/${newConv._id}`);

        } catch (error) {
            console.error("Failed to create conversation", error);
        }
    };

    const handleSelectConversation = (id: string) => {
        dispatch(setConversationId(id));
        router.push(`/chat/${id}`);
    };

    const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Delete this conversation?")) {
            await dispatch(deleteConversationThunk(id));
            if (currentConversationId === id) {
                router.push('/chat');
                dispatch(clearMessages());
                dispatch(setConversationId(null));
            }
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-white/40 dark:bg-zinc-900/60 backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-2xl md:shadow-lg rounded-2xl md:rounded-none md:rounded-r-md overflow-hidden">
            {/* Header */}
            <div className="p-3 md:p-4 border-b border-white/20 dark:border-white/10 shrink-0">
                <Button
                    onClick={handleNewConversation}
                    className="w-full bg-white/60 dark:bg-white/20 hover:bg-white/80 dark:hover:bg-white/30 backdrop-blur-xl border border-white/40 dark:border-white/30 text-indigo-600 dark:text-white rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    <span className="font-semibold">New Chat</span>
                </Button>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {conversations.map((conversation) => (
                        <div
                            key={conversation.id}
                            onClick={() => handleSelectConversation(conversation.id)}
                            className={`
                                w-full text-left px-3 py-2.5 rounded-xl transition-all group cursor-pointer relative flex items-center justify-between
                                ${currentConversationId === conversation.id
                                    ? 'bg-indigo-500/20 border border-indigo-500/30 text-foreground'
                                    : 'hover:bg-white/20 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground'
                                }
                            `}
                        >
                            <div className="flex-1 min-w-0 pr-2">
                                <p className="text-sm font-medium truncate dark:text-white">{conversation.title}</p>
                                <p className="text-xs opacity-60 mt-0.5">{conversation.timestamp}</p>
                            </div>

                            {/* Three Dots Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        onClick={(e) => e.stopPropagation()}
                                        className="opacity-70 md:opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground dark:text-white transition-opacity"
                                        aria-label="Conversation options"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    side="right"
                                    align="start"
                                    className="w-36 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-white/20 shadow-xl rounded-xl p-1 z-50"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <DropdownMenuItem
                                        onClick={(e) => handleDeleteConversation(conversation.id, e)}
                                        className="text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg cursor-pointer flex items-center gap-2 px-2.5 py-2 text-xs font-medium"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete Chat</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
