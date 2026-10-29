import { RoomState, Player, Street, GameHistoryEntry } from '@/types/poker';

export const MAX_PLAYERS = 10;
export const DEFAULT_STARTING_CHIPS = 1000;
export const DEFAULT_SB = 5;
export const DEFAULT_BB = 10;

export const createInitialRoomState = (roomId: string, hostPlayer: Player): RoomState => {
  return {
    roomId,
    roomName: 'Poker Party Room',
    hostId: hostPlayer.id,
    isHostPlaying: true,
    smallBlind: DEFAULT_SB,
    bigBlind: DEFAULT_BB,
    ante: 0,
    street: 'preflop',
    pot: 0,
    currentHighestBet: DEFAULT_BB,
    minRaise: DEFAULT_BB,
    dealerIndex: 0,
    activePlayerIndex: 0,
    players: [hostPlayer],
    sidePots: [],
    history: [],
    pendingRequests: [],
    activeVote: null,
    winnerIds: [],
  };
};

export const saveHistorySnapshot = (state: RoomState, description: string): GameHistoryEntry => {
  return {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    description,
    snapshot: JSON.stringify({
      street: state.street,
      pot: state.pot,
      currentHighestBet: state.currentHighestBet,
      minRaise: state.minRaise,
      dealerIndex: state.dealerIndex,
      activePlayerIndex: state.activePlayerIndex,
      players: state.players,
      sidePots: state.sidePots,
      winnerIds: state.winnerIds,
    }),
  };
};

export const restoreHistorySnapshot = (state: RoomState): RoomState | null => {
  if (state.history.length === 0) return null;
  const historyCopy = [...state.history];
  const lastEntry = historyCopy.pop();
  if (!lastEntry) return null;

  try {
    const parsed = JSON.parse(lastEntry.snapshot);
    return {
      ...state,
      ...parsed,
      history: historyCopy,
    };
  } catch {
    return null;
  }
};

// Find the next active player seat in clockwise direction
export const getNextActivePlayerIndex = (
  players: Player[],
  startIndex: number
): number => {
  const count = players.length;
  for (let i = 1; i <= count; i++) {
    const nextIdx = (startIndex + i) % count;
    const p = players[nextIdx];
    if (p.isApproved && p.status === 'active') {
      return nextIdx;
    }
  }
  return startIndex;
};

// Count active players still in hand
export const getActivePlayersCount = (players: Player[]): number => {
  return players.filter(p => p.isApproved && (p.status === 'active' || p.status === 'all-in')).length;
};

