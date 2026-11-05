import { supabase, isSupabaseConfigured } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
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
} from './poker-engine';

export interface SupabaseRoomRow {
  id: string; // pin
  state: RoomState;
  updated_at: string;
}

// Active Realtime Channel Map by room PIN (reused across subscriptions & broadcasts)
const activeSyncChannels = new Map<string, RealtimeChannel>();

export const getOrCreateRoomChannel = (pin: string): RealtimeChannel => {
  let ch = activeSyncChannels.get(pin);
  if (!ch) {
    ch = supabase.channel(`room_sync_${pin}`, {
      config: { broadcast: { self: true } },
    });
    activeSyncChannels.set(pin, ch);
  }
  return ch;
};

/**
 * Fetches the current room state from Supabase 'rooms' table.
 */
export const getSupabaseRoom = async (pin: string): Promise<RoomState | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('state')
      .eq('id', pin)
      .maybeSingle();
    if (error || !data) return null;
    return data.state as RoomState;
  } catch {
    return null;
  }
};

/**
 * Saves/updates room state in Supabase and broadcasts via WebSockets in < 30ms.
 * Broadcasts a lightweight payload (no history snapshots) to save bandwidth.
 */
export const saveSupabaseRoom = async (pin: string, room: RoomState): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  const lightweight: RoomState = {
    ...room,
    history: (room.history || []).map(h => ({
      ...h,
      snapshot: '', // Strip heavy snapshots from broadcast
    })),
  };

  // 1. FAST BROADCAST (< 30ms peer sync over open WebSocket)
  try {
    const ch = getOrCreateRoomChannel(pin);
    ch.send({
      type: 'broadcast',
      event: 'room_state',
      payload: lightweight,
    }).catch((err) => {
      console.warn('[Supabase Realtime] Broadcast send error:', err);
    });
  } catch (err) {
    console.warn('[Supabase Realtime] Broadcast failed:', err);
  }

  // 2. Persist to Supabase DB for reconnects & page refreshes
  try {
    const { error } = await supabase
      .from('rooms')
      .upsert({ id: pin, state: room, updated_at: new Date().toISOString() });

    if (error) {
      console.warn('[SupabaseRoom] DB upsert warning:', error.message);
    }
    return !error;
  } catch (err) {
    console.warn('[SupabaseRoom] Save DB failed:', err);
    return false;
  }
};

/**
 * Creates a brand new room directly in Supabase.
 */
export const createSupabaseRoom = async (
  pin: string,
  hostName: string,
  hostAvatar: string,
  startingChips: number = 1000,
  smallBlind: number = 5,
  bigBlind: number = 10,
  raiseRule: 'standard' | 'casual' = 'standard'
): Promise<RoomState | null> => {
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
  newRoom.players = [hostPlayer];

  const ok = await saveSupabaseRoom(pin, newRoom);
  return ok ? newRoom : null;
};

/**
 * Joins a room in Supabase (with reconnect support & host approval queue).
 */
export const joinSupabaseRoom = async (
  pin: string,
  playerName: string,
  playerAvatar: string,
  requestedChips: number = 1000,
  autoApprove: boolean = false,
  existingPlayerId?: string
): Promise<{ room: RoomState | null; request: JoinRequest | null; player?: Player; error?: string }> => {
  const room = await getSupabaseRoom(pin);
  if (!room) {
    return { room: null, request: null, error: 'ไม่พบห้องที่ระบุ PIN นี้' };
  }

  // 1. Reconnection by existingPlayerId
  if (existingPlayerId) {
    const playerById = room.players.find(p => p.id === existingPlayerId);
    if (playerById) {
      if (playerAvatar) playerById.avatarUrl = playerAvatar;
      if (playerName) playerById.name = playerName;
      await saveSupabaseRoom(pin, room);
      return { room, request: null, player: playerById };
    }
  }

  // 2. Reconnection by name
  const cleanName = (playerName || '').trim().toLowerCase();
  const existingPlayer = cleanName
    ? room.players.find(p => (p.name || '').trim().toLowerCase() === cleanName)
    : null;
  if (existingPlayer) {
    if (playerAvatar) existingPlayer.avatarUrl = playerAvatar;
    await saveSupabaseRoom(pin, room);
    return { room, request: null, player: existingPlayer };
  }

  // 3. Deduplicate pending requests
  const existingReq = room.pendingRequests.find(
    r => (existingPlayerId && r.userId === existingPlayerId) ||
         ((r.userName || '').trim().toLowerCase() === cleanName && cleanName !== '')
  );
  if (existingReq) {
    return { room, request: existingReq };
  }

  if (autoApprove) {
    const newPlayer: Player = {
      id: existingPlayerId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: playerName,
      avatarUrl: playerAvatar,
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
    await saveSupabaseRoom(pin, room);
    return { room, request: null, player: newPlayer };
  } else {
    const newRequest: JoinRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: existingPlayerId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userName: playerName,
      userAvatar: playerAvatar,
      requestedChips,
      createdAt: Date.now(),
    };
    room.pendingRequests.push(newRequest);
    await saveSupabaseRoom(pin, room);
    return { room, request: newRequest };
  }
};

