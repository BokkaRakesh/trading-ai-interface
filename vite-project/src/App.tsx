// ============================================
// App Component - Main Application Entry
// Follows SOLID principles with clean composition
// ============================================

import { MainLayout } from './components';
import { 
  DashboardPage, 
  ChartsPage, 
  ChatPage, 
  PortfolioPage, 
  ExpensesPage,
  SettingsPage 
} from './pages';
import { useUIStore } from './stores';

function App() {
  const currentPage = useUIStore((state) => state.currentPage);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'charts':
        return <ChartsPage />;
      case 'chat':
        return <ChatPage />;
      case 'portfolio':
        return <PortfolioPage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <MainLayout>
      {renderPage()}
    </MainLayout>
  );
}

export default App;
