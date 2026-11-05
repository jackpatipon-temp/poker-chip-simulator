import { supabase, isSupabaseConfigured } from './supabase';
import { RoomState } from '@/types/poker';
import { RealtimeChannel } from '@supabase/supabase-js';

// Cache active Supabase Realtime channels by room PIN
const activeChannels = new Map<string, RealtimeChannel>();

/**
 * Subscribes to Supabase Realtime Broadcast for instant, zero-server-load table synchronization.
 * If Supabase is configured, table updates are delivered via global WebSockets in < 50ms.
 */
export const subscribeToSupabaseRealtime = (
  pin: string,
  onUpdate: (room: RoomState) => void
): (() => void) | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const channelName = `poker-room-${pin}`;

  let channel = activeChannels.get(channelName);
  if (!channel) {
    channel = supabase.channel(channelName, {
      config: { broadcast: { self: true } },
    });
    activeChannels.set(channelName, channel);
  }

  channel
    .on('broadcast', { event: 'room_state' }, ({ payload }) => {
      if (payload && payload.roomId === pin) {
        onUpdate(payload as RoomState);
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Supabase Realtime] Connected to channel: ${channelName}`);
      }
    });

  return () => {
    if (channel) {
      supabase.removeChannel(channel).catch(() => {});
      activeChannels.delete(channelName);
    }
  };
};

/**
 * Broadcasts an updated room state through Supabase Realtime to all connected players.
 */
export const broadcastRoomViaSupabase = async (
  pin: string,
  room: RoomState
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const channelName = `poker-room-${pin}`;
  let channel = activeChannels.get(channelName);
  if (!channel) {
    channel = supabase.channel(channelName, {
      config: { broadcast: { self: true } },
    });
    activeChannels.set(channelName, channel);
    await channel.subscribe();
  }

  try {
    await channel.send({
      type: 'broadcast',
      event: 'room_state',
      payload: room,
    });
    return true;
  } catch (err) {
    console.warn('[Supabase Realtime] Broadcast failed:', err);
    return false;
  }
};
