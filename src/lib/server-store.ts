import { RoomState, Player, JoinRequest } from '@/types/poker';
import {
  createInitialRoomState,
  handlePlayerAction,
  startNewHand,
  awardPotToWinners,
  restoreHistorySnapshot,
} from './poker-engine';

// Global in-memory multi-room storage across Next.js module graphs and route handlers
const globalForRooms = globalThis as unknown as {
  pokerRoomsMap: Map<string, RoomState> | undefined;
};

const roomsMap = globalForRooms.pokerRoomsMap ?? new Map<string, RoomState>();
globalForRooms.pokerRoomsMap = roomsMap;

export const generateRoomPin = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const getServerRoom = (pin: string): RoomState | null => {
  return roomsMap.get(pin) || null;
};

export const createServerRoom = (
  pin: string,
  hostName: string,
  hostAvatar: string,
  startingChips: number = 1000,
  smallBlind: number = 5,
  bigBlind: number = 10
): RoomState => {
  const hostPlayer: Player = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: hostName,
    avatarUrl: hostAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    chips: startingChips,
    currentBet: 0,
    totalRoundBet: 0,
    status: 'active',
    seatIndex: 0,
    isDealer: true,
    isSmallBlind: false,
    isBigBlind: false,
    isTurn: false,
    isHost: true,
    isApproved: true,
    hasActedThisRound: false,
  };

  const newRoom = createInitialRoomState(pin, hostPlayer);
  newRoom.smallBlind = smallBlind;
  newRoom.bigBlind = bigBlind;
  newRoom.pot = 0;
  newRoom.currentHighestBet = 0;
  newRoom.minRaise = bigBlind;
  newRoom.players = [hostPlayer]; // Real host only

  roomsMap.set(pin, newRoom);
  return newRoom;
};

export const requestJoinServerRoom = (
  pin: string,
  playerName: string,
  playerAvatar: string,
  requestedChips: number = 1000,
  autoApprove: boolean = true // Auto-approve by default for smooth LAN play
): { room: RoomState | null; request: JoinRequest | null; player?: Player; error?: string } => {
  const room = roomsMap.get(pin);
  if (!room) {
    return { room: null, request: null, error: 'ไม่พบห้องที่ระบุ PIN นี้' };
  }

  // Check if player with same name is already seated
  const existingPlayer = room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
  if (existingPlayer) {
    return { room, request: null, player: existingPlayer };
  }

  if (autoApprove) {
    // Directly seat the player with approved status
    const newPlayer: Player = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: playerName,
      avatarUrl: playerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      chips: requestedChips,
      currentBet: 0,
      totalRoundBet: 0,
      status: 'active',
      seatIndex: room.players.length,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      isTurn: false,
      isHost: false,
      isApproved: true,
      hasActedThisRound: false,
    };

    room.players.push(newPlayer);
    return { room, request: null, player: newPlayer };
  } else {
    // Put into pending requests for host manual approval
    const newRequest: JoinRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userName: playerName,
      userAvatar: playerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      requestedChips,
      createdAt: Date.now(),
    };

    room.pendingRequests.push(newRequest);
    return { room, request: newRequest };
  }
};

export const approveJoinRequest = (
  pin: string,
  requestId: string,
  chips: number
): RoomState | null => {
  const room = roomsMap.get(pin);
  if (!room) return null;

  const reqIndex = room.pendingRequests.findIndex(r => r.id === requestId);
  if (reqIndex === -1) return room;

  const req = room.pendingRequests[reqIndex];
  room.pendingRequests.splice(reqIndex, 1);

  const newPlayer: Player = {
    id: req.userId,
    name: req.userName,
    avatarUrl: req.userAvatar,
    chips,
    currentBet: 0,
    totalRoundBet: 0,
    status: 'active',
    seatIndex: room.players.length,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    isTurn: false,
    isHost: false,
    isApproved: true,
    hasActedThisRound: false,
  };

  room.players.push(newPlayer);
  return room;
};

export const rejectJoinRequest = (pin: string, requestId: string): RoomState | null => {
  const room = roomsMap.get(pin);
  if (!room) return null;

  room.pendingRequests = room.pendingRequests.filter(r => r.id !== requestId);
  return room;
};

export const dispatchServerRoomAction = (
  pin: string,
  actionPayload: {
    type: 'ACTION' | 'START_HAND' | 'SHOWDOWN_WINNERS' | 'UNDO' | 'VOTE_CREATE' | 'VOTE_CAST' | 'VOTE_CLOSE' | 'TOGGLE_AFK' | 'LEAVE';
    playerId?: string;
    action?: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
    raiseAmount?: number;
    winnerIds?: string[];
    voteTitle?: string;
    voteOptions?: string[];
    voteOptionId?: string;
  }
): RoomState | null => {
  const room = roomsMap.get(pin);
  if (!room) return null;

  let updated = room;

  switch (actionPayload.type) {
    case 'ACTION':
      if (actionPayload.playerId && actionPayload.action) {
        updated = handlePlayerAction(room, actionPayload.playerId, actionPayload.action, actionPayload.raiseAmount);
      }
      break;

    case 'START_HAND':
      updated = startNewHand(room);
      break;

    case 'SHOWDOWN_WINNERS':
      if (actionPayload.winnerIds) {
        updated = awardPotToWinners(room, actionPayload.winnerIds);
      }
      break;

    case 'UNDO':
      const undone = restoreHistorySnapshot(room);
      if (undone) updated = undone;
      break;

    case 'TOGGLE_AFK':
      if (actionPayload.playerId) {
        updated.players = updated.players.map(p => {
          if (p.id === actionPayload.playerId) {
            const nextStatus = p.status === 'sitting-out' ? 'active' : 'sitting-out';
            return { ...p, status: nextStatus };
          }
          return p;
        });
      }
      break;

    case 'LEAVE':
      if (actionPayload.playerId) {
        updated.players = updated.players.filter(p => p.id !== actionPayload.playerId);
      }
      break;

    case 'VOTE_CREATE':
      if (actionPayload.voteTitle && actionPayload.voteOptions) {
        updated.activeVote = {
          id: `vote_${Date.now()}`,
          title: actionPayload.voteTitle,
          description: '',
          createdBy: actionPayload.playerId || 'admin',
          options: actionPayload.voteOptions.map((opt, idx) => ({
            id: `opt_${idx}`,
            label: opt,
            votes: [],
          })),
          resolved: false,
        };
      }
      break;

    case 'VOTE_CAST':
      if (updated.activeVote && actionPayload.voteOptionId && actionPayload.playerId) {
        updated.activeVote.options = updated.activeVote.options.map(opt => ({
          ...opt,
          votes: opt.id === actionPayload.voteOptionId
            ? Array.from(new Set([...opt.votes, actionPayload.playerId!]))
            : opt.votes.filter(id => id !== actionPayload.playerId),
        }));
      }
      break;

    case 'VOTE_CLOSE':
      updated.activeVote = null;
      break;
  }

  roomsMap.set(pin, updated);
  return updated;
};
