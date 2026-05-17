// ============================================
// Mock AI Service - Implements IAIService Interface
// Single Responsibility: Handle AI response generation
// Open/Closed: Easy to extend with new response patterns
// ============================================

import type { IAIService, AIResponse, Message } from '../types';
import { delay, randomBetween } from '../utils/helpers';

// Predefined responses based on keywords - extensible pattern
const responsePatterns: Array<{
  keywords: string[];
  responses: AIResponse[];
}> = [
  {
    keywords: ['buy', 'bullish', 'long', 'invest'],
    responses: [
      {
        content: "Based on current market trends, this could be a good entry point. However, always consider your risk tolerance and do your own research before making any investment decisions.",
        sentiment: 'bullish',
        confidence: 0.72,
      },
      {
        content: "The technical indicators suggest potential upward momentum. Key support levels are holding well, which is typically a bullish sign.",
        sentiment: 'bullish',
        confidence: 0.68,
      },
    ],
  },
  {
    keywords: ['sell', 'bearish', 'short', 'drop'],
    responses: [
      {
        content: "Current market conditions show some bearish signals. Consider setting stop-losses and be prepared for potential volatility.",
        sentiment: 'bearish',
        confidence: 0.65,
      },
      {
        content: "The recent price action suggests caution. Resistance levels are holding strong, which may indicate limited upside in the short term.",
        sentiment: 'bearish',
        confidence: 0.61,
      },
    ],
  },
  {
    keywords: ['price', 'prediction', 'forecast', 'target'],
    responses: [
      {
        content: "Price predictions are inherently uncertain. Based on historical patterns and current momentum, I can identify key levels to watch, but always trade with proper risk management.",
        sentiment: 'neutral',
        confidence: 0.55,
      },
    ],
  },
  {
    keywords: ['trend', 'analysis', 'chart', 'pattern'],
    responses: [
      {
        content: "Looking at the current chart patterns, I can see some interesting formations. The moving averages are converging, which often precedes significant price movement.",
        sentiment: 'neutral',
        confidence: 0.70,
      },
      {
        content: "Technical analysis shows mixed signals. The RSI is near neutral territory, and volume has been declining, suggesting consolidation.",
        sentiment: 'neutral',
        confidence: 0.63,
      },
    ],
  },
  {
    keywords: ['help', 'how', 'what', 'explain'],
    responses: [
      {
        content: "I'm here to help you understand market dynamics and provide trading insights. Feel free to ask about price trends, technical analysis, or market sentiment!",
        sentiment: 'neutral',
        confidence: 0.90,
      },
    ],
  },
];

// Default responses when no pattern matches
const defaultResponses: AIResponse[] = [
  {
    content: "That's an interesting perspective. Markets are complex and influenced by many factors. Would you like me to analyze any specific aspect of the current market conditions?",
    sentiment: 'neutral',
    confidence: 0.50,
  },
  {
    content: "I understand you're looking for market insights. Could you be more specific about what you'd like to know? I can help with trend analysis, price levels, or general market sentiment.",
    sentiment: 'neutral',
    confidence: 0.50,
  },
  {
    content: "The market is showing interesting dynamics today. Is there a particular asset or trend you'd like me to focus on?",
    sentiment: 'neutral',
    confidence: 0.50,
  },
];

/**
 * Mock AI Service Implementation
 * Follows Interface Segregation - implements only IAIService
 */
class MockAIService implements IAIService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateResponse(message: string, _context?: Message[]): Promise<AIResponse> {
    // Simulate network delay
    await delay(randomBetween(800, 1500));

    const lowerMessage = message.toLowerCase();

    // Find matching pattern
    for (const pattern of responsePatterns) {
      if (pattern.keywords.some(keyword => lowerMessage.includes(keyword))) {
        const randomIndex = Math.floor(Math.random() * pattern.responses.length);
        return pattern.responses[randomIndex];
      }
    }

    // Return default response if no pattern matches
    const randomIndex = Math.floor(Math.random() * defaultResponses.length);
    return defaultResponses[randomIndex];
  }
}

// Export singleton instance - Dependency Inversion ready
export const mockAIService: IAIService = new MockAIService();
