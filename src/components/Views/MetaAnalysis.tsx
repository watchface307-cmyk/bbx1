import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Target, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PartStats {
  name: string;
  full: string;
  line: string;
  used: number;
  wins: number;
  losses: number;
  winRate: number;
  wilson: number;
}

interface BuildStats {
  build: string;
  player: string;
  wins: number;
  losses: number;
  winRate: number;
  wilson: number;
}

interface MatchData {
  p1: string;
  p2: string;
  bey1: string;
  bey2: string;
  winner: string;
  finish: string;
}

export function MetaAnalysis() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [partsData, setPartsData] = useState<{
    blade: { [key: string]: PartStats };
    ratchet: { [key: string]: PartStats };
    bit: { [key: string]: PartStats };
  }>({
    blade: {},
    ratchet: {},
    bit: {}
  });
  const [matchData, setMatchData] = useState<MatchData[]>([]);
  const [selectedPartType, setSelectedPartType] = useState<'blade' | 'ratchet' | 'bit' | ''>('');
  const [selectedPartName, setSelectedPartName] = useState<string>('');
  const [buildsData, setBuildsData] = useState<BuildStats[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<{ build: string; player: string } | null>(null);
  const [buildMatches, setBuildMatches] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTournamentData();
    }
  }, [selectedTournament]);

  useEffect(() => {
    if (selectedPartType && selectedPartName && matchData.length > 0) {
      generateBuildsData();
    }
  }, [selectedPartType, selectedPartName, matchData]);

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
      // Fetch Beyblade parts data
      const [bladesRes, ratchetsRes, bitsRes] = await Promise.all([
        supabase.from('Beyblade - Blades').select('*'),
        supabase.from('Beyblade - Ratchets').select('*'),
        supabase.from('Beyblade - Bit').select('*')
      ]);

      // Initialize parts data
      const newPartsData = { blade: {}, ratchet: {}, bit: {} };

      // Process blades
      bladesRes.data?.forEach(blade => {
        newPartsData.blade[blade.Blades] = {
          name: blade.Blades,
          full: blade.Blades,
          line: blade.Line,
          used: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          wilson: 0
        };
      });

      // Process ratchets
      ratchetsRes.data?.forEach(ratchet => {
        newPartsData.ratchet[ratchet.Ratchet] = {
          name: ratchet.Ratchet,
          full: ratchet.Ratchet,
          line: '',
          used: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          wilson: 0
        };
      });

      // Process bits
      bitsRes.data?.forEach(bit => {
        newPartsData.bit[bit.Shortcut] = {
          name: bit.Shortcut,
          full: bit.Bit,
          line: '',
          used: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          wilson: 0
        };
      });

      // Fetch match results for the tournament
      const { data: matches, error: matchError } = await supabase
        .from('match_results')
        .select('*')
        .eq('tournament_id', selectedTournament);

      if (matchError) throw matchError;

      // Transform match data
      const transformedMatches: MatchData[] = (matches || []).map(match => ({
        p1: match.player1_name,
        p2: match.player2_name,
        bey1: match.player1_beyblade,
        bey2: match.player2_beyblade,
        winner: match.winner_name,
        finish: match.outcome
      }));

      setMatchData(transformedMatches);

      // Compute stats
      computeStats(newPartsData, transformedMatches);
      setPartsData(newPartsData);

    } catch (error) {
      console.error('Error fetching tournament data:', error);
    }
  };

  const parseParts = (bey: string): [string, string, string] => {
    // Get all bit keys sorted by length (longest first)
    const sortedBits = Object.keys(partsData.bit).sort((a, b) => b.length - a.length);

    for (const bit of sortedBits) {
      if (bey.endsWith(bit)) {
        const withoutBit = bey.slice(0, bey.length - bit.length).trim();
        const lastSpace = withoutBit.lastIndexOf(" ");
        if (lastSpace === -1) return ["", "", ""];
        const blade = withoutBit.slice(0, lastSpace).trim();
        const ratchet = withoutBit.slice(lastSpace + 1).trim();
        return [blade, ratchet, bit];
      }
    }
    return ["", "", ""];
  };

  const computeStats = (parts: typeof partsData, matches: MatchData[]) => {
    // Reset stats
    Object.values(parts.blade).forEach(p => { p.used = 0; p.wins = 0; p.losses = 0; });
    Object.values(parts.ratchet).forEach(p => { p.used = 0; p.wins = 0; p.losses = 0; });
    Object.values(parts.bit).forEach(p => { p.used = 0; p.wins = 0; p.losses = 0; });

    for (const match of matches) {
      const [b1Blade, b1Ratchet, b1Bit] = parseParts(match.bey1);
      const [b2Blade, b2Ratchet, b2Bit] = parseParts(match.bey2);

      // Count usage and wins/losses
      const countPart = (name: string, isWin: boolean, type: 'blade' | 'ratchet' | 'bit') => {
        if (!parts[type][name]) return;
        parts[type][name].used++;
        if (isWin) {
          parts[type][name].wins++;
        } else {
          parts[type][name].losses++;
        }
      };

      countPart(b1Blade, match.winner === match.p1, 'blade');
      countPart(b1Ratchet, match.winner === match.p1, 'ratchet');
      countPart(b1Bit, match.winner === match.p1, 'bit');

      countPart(b2Blade, match.winner === match.p2, 'blade');
      countPart(b2Ratchet, match.winner === match.p2, 'ratchet');
      countPart(b2Bit, match.winner === match.p2, 'bit');
    }

    // Calculate win rates and Wilson scores
    ['blade', 'ratchet', 'bit'].forEach(type => {
      Object.values(parts[type as keyof typeof parts]).forEach(part => {
        const total = part.wins + part.losses;
        part.winRate = total ? (part.wins / total) * 100 : 0;
        part.wilson = wilson(part.wins, total);
      });
    });
  };

  const wilson = (wins: number, total: number, z: number = 1.96): number => {
    if (total === 0) return 0;
    const phat = wins / total;
    const denom = 1 + z * z / total;
    const center = phat + z * z / (2 * total);
    const spread = z * Math.sqrt((phat * (1 - phat) + z * z / (4 * total)) / total);
    return (center - spread) / denom;
  };

  const generateBuildsData = () => {
    const builds: { [key: string]: BuildStats } = {};

    for (const match of matchData) {
      const processBey = (player: string, bey: string, isWin: boolean) => {
        const [blade, ratchet, bit] = parseParts(bey);
        const matchKey = selectedPartType === 'blade' ? blade : 
                        selectedPartType === 'ratchet' ? ratchet : bit;
        
        if (matchKey !== selectedPartName) return;

        const build = `${blade} ${ratchet}${bit}`;
        const id = `${build}_${player}`;
        
        if (!builds[id]) {
          builds[id] = { build, player, wins: 0, losses: 0, winRate: 0, wilson: 0 };
        }
        
        if (isWin) {
          builds[id].wins++;
        } else {
          builds[id].losses++;
        }
      };

      processBey(match.p1, match.bey1, match.winner === match.p1);
      processBey(match.p2, match.bey2, match.winner === match.p2);
    }

    // Calculate win rates and Wilson scores
    const buildsArray = Object.values(builds).map(build => {
      const total = build.wins + build.losses;
      build.winRate = total ? (build.wins / total) * 100 : 0;
      build.wilson = wilson(build.wins, total);
      return build;
    });

    setBuildsData(buildsArray);
  };

  const handleBuildClick = (build: string, player: string) => {
    setSelectedBuild({ build, player });
    
    const matchRows = [];
    for (const match of matchData) {
      const addMatch = (p: string, bey: string, opponent: string, opponentBey: string, winner: string) => {
        const [blade, ratchet, bit] = parseParts(bey);
        const fullBuild = `${blade} ${ratchet}${bit}`;
        if (fullBuild === build && p === player) {
          const result = p === winner ? "Win" : "Loss";
          matchRows.push({
            result,
            opponent,
            opponentBey,
            finish: match.finish || "Unknown"
          });
        }
      };

      addMatch(match.p1, match.bey1, match.p2, match.bey2, match.winner);
      addMatch(match.p2, match.bey2, match.p1, match.bey1, match.winner);
    }

    setBuildMatches(matchRows);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPartsData = (type: 'blade' | 'ratchet' | 'bit') => {
    const data = Object.values(partsData[type]).filter(p => p.used > 0);
    
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof PartStats];
      const bVal = b[sortConfig.key as keyof PartStats];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  };

  const SortableHeader = ({ children, sortKey }: { children: React.ReactNode; sortKey: string }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        )}
      </div>
    </th>
  );

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meta Analysis</h1>
        <p className="text-gray-600">Analyze Beyblade part usage and performance statistics</p>
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
          {/* Builds by Part Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Target className="mr-2" size={24} />
              Builds by Part
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Part Type</label>
                <select
                  value={selectedPartType}
                  onChange={(e) => {
                    setSelectedPartType(e.target.value as any);
                    setSelectedPartName('');
                    setBuildsData([]);
                    setSelectedBuild(null);
                    setBuildMatches([]);
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Part Type</option>
                  <option value="blade">Blade</option>
                  <option value="ratchet">Ratchet</option>
                  <option value="bit">Bit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Part Name</label>
                <select
                  value={selectedPartName}
                  onChange={(e) => setSelectedPartName(e.target.value)}
                  disabled={!selectedPartType}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select Part Name</option>
                  {selectedPartType && Object.keys(partsData[selectedPartType])
                    .filter(key => partsData[selectedPartType][key].used > 0)
                    .map(key => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                </select>
              </div>
            </div>

            {buildsData.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Builds using {selectedPartName} ({selectedPartType})
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Build</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wilson Score</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {buildsData.map((build, index) => (
                        <tr 
                          key={index} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleBuildClick(build.build, build.player)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                            {build.build}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{build.player}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{build.wins}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{build.losses}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{build.winRate.toFixed(1)}%</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{build.wilson.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-center text-sm text-gray-600 mt-4">
                  Click on a build to show all matches for that build
                </p>
              </div>
            )}

            {selectedBuild && buildMatches.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Matches for <strong>{selectedBuild.build}</strong> by <strong>{selectedBuild.player}</strong>
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opponent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opponent's Bey</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finish Type</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {buildMatches.map((match, index) => (
                        <tr key={index} className={match.result === 'Win' ? 'bg-green-50' : 'bg-red-50'}>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            match.result === 'Win' ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {match.result}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{match.opponent}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{match.opponentBey}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{match.finish}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Parts Statistics Tables */}
          <div className="space-y-8">
            {(['blade', 'ratchet', 'bit'] as const).map(partType => (
              <div key={partType} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 capitalize flex items-center">
                  <BarChart3 className="mr-2" size={24} />
                  {partType}s
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <SortableHeader sortKey="name">Name</SortableHeader>
                        <SortableHeader sortKey="used">Usage</SortableHeader>
                        <SortableHeader sortKey="wins">Wins</SortableHeader>
                        <SortableHeader sortKey="losses">Losses</SortableHeader>
                        <SortableHeader sortKey="winRate">Win Rate</SortableHeader>
                        <SortableHeader sortKey="wilson">Wilson Score</SortableHeader>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedPartsData(partType).map((part, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {part.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{part.used}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{part.wins}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{part.losses}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {part.winRate.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {part.wilson.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}