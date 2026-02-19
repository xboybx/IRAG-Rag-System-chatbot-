
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
                        <div className="w-full overflow-x-auto rounded-md">
                            <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-md"
                                {...props}
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        </div>
                    ) : (
                        <code className={`${className} bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5 break-all`} {...props}>
                            {children}
                        </code>
                    );
                },
                h1: ({ children }) => <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-4 break-words">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-3 break-words">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1 sm:mb-2 break-words">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc pl-4 sm:pl-6 mb-2 sm:mb-4 break-words">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 sm:pl-6 mb-2 sm:mb-4 break-words">{children}</ol>,
                li: ({ children }) => <li className="mb-1 text-sm sm:text-base break-words">{children}</li>,
                p: ({ children }) => <p className="mb-2 sm:mb-4 last:mb-0 text-sm sm:text-base break-words">{children}</p>,
                a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
                        {children}
                    </a>
                ),
                blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-3 sm:pl-4 italic my-2 sm:my-4 text-gray-600 dark:text-gray-400 text-sm sm:text-base break-words">
                        {children}
                    </blockquote>
                ),
                table: ({ children }) => (
                    <div className="overflow-x-auto my-2 sm:my-4 border border-black dark:border-white rounded-lg max-w-full block">
                        <table className="min-w-full divide-y divide-black dark:divide-white">
                            {children}
                        </table>
                    </div>
                ),
                thead: ({ children }) => <thead className="bg-transparent border-b border-black dark:border-white">{children}</thead>,
                tbody: ({ children }) => <tbody className="divide-y divide-black dark:divide-white">{children}</tbody>,
                tr: ({ children }) => <tr>{children}</tr>,
                th: ({ children }) => <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-black dark:text-white uppercase tracking-wider break-words">{children}</th>,
                td: ({ children }) => <td className="px-2 py-2 sm:px-4 sm:py-4 text-xs sm:text-sm text-black dark:text-white break-words min-w-[100px]">{children}</td>,
            }}
        >
            {content}
        </ReactMarkdown >
    );
};

export default MessageContent;
