# Beyblade Match Tracker - Mobile App Development Documentation

## Overview
This document provides complete specifications for developing a mobile app version of the Beyblade Match Tracker system. The mobile app will replicate the functionality of the existing web-based tracker and integrate with Supabase for data persistence.

## System Architecture

### Current Web App Flow
1. **Player Selection** → Load player data from Google Apps Script
2. **Match Setup** → Configure round, players, and Tournament Officer
3. **Phase Management** → Handle multiple phases with deck shuffling
4. **Match Recording** → Track outcomes, winners, and points
5. **Data Submission** → Send match data to Google Apps Script

### Target Mobile App Flow
1. **Player Selection** → Load player data from Supabase
2. **Match Setup** → Configure round, players, and Tournament Officer
3. **Phase Management** → Handle multiple phases with deck shuffling
4. **Match Recording** → Track outcomes, winners, and points
5. **Data Submission** → Send match data to Supabase

## Core Features & Components

### 1. Player Management
```javascript
// Data Structure
playerData = {
  "PlayerName1": ["Beyblade1", "Beyblade2", "Beyblade3"],
  "PlayerName2": ["Beyblade1", "Beyblade2", "Beyblade3"],
  // ... more players
}
```

**Requirements:**
- Dropdown selection for Player 1 and Player 2
- Prevent selecting the same player for both positions
- Dynamic filtering of available players
- Load player data from Supabase on app start

### 2. Match Configuration
**Input Fields:**
- Round Number (numeric input, default: 1, min: 1)
- Tournament Officer Name (text input, required for submission)
- Player 1 Selection (dropdown)
- Player 2 Selection (dropdown)

**Validation:**
- Both players must be selected and different
- TO name required before final submission

### 3. Scoring System
```javascript
const pointMap = {
  "Over Finish (2 pts)": 2,
  "Burst Finish (2 pts)": 2,
  "Spin Finish (1 pt)": 1,
  "Extreme Finish (3 pts)": 3
};
```

**Score Tracking:**
- Real-time score updates
- Visual indicators for leading/trailing players
- Score reset when players change

### 4. Phase Management System

#### Phase 1: Fixed Deck Order
- Players use their Beyblades in original order (Bey 1, Bey 2, Bey 3)
- Display deck table showing both players' Beyblades

#### Phase 2+: Shuffleable Decks
- After every 3 matches, enable deck shuffling
- Players can reorder their Beyblades using drag-and-drop
- Button changes from "Add Match" to "Shuffle" after 3rd, 6th, 9th match, etc.

### 5. Match Recording

#### Match Data Structure
```javascript
matchMap = {
  0: { outcome: "Burst Finish (2 pts)", winner: "PlayerName", points: 2 },
  1: { outcome: "Spin Finish (1 pt)", winner: "PlayerName", points: 1 },
  // ... more matches
}
```

#### Match Card Components
- **Match Number & Beyblade Matchup**: "Match 1: Beyblade1 vs Beyblade2"
- **Outcome Selection**: 4 buttons for finish types
- **Winner Selection**: 2 buttons for each player
- **Delete Option**: Remove match functionality
- **Visual States**: Selected buttons highlighted

### 6. UI/UX Requirements

#### Sticky Score Bar
- Always visible during match recording
- Shows current scores for both players
- Highlights leading player
- Includes TO name input

#### Match Cards
- Chronological display of matches
- Clear visual separation between phases
- Easy-to-tap buttons for mobile
- Immediate visual feedback for selections

#### Navigation Flow
1. **Setup Screen**: Player selection, round, TO name
2. **Match Recording Screen**: Add matches, view scores
3. **Phase Transition**: Deck shuffling interface
4. **Summary Modal**: Review before submission
5. **Confirmation Screen**: Success/error feedback

## Data Integration

### Supabase Schema Requirements

#### Tables Needed:
```sql
-- Players and their Beyblades
CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  beyblades jsonb NOT NULL, -- Array of 3 Beyblade names
  created_at timestamptz DEFAULT now()
);

-- Match results
CREATE TABLE match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number integer NOT NULL,
  player1_name text NOT NULL,
  player2_name text NOT NULL,
  player1_beyblade text NOT NULL,
  player2_beyblade text NOT NULL,
  outcome text NOT NULL,
  winner_name text NOT NULL,
  points_awarded integer NOT NULL,
  match_number integer NOT NULL,
  phase_number integer NOT NULL,
  tournament_officer text NOT NULL,
  submitted_at timestamptz DEFAULT now()
);

-- Match sessions (groups related matches)
CREATE TABLE match_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number integer NOT NULL,
  player1_name text NOT NULL,
  player2_name text NOT NULL,
  player1_final_score integer NOT NULL,
  player2_final_score integer NOT NULL,
  winner_name text NOT NULL,
  total_matches integer NOT NULL,
  tournament_officer text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### API Endpoints Needed

#### 1. Get Players
```javascript
// GET request to fetch all players and their Beyblades
const response = await supabase
  .from('players')
  .select('name, beyblades');
```

#### 2. Submit Match Data
```javascript
// POST request to save match results
const matchData = {
  round_number: 1,
  player1_name: "Player1",
  player2_name: "Player2",
  player1_beyblade: "Beyblade1",
  player2_beyblade: "Beyblade2",
  outcome: "Burst Finish (2 pts)",
  winner_name: "Player1",
  points_awarded: 2,
  match_number: 1,
  phase_number: 1,
  tournament_officer: "TO Name"
};

