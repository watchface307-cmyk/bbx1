import React, { useState } from 'react';
import { Menu, X, User, LogOut, Settings, TestTube } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

export function Header({ onMenuToggle, isMenuOpen }: HeaderProps) {
  const { user, logout, updateUserRole } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500';
      case 'technical_officer': return 'bg-blue-500';
      case 'developer': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const demoRoles = [
    { role: 'user' as const, label: 'User', color: 'bg-gray-500' },
    { role: 'technical_officer' as const, label: 'Technical Officer', color: 'bg-blue-500' },
    { role: 'admin' as const, label: 'Admin', color: 'bg-red-500' },
    { role: 'developer' as const, label: 'Developer', color: 'bg-purple-500' }
  ];

  const handleDemoRoleChange = (role: 'user' | 'technical_officer' | 'admin' | 'developer') => {
    updateUserRole(role);
    setShowDemoMenu(false);
  };
  return (
    <header className="bg-blue-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-md hover:bg-blue-800 transition-colors"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center font-bold">
                B
              </div>
              <h1 className="text-xl font-bold">Beyblade Community</h1>
            </div>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              {/* Demo Role Switcher - only show for guest users */}
              {user.id.startsWith('guest-') && (
                <div className="relative">
                  <button
                    onClick={() => setShowDemoMenu(!showDemoMenu)}
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-blue-800 transition-colors"
                    title="Switch Demo Role"
                  >
                    <TestTube size={20} />
                    <span className="hidden sm:block text-sm">Demo</span>
                  </button>

                  {showDemoMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white text-gray-800 rounded-md shadow-lg z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 border-b">
                          <p className="font-medium text-sm">Switch Demo Role</p>
                          <p className="text-xs text-gray-600">Current: {user.role.replace('_', ' ')}</p>
                        </div>
                        {demoRoles.map((demo) => (
                          <button
                            key={demo.role}
                            onClick={() => handleDemoRoleChange(demo.role)}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 ${
                              user.role === demo.role ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full ${demo.color}`}></div>
                            <span className="text-sm">{demo.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-blue-800 transition-colors"
                >
                  <User size={20} />
                  <span className="hidden sm:block">{user.username}</span>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${getRoleColor(user.role)}`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-md shadow-lg z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b">
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.id.startsWith('guest-') && (
                          <p className="text-xs text-purple-600 font-medium">Demo Mode</p>
                        )}
                      </div>
                      <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2">
                        <Settings size={16} />
                        <span>Settings</span>
                      </button>
                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 text-red-600"
                      >
                        <LogOut size={16} />
                        <span>{user.id.startsWith('guest-') ? 'Exit Demo' : 'Logout'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Click outside handlers */}
      {(showUserMenu || showDemoMenu) && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => {
            setShowUserMenu(false);
            setShowDemoMenu(false);
          }}
        />
      )}
    </header>
  );
}