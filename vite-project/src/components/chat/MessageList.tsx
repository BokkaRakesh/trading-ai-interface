// ============================================
// Message List Component - Single Responsibility
// Renders the list of messages with auto-scroll
// ============================================

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from '../ui';
import type { Message } from '../../types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">Start a conversation</p>
          <p className="text-sm mt-1">
            Ask me about market trends, trading insights, or price analysis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex gap-3 p-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
            <LoadingSpinner size="sm" />
          </div>
          <div className="bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span>Thinking</span>
              <span className="animate-pulse">...</span>
            </div>
          </div>
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  );
}
