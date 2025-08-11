import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './components/Views/Dashboard';
import { News } from './components/Views/News';
import { Tournaments } from './components/Views/Tournaments';
import { Analytics } from './components/Views/Analytics';
import { MatchTracker } from './components/Views/MatchTracker';
import { TournamentManager } from './components/Views/TournamentManager';
import { UserManagement } from './components/Views/UserManagement';
import { DatabaseView } from './components/Views/Database';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'news': return <News />;
      case 'tournaments': return <Tournaments />;
      case 'analytics': return <Analytics />;
      case 'match-tracker': return <MatchTracker />;
      case 'tournament-manager': return <TournamentManager />;
      case 'user-management': return <UserManagement />;
      case 'database': return <DatabaseView />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        isOpen={isSidebarOpen} 
        currentView={currentView} 
        onViewChange={setCurrentView}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          isMenuOpen={isSidebarOpen}
        />
        
        <main className="flex-1 overflow-y-auto">
          {renderCurrentView()}
        </main>
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;