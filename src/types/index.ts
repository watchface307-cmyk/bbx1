export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'technical_officer' | 'admin' | 'developer';
  avatar?: string;
  joinedDate: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  date: string;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
  status: 'upcoming' | 'active' | 'completed';
  registrationDeadline: string;
  prizePool?: string;
  beybladesPerPlayer: number;
  playersPerTeam: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  player1: string;
  player2: string;
  winner?: string;
  round: string;
  status: 'pending' | 'in_progress' | 'completed';
  startTime?: string;
  endTime?: string;
  score?: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  author: string;
  publishDate: string;
  category: 'announcement' | 'news' | 'tournament';
  featured: boolean;
}

export interface Analytics {
  totalTournaments: number;
  activePlayers: number;
  completedMatches: number;
  upcomingEvents: number;
}

export interface Beyblade {
  id: string;
  name: string;
  playerId: string;
  tournamentId: string;
  bladeLine: 'Basic' | 'Unique' | 'Custom' | 'X-Over';
  registeredAt: string;
}

export interface BeybladePart {
  id: string;
  beybladeId: string;
  partType: 'Blade' | 'Ratchet' | 'Bit' | 'Lockchip' | 'Main Blade' | 'Assist Blade';
  partName: string;
  partDetails?: any;
}

export interface BeybladePartOption {
  id: string;
  name: string;
  type: BeybladePart['partType'];
  bladeLine: Beyblade['bladeLine'];
  stats?: {
    attack?: number;
    defense?: number;
    stamina?: number;
  };
}

// Specific part interfaces matching Supabase tables
export interface AssistBladePart {
  'Assist Blade': string;
  'Assist Blade Name': string;
  Type: string;
  Height: string;
  Attack: number;
  Defense: number;
  Stamina: number;
}

export interface BitPart {
  Bit: string;
  Shortcut: string;
  Type: string;
  Attack: number;
  Defense: number;
  Stamina: number;
  Dash: number;
  'Burst Res': number;
}

export interface BladePart {
  Blades: string;
  Line: string;
  Type: string;
  Attack: number;
  Defense: number;
  Stamina: number;
}

export interface LockchipPart {
  Lockchip: string;
  Attack: number;
  Defense: number;
  Stamina: number;
}

export interface RatchetPart {
  Ratchet: string;
  Attack: number;
  Defense: number;
  Stamina: number;
}

export interface BeybladeStats {
  attack: number;
  defense: number;
  stamina: number;
  dash: number;
  burstRes: number;
}