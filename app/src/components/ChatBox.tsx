import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../utils';

interface ChatMessage {
  sender: string;
  message: string;
  timestamp: number;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  currentUserName: string;
  title?: string;
  placeholder?: string;
  emptyMessage?: string;
}

/**
 * Reusable chat component used by both GameRoomPage (match chat) and LobbyPage (global chat).
 */
export default function ChatBox({
  messages,
  onSend,
  currentUserName,
  title = 'Chat',
  placeholder = 'Type a message...',
  emptyMessage = 'No messages yet.',
}: ChatBoxProps) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const timer = setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-800/50 shrink-0">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {title}
        </h4>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 min-h-0">
        {messages.length === 0 ? (
          <div className="text-xs text-slate-500 text-center mt-4">{emptyMessage}</div>
        ) : (
          messages.map((msg, i) => {
            const isOwnMessage = msg.sender === currentUserName;
            return (
              <div key={i} className="text-sm">
                <span className={cn(
                  "font-bold",
                  isOwnMessage ? "text-indigo-400" : "text-rose-400"
                )}>
                  {msg.sender}:{' '}
                </span>
                <span className="text-slate-300">{msg.message}</span>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
        />
      </form>
    </div>
  );
}