// Start a fresh hand with blinds posted
export const startNewHand = (state: RoomState): RoomState => {
  const newState = { ...state };
  const approvedPlayers = newState.players.filter(
    p => p.isApproved && p.status !== 'sitting-out' && p.chips > 0
  );

  if (approvedPlayers.length < 2) {
    return newState;
  }

  // Record history
  const historyEntry = saveHistorySnapshot(state, 'Start New Hand');
  newState.history = [...newState.history.slice(-15), historyEntry];

  // Rotate Dealer Button clockwise (วนซ้าย)
  if (newState.isFirstHandStarted) {
    newState.dealerIndex = (newState.dealerIndex + 1) % newState.players.length;
    while (
      !newState.players[newState.dealerIndex].isApproved ||
      newState.players[newState.dealerIndex].status === 'sitting-out' ||
      newState.players[newState.dealerIndex].chips <= 0
    ) {
      newState.dealerIndex = (newState.dealerIndex + 1) % newState.players.length;
    }
  } else {
    // For the very first hand, honor the host-selected dealer (or default)
    newState.isFirstHandStarted = true;
    if (
      !newState.players[newState.dealerIndex] ||
      !newState.players[newState.dealerIndex].isApproved ||
      newState.players[newState.dealerIndex].status === 'sitting-out' ||
      newState.players[newState.dealerIndex].chips <= 0
    ) {
      const validDealer = approvedPlayers[0];
      newState.dealerIndex = newState.players.findIndex(p => p.id === validDealer.id);
    }
  }

  // Reset player round states
  newState.players = newState.players.map((p, idx) => ({
    ...p,
    currentBet: 0,
    totalRoundBet: 0,
    status: p.status === 'sitting-out' ? 'sitting-out' : p.chips > 0 ? 'active' : 'folded',
    isDealer: idx === newState.dealerIndex,
    isSmallBlind: false,
    isBigBlind: false,
    isTurn: false,
    lastAction: undefined,
    hasActedThisRound: false,
  }));

  // Assign Blinds clockwise (วนซ้าย)
  let sbIdx: number;
  let bbIdx: number;

  if (approvedPlayers.length === 2) {
    // Heads-up: Dealer is Small Blind, other player is Big Blind
    sbIdx = newState.dealerIndex;
    bbIdx = getNextActivePlayerIndex(newState.players, sbIdx);
  } else {
    sbIdx = getNextActivePlayerIndex(newState.players, newState.dealerIndex);
    bbIdx = getNextActivePlayerIndex(newState.players, sbIdx);
  }

  newState.players[sbIdx].isSmallBlind = true;
  newState.players[bbIdx].isBigBlind = true;

  // Post Blinds
  const sbAmount = Math.min(newState.players[sbIdx].chips, newState.smallBlind);
  newState.players[sbIdx].chips -= sbAmount;
  newState.players[sbIdx].currentBet = sbAmount;
  newState.players[sbIdx].totalRoundBet = sbAmount;
  if (newState.players[sbIdx].chips === 0) newState.players[sbIdx].status = 'all-in';

  const bbAmount = Math.min(newState.players[bbIdx].chips, newState.bigBlind);
  newState.players[bbIdx].chips -= bbAmount;
  newState.players[bbIdx].currentBet = bbAmount;
  newState.players[bbIdx].totalRoundBet = bbAmount;
  if (newState.players[bbIdx].chips === 0) newState.players[bbIdx].status = 'all-in';

  newState.pot = sbAmount + bbAmount;
  newState.currentHighestBet = newState.bigBlind;
  newState.minRaise = newState.bigBlind;
  newState.street = 'preflop';
  newState.winnerIds = [];

  // First to act preflop:
  // In heads-up: Small Blind (Dealer) acts first preflop
  // In 3+ players: Player left of Big Blind (UTG) acts first preflop
  const firstToAct = approvedPlayers.length === 2
    ? sbIdx
    : getNextActivePlayerIndex(newState.players, bbIdx);

  newState.activePlayerIndex = firstToAct;
  newState.players[firstToAct].isTurn = true;

  return newState;
};

// Check if current street betting is complete
export const isBettingRoundComplete = (players: Player[], currentHighestBet: number): boolean => {
  const inHandPlayers = players.filter(
    p => p.isApproved && p.status !== 'folded' && p.status !== 'sitting-out'
  );
  if (inHandPlayers.length <= 1) return true;

  // Active players with chips remaining who can make bets
  const activePlayers = inHandPlayers.filter(p => p.status === 'active');

  // If everyone in hand is all-in, round is complete!
  if (activePlayers.length === 0) return true;

  // If there are active players, EVERY single one must have acted this round AND matched the highest bet
  return activePlayers.every(
    p => p.hasActedThisRound && (p.currentBet === currentHighestBet || p.chips === 0)
  );
};

// Move to the next street or showdown
export const progressToNextStreet = (state: RoomState): RoomState => {
  const newState = { ...state };
  const historyEntry = saveHistorySnapshot(state, `Progress from ${state.street}`);
  newState.history = [...newState.history.slice(-15), historyEntry];

  // Reset player round bets
  newState.players = newState.players.map(p => ({
    ...p,
    currentBet: 0,
    hasActedThisRound: false,
    lastAction: undefined,
    isTurn: false,
  }));

  newState.currentHighestBet = 0;
  newState.minRaise = newState.bigBlind;

  // Check if players with chips can continue betting
  const inHandPlayers = newState.players.filter(
    p => p.isApproved && p.status !== 'folded' && p.status !== 'sitting-out'
  );
  const playersWithChips = inHandPlayers.filter(p => p.chips > 0);

  // If 1 or 0 players have chips (all-in runout), jump straight to showdown!
  if (playersWithChips.length <= 1 && inHandPlayers.length > 1) {
    newState.street = 'showdown';
    return newState;
  }

  // Street transition sequence
  if (newState.street === 'preflop') {
    newState.street = 'flop';
  } else if (newState.street === 'flop') {
    newState.street = 'turn';
  } else if (newState.street === 'turn') {
    newState.street = 'river';
  } else if (newState.street === 'river') {
    newState.street = 'showdown';
    return newState;
  }

  // In postflop, first active player to the left of the Dealer button acts first
  const nextActor = getNextActivePlayerIndex(newState.players, newState.dealerIndex);
  newState.activePlayerIndex = nextActor;
  newState.players[nextActor].isTurn = true;

  return newState;
};

