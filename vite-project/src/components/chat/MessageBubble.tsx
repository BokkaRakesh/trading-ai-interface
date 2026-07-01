// ============================================
// Message Bubble Component - Single Responsibility
// Renders a single chat message
// ============================================

import { Bot, User } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { formatDate } from '../../utils/helpers';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-2 sm:gap-3 p-2 sm:p-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-blue-600' : 'bg-gray-700'
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        ) : (
          <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5',
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-gray-700 text-gray-100 rounded-tl-sm'
        )}
      >
        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        <p
          className={cn(
            'text-[10px] sm:text-xs mt-1',
            isUser ? 'text-blue-200' : 'text-gray-400'
          )}
        >
          {formatDate(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
