import { isSupabaseConfigured } from './supabase';
import { RoomState, Player, JoinRequest } from '@/types/poker';
import {
  getSupabaseRoom,
  createSupabaseRoom,
  joinSupabaseRoom,
  dispatchSupabaseRoomAction,
} from './supabase-room';

/**
 * Unified Room Service that coordinates between Supabase Realtime (Serverless & Zero-Memory)
 * and Local Server fallback.
 */

export const fetchRoomState = async (pin: string): Promise<RoomState | null> => {
  if (isSupabaseConfigured()) {
    try {
      const sbRoom = await getSupabaseRoom(pin);
      if (sbRoom) return sbRoom;
    } catch {}
  }

  // Fallback to local server
  try {
    const res = await fetch(`/api/rooms/${pin}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    const data = await res.json().catch(() => null);
    return data?.room || null;
  } catch {
    return null;
  }
};

export const createRoom = async (
  pin: string,
  hostName: string,
  hostAvatar: string,
  startingChips: number = 1000,
  smallBlind: number = 5,
  bigBlind: number = 10,
  raiseRule: 'standard' | 'casual' = 'standard'
): Promise<{ pin: string; room: RoomState }> => {
  if (isSupabaseConfigured()) {
    try {
      const sbRoom = await createSupabaseRoom(pin, hostName, hostAvatar, startingChips, smallBlind, bigBlind, raiseRule);
      if (sbRoom) {
        return { pin, room: sbRoom };
      }
    } catch (e) {
      console.warn('Supabase create room failed, falling back to local server:', e);
    }
  }

  // Fallback to local server API
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hostName,
      hostAvatar,
      startingChips,
      smallBlind,
      bigBlind,
      customPin: pin,
      raiseRule,
    }),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'สร้างห้องไม่สำเร็จ');
  }
  return { pin: data.pin, room: data.room };
};

export const joinRoom = async (
  pin: string,
  playerName: string,
  playerAvatar: string,
  requestedChips: number = 1000,
  playerId?: string
): Promise<{ room: RoomState | null; request: JoinRequest | null; player?: Player; error?: string }> => {
  if (isSupabaseConfigured()) {
    try {
      const sbResult = await joinSupabaseRoom(pin, playerName, playerAvatar, requestedChips, false, playerId);
      if (sbResult && sbResult.room) {
        return sbResult;
      }
    } catch (e) {
      console.warn('Supabase join failed, falling back to local server:', e);
    }
  }

  // Fallback to local server API
  const res = await fetch(`/api/rooms/${pin}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'JOIN',
      playerName,
      playerAvatar,
      requestedChips,
      playerId,
    }),
  });

  const data = await res.json();
  if (!data.success) {
    return { room: null, request: null, error: data.error || 'เข้าร่วมห้องไม่สำเร็จ' };
  }
  return { room: data.room, request: data.request, player: data.player };
};

export const dispatchRoomAction = async (
  pin: string,
  payload: Record<string, unknown>,
  baseRoom?: RoomState
): Promise<RoomState | null> => {
  if (isSupabaseConfigured()) {
    try {
      const updated = await dispatchSupabaseRoomAction(pin, payload, baseRoom);
      if (updated !== null && updated !== undefined) {
        return updated;
      }
    } catch (e) {
      console.warn('Supabase action failed, falling back to local server:', e);
    }
  }

  // Fallback to local server API with 4s timeout protection
  const abortCtrl = new AbortController();
  const timeoutId = setTimeout(() => abortCtrl.abort(), 4000);

  try {
    const res = await fetch(`/api/rooms/${pin}?t=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
      body: JSON.stringify(payload),
      signal: abortCtrl.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => null);
    return data?.room || null;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Local action dispatch error:', err);
    return null;
  }
};