// Handle player action (fold, check, call, raise, all-in)
export const handlePlayerAction = (
  state: RoomState,
  playerId: string,
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in',
  raiseTotalAmount?: number
): RoomState => {
  const playerIdx = state.players.findIndex(p => p.id === playerId);
  if (playerIdx === -1 || playerIdx !== state.activePlayerIndex) {
    return state;
  }

  const newState = { ...state };
  const player = { ...newState.players[playerIdx] };
  const currentHighest = newState.currentHighestBet;
  const toCall = currentHighest - player.currentBet;

  // Record history snapshot for undo
  const histEntry = saveHistorySnapshot(state, `${player.name} did ${action}`);
  newState.history = [...newState.history.slice(-15), histEntry];

  if (action === 'fold') {
    player.status = 'folded';
    player.lastAction = 'fold';
    player.hasActedThisRound = true;
    player.isTurn = false;
    newState.players[playerIdx] = player;

    // Check if only 1 player remains in the hand
    const inHandRemaining = newState.players.filter(
      p => p.isApproved && p.status !== 'folded' && p.status !== 'sitting-out'
    );
    if (inHandRemaining.length === 1) {
      // Sole survivor wins immediately!
      const winner = inHandRemaining[0];
      const winIdx = newState.players.findIndex(p => p.id === winner.id);
      newState.players[winIdx].chips += newState.pot;
      newState.winnerIds = [winner.id];
      newState.pot = 0;
      newState.street = 'showdown';
      return newState;
    }
  } else if (action === 'check') {
    // Only valid if player has already matched current highest bet
    player.lastAction = 'check';
    player.hasActedThisRound = true;
    player.isTurn = false;
    newState.players[playerIdx] = player;
  } else if (action === 'call') {
    const callAmount = Math.min(toCall, player.chips);
    player.chips -= callAmount;
    player.currentBet += callAmount;
    player.totalRoundBet += callAmount;
    newState.pot += callAmount;
    player.lastAction = player.chips === 0 ? 'all-in' : 'call';
    if (player.chips === 0) player.status = 'all-in';
    player.hasActedThisRound = true;
    player.isTurn = false;
    newState.players[playerIdx] = player;
  } else if (action === 'raise' || action === 'all-in') {
    const playerTotalStack = player.chips + player.currentBet;
    
    // Legal minimum raise calculation:
    // If opening the betting (currentHighest === 0), minimum is bigBlind
    // If facing a bet, minimum raise total is currentHighest + minRaise
    const minLegalRaiseTotal = currentHighest === 0
      ? newState.bigBlind
      : currentHighest + newState.minRaise;

    let targetTotal: number;
    if (playerTotalStack <= minLegalRaiseTotal) {
      // Player does not have enough chips for a full min raise -> All-In for total stack
      targetTotal = playerTotalStack;
    } else {
      // Player has enough chips -> targetTotal cannot be less than minLegalRaiseTotal
      const requested = raiseTotalAmount ?? minLegalRaiseTotal;
      targetTotal = Math.max(minLegalRaiseTotal, Math.min(playerTotalStack, requested));
    }

    const additionalCost = targetTotal - player.currentBet;
    player.chips -= additionalCost;
    player.currentBet = targetTotal;
    player.totalRoundBet += additionalCost;
    newState.pot += additionalCost;

    const raiseDifference = targetTotal - currentHighest;
    if (raiseDifference > newState.minRaise) {
      newState.minRaise = raiseDifference;
    }
    if (targetTotal > currentHighest) {
      newState.currentHighestBet = targetTotal;
    }

    player.lastAction = player.chips === 0 ? 'all-in' : 'raise';
    if (player.chips === 0) player.status = 'all-in';
    player.hasActedThisRound = true;
    player.isTurn = false;

    // A raise reopens betting for all other in-hand players who are active
    newState.players = newState.players.map((p, idx) => {
      if (idx === playerIdx) return player;
      if (p.status === 'active') {
        return { ...p, hasActedThisRound: false };
      }
      return p;
    });
  }

  // Check if round is complete or pass to next active player
  if (isBettingRoundComplete(newState.players, newState.currentHighestBet)) {
    return progressToNextStreet(newState);
  } else {
    const nextIdx = getNextActivePlayerIndex(newState.players, playerIdx);
    newState.activePlayerIndex = nextIdx;
    newState.players[nextIdx].isTurn = true;
    return newState;
  }
};

