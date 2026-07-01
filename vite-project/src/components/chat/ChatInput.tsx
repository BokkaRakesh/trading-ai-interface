// ============================================
// Chat Input Component - Single Responsibility
// Handles user message input
// ============================================

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Input, Button } from '../ui';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSend(trimmedMessage);
      setMessage('');
    }
  };

  return (
    <div className="p-2 sm:p-4 border-t border-gray-700 flex-shrink-0">
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={setMessage}
          placeholder="Ask about market trends..."
          onSubmit={handleSubmit}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
          className="px-3 sm:px-4"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </div>
    </div>
  );
}
