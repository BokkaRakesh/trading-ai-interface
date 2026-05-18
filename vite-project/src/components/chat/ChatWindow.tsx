// ============================================
// Chat Window Component - Composition
// Composes MessageList and ChatInput
// ============================================

import { useChatStore } from '../../stores';
import { Card } from '../ui';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { MessageCircle } from 'lucide-react';

export function ChatWindow() {
  const { messages, isLoading, sendMessage } = useChatStore();

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-700 flex-shrink-0">
        <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
        <h2 className="text-base sm:text-lg font-semibold text-white">AI Trading Assistant</h2>
      </div>

      {/* Messages */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </Card>
  );
}
