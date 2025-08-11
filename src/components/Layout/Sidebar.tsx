import React from 'react';
import { Home, Trophy, Users, BarChart3, Settings, Database, Calendar, Newspaper } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  currentView: string;
  onViewChange: (view: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home size={20} />, roles: ['user', 'technical_officer', 'admin', 'developer'] },
  { id: 'news', label: 'News & Updates', icon: <Newspaper size={20} />, roles: ['user', 'technical_officer', 'admin', 'developer'] },
  { id: 'tournaments', label: 'Tournaments', icon: <Trophy size={20} />, roles: ['user', 'technical_officer', 'admin', 'developer'] },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={20} />, roles: ['technical_officer', 'admin', 'developer'] },
  { id: 'match-tracker', label: 'Match Tracker', icon: <Calendar size={20} />, roles: ['technical_officer', 'admin', 'developer'] },
  { id: 'tournament-manager', label: 'Tournament Manager', icon: <Settings size={20} />, roles: ['admin', 'developer'] },
  { id: 'user-management', label: 'User Management', icon: <Users size={20} />, roles: ['admin', 'developer'] },
  { id: 'database', label: 'Database', icon: <Database size={20} />, roles: ['developer'] },
];

export function Sidebar({ isOpen, currentView, onViewChange }: SidebarProps) {
  const { user } = useAuth();

  const filteredMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <aside className={`
      fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      <div className="h-full px-3 py-4 overflow-y-auto">
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`
                  w-full flex items-center p-2 rounded-lg transition-colors group
                  ${currentView === item.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}