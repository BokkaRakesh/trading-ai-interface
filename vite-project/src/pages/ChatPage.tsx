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
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6 h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)]">
      {/* Main Chat Window - First on mobile */}
      <div className="flex-1 lg:col-span-9 lg:order-2 min-h-[300px]">
        <ChatWindow />
      </div>

      {/* Suggestions Panel - Below on mobile, sidebar on desktop */}
      <div className="lg:col-span-3 lg:order-1 shrink-0">
        <Card className="h-full">
          <div className="p-3 sm:p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Suggested Questions
            </h3>
          </div>
          <div className="p-2 sm:p-3 flex lg:block gap-2 overflow-x-auto lg:overflow-visible lg:space-y-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                className="flex-shrink-0 lg:w-full p-2 sm:p-3 rounded-lg text-left hover:bg-gray-800 transition-colors group border border-gray-700 lg:border-0"
              >
                <div className="flex items-start gap-2">
                  <q.icon className="w-4 h-4 text-gray-500 group-hover:text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-400 group-hover:text-white whitespace-nowrap lg:whitespace-normal">
                    {q.text}
                  </span>
                </div>
              </button>
            ))}
          </div>
          
          <div className="p-3 sm:p-4 border-t border-gray-700 mt-auto hidden lg:block">
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
    </div>
  );
}
