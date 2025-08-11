# Mobile Match Tracker - Supabase Integration Guide

## Overview
This document provides complete specifications for integrating the mobile match tracker app with the existing Supabase database. The mobile app will replicate the functionality of the web-based tracker while using Supabase for all data operations.

## Database Schema Overview

### Core Tables for Match Tracker
The mobile app will interact with these primary tables:

1. **`tournament_registrations`** - Player registration data
2. **`tournament_beyblades`** - Beyblade information per registration
3. **`tournament_beyblade_parts`** - Individual parts for each Beyblade
4. **`tournaments`** - Tournament information
5. **`matches`** - Match results (NEW - needs to be created)
6. **`match_sessions`** - Complete match session data (NEW - needs to be created)

---

## 1. Player Data Retrieval

### 1.1 Get All Players for Tournament
**Endpoint**: Query `tournament_registrations` table
**Purpose**: Load player dropdown options

```sql
SELECT DISTINCT player_name 
FROM tournament_registrations 
WHERE tournament_id = 'TOURNAMENT_ID' 
  AND status = 'confirmed'
ORDER BY player_name ASC;
```

**Supabase JavaScript:**
```javascript
const { data: players, error } = await supabase
  .from('tournament_registrations')
  .select('player_name')
  .eq('tournament_id', tournamentId)
  .eq('status', 'confirmed')
  .order('player_name', { ascending: true });

// Transform to unique player names
const uniquePlayers = [...new Set(players.map(p => p.player_name))];
```

### 1.2 Get Player's Beyblades
**Endpoint**: Query `tournament_beyblades` with registration join
**Purpose**: Load Beyblade data for selected players

```sql
SELECT 
  tb.beyblade_name,
  tb.blade_line,
  tb.id as beyblade_id
FROM tournament_beyblades tb
JOIN tournament_registrations tr ON tr.id = tb.registration_id
WHERE tr.tournament_id = 'TOURNAMENT_ID' 
  AND tr.player_name = 'PLAYER_NAME'
  AND tr.status = 'confirmed'
ORDER BY tb.registered_at ASC;
```

**Supabase JavaScript:**
```javascript
const getPlayerBeyblades = async (tournamentId, playerName) => {
  const { data, error } = await supabase
    .from('tournament_beyblades')
    .select(`
      beyblade_name,
      blade_line,
      id,
      tournament_registrations!inner(
        tournament_id,
        player_name,
        status
      )
    `)
    .eq('tournament_registrations.tournament_id', tournamentId)
    .eq('tournament_registrations.player_name', playerName)
    .eq('tournament_registrations.status', 'confirmed')
    .order('registered_at', { ascending: true });

  if (error) throw error;
  return data;
};
```

### 1.3 Complete Player Data Structure
**Expected Format for Mobile App:**
```javascript
const playerData = {
  "PlayerName1": ["Beyblade1", "Beyblade2", "Beyblade3"],
  "PlayerName2": ["Beyblade1", "Beyblade2", "Beyblade3"],
  // ... more players
};
```

**Implementation Function:**
```javascript
const loadPlayerData = async (tournamentId) => {
  try {
    // Get all registrations with their beyblades
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select(`
        player_name,
        tournament_beyblades(
          beyblade_name
        )
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'confirmed')
      .order('player_name', { ascending: true });

    if (error) throw error;

    // Transform to expected format
    const playerData = {};
    data.forEach(registration => {
      const playerName = registration.player_name;
      const beyblades = registration.tournament_beyblades.map(b => b.beyblade_name);
      playerData[playerName] = beyblades;
    });

    return playerData;
  } catch (error) {
    console.error('Error loading player data:', error);
    throw error;
  }
};
```

---

## 2. Tournament Information

### 2.1 Get Tournament Details
**Purpose**: Load tournament-specific settings and information

```javascript
const getTournamentInfo = async (tournamentId) => {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (error) throw error;
  return data;
};
```

### 2.2 Key Tournament Fields for Mobile App
- `name` - Tournament name for display
- `beyblades_per_player` - Number of Beyblades each player can use
- `players_per_team` - Team configuration
- `status` - Tournament status (should be 'active' for match tracking)

---

## 3. Match Results Storage

### 3.1 Required New Tables
**Note**: These tables need to be created in Supabase as they don't exist yet.

#### Table: `match_results`
```sql
CREATE TABLE match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  player1_name text NOT NULL,
  player2_name text NOT NULL,
  player1_beyblade text NOT NULL,
  player2_beyblade text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN (
    'Over Finish (2 pts)',
    'Burst Finish (2 pts)', 
    'Spin Finish (1 pt)',
    'Extreme Finish (3 pts)'
  )),
  winner_name text NOT NULL,
  points_awarded integer NOT NULL,
  match_number integer NOT NULL,
  phase_number integer NOT NULL DEFAULT 1,
  tournament_officer text NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read match results"
  ON match_results FOR SELECT USING (true);