// Distribute pot to winners at showdown
export const awardPotToWinners = (state: RoomState, winnerIds: string[]): RoomState => {
  if (winnerIds.length === 0 || state.pot === 0) return state;

  const newState = { ...state };
  const historyEntry = saveHistorySnapshot(state, `Award pot to ${winnerIds.length} winner(s)`);
  newState.history = [...newState.history.slice(-15), historyEntry];

  const share = Math.floor(newState.pot / winnerIds.length);
  const remainder = newState.pot % winnerIds.length;

  newState.players = newState.players.map(p => {
    if (winnerIds.includes(p.id)) {
      return {
        ...p,
        chips: p.chips + share + (p.id === winnerIds[0] ? remainder : 0),
      };
    }
    return p;
  });

  newState.pot = 0;
  newState.winnerIds = winnerIds;
  return newState;
};

// Seating and Dealer Setup Management
export const setRoomDealer = (state: RoomState, playerId: string): RoomState => {
  const targetIdx = state.players.findIndex(p => p.id === playerId);
  if (targetIdx === -1) return state;

  const newState = { ...state };
  newState.dealerIndex = targetIdx;
  newState.players = newState.players.map((p, idx) => ({
    ...p,
    isDealer: idx === targetIdx,
  }));
  newState.isFirstHandStarted = false; // Next startHand uses this exact dealer
  return newState;
};

export const randomizeRoomDealer = (state: RoomState): RoomState => {
  const eligible = state.players.filter(
    p => p.isApproved && p.status !== 'sitting-out' && p.chips > 0
  );
  if (eligible.length === 0) return state;
  const picked = eligible[Math.floor(Math.random() * eligible.length)];
  return setRoomDealer(state, picked.id);
};

export const swapPlayerSeats = (state: RoomState, player1Id: string, player2Id: string): RoomState => {
  const idx1 = state.players.findIndex(p => p.id === player1Id);
  const idx2 = state.players.findIndex(p => p.id === player2Id);
  if (idx1 === -1 || idx2 === -1 || idx1 === idx2) return state;

  const newState = { ...state };
  const playersCopy = [...newState.players];
  const temp = playersCopy[idx1];
  playersCopy[idx1] = playersCopy[idx2];
  playersCopy[idx2] = temp;

  newState.players = playersCopy.map((p, idx) => ({
    ...p,
    seatIndex: idx,
  }));

  const dealerIdx = newState.players.findIndex(p => p.isDealer);
  if (dealerIdx !== -1) {
    newState.dealerIndex = dealerIdx;
  }

  return newState;
};

export const movePlayerSeat = (
  state: RoomState,
  playerId: string,
  direction: 'up' | 'down'
): RoomState => {
  const idx = state.players.findIndex(p => p.id === playerId);
  if (idx === -1 || state.players.length < 2) return state;
  const targetIdx = direction === 'up'
    ? (idx - 1 + state.players.length) % state.players.length
    : (idx + 1) % state.players.length;

  return swapPlayerSeats(state, playerId, state.players[targetIdx].id);
};
