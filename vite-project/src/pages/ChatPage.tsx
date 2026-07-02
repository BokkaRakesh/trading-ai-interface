// ============================================
// AI Chat Page — Portfolio Copilot (streaming, charts-in-chat)
// ============================================

import CopilotChat from '../features/copilot/CopilotChat';

export function ChatPage() {
  return (
    <div className="h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      <CopilotChat />
    </div>
  );
}
