import React from 'react';
import { useAuth } from '../../context/AuthContext';

export function DeveloperLogin() {
  const { updateUserRole } = useAuth();

  const demoRoles = [
    { role: 'user' as const, label: 'User', description: 'Basic user with tournament participation access', color: 'bg-gray-500' },
    { role: 'technical_officer' as const, label: 'Technical Officer', description: 'Can view analytics and manage matches', color: 'bg-blue-500' },
    { role: 'admin' as const, label: 'Admin', description: 'Can manage tournaments and users', color: 'bg-red-500' },
    { role: 'developer' as const, label: 'Developer', description: 'Full system access including database', color: 'bg-purple-500' }
  ];

  const handleDemoLogin = (role: 'user' | 'technical_officer' | 'admin' | 'developer') => {
    updateUserRole(role);
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Demo Mode</h3>
        <p className="text-sm text-gray-600">
          Select a role to demo the system with different permission levels
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {demoRoles.map((demo) => (
          <button
            key={demo.role}
            onClick={() => handleDemoLogin(demo.role)}
            className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${demo.color}`}></div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-blue-700">
                  Demo as {demo.label}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {demo.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <div className="text-yellow-600 mr-2">⚠️</div>
          <div className="text-sm text-yellow-800">
            <strong>Demo Mode:</strong> This is for demonstration purposes only. 
            In demo mode, you're using a guest account with simulated permissions.
          </div>
        </div>
      </div>
    </div>
  );
}