await supabase
  .from('match_results')
  .insert(matchData);
```

#### 3. Submit Session Summary
```javascript
// POST request to save overall match session
const sessionData = {
  round_number: 1,
  player1_name: "Player1",
  player2_name: "Player2",
  player1_final_score: 5,
  player2_final_score: 3,
  winner_name: "Player1",
  total_matches: 4,
  tournament_officer: "TO Name"
};

await supabase
  .from('match_sessions')
  .insert(sessionData);
```

## Mobile-Specific Considerations

### 1. Touch Interface
- Large, easily tappable buttons (minimum 44px)
- Swipe gestures for navigation
- Drag-and-drop for deck shuffling
- Pull-to-refresh for player data

### 2. Screen Layouts
- **Portrait Mode**: Stack elements vertically
- **Landscape Mode**: Utilize horizontal space for match cards
- **Responsive Design**: Adapt to various screen sizes

### 3. Offline Capability
- Cache player data locally
- Queue match submissions when offline
- Sync when connection restored
- Visual indicators for sync status

### 4. Performance
- Lazy loading for large player lists
- Efficient state management
- Smooth animations for transitions
- Minimal battery usage

## Technical Implementation Guide

### 1. State Management
```javascript
// Global App State
const appState = {
  players: {},           // Player data from Supabase
  selectedPlayers: {     // Currently selected players
    player1: null,
    player2: null
  },
  currentRound: 1,       // Round number
  tournamentOfficer: "", // TO name
  matches: {},           // Match data
  scores: {              // Current scores
    player1: 0,
    player2: 0
  },
  currentPhase: 1,       // Current phase number
  pendingPhase: false    // Waiting for shuffle
};
```

### 2. Core Functions to Implement

#### Player Management
```javascript
async function loadPlayers() {
  // Fetch from Supabase
  // Populate dropdowns
  // Handle errors
}

function handlePlayerSelect(playerNumber, playerName) {
  // Update state
  // Filter other dropdown
  // Reset scores if needed
  // Update deck display
}
```

#### Match Management
```javascript
function addMatch() {
  // Check if shuffle needed
  // Create match card
  // Update UI
}

function setOutcome(matchIndex, outcome) {
  // Update match data
  // Recalculate scores
  // Update UI
}

function setWinner(matchIndex, winner) {
  // Update match data
  // Recalculate scores
  // Update UI
}
```

#### Phase Management
```javascript
function checkPhaseTransition() {
  // Check if 3 matches completed
  // Enable shuffle mode
  // Update button text
}

function shufflePhase() {
  // Create new phase UI
  // Enable deck reordering
  // Reset match counter
}
```

#### Data Submission
```javascript
async function submitMatches() {
  // Validate data
  // Show summary modal
  // Submit to Supabase
  // Handle success/error
}
```

### 3. Error Handling
- Network connectivity issues
- Invalid player selections
- Incomplete match data
- Supabase connection errors
- Data validation failures

### 4. User Feedback
- Loading indicators
- Success/error messages
- Progress indicators
- Confirmation dialogs

## Testing Requirements

### 1. Unit Tests
- Player selection logic
- Score calculation
- Phase transitions
- Data validation

### 2. Integration Tests
- Supabase connectivity
- Data submission flow
- Error handling
- Offline functionality

### 3. User Testing
- Touch interface usability
- Navigation flow
- Performance on various devices
- Accessibility compliance

## Deployment Considerations

### 1. Platform Support
- iOS (React Native/Flutter)
- Android (React Native/Flutter)
- Progressive Web App option

### 2. App Store Requirements
- Privacy policy
- Terms of service
- App descriptions
- Screenshots

### 3. Updates & Maintenance
- Version control strategy
- Update distribution
- Bug tracking
- User feedback collection

## Migration from Current System

### 1. Data Migration
- Export existing player data
- Convert to Supabase format
- Validate data integrity

### 2. Feature Parity
- All current web features
- Mobile-optimized improvements
- Additional mobile-specific features

### 3. Training & Documentation
- User guides
- Tournament officer training
- Troubleshooting guides

## Success Metrics

### 1. Performance Metrics
- App load time < 3 seconds
- Match submission time < 2 seconds
- 99.9% uptime for data sync

### 2. User Experience Metrics
- User satisfaction scores
- Task completion rates
- Error frequency
- Support ticket volume

### 3. Technical Metrics
- Crash rate < 0.1%
- Battery usage optimization
- Memory usage efficiency
- Network usage optimization

---

## Quick Start Checklist for Development

1. ✅ Set up Supabase project with required tables
2. ✅ Create mobile app project (React Native/Flutter)
3. ✅ Implement player data loading
4. ✅ Build player selection interface
5. ✅ Create match recording UI
6. ✅ Implement scoring system
7. ✅ Add phase management
8. ✅ Build deck shuffling interface
9. ✅ Implement data submission
10. ✅ Add error handling and validation
11. ✅ Test offline functionality
12. ✅ Optimize for mobile performance
13. ✅ Conduct user testing
14. ✅ Deploy to app stores

This documentation provides everything needed to recreate the match tracker functionality in a mobile app while integrating with Supabase for data persistence and analysis.