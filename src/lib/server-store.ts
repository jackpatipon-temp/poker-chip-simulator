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
  setRoomNextBlinds,
  progressRoomNextStreet,
  requestRebuyChips,
  approveRoomRequest,
  rejectRoomRequest,
  removePlayerFromRoom,
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

/**
 * Broadcasts room state to all SSE subscribers.
 * CRITICAL: Strips heavy history snapshots to reduce payload from ~500KB to ~5KB.
 */
export const broadcastRoomUpdate = (room: RoomState) => {
  const lightweight: RoomState = {
    ...room,
    history: room.history.map(h => ({
      ...h,
      snapshot: '', // Strip snapshot strings from broadcast — saves 90%+ payload
    })),
  };
  roomEmitter.emit('room_updated', lightweight);
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
  const room = roomsMap.get(pin);
  if (!room || room.players.length === 0) {
    if (room && room.players.length === 0) {
      roomsMap.delete(pin);
      roomEmitter.emit('room_deleted', pin);
    }
    return null;
  }
  return room;
};

export const createServerRoom = (
  pin: string,
  hostName: string,
  hostAvatar: string,
  startingChips: number = 1000,
  smallBlind: number = 5,
  bigBlind: number = 10,
  raiseRule: 'standard' | 'casual' = 'standard'
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

  const newRoom = createInitialRoomState(pin, hostPlayer, raiseRule);
  newRoom.smallBlind = smallBlind;
  newRoom.bigBlind = bigBlind;
  newRoom.pot = 0;
  newRoom.currentHighestBet = 0;
  newRoom.minRaise = raiseRule === 'casual' ? 1 : bigBlind;
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
  autoApprove: boolean = false,
  existingPlayerId?: string
): { room: RoomState | null; request: JoinRequest | null; player?: Player; error?: string } => {
  const room = roomsMap.get(pin);
  if (!room || room.players.length === 0) {
    if (room && room.players.length === 0) {
      roomsMap.delete(pin);
      roomEmitter.emit('room_deleted', pin);
    }
    return { room: null, request: null, error: 'ไม่พบห้องที่ระบุ หรือห้องถูกปิดแล้วเนื่องจากไม่มีผู้เล่นเหลืออยู่' };
  }

  // 1. Reconnection by existingPlayerId: Seamlessly reclaim existing seat with preserved chips & state!
  if (existingPlayerId) {
    const playerById = room.players.find(p => p.id === existingPlayerId);
    if (playerById) {
      if (playerAvatar) playerById.avatarUrl = playerAvatar;
      if (playerName) playerById.name = playerName;
      broadcastRoomUpdate(room);
      return { room, request: null, player: playerById };
    }
  }

  // 2. Reconnection by name: Seamlessly reclaim existing seat if player name matches
  const cleanName = (playerName || '').trim().toLowerCase();
  const existingPlayer = cleanName
    ? room.players.find(p => (p.name || '').trim().toLowerCase() === cleanName)
    : null;
  if (existingPlayer) {
    if (playerAvatar) {
      existingPlayer.avatarUrl = playerAvatar;
      broadcastRoomUpdate(room);
    }
    return { room, request: null, player: existingPlayer };
  }

  // 3. Prevent duplicate requests: Check if player already has a pending approval request
  const existingReq = room.pendingRequests.find(
    r => (existingPlayerId && r.userId === existingPlayerId) ||
         ((r.userName || '').trim().toLowerCase() === cleanName && cleanName !== '')
  );
  if (existingReq) {
    return { room, request: existingReq };
  }

  if (autoApprove) {
    // Directly seat the player with approved status
    const newPlayer: Player = {
      id: existingPlayerId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
      userId: existingPlayerId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
  chips: number,
  requesterId?: string
): RoomState | null => {
  const room = roomsMap.get(pin);
  if (!room) return null;

  if (requesterId && requesterId !== room.hostId) {
    console.warn('Unauthorized approveJoinRequest by non-host:', requesterId);
    return room;
  }

  const updated = approveRoomRequest(room, requestId, chips);
  roomsMap.set(pin, updated);
  broadcastRoomUpdate(updated);
  return updated;
};

export const rejectJoinRequest = (
  pin: string,
  requestId: string,
  requesterId?: string
): RoomState | null => {
  const room = roomsMap.get(pin);
  if (!room) return null;

  if (requesterId && requesterId !== room.hostId) {
    console.warn('Unauthorized rejectJoinRequest by non-host:', requesterId);
    return room;
  }

  const updated = rejectRoomRequest(room, requestId);
  roomsMap.set(pin, updated);
  broadcastRoomUpdate(updated);
  return updated;
};

export const dispatchServerRoomAction = (
  pin: string,
  actionPayload: {
    type:
      | 'ACTION'
      | 'START_HAND'
      | 'NEXT_STREET'
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
      | 'MOVE_SEAT'
      | 'TRANSFER_HOST'
      | 'SET_NEXT_BLINDS'
      | 'REQUEST_REBUY'
      | 'APPROVE'
      | 'REJECT';
    requesterId?: string;
    playerId?: string;
    targetPlayerId?: string;
    newHostId?: string;
    requestId?: string;
    chips?: number;
    direction?: 'up' | 'down';
    action?: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
    raiseAmount?: number;
    totalAmount?: number;
    smallBlind?: number;
    bigBlind?: number;
    winnerIds?: string[];
    potWinnerMap?: Record<string, string[]>;
    voteTitle?: string;
    voteOptions?: string[];
    voteOptionId?: string;
  }
): RoomState | null => {
  const room = roomsMap.get(pin);
  if (!room) return null;

  let updated = room;
  const requester = actionPayload.requesterId || actionPayload.playerId;
  const isHost = requester === updated.hostId;

  switch (actionPayload.type) {
    case 'SET_NEXT_BLINDS':
      if (!isHost) {
        console.warn('Unauthorized SET_NEXT_BLINDS attempt by non-host:', requester);
        break;
      }
      if (actionPayload.smallBlind && actionPayload.bigBlind) {
        updated = setRoomNextBlinds(room, actionPayload.smallBlind, actionPayload.bigBlind);
      }
      break;

    case 'ACTION':
      if (actionPayload.playerId && actionPayload.action) {
        const raiseVal = actionPayload.totalAmount ?? actionPayload.raiseAmount;
        updated = handlePlayerAction(room, actionPayload.playerId, actionPayload.action, raiseVal);
      }
      break;

    case 'START_HAND':
      if (!isHost) {
        console.warn('Unauthorized START_HAND attempt by non-host:', requester);
        break;
      }
      updated = startNewHand(room);
      break;

    case 'NEXT_STREET':
      {
        const isDealer = updated.players.some(p => p.id === requester && p.isDealer);
        if (!isHost && !isDealer) {
          console.warn('Unauthorized NEXT_STREET attempt by non-host/non-dealer:', requester);
          break;
        }
        updated = progressRoomNextStreet(room);
      }
      break;

    case 'SET_DEALER':
      if (!isHost) {
        console.warn('Unauthorized SET_DEALER attempt by non-host:', requester);
        break;
      }
      if (actionPayload.playerId) {
        updated = setRoomDealer(room, actionPayload.playerId);
      }
      break;

    case 'RANDOMIZE_DEALER':
      if (!isHost) {
        console.warn('Unauthorized RANDOMIZE_DEALER attempt by non-host:', requester);
        break;
      }
      updated = randomizeRoomDealer(room);
      break;

    case 'SWAP_SEATS':
      if (!isHost) {
        console.warn('Unauthorized SWAP_SEATS attempt by non-host:', requester);
        break;
      }
      if (actionPayload.playerId && actionPayload.targetPlayerId) {
        updated = swapPlayerSeats(room, actionPayload.playerId, actionPayload.targetPlayerId);
      }
      break;

    case 'MOVE_SEAT':
      if (!isHost) {
        console.warn('Unauthorized MOVE_SEAT attempt by non-host:', requester);
        break;
      }
      if (actionPayload.playerId && actionPayload.direction) {
        updated = movePlayerSeat(room, actionPayload.playerId, actionPayload.direction);
      }
      break;

    case 'SHOWDOWN_WINNERS':
      if (!isHost) {
        console.warn('Unauthorized SHOWDOWN_WINNERS attempt by non-host:', requester);
        break;
      }
      {
        const map = (actionPayload as any).potWinnerMap;
        let wIds: string[] = actionPayload.winnerIds || [];
        if (wIds.length === 0 && map) {
          wIds = Array.from(new Set(Object.values(map).flat() as string[]));
        }
        if (wIds.length > 0) {
          const startNext = (actionPayload as any).startNextHand !== false;
          updated = awardPotToWinners(room, wIds, startNext, map);
        }
      }
      break;

    case 'UNDO':
      if (!isHost) {
        console.warn('Unauthorized UNDO attempt by non-host:', requester);
        break;
      }
      const undone = restoreHistorySnapshot(room);
      if (undone) updated = undone;
      break;

    case 'TOGGLE_AFK':
      if (actionPayload.playerId) {
        if (!isHost && requester !== actionPayload.playerId) {
          console.warn('Unauthorized TOGGLE_AFK attempt:', requester);
          break;
        }
        updated.players = updated.players.map(p => {
          if (p.id === actionPayload.playerId) {
            const nextStatus = p.status === 'sitting-out' ? 'active' : 'sitting-out';
            return { ...p, status: nextStatus };
          }
          return p;
        });
      }
      break;

    case 'TRANSFER_HOST':
      if (!isHost) {
        console.warn('Unauthorized TRANSFER_HOST attempt by non-host:', requester);
        break;
      }
      if (actionPayload.targetPlayerId) {
        const nextHost = updated.players.find(p => p.id === actionPayload.targetPlayerId);
        if (nextHost) {
          updated.hostId = nextHost.id;
          updated.players = updated.players.map(p => ({
            ...p,
            isHost: p.id === nextHost.id,
          }));
        }
      }
      break;

    case 'REQUEST_REBUY':
      if (actionPayload.playerId && actionPayload.chips) {
        updated = requestRebuyChips(room, actionPayload.playerId, actionPayload.chips);
      }
      break;

    case 'APPROVE':
      if (!isHost) {
        console.warn('Unauthorized APPROVE attempt by non-host:', requester);
        break;
      }
      if (actionPayload.requestId) {
        updated = approveRoomRequest(room, actionPayload.requestId, actionPayload.chips);
      }
      break;

    case 'REJECT':
      if (!isHost) {
        console.warn('Unauthorized REJECT attempt by non-host:', requester);
        break;
      }
      if (actionPayload.requestId) {
        updated = rejectRoomRequest(room, actionPayload.requestId);
      }
      break;

    case 'LEAVE':
      if (actionPayload.playerId) {
        updated = removePlayerFromRoom(room, actionPayload.playerId, actionPayload.newHostId);
      }
      break;

    case 'KICK_PLAYER':
      if (!isHost) {
        console.warn('Unauthorized KICK_PLAYER attempt by non-host:', requester);
        break;
      }
      if (actionPayload.targetPlayerId && actionPayload.targetPlayerId !== updated.hostId) {
        updated.players = updated.players.filter(p => p.id !== actionPayload.targetPlayerId);
        updated.players = updated.players.map((p, idx) => ({ ...p, seatIndex: idx }));
        if (updated.players.length > 0) {
          updated.dealerIndex = updated.dealerIndex % updated.players.length;
          updated.activePlayerIndex = updated.activePlayerIndex % updated.players.length;
        }
      }
      break;

    case 'VOTE_CREATE':
      if (!isHost) {
        console.warn('Unauthorized VOTE_CREATE attempt by non-host:', requester);
        break;
      }
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
      if (!isHost) {
        console.warn('Unauthorized VOTE_CLOSE attempt by non-host:', requester);
        break;
      }
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
