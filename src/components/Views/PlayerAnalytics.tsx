import React, { useState, useEffect } from 'react';
import { User, Trophy, Target, TrendingUp, BarChart3, Eye, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface PlayerStats {
  name: string;
  beys: string[];
  matches: Array<{
    result: 'win' | 'loss';
    bey: string;
    outcome: string;
    opponent: string;
    opponentBey: string;
  }>;
  winFinishes: { [key: string]: number };
  loseFinishes: { [key: string]: number };
  beyStats: {
    [key: string]: {
      win: number;
      loss: number;
      finishes: { [key: string]: number };
      lossFinishes: { [key: string]: number };
      points: number;
    };
  };
  wins: number;
  losses: number;
  points: number;
}

const FINISH_TYPES = ["Spin Finish", "Burst Finish", "Over Finish", "Extreme Finish"];
const FINISH_POINTS = {
  "Spin Finish": 1,
  "Burst Finish": 2,
  "Over Finish": 2,
  "Extreme Finish": 3
};

export function PlayerAnalytics() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [players, setPlayers] = useState<{ [key: string]: PlayerStats }>({});
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentView, setCurrentView] = useState<'player' | 'matches'>('player');

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTournamentData();
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, status, tournament_date')
        .order('tournament_date', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
      
      // Auto-select first completed tournament
      const completedTournament = data?.find(t => t.status === 'completed');
      if (completedTournament) {
        setSelectedTournament(completedTournament.id);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTournamentData = async () => {
    try {
      // Fetch tournament registrations with beyblades
      const { data: registrations, error: regError } = await supabase
        .from('tournament_registrations')
        .select(`
          player_name,
          tournament_beyblades(
            beyblade_name
          )
        `)
        .eq('tournament_id', selectedTournament)
        .eq('status', 'confirmed');

      if (regError) throw regError;

      // Initialize players data
      const playersData: { [key: string]: PlayerStats } = {};
      
      registrations?.forEach(registration => {
        const playerName = registration.player_name;
        const beyblades = registration.tournament_beyblades.map((b: any) => b.beyblade_name);
        
        playersData[playerName] = {
          name: playerName,
          beys: beyblades,
          matches: [],
          winFinishes: {},
          loseFinishes: {},
          beyStats: {},
          wins: 0,
          losses: 0,
          points: 0
        };
      });

      // Fetch match results
      const { data: matches, error: matchError } = await supabase
        .from('match_results')
        .select('*')
        .eq('tournament_id', selectedTournament);

      if (matchError) throw matchError;

      // Process matches
      matches?.forEach(match => {
        const p1 = match.player1_name;
        const p2 = match.player2_name;
        const b1 = match.player1_beyblade;
        const b2 = match.player2_beyblade;
        const fullOutcome = match.outcome;
        const finishType = fullOutcome.split(" (")[0].trim();
        const winner = match.winner_name;
        const loser = winner === p1 ? p2 : p1;
        const winBey = winner === p1 ? b1 : b2;
        const loseBey = winner === p1 ? b2 : b1;
        const pts = FINISH_POINTS[finishType as keyof typeof FINISH_POINTS] || 0;

        if (!playersData[winner] || !playersData[loser]) return;

        // Update winner stats
        playersData[winner].wins++;
        playersData[winner].points += pts;
        playersData[winner].winFinishes[finishType] = (playersData[winner].winFinishes[finishType] || 0) + 1;
        playersData[winner].matches.push({
          result: "win",
          bey: winBey,
          outcome: finishType,
          opponent: loser,
          opponentBey: loseBey
        });

        // Update loser stats
        playersData[loser].losses++;
        playersData[loser].loseFinishes[finishType] = (playersData[loser].loseFinishes[finishType] || 0) + 1;
        playersData[loser].matches.push({
          result: "loss",
          bey: loseBey,
          outcome: finishType,
          opponent: winner,
          opponentBey: winBey
        });

        // Initialize beyblade stats if needed
        if (!playersData[winner].beyStats[winBey]) {
          playersData[winner].beyStats[winBey] = { win: 0, loss: 0, finishes: {}, lossFinishes: {}, points: 0 };
        }
        if (!playersData[loser].beyStats[loseBey]) {
          playersData[loser].beyStats[loseBey] = { win: 0, loss: 0, finishes: {}, lossFinishes: {}, points: 0 };
        }

        // Update beyblade stats
        playersData[winner].beyStats[winBey].win++;
        playersData[winner].beyStats[winBey].points += pts;
        playersData[winner].beyStats[winBey].finishes[finishType] = 
          (playersData[winner].beyStats[winBey].finishes[finishType] || 0) + 1;

        playersData[loser].beyStats[loseBey].loss++;
        playersData[loser].beyStats[loseBey].lossFinishes[finishType] = 
          (playersData[loser].beyStats[loseBey].lossFinishes[finishType] || 0) + 1;
      });

      setPlayers(playersData);
      setSelectedPlayer('');
      setCurrentView('player');
      setShowAdvanced(false);

    } catch (error) {
      console.error('Error fetching tournament data:', error);
    }
  };

  const getTopFinish = (finishMap: { [key: string]: number }): string => {
    return Object.entries(finishMap).reduce((top, [finish, count]) => 
      count > top[1] ? [finish, count] : top, ["", -1])[0] || "N/A";
  };

  const getMostValuableBey = (player: PlayerStats): { bey: string; reason: string } => {
    let mvb = "";
    let maxPts = -1;
    
    for (const bey of player.beys) {
      const stat = player.beyStats[bey] || { points: 0, win: 0 };
      if (stat.points > maxPts) {
        maxPts = stat.points;
        mvb = bey;
      }
    }
    
    const stat = player.beyStats[mvb];
    const reason = stat ? `${stat.win} wins, ${stat.points} pts` : "No matches";
    
    return { bey: mvb || "N/A", reason };
  };

  const getRadarData = (winFinishes: { [key: string]: number }) => {
    const data = FINISH_TYPES.map(finish => winFinishes[finish] || 0);
    
    return {
      labels: FINISH_TYPES,
      datasets: [{
        label: 'Finish Bias',
        data,
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
        borderColor: '#2196f3',
        pointBackgroundColor: '#2196f3',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#2196f3'
      }]
    };
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        suggestedMin: 0,
        ticks: {
          stepSize: 1
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  };

  const renderPlayerCard = () => {
    if (!selectedPlayer || !players[selectedPlayer]) return null;

    const player = players[selectedPlayer];
    const { bey: mvb, reason: mvbReason } = getMostValuableBey(player);
    const totalMatches = player.wins + player.losses;
    const winRate = totalMatches ? ((player.wins / totalMatches) * 100).toFixed(1) : "0.0";
    const pointsPerMatch = totalMatches ? (player.points / totalMatches).toFixed(2) : "0.00";

    return (
      <div className="space-y-6">
        {/* Player Summary Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{player.name}</h2>
              <p className="text-gray-600">Tournament Player</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Most Valuable Bey</p>
                <p className="text-lg font-semibold text-gray-900">{mvb}</p>
                <p className="text-sm text-gray-500">{mvbReason}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">Most Common Finish (Win)</p>
                <p className="text-lg font-semibold text-green-600">{getTopFinish(player.winFinishes)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">Most Common Finish (Loss)</p>
                <p className="text-lg font-semibold text-red-600">{getTopFinish(player.loseFinishes)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-lg font-semibold text-gray-900">
                  {winRate}% ({player.wins} of {totalMatches}) — {pointsPerMatch} pts/match
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <div style={{ width: '300px', height: '300px' }}>
                <Radar data={getRadarData(player.winFinishes)} options={radarOptions} />
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4 mt-6">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
            </button>
            <button
              onClick={() => setCurrentView('matches')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Eye size={16} />
              <span>Show All Matches</span>
            </button>
          </div>
        </div>

        {/* Advanced Stats */}
        {showAdvanced && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Advanced Statistics</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Win by Finish</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beyblade</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Spin</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Burst</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Over</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Extreme</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Wins</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {player.beys.map(bey => {
                        const stat = player.beyStats[bey] || { finishes: {}, win: 0, points: 0 };
                        return (
                          <tr key={bey} className="bg-green-50">
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{bey}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{stat.finishes["Spin Finish"] || 0}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{stat.finishes["Burst Finish"] || 0}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{stat.finishes["Over Finish"] || 0}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{stat.finishes["Extreme Finish"] || 0}</td>
                            <td className="px-4 py-2 text-sm font-semibold text-gray-900">{stat.win}</td>
                            <td className="px-4 py-2 text-sm font-semibold text-gray-900">{stat.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Loss by Finish</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beyblade</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Spin</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Burst</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Over</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Extreme</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Losses</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Points Given</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {player.beys.map(bey => {
                        const stat = player.beyStats[bey] || { lossFinishes: {}, loss: 0 };
                        const lossFinishes = stat.lossFinishes || {};
                        const pointsGiven = (lossFinishes["Spin Finish"] || 0) * 1 + 
                                          (lossFinishes["Burst Finish"] || 0) * 2 + 
                                          (lossFinishes["Over Finish"] || 0) * 2 + 
                                          (lossFinishes["Extreme Finish"] || 0) * 3;
                        return (
                          <tr key={bey} className="bg-red-50">
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{bey}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{lossFinishes["Spin Finish"] || 0}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{lossFinishes["Burst Finish"] || 0}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{lossFinishes["Over Finish"] || 0}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{lossFinishes["Extreme Finish"] || 0}</td>
                            <td className="px-4 py-2 text-sm font-semibold text-gray-900">{stat.loss}</td>
                            <td className="px-4 py-2 text-sm font-semibold text-gray-900">{pointsGiven}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAllMatches = () => {
    if (!selectedPlayer || !players[selectedPlayer]) return null;

    const player = players[selectedPlayer];

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            All Matches for <strong>{player.name}</strong>
          </h2>
          <button
            onClick={() => setCurrentView('player')}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Back to Player Stats</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Bey</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opponent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opponent's Bey</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finish</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {player.matches.map((match, index) => (
                <tr key={index} className={match.result === 'win' ? 'bg-green-50' : 'bg-red-50'}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    match.result === 'win' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {match.result === 'win' ? 'Win' : 'Loss'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{match.bey}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{match.opponent}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{match.opponentBey || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{match.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Player Performance Analysis</h1>
        <p className="text-gray-600">Analyze individual player statistics and performance</p>
      </div>

      {/* Tournament Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Tournament Selection</h2>
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Tournament
          </label>
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Tournament --</option>
            {tournaments.map(tournament => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name} ({tournament.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedTournament && (
        <>
          {/* Player Selection */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <User className="mr-2" size={24} />
              Player Selection
            </h2>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Player
              </label>
              <select
                value={selectedPlayer}
                onChange={(e) => {
                  setSelectedPlayer(e.target.value);
                  setCurrentView('player');
                  setShowAdvanced(false);
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Player --</option>
                {Object.keys(players).sort().map(playerName => (
                  <option key={playerName} value={playerName}>
                    {playerName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Player Analytics */}
          {selectedPlayer && (
            currentView === 'player' ? renderPlayerCard() : renderAllMatches()
          )}
        </>
      )}
    </div>
  );
}