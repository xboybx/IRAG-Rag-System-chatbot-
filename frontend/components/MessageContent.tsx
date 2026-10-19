
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageContentProps {
    content: string;
}

const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                        <div className="w-full max-w-full overflow-x-auto my-2 rounded-lg border border-black/10 dark:border-white/10 shadow-sm bg-neutral-900/90 text-neutral-100">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-white/10 text-[11px] font-mono text-zinc-400">
                                <span>{match[1]}</span>
                            </div>
                            <div className="overflow-x-auto p-1 text-xs md:text-sm">
                                <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{ margin: 0, padding: '0.75rem', background: 'transparent' }}
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            </div>
                        </div>
                    ) : (
                        <code className={`${className} bg-black/10 dark:bg-white/15 text-foreground dark:text-white rounded px-1.5 py-0.5 text-xs font-mono break-all inline-block`} {...props}>
                            {children}
                        </code>
                    );
                },
                h1: ({ children }) => <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-4 break-words">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-3 break-words">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1 sm:mb-2 break-words">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc pl-4 sm:pl-6 mb-2 sm:mb-4 break-words space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 sm:pl-6 mb-2 sm:mb-4 break-words space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-sm sm:text-base break-words leading-relaxed">{children}</li>,
                p: ({ children }) => <p className="mb-2 sm:mb-4 last:mb-0 text-sm sm:text-base break-words leading-relaxed">{children}</p>,
                a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all font-medium">
                        {children}
                    </a>
                ),
                blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-indigo-500/50 pl-3 sm:pl-4 italic my-2 sm:my-4 text-muted-foreground text-sm sm:text-base break-words bg-black/5 dark:bg-white/5 py-1 rounded-r-lg">
                        {children}
                    </blockquote>
                ),
                table: ({ children }) => (
                    <div className="w-full max-w-full overflow-x-auto my-3 rounded-xl border border-black/15 dark:border-white/15 shadow-sm bg-white/20 dark:bg-black/20 backdrop-blur-md touch-pan-x [overscroll-behavior-x:contain]">
                        <table className="min-w-full divide-y divide-black/15 dark:divide-white/15 text-left">
                            {children}
                        </table>
                    </div>
                ),
                thead: ({ children }) => <thead className="bg-black/5 dark:bg-white/10">{children}</thead>,
                tbody: ({ children }) => <tbody className="divide-y divide-black/10 dark:divide-white/10">{children}</tbody>,
                tr: ({ children }) => <tr className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">{children}</tr>,
                th: ({ children }) => <th className="px-3 py-2 sm:px-4 sm:py-2.5 text-left text-[11px] sm:text-xs font-semibold text-foreground dark:text-white uppercase tracking-wider whitespace-nowrap">{children}</th>,
                td: ({ children }) => <td className="px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-foreground/90 dark:text-white/90 break-words whitespace-normal min-w-[80px]">{children}</td>,
            }}
        >
            {content}
        </ReactMarkdown >
    );
};

export default MessageContent;