CREATE POLICY "Technical officers and above can insert match results"
  ON match_results FOR INSERT 
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('technical_officer', 'admin', 'developer')
  ));
```

#### Table: `match_sessions`
```sql
CREATE TABLE match_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  player1_name text NOT NULL,
  player2_name text NOT NULL,
  player1_final_score integer NOT NULL,
  player2_final_score integer NOT NULL,
  winner_name text NOT NULL,
  total_matches integer NOT NULL,
  tournament_officer text NOT NULL,
  session_data jsonb, -- Store complete match session for analysis
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE match_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read match sessions"
  ON match_sessions FOR SELECT USING (true);

CREATE POLICY "Technical officers and above can insert match sessions"
  ON match_sessions FOR INSERT 
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('technical_officer', 'admin', 'developer')
  ));
```

### 3.2 Storing Individual Match Results

**Function to save each match:**
```javascript
const saveMatchResult = async (matchData) => {
  const { error } = await supabase
    .from('match_results')
    .insert({
      tournament_id: matchData.tournamentId,
      round_number: matchData.round,
      player1_name: matchData.player1,
      player2_name: matchData.player2,
      player1_beyblade: matchData.bey1,
      player2_beyblade: matchData.bey2,
      outcome: matchData.outcome,
      winner_name: matchData.winner,
      points_awarded: getPointsForOutcome(matchData.outcome),
      match_number: matchData.matchNumber,
      phase_number: matchData.phaseNumber || 1,
      tournament_officer: matchData.submittedBy
    });

  if (error) throw error;
};

const getPointsForOutcome = (outcome) => {
  const pointMap = {
    "Over Finish (2 pts)": 2,
    "Burst Finish (2 pts)": 2,
    "Spin Finish (1 pt)": 1,
    "Extreme Finish (3 pts)": 3
  };
  return pointMap[outcome] || 0;
};
```

### 3.3 Storing Complete Match Session

**Function to save session summary:**
```javascript
const saveMatchSession = async (sessionData) => {
  const { error } = await supabase
    .from('match_sessions')
    .insert({
      tournament_id: sessionData.tournamentId,
      round_number: sessionData.round,
      player1_name: sessionData.player1,
      player2_name: sessionData.player2,
      player1_final_score: sessionData.p1Score,
      player2_final_score: sessionData.p2Score,
      winner_name: sessionData.p1Score > sessionData.p2Score ? sessionData.player1 : sessionData.player2,
      total_matches: sessionData.totalMatches,
      tournament_officer: sessionData.tournamentOfficer,
      session_data: {
        matches: sessionData.matches,
        phases: sessionData.phases,
        deckOrders: sessionData.deckOrders
      }
    });

  if (error) throw error;
};
```

---

## 4. Complete Mobile App Integration Flow

### 4.1 App Initialization
```javascript
const initializeMatchTracker = async (tournamentId) => {
  try {
    // 1. Load tournament info
    const tournament = await getTournamentInfo(tournamentId);
    
    // 2. Load player data
    const playerData = await loadPlayerData(tournamentId);
    
    // 3. Initialize app state
    return {
      tournament,
      playerData,
      ready: true
    };
  } catch (error) {
    console.error('Failed to initialize match tracker:', error);
    throw error;
  }
};
```

### 4.2 Match Submission Flow
```javascript
const submitMatchSession = async (sessionData) => {
  try {
    // 1. Save individual match results
    for (const match of sessionData.matches) {
      await saveMatchResult({
        tournamentId: sessionData.tournamentId,
        round: sessionData.round,
        player1: sessionData.player1,
        player2: sessionData.player2,
        bey1: match.bey1,
        bey2: match.bey2,
        outcome: match.outcome,
        winner: match.winner,
        matchNumber: match.matchNumber,
        phaseNumber: match.phaseNumber,
        submittedBy: sessionData.tournamentOfficer
      });
    }

    // 2. Save session summary
    await saveMatchSession(sessionData);

    return { success: true };
  } catch (error) {
    console.error('Failed to submit match session:', error);
    throw error;
  }
};
```

---

## 5. Data Validation and Error Handling

### 5.1 Required Validations
```javascript
const validateMatchData = (matchData) => {
  const errors = [];

  if (!matchData.tournamentId) errors.push('Tournament ID is required');
  if (!matchData.player1 || !matchData.player2) errors.push('Both players must be selected');
  if (matchData.player1 === matchData.player2) errors.push('Players must be different');
  if (!matchData.tournamentOfficer?.trim()) errors.push('Tournament Officer name is required');
  if (!matchData.matches || matchData.matches.length === 0) errors.push('At least one match is required');

  matchData.matches?.forEach((match, index) => {
    if (!match.outcome) errors.push(`Match ${index + 1}: Outcome is required`);
    if (!match.winner) errors.push(`Match ${index + 1}: Winner is required`);
    if (!match.bey1 || !match.bey2) errors.push(`Match ${index + 1}: Beyblade information is missing`);
  });

  return errors;
};
```

### 5.2 Error Handling
```javascript
const handleDatabaseError = (error) => {
  console.error('Database error:', error);
  
  if (error.code === '23505') {
    return 'Duplicate entry detected. This match may have already been submitted.';
  } else if (error.code === '23503') {
    return 'Invalid tournament or player reference.';
  } else if (error.message?.includes('RLS')) {
    return 'Permission denied. Please check your user role.';
  } else {
    return 'Database error occurred. Please try again.';
  }
};
```

---

## 6. Environment Configuration

### 6.1 Supabase Configuration
```javascript
// Mobile app configuration
const supabaseConfig = {
  url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  anonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
  options: {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
};

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, supabaseConfig.options);
```

### 6.2 Authentication Requirements
The mobile app should handle authentication for Tournament Officers:
- Users with roles: `technical_officer`, `admin`, or `developer` can submit match results
- Guest users can view but not submit data
- Implement proper session management for offline capability

---

## 7. Offline Capability

### 7.1 Local Storage Strategy
```javascript
// Store match data locally until submission
const storeMatchLocally = (matchData) => {
  const stored = JSON.parse(localStorage.getItem('pendingMatches') || '[]');
  stored.push({
    ...matchData,
    timestamp: new Date().toISOString(),
    synced: false
  });
  localStorage.setItem('pendingMatches', JSON.stringify(stored));
};

