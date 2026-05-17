// ============================================
// AI Chat Page - Full AI Assistant View
// ============================================

import { ChatWindow } from '../components/chat';
import { Card } from '../components/ui';
import { 
  Bot, 
  Lightbulb, 
  TrendingUp, 
  BarChart3,
  MessageCircle
} from 'lucide-react';

const suggestedQuestions = [
  { icon: TrendingUp, text: "What's the current market trend for BTC?" },
  { icon: BarChart3, text: "Analyze the technical indicators for ETH" },
  { icon: Lightbulb, text: "Should I buy or sell based on current conditions?" },
  { icon: MessageCircle, text: "Explain the recent market volatility" },
];

export function ChatPage() {
  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
      {/* Suggestions Panel */}
      <div className="col-span-3">
        <Card className="h-full">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Suggested Questions
            </h3>
          </div>
          <div className="p-3 space-y-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                className="w-full p-3 rounded-lg text-left hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-start gap-2">
                  <q.icon className="w-4 h-4 text-gray-500 group-hover:text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-400 group-hover:text-white">
                    {q.text}
                  </span>
                </div>
              </button>
            ))}
          </div>
          
          <div className="p-4 border-t border-gray-700 mt-auto">
            <div className="flex items-center gap-3 p-3 bg-blue-600/10 rounded-lg border border-blue-600/30">
              <Bot className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-white">AI Trading Assistant</p>
                <p className="text-xs text-gray-400">Powered by advanced AI</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Chat Window */}
      <div className="col-span-9">
        <ChatWindow />
      </div>
    </div>
  );
}
