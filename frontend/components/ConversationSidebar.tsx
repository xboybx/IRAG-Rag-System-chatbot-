'use client';

import { useRouter } from 'next/navigation';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/Redux/Store';
import { addConversation, deleteConversation } from '@/Redux/Features/ConversationHistorySlice';
import { clearMessages, setConversationId } from '@/Redux/Features/Chatslice';

interface Conversation {
    id: string;
    title: string;
    timestamp: string;
}

interface ConversationSidebarProps {
    isOpen: boolean;
    currentConversationId?: string;
}

export default function ConversationSidebar({ isOpen, currentConversationId }: ConversationSidebarProps) {
    const router = useRouter();
    const conversations = useSelector((state: RootState) => state.conversationsHistory.conversations);
    const dispatch = useDispatch();

    const handleNewConversation = () => {
        dispatch(clearMessages());
        dispatch(setConversationId(null));
        router.push('/chat');
    };

    const handleSelectConversation = (id: string) => {
        dispatch(setConversationId(id));
        router.push(`/chat/${id}`);
    };

    return (
        <div className="h-full w-64 flex flex-col bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border-r border-white/20 dark:border-white/10 shadow-lg rounded-r-md">
            {/* Header */}
            <div className="p-4 border-b border-white/20 dark:border-white/10 shrink-0">
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
                w-full text-left px-3 py-3 rounded-xl transition-all group cursor-pointer
                ${currentConversationId === conversation.id
                                    ? 'bg-indigo-500/20 border border-indigo-500/30 text-foreground'
                                    : 'hover:bg-white/20 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground'
                                }
              `}
                        >
                            <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate dark:text-white">{conversation.title}</p>
                                    <p className="text-xs opacity-60 mt-0.5">{conversation.timestamp}</p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Handle delete
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                                >
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