// Sync when online
const syncPendingMatches = async () => {
  const pending = JSON.parse(localStorage.getItem('pendingMatches') || '[]');
  const unsynced = pending.filter(match => !match.synced);
  
  for (const match of unsynced) {
    try {
      await submitMatchSession(match);
      match.synced = true;
    } catch (error) {
      console.error('Failed to sync match:', error);
    }
  }
  
  localStorage.setItem('pendingMatches', JSON.stringify(pending));
};
```

---

## 8. Testing and Validation

### 8.1 Test Data Setup
```javascript
// Create test tournament and registrations
const setupTestData = async () => {
  // This should be run in development environment only
  const testTournament = await supabase
    .from('tournaments')
    .insert({
      name: 'Test Tournament',
      tournament_date: '2025-02-01',
      location: 'Test Venue',
      max_participants: 8,
      status: 'active',
      registration_deadline: '2025-01-30',
      beyblades_per_player: 3,
      players_per_team: 1
    })
    .select()
    .single();

  // Add test registrations and beyblades...
};
```

### 8.2 Integration Tests
```javascript
describe('Match Tracker Supabase Integration', () => {
  test('should load player data correctly', async () => {
    const playerData = await loadPlayerData('test-tournament-id');
    expect(Object.keys(playerData).length).toBeGreaterThan(0);
    expect(playerData['TestPlayer1']).toHaveLength(3);
  });

  test('should submit match results successfully', async () => {
    const result = await submitMatchSession(testMatchData);
    expect(result.success).toBe(true);
  });
});
```

---

## 9. Performance Considerations

### 9.1 Optimization Strategies
- **Batch Operations**: Submit multiple matches in a single transaction
- **Caching**: Cache player data locally to reduce API calls
- **Pagination**: For tournaments with many participants
- **Indexes**: Ensure proper database indexes on frequently queried fields

### 9.2 Recommended Database Indexes
```sql
-- Add these indexes for better performance
CREATE INDEX idx_tournament_registrations_tournament_player 
ON tournament_registrations(tournament_id, player_name);

CREATE INDEX idx_tournament_beyblades_registration 
ON tournament_beyblades(registration_id);

CREATE INDEX idx_match_results_tournament_round 
ON match_results(tournament_id, round_number);

CREATE INDEX idx_match_sessions_tournament 
ON match_sessions(tournament_id, created_at);
```

---

## 10. Migration from Google Apps Script

### 10.1 Data Mapping
| Google Apps Script | Supabase Table | Notes |
|-------------------|----------------|-------|
| Player data from script | `tournament_registrations` + `tournament_beyblades` | Join tables for complete data |
| Match submissions | `match_results` | Individual match records |
| Session data | `match_sessions` | Complete session summaries |

### 10.2 API Endpoint Changes
- **Old**: `fetch(SCRIPT_URL + '?action=getPlayerData')`
- **New**: `supabase.from('tournament_registrations').select(...)`

- **Old**: `fetch(SCRIPT_URL, { method: 'POST', body: matchData })`
- **New**: `supabase.from('match_results').insert(matchData)`

---

This documentation provides everything needed to integrate the mobile match tracker with your existing Supabase database structure. The mobile app will have full access to player and Beyblade data while properly storing match results for post-match analysis.