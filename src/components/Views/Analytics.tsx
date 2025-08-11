import React from 'react';
import { BarChart3, TrendingUp, Trophy, Users, Calendar, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MetaAnalysis } from './MetaAnalysis';
import { PlayerAnalytics } from './PlayerAnalytics';

export function Analytics() {
  const [currentView, setCurrentView] = React.useState<'overview' | 'meta' | 'player'>('overview');
  const [analytics, setAnalytics] = React.useState({
    totalTournaments: 0,
    activePlayers: 0,
    completedMatches: 0,
    upcomingEvents: 0,
    completedTournaments: [],
    activeTournaments: 0,
    upcomingTournaments: 0
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [tournamentsRes, usersRes, matchesRes] = await Promise.all([
          supabase.from('tournaments').select('*'),
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('matches').select('*')
        ]);

        const tournaments = tournamentsRes.data || [];
        const matches = matchesRes.data || [];
        
        const completedTournaments = tournaments.filter(t => t.status === 'completed');
        const activeTournaments = tournaments.filter(t => t.status === 'active').length;
        const upcomingTournaments = tournaments.filter(t => t.status === 'upcoming').length;
        const completedMatches = matches.filter(m => m.status === 'completed').length;

        setAnalytics({
          totalTournaments: tournaments.length,
          activePlayers: usersRes.count || 0,
          completedMatches,
          upcomingEvents: upcomingTournaments,
          completedTournaments,
          activeTournaments,
          upcomingTournaments
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);
  
  const [winRates, setWinRates] = React.useState([]);

  React.useEffect(() => {
    const calculateWinRates = async () => {
      try {
        const { data: matches } = await supabase
          .from('matches')
          .select('player1_name, player2_name, winner_name')
          .eq('status', 'completed');

        if (!matches) return;

        const playerStats = {};
        
        matches.forEach(match => {
          [match.player1_name, match.player2_name].forEach(player => {
            if (!playerStats[player]) {
              playerStats[player] = { wins: 0, matches: 0 };
            }
            playerStats[player].matches++;
            if (match.winner_name === player) {
              playerStats[player].wins++;
            }
          });
        });

        const rates = Object.entries(playerStats)
          .map(([player, stats]) => ({
            player,
            wins: stats.wins,
            matches: stats.matches,
            winRate: Math.round((stats.wins / stats.matches) * 100)
          }))
          .sort((a, b) => b.winRate - a.winRate)
          .slice(0, 4);

        setWinRates(rates);
      } catch (error) {
        console.error('Error calculating win rates:', error);
      }
    };

    calculateWinRates();
  }, []);

  if (currentView === 'meta') {
    return <MetaAnalysis />;
  }

  if (currentView === 'player') {
    return <PlayerAnalytics />;
  }

  const stats = [
    { icon: Trophy, label: 'Total Tournaments', value: analytics.totalTournaments, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { icon: Users, label: 'Active Players', value: analytics.activePlayers, color: 'text-green-600', bgColor: 'bg-green-100' },
    { icon: Target, label: 'Completed Matches', value: analytics.completedMatches, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { icon: Calendar, label: 'Upcoming Events', value: analytics.upcomingEvents, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  ];

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tournament Analytics</h1>
            <p className="text-gray-600">Comprehensive tournament and player statistics</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setCurrentView('overview')}
              className={`px-4 py-2 rounded-md transition-colors ${
                currentView === 'overview' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setCurrentView('meta')}
              className={`px-4 py-2 rounded-md transition-colors ${
                currentView === 'meta' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Meta Analysis
            </button>
            <button
              onClick={() => setCurrentView('player')}
              className={`px-4 py-2 rounded-md transition-colors ${
                currentView === 'player' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Player Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor} ${stat.color}`}>
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
        {/* Tournament Status Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="mr-2" size={24} />
            Tournament Status
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Completed</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${analytics.totalTournaments > 0 ? (analytics.completedTournaments.length / analytics.totalTournaments) * 100 : 0}%` }}></div>
                </div>
                <span className="text-sm font-medium">{analytics.completedTournaments.length}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Active</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${analytics.totalTournaments > 0 ? (analytics.activeTournaments / analytics.totalTournaments) * 100 : 0}%` }}></div>
                </div>
                <span className="text-sm font-medium">{analytics.activeTournaments}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Upcoming</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${analytics.totalTournaments > 0 ? (analytics.upcomingTournaments / analytics.totalTournaments) * 100 : 0}%` }}></div>
                </div>
                <span className="text-sm font-medium">{analytics.upcomingTournaments}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Players Win Rates */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="mr-2" size={24} />
            Top Player Win Rates
          </h2>
          <div className="space-y-4">
            {winRates.map((player, index) => (
              <div key={player.player} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{player.player}</p>
                    <p className="text-sm text-gray-600">{player.wins}/{player.matches} matches</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-gray-900">{player.winRate}%</p>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${player.winRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Match Statistics */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Match Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {analytics.completedMatches}
            </div>
            <p className="text-gray-600">Completed Matches</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              0
            </div>
            <p className="text-gray-600">Ongoing Matches</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              0
            </div>
            <p className="text-gray-600">Scheduled Matches</p>
          </div>
        </div>
      </div>
    </div>
  );
}