import { RoomState, Player, Street, GameHistoryEntry } from '@/types/poker';
import {
  PokerRoom,
  Player as OOPPlayer,
  GameAction,
  FoldAction,
  CheckAction,
  CallAction,
  RaiseAction,
} from './oop';

export const MAX_PLAYERS = 10;
export const DEFAULT_STARTING_CHIPS = 1000;
export const DEFAULT_SB = 5;
export const DEFAULT_BB = 10;

/**
 * Factory creating initial room state using OOP encapsulation.
 */
export const createInitialRoomState = (roomId: string, hostPlayer: Player): RoomState => {
  const oopHost = OOPPlayer.fromJSON(hostPlayer);
  const room = new PokerRoom(roomId, oopHost, DEFAULT_SB, DEFAULT_BB, 'Poker Party Room');
  return room.toJSON();
};

export const saveHistorySnapshot = (state: RoomState, description: string): GameHistoryEntry => {
  return {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    description,
    snapshot: JSON.stringify(state),
  };
};

export const restoreHistorySnapshot = (state: RoomState): RoomState | null => {
  const room = PokerRoom.fromState(state);
  const success = room.undo();
  return success ? room.toJSON() : null;
};

export const getNextActivePlayerIndex = (players: Player[], startIndex: number): number => {
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

export const getActivePlayersCount = (players: Player[]): number => {
  return players.filter(p => p.isApproved && (p.status === 'active' || p.status === 'all-in')).length;
};

/**
 * Starts a new hand using PokerRoom domain aggregate root.
 */
export const startNewHand = (state: RoomState): RoomState => {
  const room = PokerRoom.fromState(state);
  const started = room.startNewHand();
  return started ? room.toJSON() : state;
};

export const isBettingRoundComplete = (players: Player[], currentHighestBet: number): boolean => {
  const inHand = players.filter(p => p.isApproved && p.status !== 'folded' && p.status !== 'sitting-out');
  if (inHand.length <= 1) return true;
  const activePlayers = inHand.filter(p => p.status === 'active');
  if (activePlayers.length === 0) return true;
  return activePlayers.every(p => p.hasActedThisRound && (p.currentBet === currentHighestBet || p.chips === 0));
};

export const progressToNextStreet = (state: RoomState): RoomState => {
  const room = PokerRoom.fromState(state);
  room.progressToNextStreet();
  return room.toJSON();
};

/**
 * Polymorphic Action Dispatcher (OOP Command Pattern).
 */
export const handlePlayerAction = (
  state: RoomState,
  playerId: string,
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in',
  raiseTotalAmount?: number
): RoomState => {
  const room = PokerRoom.fromState(state);
  let command: GameAction;

  switch (action) {
    case 'fold':
      command = new FoldAction(playerId);
      break;
    case 'check':
      command = new CheckAction(playerId);
      break;
    case 'call':
      command = new CallAction(playerId);
      break;
    case 'raise':
    case 'all-in':
      command = new RaiseAction(playerId, raiseTotalAmount ?? 0);
      break;
    default:
      return state;
  }

  room.dispatchAction(command);
  return room.toJSON();
};

export const awardPotToWinners = (state: RoomState, winnerIds: string[]): RoomState => {
  const room = PokerRoom.fromState(state);
  room.awardPotToWinners(winnerIds);
  return room.toJSON();
};

export const setRoomDealer = (state: RoomState, playerId: string): RoomState => {
  const room = PokerRoom.fromState(state);
  room.setDealer(playerId);
  return room.toJSON();
};

export const randomizeRoomDealer = (state: RoomState): RoomState => {
  const room = PokerRoom.fromState(state);
  room.randomizeDealer();
  return room.toJSON();
};

export const swapPlayerSeats = (state: RoomState, player1Id: string, player2Id: string): RoomState => {
  const room = PokerRoom.fromState(state);
  room.swapSeats(player1Id, player2Id);
  return room.toJSON();
};

export const movePlayerSeat = (
  state: RoomState,
  playerId: string,
  direction: 'up' | 'down'
): RoomState => {
  const room = PokerRoom.fromState(state);
  room.moveSeat(playerId, direction);
  return room.toJSON();
};

// Re-export OOP models and classes
export * from './oop';
