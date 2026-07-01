// ============================================
// Chat Store - Zustand State Management
// Single Responsibility: Manage chat state
// Dependency Inversion: Uses IAIService interface
// ============================================

import { create } from 'zustand';
import type { Message, ChatState, IAIService } from '../types';
import { generateId } from '../utils/helpers';
import { mockAIService } from '../services';

interface ChatStore extends ChatState {
  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  setAIService: (service: IAIService) => void;
}

// Store internal state
let aiService: IAIService = mockAIService;

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,

  sendMessage: async (content: string) => {
    const userMessage: Message = {
      id: generateId(),
      content,
      role: 'user',
      timestamp: new Date(),
    };

    // Add user message
    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
    }));

    try {
      // Get AI response
      const response = await aiService.generateResponse(content, get().messages);

      const assistantMessage: Message = {
        id: generateId(),
        content: response.content,
        role: 'assistant',
        timestamp: new Date(),
      };

      // Add assistant message
      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorMessage: Message = {
        id: generateId(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
      }));
    }
  },

  clearMessages: () => set({ messages: [] }),

  setAIService: (service: IAIService) => {
    aiService = service;
  },
}));
