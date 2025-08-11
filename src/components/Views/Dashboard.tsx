import React from 'react';
import { Trophy, Users, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = React.useState({
    totalTournaments: 0,
    activePlayers: 0,
    upcomingEvents: 0,
    completedMatches: 0
  });
  const [upcomingTournaments, setUpcomingTournaments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [tournamentsRes, usersRes, matchesRes] = await Promise.all([
          supabase.from('tournaments').select('*'),
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('matches').select('*', { count: 'exact', head: true })
        ]);

        const tournaments = tournamentsRes.data || [];
        const upcoming = tournaments.filter(t => t.status === 'upcoming').slice(0, 3);
        
        setUpcomingTournaments(upcoming);
        setStats({
          totalTournaments: tournaments.length,
          activePlayers: usersRes.count || 0,
          upcomingEvents: tournaments.filter(t => t.status === 'upcoming').length,
          completedMatches: matchesRes.count || 0
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statsDisplay = [
    { icon: Trophy, label: 'Total Tournaments', value: stats.totalTournaments, color: 'text-blue-600' },
    { icon: Users, label: 'Total Community Players', value: stats.activePlayers, color: 'text-green-600' },
    { icon: Calendar, label: 'Upcoming Events', value: stats.upcomingEvents, color: 'text-orange-600' },
    { icon: TrendingUp, label: 'Completed Matches', value: stats.completedMatches, color: 'text-purple-600' },
  ];

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Demo Mode Banner */}
      {user?.id.startsWith('guest-') && (
        <div className="mb-6 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">🎭 Demo Mode Active</h3>
              <p className="text-purple-100">
                You're currently viewing as: <span className="font-semibold capitalize">{user.role.replace('_', ' ')}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-200">
                Switch roles using the demo button in the header
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-gray-600">
          {user?.id.startsWith('guest-') 
            ? `Check out the latest news and announcements, and register in upcoming tournaments!`
            : "You can also check your player stats at the left."
          }
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsDisplay.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg bg-gray-100 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Tournaments */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Tournaments</h2>
          <div className="space-y-4">
            {upcomingTournaments.map((tournament) => (
              <div key={tournament.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <h3 className="font-semibold text-gray-900">{tournament.name}</h3>
                <p className="text-sm text-gray-600">{new Date(tournament.tournament_date).toLocaleDateString()} • {tournament.location}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">
                    {tournament.currentParticipants}/{tournament.maxParticipants} registered
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {tournament.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Status</h2>
          <div className="text-center py-8">
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <p className="text-gray-600">All systems operational</p>
            <p className="text-sm text-gray-500 mt-2">Connected to Supabase database</p>
          </div>
        </div>
      </div>
    </div>
  );
}