/**
 * Dispatches any poker action (Fold, Check, Call, Raise, Start Hand, Transfer Host, etc.) to Supabase.
 * If baseRoom is provided, avoids an unnecessary GET roundtrip (< 0ms network latency).
 */
export const dispatchSupabaseRoomAction = async (
  pin: string,
  actionPayload: any,
  baseRoom?: RoomState
): Promise<RoomState | null> => {
  const room = baseRoom || (await getSupabaseRoom(pin));
  if (!room) return null;

  let updated = { ...room };

  switch (actionPayload.type) {
    case 'SET_NEXT_BLINDS':
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
      updated = startNewHand(room);
      break;
    case 'SET_DEALER':
      if (actionPayload.playerId) updated = setRoomDealer(room, actionPayload.playerId);
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
        const startNext = actionPayload.startNextHand !== false;
        updated = awardPotToWinners(room, actionPayload.winnerIds, startNext, actionPayload.potWinnerMap);
      }
      break;
    case 'UNDO':
      const undone = restoreHistorySnapshot(room);
      if (undone) updated = undone;
      break;
    case 'TOGGLE_AFK':
      if (actionPayload.playerId) {
        updated.players = updated.players.map(p =>
          p.id === actionPayload.playerId
            ? { ...p, status: p.status === 'sitting-out' ? 'active' : 'sitting-out' }
            : p
        );
      }
      break;
    case 'TRANSFER_HOST':
      if (actionPayload.targetPlayerId) {
        updated.hostId = actionPayload.targetPlayerId;
        updated.players = updated.players.map(p => ({
          ...p,
          isHost: p.id === actionPayload.targetPlayerId,
        }));
      }
      break;
    case 'LEAVE':
      if (actionPayload.playerId) {
        if (actionPayload.playerId === updated.hostId && actionPayload.newHostId) {
          const nextH = updated.players.find(p => p.id === actionPayload.newHostId);
          if (nextH) {
            updated.hostId = nextH.id;
            nextH.isHost = true;
          }
        }
        updated.players = updated.players.filter(p => p.id !== actionPayload.playerId);
        updated.players = updated.players.map((p, idx) => ({ ...p, seatIndex: idx }));
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
    case 'APPROVE':
      const reqIdx = updated.pendingRequests.findIndex(r => r.id === actionPayload.requestId);
      if (reqIdx !== -1) {
        const req = updated.pendingRequests[reqIdx];
        updated.pendingRequests.splice(reqIdx, 1);
        const newPlayer: Player = {
          id: req.userId,
          name: req.userName,
          avatarUrl: req.userAvatar,
          chips: actionPayload.chips || req.requestedChips || 1000,
          currentBet: 0,
          totalRoundBet: 0,
          status: 'active',
          seatIndex: updated.players.length,
          isDealer: false,
          isSmallBlind: false,
          isBigBlind: false,
          isTurn: false,
          isHost: false,
          isApproved: true,
          hasActedThisRound: false,
        };
        updated.players.push(newPlayer);
      }
      break;
    case 'REJECT':
      updated.pendingRequests = updated.pendingRequests.filter(r => r.id !== actionPayload.requestId);
      break;
  }

  // Delete room permanently if 0 players remain
  if (updated.players.length === 0) {
    try {
      await supabase.from('rooms').delete().eq('id', pin);
    } catch {}
    return null;
  }

  await saveSupabaseRoom(pin, updated);
  return updated;
};

/**
 * Subscribes to Supabase Realtime (both database postgres_changes and channel broadcast).
 * Uses persistent channel singleton for instant sub-30ms peer sync.
 */
export const subscribeToSupabaseRoomRealtime = (
  pin: string,
  onUpdate: (room: RoomState) => void,
  onDelete?: () => void
): (() => void) => {
  if (!isSupabaseConfigured()) return () => {};

  const channel = getOrCreateRoomChannel(pin);

  // A. Database postgres_changes (in case Realtime replication is enabled on 'rooms' table)
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'rooms',
      filter: `id=eq.${pin}`,
    },
    (payload) => {
      if (payload.eventType === 'DELETE') {
        if (onDelete) onDelete();
      } else if (payload.new && (payload.new as any).state) {
        onUpdate((payload.new as any).state as RoomState);
      }
    }
  );

  // B. Instant WebSockets Broadcast (< 30ms peer sync without waiting for DB replication)
  channel.on('broadcast', { event: 'room_state' }, ({ payload }) => {
    if (payload && payload.roomId === pin) {
      onUpdate(payload as RoomState);
    }
  });

  // Ensure channel is actively subscribed
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`[Supabase Realtime] Connected to room channel: room_sync_${pin}`);
    }
  });

  return () => {
    try {
      supabase.removeChannel(channel).catch(() => {});
      activeSyncChannels.delete(pin);
    } catch {}
  };
};

