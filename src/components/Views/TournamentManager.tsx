import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Users, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Tournament } from '../../types';

interface TournamentRegistration {
  registration_id: string;
  player_name: string;
  payment_mode: string;
  registered_at: string;
  status: string;
  beyblades: Array<{
    beyblade_id: string;
    beyblade_name: string;
    blade_line: string;
    parts: any[];
  }>;
}

export function TournamentManager() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [viewingRegistrations, setViewingRegistrations] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin' || user?.role === 'developer';

  React.useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('tournament_date', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      description: '',
      tournament_date: '',
      location: '',
      max_participants: 16,
      status: 'upcoming',
      registration_deadline: '',
      prize_pool: '',
      beyblades_per_player: 3,
      players_per_team: 1
    });
  };

  const startEdit = (tournament: any) => {
    setEditingId(tournament.id);
    setFormData(tournament);
  };

  const saveChanges = async () => {
    try {
      if (isCreating) {
        const { error } = await supabase
          .from('tournaments')
          .insert([formData]);
        
        if (error) {
          console.error('Insert error:', error);
          if (error.code === '42501' || error.message.includes('RLS')) {
            alert('Permission denied. You need admin or developer role to create tournaments.');
          } else {
            alert(`Failed to create tournament: ${error.message}`);
          }
          return;
        }
      } else if (editingId) {
        const { error } = await supabase
          .from('tournaments')
          .update(formData)
          .eq('id', editingId);
        
        if (error) {
          console.error('Update error:', error);
          if (error.code === '42501' || error.message.includes('RLS') || error.code === '42883') {
            alert('Permission denied. You need admin or developer role to edit tournaments.');
          } else {
            alert(`Failed to update tournament: ${error.message}`);
          }
          return;
        }
      }

      await fetchTournaments();
      setIsCreating(false);
      setEditingId(null);
      setFormData({});
    } catch (error) {
      console.error('Error saving tournament:', error);
      alert(`Failed to save tournament: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  const saveChangesOld = () => {
    if (isCreating) {
      const newTournament = {
        ...formData,
        id: Date.now().toString(),
        current_participants: 0
      };
      setTournaments([...tournaments, newTournament]);
      setIsCreating(false);
    } else if (editingId) {
      setTournaments(tournaments.map(t => 
        t.id === editingId ? { ...t, ...formData } : t
      ));
      setEditingId(null);
    }
    setFormData({});
  };

  const cancelEdit = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({});
  };

  const viewRegistrations = async (tournamentId: string) => {
    setLoadingRegistrations(true);
    setViewingRegistrations(tournamentId);
    
    try {
      const { data, error } = await supabase
        .from('tournament_registration_details')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (error) {
        throw error;
      }

      // Group registrations by registration_id
      const groupedRegistrations: { [key: string]: TournamentRegistration } = {};
      
      data?.forEach((row: any) => {
        if (!groupedRegistrations[row.registration_id]) {
          groupedRegistrations[row.registration_id] = {
            registration_id: row.registration_id,
            player_name: row.player_name,
            payment_mode: row.payment_mode,
            registered_at: row.registered_at,
            status: row.status,
            beyblades: []
          };
        }

        if (row.beyblade_id) {
          const existingBeyblade = groupedRegistrations[row.registration_id].beyblades
            .find(b => b.beyblade_id === row.beyblade_id);
          
          if (!existingBeyblade) {
            groupedRegistrations[row.registration_id].beyblades.push({
              beyblade_id: row.beyblade_id,
              beyblade_name: row.beyblade_name,
              blade_line: row.blade_line,
              parts: row.beyblade_parts || []
            });
          }
        }
      });

      setRegistrations(Object.values(groupedRegistrations));
    } catch (error) {
      console.error('Error fetching registrations:', error);
      alert('Failed to load registrations. Please try again.');
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const deleteTournament = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament? This will also delete all associated registrations and matches. This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        if (error.code === '42501' || error.message.includes('RLS')) {
          alert('Permission denied. You need admin or developer role to delete tournaments.');
        } else {
          alert(`Failed to delete tournament: ${error.message}`);
        }
        return;
      }
      
      alert('Tournament deleted successfully!');
      await fetchTournaments();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert(`Failed to delete tournament: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tournament Manager</h1>
          <p className="text-gray-600">Create and manage tournaments</p>
        </div>
        {isAdmin && (
          <button
            onClick={startCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Create Tournament</span>
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isCreating ? 'Create New Tournament' : 'Edit Tournament'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tournament Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tournament Date</label>
              <input
                type="date"
                value={formData.tournament_date || ''}
                onChange={(e) => setFormData({...formData, tournament_date: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Deadline</label>
              <input
                type="date"
                value={formData.registration_deadline || ''}
                onChange={(e) => setFormData({...formData, registration_deadline: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label>
              <input
                type="number"
                value={formData.max_participants || ''}
                onChange={(e) => setFormData({...formData, max_participants: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prize Pool</label>
              <input
                type="text"
                value={formData.prize_pool || ''}
                onChange={(e) => setFormData({...formData, prize_pool: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., $500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beyblades per Player</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.beyblades_per_player || 3}
                onChange={(e) => setFormData({...formData, beyblades_per_player: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Players per Team</label>
              <input
                type="number"
                min="1"
                max="4"
                value={formData.players_per_team || 1}
                onChange={(e) => setFormData({...formData, players_per_team: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {!isCreating && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status || ''}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
            <button
              onClick={saveChanges}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Save size={16} />
              <span>Save</span>
            </button>
          </div>
        </div>
      )}

      {/* Tournaments List */}
      <div className="space-y-4">
        {tournaments.map((tournament) => (
          <div key={tournament.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{tournament.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(tournament.status)}`}>
                    {tournament.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-2">{tournament.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Date:</span> {new Date(tournament.tournament_date).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {tournament.location}
                  </div>
                  <div>
                    <span className="font-medium">Participants:</span> {tournament.current_participants}/{tournament.max_participants}
                  </div>
                  <div>
                    <span className="font-medium">Prize Pool:</span> {tournament.prize_pool}
                  </div>
                  <div>
                    <span className="font-medium">Beyblades/Player:</span> {tournament.beyblades_per_player}
                  </div>
                  <div>
                    <span className="font-medium">Players/Team:</span> {tournament.players_per_team}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {isAdmin && (
                  <button
                    onClick={() => startEdit(tournament)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Edit Tournament"
                  >
                    <Edit size={16} />
                  </button>
                )}
                <button
                  onClick={() => viewRegistrations(tournament.id)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                  title="View Registrations"
                >
                  <Eye size={16} />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => deleteTournament(tournament.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete Tournament"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Registration Deadline: {new Date(tournament.registration_deadline).toLocaleDateString()}</span>
                <span>Tournament ID: {tournament.id}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Registrations Modal */}
      {viewingRegistrations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Tournament Registrations</h2>
                <p className="text-gray-600">
                  {tournaments.find(t => t.id === viewingRegistrations)?.name}
                </p>
              </div>
              <button
                onClick={() => setViewingRegistrations(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {loadingRegistrations ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading registrations...</p>
                </div>
              ) : registrations.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No registrations yet for this tournament</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {registrations.map((registration) => (
                    <div key={registration.registration_id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{registration.player_name}</h3>
                          <p className="text-sm text-gray-600">
                            Registered: {new Date(registration.registered_at).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Payment: <span className="capitalize">{registration.payment_mode.replace('_', ' ')}</span>
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          registration.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          registration.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {registration.status}
                        </span>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900">Registered Beyblades:</h4>
                        {registration.beyblades.map((beyblade) => (
                          <div key={beyblade.beyblade_id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="font-medium text-gray-900">{beyblade.beyblade_name}</h5>
                              <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                                {beyblade.blade_line} Line
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-sm">
                              {beyblade.parts.map((part: any, index: number) => (
                                <div key={index} className="bg-white p-2 rounded border">
                                  <div className="font-medium text-gray-700">{part.part_type}</div>
                                  <div className="text-gray-600">{part.part_name}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}