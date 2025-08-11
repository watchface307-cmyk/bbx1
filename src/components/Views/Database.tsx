import React, { useState, useEffect } from 'react';
import { Database, Table, Users, Trophy, Calendar, BarChart3, Download, RefreshCw, Edit, Trash2, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface TableInfo {
  name: string;
  records: number;
  icon: React.ReactNode;
  description: string;
}

interface RegistrationWithBeyblades {
  registration_id: string;
  tournament_id: string;
  tournament_name?: string;
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

export function DatabaseView() {
  const { user } = useAuth();
  const [selectedTable, setSelectedTable] = useState<string>('tournaments');
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [viewingRegistration, setViewingRegistration] = useState<RegistrationWithBeyblades | null>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);

  // Reset state when switching tables
  React.useEffect(() => {
    setSelectedTournament(null);
    setViewingRegistration(null);
    setEditingRow(null);
    setEditData({});
  }, [selectedTable]);

  const isAdmin = user?.role === 'admin' || user?.role === 'developer';

  const fetchTableCounts = async () => {
    try {
      const [usersRes, tournamentsRes, matchesRes, registrationsRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('tournaments').select('*', { count: 'exact', head: true }),
        supabase.from('matches').select('*', { count: 'exact', head: true }),
        supabase.from('tournament_registrations').select('*', { count: 'exact', head: true })
      ]);

      setTables([
        { name: 'users', records: usersRes.count || 0, icon: <Users size={16} />, description: 'User accounts and profiles' },
        { name: 'tournaments', records: tournamentsRes.count || 0, icon: <Trophy size={16} />, description: 'Tournament information' },
        { name: 'matches', records: matchesRes.count || 0, icon: <Calendar size={16} />, description: 'Match results and schedules' },
        { name: 'registrations', records: registrationsRes.count || 0, icon: <Table size={16} />, description: 'Tournament registrations with Beyblades' }
      ]);

      // Also fetch tournaments for the registration view
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('id, name')
        .order('name');
      
      setTournaments(tournamentData || []);
    } catch (error) {
      console.error('Error fetching table counts:', error);
    }
  };

  const fetchTableData = async (tableName: string, tournamentId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let data: any[] = [];
      
      if (tableName === 'registrations' && tournamentId) {
        // Fetch registrations with their beyblades for a specific tournament
        const { data: registrationData, error } = await supabase
          .from('tournament_registration_details')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('registered_at', { ascending: false });

        if (error) throw error;

        // Group by registration_id
        const groupedData: { [key: string]: RegistrationWithBeyblades } = {};
        
        registrationData?.forEach((row: any) => {
          if (!groupedData[row.registration_id]) {
            groupedData[row.registration_id] = {
              registration_id: row.registration_id,
              tournament_id: row.tournament_id,
              tournament_name: tournaments.find(t => t.id === row.tournament_id)?.name || 'Unknown Tournament',
              player_name: row.player_name,
              payment_mode: row.payment_mode,
              registered_at: row.registered_at,
              status: row.status,
              beyblades: []
            };
          }

          if (row.beyblade_id) {
            const existingBeyblade = groupedData[row.registration_id].beyblades
              .find(b => b.beyblade_id === row.beyblade_id);
            
            if (!existingBeyblade) {
              groupedData[row.registration_id].beyblades.push({
                beyblade_id: row.beyblade_id,
                beyblade_name: row.beyblade_name,
                blade_line: row.blade_line,
                parts: row.beyblade_parts || []
              });
            }
          }
        });

        data = Object.values(groupedData);
      } else if (tableName === 'registrations' && !tournamentId) {
        // Show tournament selection instead of registrations
        data = tournaments;
      } else {
        const supabaseTableName = tableName === 'registrations' ? 'tournament_registrations' : tableName;
        const { data: fetchedData, error } = await supabase
          .from(supabaseTableName)
          .select('*')
          .order(
            tableName === 'tournaments' ? 'tournament_date' : 
            tableName === 'matches' ? 'created_at' : 
            'created_at', 
            { ascending: false }
          );

        if (error) throw error;
        data = fetchedData || [];
      }

      // Sort data alphabetically by the first text field
      if (tableName !== 'registrations' || tournamentId) {
        data.sort((a, b) => {
          const aValue = Object.values(a).find(val => typeof val === 'string') as string || '';
          const bValue = Object.values(b).find(val => typeof val === 'string') as string || '';
          return aValue.localeCompare(bValue);
        });
      }

      setTableData(data);
    } catch (error) {
      console.error('Error fetching table data:', error);
      setError(`Failed to load ${tableName} data. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchTableCounts(),
      fetchTableData(selectedTable, selectedTournament || undefined)
    ]);
    setIsRefreshing(false);
  };

  const handleExport = (tableName: string) => {
    const dataStr = JSON.stringify(tableData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tableName}_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleEdit = (row: any) => {
    setEditingRow(row.id || row.registration_id);
    setEditData({ ...row });
  };

  const handleSave = async () => {
    if (!editingRow || !isAdmin) return;

    try {
      const supabaseTableName = selectedTable === 'registrations' ? 'tournament_registrations' : selectedTable;
      const { error } = await supabase
        .from(supabaseTableName)
        .update(editData)
        .eq('id', editingRow);

      if (error) {
        console.error('Update error:', error);
        if (error.code === '42501' || error.message.includes('RLS')) {
          alert('Permission denied. You need admin or developer role to edit records.');
        } else {
          alert(`Failed to update record: ${error.message}`);
        }
        return;
      }

      setEditingRow(null);
      setEditData({});
      await fetchTableData(selectedTable);
    } catch (error) {
      console.error('Error updating row:', error);
      alert(`Failed to update record: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      return;
    }

    try {
      const supabaseTableName = selectedTable === 'registrations' ? 'tournament_registrations' : selectedTable;
      const { error } = await supabase
        .from(supabaseTableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        if (error.code === '42501' || error.message.includes('RLS')) {
          alert('Permission denied. You need admin or developer role to delete records.');
        } else {
          alert(`Failed to delete record: ${error.message}`);
        }
        return;
      }

      // Show success message
      alert('Record deleted successfully!');

      await Promise.all([
        fetchTableCounts(),
        fetchTableData(selectedTable, selectedTournament || undefined)
      ]);
    } catch (error) {
      console.error('Error deleting row:', error);
      alert(`Failed to delete record: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  const handleTournamentSelect = (tournamentId: string) => {
    setSelectedTournament(tournamentId);
    fetchTableData('registrations', tournamentId);
  };

  const handleBackToTournaments = () => {
    setSelectedTournament(null);
    fetchTableData('registrations');
  };

  const handleViewRegistration = (registration: RegistrationWithBeyblades) => {
    setViewingRegistration(registration);
  };

  useEffect(() => {
    fetchTableCounts();
  }, []);

  useEffect(() => {
    if (selectedTable === 'registrations') {
      setSelectedTournament(null);
      fetchTableData(selectedTable);
    } else {
      fetchTableData(selectedTable);
    }
  }, [selectedTable]);

  const renderTableContent = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            Loading {selectedTable === 'registrations' && selectedTournament ? 'registration' : selectedTable} data...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">⚠️</div>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => fetchTableData(selectedTable, selectedTournament || undefined)}
            className="mt-4 text-blue-600 hover:text-blue-800 underline"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (tableData.length === 0) {
      return (
        <div className="text-center py-12">
          <Database size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">
            No data available for {selectedTable === 'registrations' && selectedTournament ? 'this tournament' : selectedTable}
          </p>
        </div>
      );
    }

    if (selectedTable === 'registrations' && !selectedTournament) {
      // Show tournament selection
      return (
        <div className="space-y-4">
          <div className="text-center py-8">
            <Trophy size={48} className="mx-auto text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Tournament</h3>
            <p className="text-gray-600 mb-6">Choose a tournament to view its registrations</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tableData.map((tournament) => (
              <button
                key={tournament.id}
                onClick={() => handleTournamentSelect(tournament.id)}
                className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <h4 className="font-semibold text-gray-900 mb-1">{tournament.name}</h4>
                <p className="text-sm text-gray-600">{tournament.location}</p>
                <p className="text-sm text-gray-500">
                  {new Date(tournament.tournament_date).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (selectedTable === 'registrations' && selectedTournament) {
      // Show registrations for selected tournament
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBackToTournaments}
              className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>←</span>
              <span>Back to Tournaments</span>
            </button>
            <h3 className="text-lg font-semibold text-gray-900">
              {tournaments.find(t => t.id === selectedTournament)?.name || 'Tournament'} Registrations
            </h3>
          </div>
          
          {(tableData as RegistrationWithBeyblades[]).map((registration) => (
            <div key={registration.registration_id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{registration.player_name}</h3>
                  <p className="text-sm text-gray-600">{registration.tournament_name}</p>
                  <p className="text-sm text-gray-600">
                    Registered: {new Date(registration.registered_at).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Payment: <span className="capitalize">{registration.payment_mode?.replace('_', ' ') || 'N/A'}</span>
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    registration.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    registration.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {registration.status}
                  </span>
                  <button
                    onClick={() => handleViewRegistration(registration)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleEdit(registration)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(registration.registration_id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <strong>Beyblades:</strong> {registration.beyblades.length > 0 
                  ? registration.beyblades.map(b => b.beyblade_name).join(', ')
                  : 'No Beyblades registered'
                }
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {tableData.length > 0 && tableData[0] && Object.keys(tableData[0]).map((key) => (
                <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {key.replace(/_/g, ' ')}
                </th>
              ))}
              {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableData.map((row: any, index) => (
              <tr key={row.id || index} className="hover:bg-gray-50">
                {Object.entries(row).map(([key, value], cellIndex) => (
                  <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingRow === (row.id || row.registration_id) && isAdmin ? (
                      <input
                        type="text"
                        value={editData[key] || ''}
                        onChange={(e) => setEditData({...editData, [key]: e.target.value})}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      typeof value === 'object' && value !== null 
                        ? JSON.stringify(value) 
                        : value instanceof Date 
                        ? value.toLocaleString()
                        : String(value || '')
                    )}
                  </td>
                ))}
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {editingRow === (row.id || row.registration_id) ? (
                        <>
                          <button
                            onClick={handleSave}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingRow(null);
                              setEditData({});
                            }}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(row)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(row.id || row.registration_id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Management</h1>
          <p className="text-gray-600">Monitor and manage application data from Supabase</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => handleExport(selectedTable)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Tables List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Database size={20} className="mr-2" />
              Tables
            </h2>
            <div className="space-y-2">
              {tables.map((table) => (
                <button
                  key={table.name}
                  onClick={() => setSelectedTable(table.name)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedTable === table.name
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      {table.icon}
                      <span className="font-medium capitalize">{table.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{table.records}</span>
                  </div>
                  <p className="text-xs text-gray-600">{table.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Database Stats */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Database Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Records</span>
                <span className="font-bold">{tables.reduce((sum, table) => sum + table.records, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tables</span>
                <span className="font-bold">{tables.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Source</span>
                <span className="font-bold text-green-600">Supabase</span>
              </div>
            </div>
          </div>
        </div>

        {/* Table Data */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 capitalize">
                  {selectedTable === 'registrations' && selectedTournament 
                    ? `${tournaments.find(t => t.id === selectedTournament)?.name || 'Tournament'} Registrations`
                    : selectedTable === 'registrations' 
                    ? 'Select Tournament for Registrations'
                    : `${selectedTable} Table`
                  }
                </h2>
                <span className="text-sm text-gray-500">
                  {selectedTable === 'registrations' && !selectedTournament
                    ? `${tournaments.length} tournaments`
                    : `${tableData.length} records`
                  }
                </span>
              </div>
            </div>
            
            {renderTableContent()}
          </div>
        </div>
      </div>

      {/* Registration Details Modal */}
      {viewingRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Registration Details</h2>
                <p className="text-gray-600">{viewingRegistration.player_name}</p>
              </div>
              <button
                onClick={() => setViewingRegistration(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Player Name</label>
                  <p className="text-lg font-semibold">{viewingRegistration.player_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tournament ID</label>
                  <p className="text-lg">{viewingRegistration.tournament_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
                  <p className="text-lg capitalize">{viewingRegistration.payment_mode.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    viewingRegistration.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    viewingRegistration.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {viewingRegistration.status}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Registered Beyblades</h3>
                {viewingRegistration.beyblades.length === 0 ? (
                  <p className="text-gray-500">No Beyblades registered</p>
                ) : (
                  <div className="space-y-4">
                    {viewingRegistration.beyblades.map((beyblade) => (
                      <div key={beyblade.beyblade_id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold text-gray-900">{beyblade.beyblade_name}</h4>
                          <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {beyblade.blade_line} Line
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                          {beyblade.parts.map((part: any, index: number) => (
                            <div key={index} className="bg-gray-50 p-2 rounded border">
                              <div className="font-medium text-gray-700 text-sm">{part.part_type}</div>
                              <div className="text-gray-600 text-xs">{part.part_name}</div>
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
        </div>
      )}
    </div>
  );
}