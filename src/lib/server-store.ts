import { RoomState, Player, JoinRequest } from '@/types/poker';
import {
  createInitialRoomState,
  handlePlayerAction,
  startNewHand,
  awardPotToWinners,
  restoreHistorySnapshot,
  setRoomDealer,
  randomizeRoomDealer,
  swapPlayerSeats,
  movePlayerSeat,
} from './poker-engine';

import { EventEmitter } from 'events';

// Global in-memory multi-room storage across Next.js module graphs and route handlers
const globalForRooms = globalThis as unknown as {
  pokerRoomsMap: Map<string, RoomState> | undefined;
  pokerEmitter: EventEmitter | undefined;
};

const roomsMap = globalForRooms.pokerRoomsMap ?? new Map<string, RoomState>();
globalForRooms.pokerRoomsMap = roomsMap;

const roomEmitter = globalForRooms.pokerEmitter ?? new EventEmitter();
globalForRooms.pokerEmitter = roomEmitter;
roomEmitter.setMaxListeners(200);

export const subscribeToRoom = (
  pin: string,
  callback: (room: RoomState) => void,
  onDelete?: () => void
) => {
  const handler = (updated: RoomState) => {
    if (updated.roomId === pin) {
      callback(updated);
    }
  };
  const deleteHandler = (deletedPin: string) => {
    if (deletedPin === pin && onDelete) {
      onDelete();
    }
  };
  roomEmitter.on('room_updated', handler);
  roomEmitter.on('room_deleted', deleteHandler);
  return () => {
    roomEmitter.off('room_updated', handler);
    roomEmitter.off('room_deleted', deleteHandler);
  };
};

export const broadcastRoomUpdate = (room: RoomState) => {
  roomEmitter.emit('room_updated', room);
};

export const deleteServerRoom = (pin: string): boolean => {
  if (roomsMap.has(pin)) {
    roomsMap.delete(pin);
    roomEmitter.emit('room_deleted', pin);
    return true;
  }
  return false;
};

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
  broadcastRoomUpdate(newRoom);
  return newRoom;
};

export const requestJoinServerRoom = (
  pin: string,
  playerName: string,
  playerAvatar: string,
  requestedChips: number = 1000,
  autoApprove: boolean = true,
  existingPlayerId?: string
): { room: RoomState | null; request: JoinRequest | null; player?: Player; error?: string } => {
  const room = roomsMap.get(pin);
  if (!room) {
    return { room: null, request: null, error: 'ไม่พบห้องที่ระบุ PIN นี้' };
  }

  // 1. Check if player already seated by existingPlayerId (reconnection)
  if (existingPlayerId) {
    const playerById = room.players.find(p => p.id === existingPlayerId);
    if (playerById) {
      if (playerAvatar) playerById.avatarUrl = playerAvatar;
      if (playerName) playerById.name = playerName;
      broadcastRoomUpdate(room);
      return { room, request: null, player: playerById };
    }
  }

  // 2. Check if player with same name is already seated
  const existingPlayer = room.players.find(
    p => p.name.trim().toLowerCase() === playerName.trim().toLowerCase()
  );
  if (existingPlayer) {
    if (playerAvatar) {
      existingPlayer.avatarUrl = playerAvatar;
      broadcastRoomUpdate(room);
    }
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
    broadcastRoomUpdate(room);
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
    broadcastRoomUpdate(room);
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
  broadcastRoomUpdate(room);
  return room;
};

export const rejectJoinRequest = (pin: string, requestId: string): RoomState | null => {
  const room = roomsMap.get(pin);
  if (!room) return null;

  room.pendingRequests = room.pendingRequests.filter(r => r.id !== requestId);
  broadcastRoomUpdate(room);
  return room;
};

export const dispatchServerRoomAction = (
  pin: string,
  actionPayload: {
    type:
      | 'ACTION'
      | 'START_HAND'
      | 'SHOWDOWN_WINNERS'
      | 'UNDO'
      | 'VOTE_CREATE'
      | 'VOTE_CAST'
      | 'VOTE_CLOSE'
      | 'TOGGLE_AFK'
      | 'LEAVE'
      | 'KICK_PLAYER'
      | 'SET_DEALER'
      | 'RANDOMIZE_DEALER'
      | 'SWAP_SEATS'
      | 'MOVE_SEAT';
    playerId?: string;
    targetPlayerId?: string;
    direction?: 'up' | 'down';
    action?: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
    raiseAmount?: number;
    totalAmount?: number;
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
        const raiseVal = actionPayload.totalAmount ?? actionPayload.raiseAmount;
        updated = handlePlayerAction(room, actionPayload.playerId, actionPayload.action, raiseVal);
      }
      break;

    case 'START_HAND':
      updated = startNewHand(room);
      break;

    case 'SET_DEALER':
      if (actionPayload.playerId) {
        updated = setRoomDealer(room, actionPayload.playerId);
      }
      break;

    case 'RANDOMIZE_DEALER':
      updated = randomizeRoomDealer(room);
      break;

    case 'SWAP_SEATS':
      if (actionPayload.playerId && actionPayload.targetPlayerId) {
        updated = swapPlayerSeats(room, actionPayload.playerId, actionPayload.targetPlayerId);
      }
      break;

    case 'MOVE_SEAT':
      if (actionPayload.playerId && actionPayload.direction) {
        updated = movePlayerSeat(room, actionPayload.playerId, actionPayload.direction);
      }
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
        // Re-index remaining player seats
        updated.players = updated.players.map((p, idx) => ({ ...p, seatIndex: idx }));
        // Transfer host if host left and other players remain
        if (updated.players.length > 0 && !updated.players.some(p => p.id === updated.hostId)) {
          updated.hostId = updated.players[0].id;
          updated.players[0].isHost = true;
        }
        if (updated.players.length > 0) {
          updated.dealerIndex = updated.dealerIndex % updated.players.length;
          updated.activePlayerIndex = updated.activePlayerIndex % updated.players.length;
        }
      }
      break;

    case 'KICK_PLAYER':
      if (actionPayload.targetPlayerId) {
        updated.players = updated.players.filter(p => p.id !== actionPayload.targetPlayerId);
        updated.players = updated.players.map((p, idx) => ({ ...p, seatIndex: idx }));
        if (updated.players.length > 0) {
          updated.dealerIndex = updated.dealerIndex % updated.players.length;
          updated.activePlayerIndex = updated.activePlayerIndex % updated.players.length;
        }
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

  // CRITICAL REQUIREMENT: If 0 players remain in the room, delete it permanently!
  // The room PIN cannot be used or joined anymore.
  if (updated.players.length === 0) {
    roomsMap.delete(pin);
    roomEmitter.emit('room_deleted', pin);
    return null;
  }

  roomsMap.set(pin, updated);
  broadcastRoomUpdate(updated);
  return updated;
};
