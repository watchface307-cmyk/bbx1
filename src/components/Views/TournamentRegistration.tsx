import React, { useState } from 'react';
import { X, Plus, Trash2, Save, Zap, Shield, Clock, Activity, ShieldCheck, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Tournament, BladePart, RatchetPart, BitPart, LockchipPart, AssistBladePart, BeybladeStats } from '../../types';

interface TournamentRegistrationProps {
  tournament: Tournament;
  onClose: () => void;
  onSubmit: (playerName: string, beyblades: any[]) => void;
}

interface BeybladeForm {
  id: string;
  bladeLine: 'Basic' | 'Unique' | 'Custom' | 'X-Over' | '';
  parts: { 
    [key: string]: BladePart | RatchetPart | BitPart | LockchipPart | AssistBladePart;
  };
}

export function TournamentRegistration({ tournament, onClose, onSubmit }: TournamentRegistrationProps) {
  const { user } = useAuth();
  const [playerName, setPlayerName] = useState('');
  const [paymentMode, setPaymentMode] = useState<'free' | 'cash' | 'gcash' | 'bank_transfer'>('free');
  const [beyblades, setBeyblades] = useState<BeybladeForm[]>([
    { id: '1', bladeLine: '', parts: {} }
  ]);
  const [partsData, setPartsData] = useState<{
    blades: BladePart[];
    ratchets: RatchetPart[];
    bits: BitPart[];
    lockchips: LockchipPart[];
    assistBlades: AssistBladePart[];
  }>({
    blades: [],
    ratchets: [],
    bits: [],
    lockchips: [],
    assistBlades: []
  });
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [partsError, setPartsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch parts data from Supabase
  const fetchPartsData = async () => {
    setIsLoadingParts(true);
    setPartsError(null);
    
    try {
      const [bladesRes, ratchetsRes, bitsRes, lockchipsRes, assistBladesRes] = await Promise.all([
        supabase.from('Beyblade - Blades').select('*'),
        supabase.from('Beyblade - Ratchets').select('*'),
        supabase.from('Beyblade - Bit').select('*'),
        supabase.from('Beyblade - Lockchips').select('*'),
        supabase.from('Beyblade - Assist Blade').select('*')
      ]);

      // Check for errors
      if (bladesRes.error) throw bladesRes.error;
      if (ratchetsRes.error) throw ratchetsRes.error;
      if (bitsRes.error) throw bitsRes.error;
      if (lockchipsRes.error) throw lockchipsRes.error;
      if (assistBladesRes.error) throw assistBladesRes.error;

      setPartsData({
        blades: bladesRes.data || [],
        ratchets: ratchetsRes.data || [],
        bits: bitsRes.data || [],
        lockchips: lockchipsRes.data || [],
        assistBlades: assistBladesRes.data || []
      });
    } catch (error) {
      console.error('Error fetching parts data:', error);
      setPartsError('Failed to load Beyblade parts. Please try again.');
    } finally {
      setIsLoadingParts(false);
    }
  };

  // Fetch parts data when component mounts
  React.useEffect(() => {
    fetchPartsData();
  }, []);

  const getRequiredParts = (bladeLine: BeybladeForm['bladeLine']): string[] => {
    switch (bladeLine) {
      case 'Basic':
      case 'Unique':
      case 'X-Over':
        return ['Blade', 'Ratchet', 'Bit'];
      case 'Custom':
        return ['Lockchip', 'Main Blade', 'Assist Blade', 'Ratchet', 'Bit'];
      default:
        return [];
    }
  };

  const getPartOptions = (bladeLine: BeybladeForm['bladeLine'], partType: string) => {
    if (!bladeLine) return [];
    
    let options: any[] = [];
    
    switch (partType) {
      case 'Blade':
      case 'Main Blade':
        options = partsData.blades.filter(blade => blade.Line === bladeLine);
        break;
      case 'Ratchet':
        options = partsData.ratchets;
        break;
      case 'Bit':
        options = partsData.bits;
        break;
      case 'Lockchip':
        options = partsData.lockchips;
        break;
      case 'Assist Blade':
        options = partsData.assistBlades;
        break;
      default:
        options = [];
    }
    
    // Sort options alphabetically by display name
    return options.sort((a, b) => {
      const aName = getPartDisplayName(a, partType);
      const bName = getPartDisplayName(b, partType);
      return aName.localeCompare(bName);
    });
  };

  const getPartDisplayName = (part: any, partType: string): string => {
    switch (partType) {
      case 'Blade':
      case 'Main Blade':
        return (part as BladePart).Blades;
      case 'Ratchet':
        return (part as RatchetPart).Ratchet;
      case 'Bit':
        return `${(part as BitPart).Bit} (${(part as BitPart).Shortcut})`;
      case 'Lockchip':
        return (part as LockchipPart).Lockchip;
      case 'Assist Blade':
        return `${(part as AssistBladePart)['Assist Blade Name']} (${(part as AssistBladePart)['Assist Blade']})`;
      default:
        return '';
    }
  };

  const generateBeybladeName = (bladeLine: BeybladeForm['bladeLine'], parts: { [key: string]: any }): string => {
    if (!bladeLine) return '';
    
    const requiredParts = getRequiredParts(bladeLine);
    const hasAllParts = requiredParts.every(partType => parts[partType]);
    
    if (!hasAllParts) return '';

    if (bladeLine === 'Custom') {
      const lockchip = parts['Lockchip']?.Lockchip || '';
      const mainBlade = parts['Main Blade']?.Blades || '';
      const assistBlade = parts['Assist Blade']?.['Assist Blade'] || '';
      const ratchet = parts['Ratchet']?.Ratchet || '';
      const bit = parts['Bit']?.Shortcut || '';
      
      return `${lockchip}${mainBlade} ${assistBlade}${ratchet}${bit}`;
    } else {
      const blade = parts['Blade']?.Blades || '';
      const ratchet = parts['Ratchet']?.Ratchet || '';
      const bit = parts['Bit']?.Shortcut || '';
      
      return `${blade} ${ratchet}${bit}`;
    }
  };

  const calculateBeybladeStats = (parts: { [key: string]: any }): BeybladeStats => {
    let stats: BeybladeStats = {
      attack: 0,
      defense: 0,
      stamina: 0,
      dash: 0,
      burstRes: 0
    };

    Object.values(parts).forEach((part: any) => {
      if (part) {
        stats.attack += part.Attack || 0;
        stats.defense += part.Defense || 0;
        stats.stamina += part.Stamina || 0;
        stats.dash += part.Dash || 0;
        stats.burstRes += part['Burst Res'] || 0;
      }
    });

    return stats;
  };

  const addBeyblade = () => {
    if (beyblades.length < tournament.beyblades_per_player) {
      setBeyblades([
        ...beyblades,
        { id: Date.now().toString(), bladeLine: '', parts: {} }
      ]);
    } else {
      alert(`Maximum ${tournament.beyblades_per_player} Beyblades allowed for this tournament.`);
    }
  };

  const removeBeyblade = (id: string) => {
    if (beyblades.length > 1) {
      setBeyblades(beyblades.filter(b => b.id !== id));
    }
  };

  const updateBeyblade = (id: string, field: keyof BeybladeForm, value: any) => {
    setBeyblades(beyblades.map(b => {
      if (b.id === id) {
        if (field === 'bladeLine') {
          return { ...b, [field]: value, parts: {} };
        }
        return { ...b, [field]: value };
      }
      return b;
    }));
  };

  const updatePart = (beybladeId: string, partType: string, selectedPart: any) => {
    setBeyblades(beyblades.map(b => {
      if (b.id === beybladeId) {
        return {
          ...b,
          parts: { ...b.parts, [partType]: selectedPart }
        };
      }
      return b;
    }));
  };

  const isFormValid = () => {
    if (!playerName.trim()) return false;
    if (!paymentMode) return false;
    return beyblades.every(beyblade => {
      if (!beyblade.bladeLine) return false;
      const requiredParts = getRequiredParts(beyblade.bladeLine);
      return requiredParts.every(partType => beyblade.parts[partType]);
    });
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      alert('Please fill in all required fields to register for the tournament.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Save registration to Supabase
      const { data: registration, error: registrationError } = await supabase
        .from('tournament_registrations')
        .insert({
          tournament_id: tournament.id,
          player_name: playerName.trim(),
          payment_mode: paymentMode,
          status: 'confirmed'
        })
        .select()
        .single();

      if (registrationError) {
        throw new Error(`Registration failed: ${registrationError.message}`);
      }

      // Save each Beyblade
      for (const beyblade of beyblades) {
        const beybladeName = generateBeybladeName(beyblade.bladeLine, beyblade.parts);
        
        // Insert Beyblade
        const { data: beybladeData, error: beybladeError } = await supabase
          .from('tournament_beyblades')
          .insert({
            registration_id: registration.id,
            beyblade_name: beybladeName,
            blade_line: beyblade.bladeLine
          })
          .select()
          .single();

        if (beybladeError) {
          throw new Error(`Beyblade registration failed: ${beybladeError.message}`);
        }

        // Insert Beyblade parts
        const partsToInsert = Object.entries(beyblade.parts).map(([partType, partData]) => ({
          beyblade_id: beybladeData.id,
          part_type: partType,
          part_name: getPartDisplayName(partData, partType),
          part_data: partData
        }));

        const { error: partsError } = await supabase
          .from('tournament_beyblade_parts')
          .insert(partsToInsert);

        if (partsError) {
          throw new Error(`Parts registration failed: ${partsError.message}`);
        }
      }

      // Success message
      alert(`Successfully registered ${playerName} for ${tournament.name}! Registration ID: ${registration.id}`);

      onSubmit(playerName, beyblades);
    } catch (error) {
      console.error('Registration error:', error);
      alert(`Failed to register for tournament: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBladeLineColor = (bladeLine: string) => {
    switch (bladeLine) {
      case 'Basic': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Unique': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Custom': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'X-Over': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatIcon = (stat: string) => {
    switch (stat) {
      case 'attack': return <Zap size={12} className="text-red-500" />;
      case 'defense': return <Shield size={12} className="text-blue-500" />;
      case 'stamina': return <Clock size={12} className="text-green-500" />;
      case 'dash': return <Activity size={12} className="text-yellow-500" />;
      case 'burstRes': return <ShieldCheck size={12} className="text-purple-500" />;
      default: return null;
    }
  };

  const getStatColor = (stat: string) => {
    switch (stat) {
      case 'attack': return 'bg-red-500';
      case 'defense': return 'bg-blue-500';
      case 'stamina': return 'bg-green-500';
      case 'dash': return 'bg-yellow-500';
      case 'burstRes': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const StatBar = ({ stats }: { stats: BeybladeStats }) => {
    const getMaxStat = (statType: string) => {
      switch (statType) {
        case 'attack':
        case 'defense':
        case 'stamina':
          return 200;
        case 'dash':
          return 50;
        case 'burstRes':
          return 80;
        default:
          return 100;
      }
    };

    const statEntries = [
      { key: 'attack', label: 'Attack', value: stats.attack },
      { key: 'defense', label: 'Defense', value: stats.defense },
      { key: 'stamina', label: 'Stamina', value: stats.stamina },
      { key: 'dash', label: 'Dash', value: stats.dash },
      { key: 'burstRes', label: 'Burst Res', value: stats.burstRes },
    ];

    return (
      <div className="bg-gray-50 rounded-lg p-4 mt-4">
        <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
          <Activity size={16} className="mr-2" />
          Combined Stats
        </h5>
        <div className="space-y-2">
          {statEntries.map(({ key, label, value }) => (
            <div key={key} className="flex items-center">
              <div className="flex items-center w-20 text-xs font-medium text-gray-600">
                {getStatIcon(key)}
                <span className="ml-1">{label}</span>
              </div>
              <div className="flex-1 mx-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getStatColor(key)}`}
                    style={{ width: `${Math.min((value / getMaxStat(key)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="w-8 text-xs font-bold text-gray-700 text-right">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Loading Overlay */}
        {(isLoadingParts || isSubmitting) && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                {isLoadingParts ? 'Loading Beyblade parts...' : 'Registering for tournament...'}
              </p>
            </div>
          </div>
        )}

        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tournament Registration</h2>
            <p className="text-gray-600">{tournament.name}</p>
            <p className="text-sm text-gray-500">
              Configure your Beyblades for this tournament. You can register up to {tournament.beyblades_per_player} Beyblades.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Error Message */}
          {partsError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-red-600 mr-3">⚠️</div>
                <div>
                  <h3 className="text-red-800 font-medium">Error Loading Parts</h3>
                  <p className="text-red-700 text-sm mt-1">{partsError}</p>
                  <button
                    onClick={fetchPartsData}
                    className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Player Name Input */}
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <User className="text-blue-600 mr-2" size={20} />
              <h3 className="text-lg font-semibold text-blue-900">Player Information</h3>
            </div>
            <div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>No account required!</strong> Simply provide your blader name and Beyblade details to register for this tournament. 
                Your registration will be saved for tournament organizers.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Player Name *
                </label>
                <input
                  type="text"
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your player name for this tournament"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is your blader name that will appear in tournament brackets and match results.
                </p>
              </div>

              <div>
                <label htmlFor="paymentMode" className="block text-sm font-medium text-gray-700 mb-2">
                  Mode of Payment *
                </label>
                <select
                  id="paymentMode"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="free">Free Entry</option>
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {paymentMode === 'free' 
                    ? 'This tournament has no entry fee.' 
                    : paymentMode === 'cash'
                    ? 'Pay at the venue on tournament day.'
                    : paymentMode === 'gcash'
                    ? 'Payment details will be provided after registration.'
                    : 'Bank details will be provided after registration.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          {paymentMode !== 'free' && (
            <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-2">
                  <span className="text-white text-sm font-bold">₱</span>
                </div>
                <h3 className="text-lg font-semibold text-yellow-900">Payment Information</h3>
              </div>
              <div className="bg-white rounded-lg p-4 border border-yellow-200">
                {paymentMode === 'cash' && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Cash Payment</h4>
                    <p className="text-gray-700 text-sm">
                      Please bring the exact tournament entry fee on the day of the tournament. 
                      Payment will be collected during registration at the venue.
                    </p>
                  </div>
                )}
                {paymentMode === 'gcash' && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">GCash Payment</h4>
                    <p className="text-gray-700 text-sm mb-2">
                      GCash payment details will be sent to you after registration confirmation.
                    </p>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <p><strong>GCash Number:</strong> [Will be provided]</p>
                      <p><strong>Account Name:</strong> [Will be provided]</p>
                    </div>
                  </div>
                )}
                {paymentMode === 'bank_transfer' && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Bank Transfer</h4>
                    <p className="text-gray-700 text-sm mb-2">
                      Bank transfer details will be sent to you after registration confirmation.
                    </p>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <p><strong>Bank:</strong> [Will be provided]</p>
                      <p><strong>Account Number:</strong> [Will be provided]</p>
                      <p><strong>Account Name:</strong> [Will be provided]</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-8">
            <div className="mb-8">
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
                Beyblade Registration
              </label>
              <p className="text-sm text-gray-600 mb-4">
                Configure your Beyblades for this tournament. You can register up to {tournament.beybladesPerPlayer} Beyblades.
              </p>
            </div>
            {beyblades.map((beyblade, index) => (
              <div key={beyblade.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Beyblade #{index + 1}
                  </h3>
                  {beyblades.length > 1 && (
                    <button
                      onClick={() => removeBeyblade(beyblade.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Blade Line *
                    </label>
                    <select
                      value={beyblade.bladeLine}
                      onChange={(e) => updateBeyblade(beyblade.id, 'bladeLine', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Blade Line</option>
                      <option value="Basic">Basic</option>
                      <option value="Unique">Unique</option>
                      <option value="Custom">Custom</option>
                      <option value="X-Over">X-Over</option>
                    </select>
                  </div>

                  {beyblade.bladeLine && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Generated Name
                      </label>
                      <div className="w-full border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-700 font-mono">
                        {generateBeybladeName(beyblade.bladeLine, beyblade.parts) || 'Select all parts to generate name'}
                      </div>
                    </div>
                  )}
                </div>

                {beyblade.bladeLine && (
                  <div className={`border rounded-lg p-4 ${getBladeLineColor(beyblade.bladeLine)}`}>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <span className="mr-2">{beyblade.bladeLine} Line Parts</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                        {getRequiredParts(beyblade.bladeLine).length} parts required
                      </span>
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getRequiredParts(beyblade.bladeLine).map((partType) => (
                        <div key={partType}>
                          <label className="block text-sm font-medium mb-2">
                            {partType} *
                          </label>
                          <select
                            value={beyblade.parts[partType] ? JSON.stringify(beyblade.parts[partType]) : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                const selectedPart = JSON.parse(e.target.value);
                                updatePart(beyblade.id, partType, selectedPart);
                              }
                            }}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                            disabled={isLoadingParts || !!partsError}
                          >
                            <option value="">Select {partType}</option>
                            {getPartOptions(beyblade.bladeLine, partType).map((part: any, idx) => (
                              <option key={idx} value={JSON.stringify(part)}>
                                {getPartDisplayName(part, partType)}
                              </option>
                            ))}
                          </select>
                          
                          {beyblade.parts[partType] && (
                            <div className="mt-2">
                              <div className="flex flex-wrap gap-2 text-xs">
                                {Object.entries(beyblade.parts[partType]).map(([key, value]) => {
                                  if (typeof value === 'number' && value > 0 && ['Attack', 'Defense', 'Stamina', 'Dash', 'Burst Res'].includes(key)) {
                                    return (
                                      <div key={key} className="flex items-center space-x-1 bg-white bg-opacity-50 px-2 py-1 rounded">
                                        {getStatIcon(key.toLowerCase().replace(' ', ''))}
                                        <span>{key}: {value}</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats Bar Chart */}
                {beyblade.bladeLine && Object.keys(beyblade.parts).length > 0 && (
                  <StatBar stats={calculateBeybladeStats(beyblade.parts)} />
                )}
              </div>
            ))}
          </div>

          {beyblades.length < tournament.beyblades_per_player && (
            <button
              onClick={addBeyblade}
              className="mt-6 w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus size={20} />
              <span>Add Another Beyblade ({beyblades.length}/{tournament.beyblades_per_player})</span>
            </button>
          )}

          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid() || isLoadingParts || !!partsError || isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Save size={16} />
              <span>Register for Tournament</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}