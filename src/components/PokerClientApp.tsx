'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RoomState, Player } from '@/types/poker';
import { HeaderBar } from '@/components/HeaderBar';
import { PokerTable } from '@/components/PokerTable';
import { ActionControls } from '@/components/ActionControls';
import { RaiseModal } from '@/components/RaiseModal';
import { ShowdownModal } from '@/components/ShowdownModal';
import { ShowdownResultModal } from '@/components/ShowdownResultModal';
import { AdminPanel } from '@/components/AdminPanel';
import { VoteModal } from '@/components/VoteModal';
import { SettingsModal } from '@/components/SettingsModal';
import { DisclaimerModal } from '@/components/DisclaimerModal';
import { LobbyView } from '@/components/LobbyView';
import { HostTransferModal } from '@/components/HostTransferModal';
import { RoomLogsModal } from '@/components/RoomLogsModal';
import { RebuyModal } from '@/components/RebuyModal';
import { TurnEdgeWaveOverlay } from '@/components/TurnEdgeWaveOverlay';
import { subscribeToSupabaseRoomRealtime } from '@/lib/supabase-room';
import { createRoom, joinRoom, dispatchRoomAction, fetchRoomState } from '@/lib/room-service';
import { handlePlayerAction, awardPotToWinners, startNewHand, setRoomNextBlinds, progressRoomNextStreet } from '@/lib/poker-engine';
import { Check, X, Loader2 } from 'lucide-react';
import { sound, triggerHaptic } from '@/lib/sound';
import {
  supabase,
  isSupabaseConfigured,
  signInWithGoogle,
  signOutGoogle,
  extractGoogleProfile,
  GoogleUserProfile,
} from '@/lib/supabase';

interface PokerClientAppProps {
  initialPin?: string | null;
  initialUserId?: string | null;
  initialRoom?: RoomState | null;
}

export function PokerClientApp({
  initialPin,
  initialUserId,
  initialRoom,
}: PokerClientAppProps) {
  // Avoid hydration mismatch (#418): initialize strictly from props, then sync with localStorage on mount
  const [currentPin, setCurrentPin] = useState<string | null>(initialPin || null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialUserId || null);
  const [roomState, setRoomState] = useState<RoomState | null>(initialRoom || null);

  // Restore saved session from localStorage after hydration without causing mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pinFromUrl = urlParams.get('pin');
      const userFromUrl = urlParams.get('userId');
      const pin = pinFromUrl || localStorage.getItem('poker_room_pin');
      const user = userFromUrl || localStorage.getItem('poker_user_id');
      if (pin && !initialPin) setCurrentPin(pin);
      if (user && !initialUserId) setCurrentUserId(user);
    }
  }, [initialPin, initialUserId]);

  // Modals state
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRoomLogsOpen, setIsRoomLogsOpen] = useState(false);
  const [isRebuyModalOpen, setIsRebuyModalOpen] = useState(false);
  const [isHostTransferModalOpen, setIsHostTransferModalOpen] = useState(false);
  const [isJoinRejected, setIsJoinRejected] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [closedResultId, setClosedResultId] = useState<string | null>(null);

  // Sound and Haptic preferences
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  // Google Authentication State
  const [authUser, setAuthUser] = useState<GoogleUserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Monitor Google OAuth session via Supabase
  useEffect(() => {
    let isMounted = true;

    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (isMounted) {
          if (session?.user) {
            setAuthUser(extractGoogleProfile(session.user));
          }
          setIsAuthLoading(false);
        }
      }).catch(() => {
        if (isMounted) setIsAuthLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isMounted) {
          if (session?.user) {
            setAuthUser(extractGoogleProfile(session.user));
          } else {
            setAuthUser(null);
          }
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  const handleLoginWithGoogle = async () => {
    await signInWithGoogle();
  };

  const handleLogoutGoogle = async () => {
    await signOutGoogle();
    setAuthUser(null);
  };

  // Polling ref to prevent overlapping requests
  const isPollingRef = useRef(false);
  const consecutive404Ref = useRef(0);

  // Always display Disclaimer modal on every site visit / fresh load
  useEffect(() => {
    setIsDisclaimerOpen(true);
  }, []);

  // Sync browser Back/Forward history buttons with room state
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const urlParams = new URLSearchParams(window.location.search);
      const pin = urlParams.get('pin');
      const userId = urlParams.get('userId');
      if (!pin) {
        setCurrentPin(null);
        setRoomState(null);
        setCurrentUserId(null);
      } else {
        setCurrentPin(pin);
        if (userId) setCurrentUserId(userId);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Hybrid Real-Time Engine: Supabase Realtime preferred, SSE only as fallback
  useEffect(() => {
    if (!currentPin) return;

    let isMounted = true;
    let eventSource: EventSource | null = null;
    const useSupabase = isSupabaseConfigured();

    // 1. Primary: Supabase Realtime (zero server load, sub-30ms global WebSockets)
    const unsubSupabase = subscribeToSupabaseRoomRealtime(
      currentPin,
      (updated) => {
        if (!isMounted) return;
        setRoomState(updated);
      },
      () => {
        if (!isMounted) return;
        setRoomState(null);
      }
    );

    // 2. Fallback ONLY when Supabase is NOT configured: use SSE
    if (!useSupabase) {
      try {
        eventSource = new EventSource(`/api/rooms/${currentPin}/stream`);
        eventSource.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data && data.roomId) {
              setRoomState(data);
            }
          } catch {}
        };
        eventSource.onerror = () => {
          // SSE auto-reconnects
        };
      } catch {}
    }

    // 3. Fallback polling ONLY when Supabase is NOT configured (every 6s)
    let interval: ReturnType<typeof setInterval> | null = null;
    if (!useSupabase) {
      const adaptivePoll = async () => {
        if (!isMounted || isPollingRef.current) return;
        isPollingRef.current = true;
        try {
          const latest = await fetchRoomState(currentPin);
          if (latest && isMounted) {
            setRoomState(latest);
          }
        } catch {
        } finally {
          isPollingRef.current = false;
        }
      };
      interval = setInterval(adaptivePoll, 6000);
    }

    return () => {
      isMounted = false;
      if (unsubSupabase) unsubSupabase();
      if (eventSource) eventSource.close();
      if (interval) clearInterval(interval);
    };
  }, [currentPin]);

  // Dispatch game action through unified room service (Supabase Realtime or local fallback)
  const sendRoomAction = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!currentPin) return;
      setIsSubmittingAction(true);
      try {
        const payloadWithRequester = {
          requesterId: currentUserId,
          ...payload,
        };
        const baseClone = roomState ? JSON.parse(JSON.stringify(roomState)) : undefined;
        const updated = await dispatchRoomAction(currentPin, payloadWithRequester, baseClone);
        if (updated) {
          setRoomState(updated);
        }
      } catch (err) {
        console.warn('Action dispatch warning:', err);
      } finally {
        setIsSubmittingAction(false);
      }
    },
    [currentPin, currentUserId, roomState]
  );

  // Create Room handler
  const handleCreateRoom = async (
    hostName: string,
    chips: number,
    sb: number,
    bb: number,
    customPin?: string,
    hostAvatar?: string,
    raiseRule?: 'standard' | 'casual'
  ) => {
    const avatar =
      hostAvatar ||
      authUser?.avatarUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
    const finalHostName = (hostName || authUser?.name || 'Host Admin').trim();

    const roomPin = customPin || Math.floor(1000 + Math.random() * 9000).toString();
    const result = await createRoom(roomPin, finalHostName, avatar, chips, sb, bb, raiseRule);

    const hostPlayerId = result.room.players[0].id;
    setCurrentPin(result.pin);
    setCurrentUserId(hostPlayerId);
    setRoomState(result.room);

    if (typeof window !== 'undefined') {
      localStorage.setItem('poker_room_pin', result.pin);
      localStorage.setItem('poker_user_id', hostPlayerId);
      window.history.pushState(
        {},
        '',
        `/?pin=${encodeURIComponent(result.pin)}&userId=${encodeURIComponent(hostPlayerId)}`
      );
    }
  };

  // Join Room handler
  const handleJoinRoom = async (
    pin: string,
    playerName: string,
    chips: number,
    playerAvatar?: string
  ) => {
    const avatar =
      playerAvatar ||
      authUser?.avatarUrl ||
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80';
    const finalPlayerName = (playerName || authUser?.name || 'Player').trim();

    const existingUserId = currentUserId || (typeof window !== 'undefined' ? localStorage.getItem('poker_user_id') || undefined : undefined);
    const result = await joinRoom(pin, finalPlayerName, avatar, chips, existingUserId);

    if (result.error) {
      throw new Error(result.error);
    }
    if (!result.room) {
      throw new Error('ไม่พบห้องที่ระบุ');
    }

    setCurrentPin(pin);
    setRoomState(result.room);

    let assignedId = '';
    if (result.player) {
      assignedId = result.player.id;
    } else if (result.request) {
      assignedId = result.request.userId;
    } else {
      const existing = result.room.players.find(
        (p: Player) => p.name.toLowerCase() === playerName.toLowerCase()
      );
      if (existing) assignedId = existing.id;
    }

    if (assignedId) {
      setCurrentUserId(assignedId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('poker_room_pin', pin);
        localStorage.setItem('poker_user_id', assignedId);
        window.history.pushState(
          {},
          '',
          `/?pin=${encodeURIComponent(pin)}&userId=${encodeURIComponent(assignedId)}`
        );
      }
    }
  };

  // Helper variables
  const currentPlayer = roomState?.players.find((p) => p.id === currentUserId) || null;
  const isHost = currentUserId === roomState?.hostId;
  const activeActor = roomState ? roomState.players[roomState.activePlayerIndex] : null;
  const isMyTurn = activeActor?.id === currentUserId;
  const isHandActive = Boolean(roomState?.isFirstHandStarted && roomState?.street !== 'showdown');
  const isWaitingForApproval = roomState?.pendingRequests.some((r) => r.userId === currentUserId);

  // Host Notification: chime sound + haptic when a new join request arrives
  const prevPendingCountRef = useRef(0);
  useEffect(() => {
    const currentCount = roomState?.pendingRequests?.length || 0;
    if (isHost && currentCount > prevPendingCountRef.current) {
      sound.playNotification();
      triggerHaptic([120, 60, 120]);
    }
    prevPendingCountRef.current = currentCount;
  }, [isHost, roomState?.pendingRequests?.length]);

  // Joining Player Notification: notify if join request was rejected by Host
  const prevWasWaitingRef = useRef(false);
  useEffect(() => {
    if (isWaitingForApproval) {
      prevWasWaitingRef.current = true;
    } else if (
      prevWasWaitingRef.current &&
      !currentPlayer &&
      roomState &&
      !isWaitingForApproval
    ) {
      setIsJoinRejected(true);
      prevWasWaitingRef.current = false;
    }
  }, [isWaitingForApproval, currentPlayer, roomState]);

  // Turn Notification: Vibrate & Sound Alert when it becomes user's turn
  const prevIsMyTurnRef = useRef(false);
  useEffect(() => {
    const isHandActive = Boolean(roomState?.isFirstHandStarted && roomState?.street !== 'showdown');
    if (isMyTurn && !prevIsMyTurnRef.current && isHandActive) {
      sound.playTurnNotice();
      triggerHaptic([140, 70, 160]);
    }
    prevIsMyTurnRef.current = Boolean(isMyTurn && isHandActive);
  }, [isMyTurn, roomState?.isFirstHandStarted, roomState?.street]);

  // Actions (Instant 0ms Local Poker Engine: UI updates & turn advances immediately without waiting for network!)
  const handleFold = useCallback(() => {
    const actorId = currentUserId || activeActor?.id;
    if (!actorId) return;

    setRoomState(prev => (prev ? handlePlayerAction(prev, actorId, 'fold') : prev));
    sendRoomAction({ type: 'ACTION', playerId: actorId, action: 'fold' });
  }, [currentUserId, activeActor, sendRoomAction]);

  const handleCheck = useCallback(() => {
    const actorId = currentUserId || activeActor?.id;
    if (!actorId) return;

    setRoomState(prev => (prev ? handlePlayerAction(prev, actorId, 'check') : prev));
    sendRoomAction({ type: 'ACTION', playerId: actorId, action: 'check' });
  }, [currentUserId, activeActor, sendRoomAction]);

  const handleCall = useCallback(() => {
    const actorId = currentUserId || activeActor?.id;
    if (!actorId) return;

    setRoomState(prev => (prev ? handlePlayerAction(prev, actorId, 'call') : prev));
    sendRoomAction({ type: 'ACTION', playerId: actorId, action: 'call' });
  }, [currentUserId, activeActor, sendRoomAction]);

  const handleConfirmRaise = useCallback(
    (totalAmount: number) => {
      const actorId = currentUserId || activeActor?.id;
      if (!actorId) return;

      setIsRaiseModalOpen(false);
      setRoomState(prev => (prev ? handlePlayerAction(prev, actorId, 'raise', totalAmount) : prev));

      sendRoomAction({
        type: 'ACTION',
        playerId: actorId,
        action: 'raise',
        raiseAmount: totalAmount,
        totalAmount: totalAmount,
      });
    },
    [currentUserId, activeActor, sendRoomAction]
  );

  const handleStartHand = useCallback(() => {
    setRoomState(prev => (prev ? startNewHand(prev) : prev));
    sendRoomAction({ type: 'START_HAND' });
  }, [sendRoomAction]);

  const handleNextStreet = useCallback(() => {
    setRoomState(prev => (prev ? progressRoomNextStreet(JSON.parse(JSON.stringify(prev))) : prev));
    sendRoomAction({ type: 'NEXT_STREET' });
    sound.playCardDeal();
    triggerHaptic(30);
  }, [sendRoomAction]);

  const handleUndo = useCallback(() => {
    sendRoomAction({ type: 'UNDO' });
  }, [sendRoomAction]);

  const handleConfirmWinners = useCallback(
    (winnerIds: string[], potWinnerMap?: Record<string, string[]>) => {
      setRoomState(prev => (prev ? awardPotToWinners(JSON.parse(JSON.stringify(prev)), winnerIds, true, potWinnerMap) : prev));
      sendRoomAction({ type: 'SHOWDOWN_WINNERS', winnerIds, startNextHand: true, potWinnerMap });
    },
    [sendRoomAction]
  );

  const handleUpdateBlinds = useCallback(
    (sb: number, bb: number) => {
      setRoomState(prev => (prev ? setRoomNextBlinds(prev, sb, bb) : prev));
      sendRoomAction({ type: 'SET_NEXT_BLINDS', smallBlind: sb, bigBlind: bb });
    },
    [sendRoomAction]
  );

  const handleApproveRequest = useCallback(
    (requestId: string, chips: number) => {
      sendRoomAction({ type: 'APPROVE', requestId, chips });
    },
    [sendRoomAction]
  );

  const handleRejectRequest = useCallback(
    (requestId: string) => {
      sendRoomAction({ type: 'REJECT', requestId });
    },
    [sendRoomAction]
  );

  const handleRequestRebuy = useCallback(
    (chips: number) => {
      if (!currentUserId) return;
      sendRoomAction({ type: 'REQUEST_REBUY', playerId: currentUserId, chips });
    },
    [currentUserId, sendRoomAction]
  );

  const handleCreateVote = useCallback(
    (title: string, options: string[]) => {
      sendRoomAction({
        type: 'VOTE_CREATE',
        playerId: currentUserId,
        voteTitle: title,
        voteOptions: options,
      });
    },
    [currentUserId, sendRoomAction]
  );

  const handleSetDealer = useCallback(
    (playerId: string) => {
      sendRoomAction({ type: 'SET_DEALER', playerId });
    },
    [sendRoomAction]
  );

  const handleRandomizeDealer = useCallback(() => {
    sendRoomAction({ type: 'RANDOMIZE_DEALER' });
  }, [sendRoomAction]);

  const handleMoveSeat = useCallback(
    (playerId: string, direction: 'up' | 'down') => {
      sendRoomAction({ type: 'MOVE_SEAT', playerId, direction });
    },
    [sendRoomAction]
  );

  const handleToggleAfk = useCallback(
    (playerId: string) => {
      sendRoomAction({ type: 'TOGGLE_AFK', playerId });
    },
    [sendRoomAction]
  );

  const handleCastVote = useCallback(
    (optionId: string) => {
      sendRoomAction({
        type: 'VOTE_CAST',
        playerId: currentUserId,
        voteOptionId: optionId,
      });
    },
    [currentUserId, sendRoomAction]
  );

  const handleCloseVote = useCallback(() => {
    sendRoomAction({ type: 'VOTE_CLOSE' });
  }, [sendRoomAction]);

  const handleToggleSittingOut = useCallback(() => {
    if (!currentUserId) return;
    sendRoomAction({ type: 'TOGGLE_AFK', playerId: currentUserId });
  }, [currentUserId, sendRoomAction]);

  const handleKickPlayer = useCallback(
    (targetPlayerId: string) => {
      sendRoomAction({ type: 'KICK_PLAYER', targetPlayerId });
    },
    [sendRoomAction]
  );

  const handleTransferHost = useCallback(
    (targetPlayerId: string) => {
      sendRoomAction({ type: 'TRANSFER_HOST', targetPlayerId });
    },
    [sendRoomAction]
  );

  const handleLeaveRoom = useCallback(async (newHostId?: string) => {
    if (currentUserId && currentPin) {
      try {
        await dispatchRoomAction(currentPin, {
          type: 'LEAVE',
          playerId: currentUserId,
          newHostId: newHostId,
        }, roomState || undefined).catch(() => {});

        await fetch(`/api/rooms/${currentPin}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'LEAVE',
            playerId: currentUserId,
            newHostId: newHostId,
          }),
        }).catch(() => {});
      } catch {}
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('poker_room_pin');
        localStorage.removeItem('poker_user_id');
      } catch {}
      window.history.pushState({}, '', '/');
    }
    setCurrentPin(null);
    setRoomState(null);
    setCurrentUserId(null);
    setIsSettingsOpen(false);
    setIsHostTransferModalOpen(false);
  }, [currentPin, currentUserId, roomState]);

  const handleInitiateLeave = useCallback(() => {
    const hasOtherPlayers = (roomState?.players || []).some(p => p.id !== currentUserId);
    if (isHost && hasOtherPlayers) {
      setIsSettingsOpen(false);
      setIsHostTransferModalOpen(true);
    } else {
      handleLeaveRoom();
    }
  }, [isHost, roomState?.players, currentUserId, handleLeaveRoom]);





  return (
    <div className="app-container">
      {/* SCENARIO A: LOBBY VIEW (NO ROOM PIN IN URL OR STATE) */}
      {!currentPin ? (
        <LobbyView
          localIp="192.168.1.106"
          user={authUser}
          isAuthLoading={isAuthLoading}
          onLoginWithGoogle={handleLoginWithGoogle}
          onLogoutGoogle={handleLogoutGoogle}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onOpenDisclaimer={() => setIsDisclaimerOpen(true)}
        />
      ) : !roomState ? (
        /* SCENARIO B: LOADING POKER TABLE STATE (WITH BULLETPROOF NATIVE EXIT) */
        <div
          id="loading-room-view"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            gap: 16,
            textAlign: 'center',
            padding: 24,
          }}
        >
          <Loader2 size={44} color="#10b981" className="animate-spin" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f3f4f6' }}>
            กำลังเชื่อมต่อเข้าโต๊ะโป๊กเกอร์...
          </h2>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              padding: '6px 16px',
              borderRadius: 12,
              color: '#f59e0b',
              fontSize: '1.1rem',
              fontWeight: 800,
            }}
          >
            ห้อง PIN: {currentPin}
          </div>
          <a
            href="/"
            id="loading-back-btn"
            className="secondary-btn"
            style={{
              marginTop: 12,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              padding: '10px 24px',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.preventDefault();
              handleLeaveRoom();
            }}
          >
            ย้อนกลับไปหน้าแรก
          </a>
        </div>
      ) : (
        /* SCENARIO C: ACTIVE POKER TABLE (RENDERED IMMEDIATELY VIA SSR!) */
        <>
          {/* Host Instant Approval Banner */}
          {isHost && roomState.pendingRequests.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 60,
                left: 12,
                right: 12,
                background: 'rgba(139, 92, 246, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: 14,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 30,
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                animation: 'slideUp 0.3s ease',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'white', fontWeight: 600 }}>
                {roomState.pendingRequests[0].type === 'rebuy' ? (
                  <>
                    💰 <strong>{roomState.pendingRequests[0].userName}</strong> ขอเพิ่มชิป (+{roomState.pendingRequests[0].requestedChips?.toLocaleString()} ชิป)
                  </>
                ) : (
                  <>
                    🔔 <strong>{roomState.pendingRequests[0].userName}</strong> ขอเข้าโต๊ะ ({roomState.pendingRequests[0].requestedChips?.toLocaleString()} ชิป)
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: 30, height: 30, background: '#10b981', color: 'white' }}
                  onClick={() =>
                    handleApproveRequest(
                      roomState.pendingRequests[0].id,
                      roomState.pendingRequests[0].requestedChips
                    )
                  }
                  title="อนุมัติ"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: 30, height: 30, background: '#ef4444', color: 'white' }}
                  onClick={() => handleRejectRequest(roomState.pendingRequests[0].id)}
                  title="ปฏิเสธ"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Waiting for Host Approval Overlay for Joining Player */}
          {isWaitingForApproval && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ textAlign: 'center', gap: 14 }}>
                <Loader2 size={36} color="#3b82f6" className="animate-spin" style={{ margin: '0 auto' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>ส่งคำขอเข้าห้องเรียบร้อย</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  รหัสห้อง PIN: <strong style={{ color: '#f59e0b' }}>{currentPin}</strong>
                  <br />
                  กำลังรอ Admin อนุมัติบนเครื่องโฮสต์...
                </p>
                <a
                  href="/"
                  className="secondary-btn"
                  style={{
                    marginTop: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    padding: '8px 20px',
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLeaveRoom();
                  }}
                >
                  ยกเลิกและกลับสู่หน้าหลัก
                </a>
              </div>
            </div>
          )}

          {/* Animated Wave Glow Overlay around screen edges when it's the viewing player's turn */}
          <TurnEdgeWaveOverlay isActive={Boolean(isMyTurn && isHandActive && !roomState.isAwaitingNextStreet)} />

          {/* Header Bar */}
          <HeaderBar
            street={roomState.street}
            smallBlind={roomState.smallBlind}
            bigBlind={roomState.bigBlind}
            ante={roomState.ante}
            isHost={isHost}
            isSittingOut={currentPlayer?.status === 'sitting-out'}
            userAvatar={currentPlayer?.avatarUrl || authUser?.avatarUrl}
            userName={currentPlayer?.name || authUser?.name}
            onToggleSittingOut={handleToggleSittingOut}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAdmin={isHost ? () => setIsAdminPanelOpen(true) : () => {}}
            onOpenLogs={isHost ? () => setIsRoomLogsOpen(true) : undefined}
            onOpenRebuy={() => setIsRebuyModalOpen(true)}
          />

          {/* Oval Table */}
          <PokerTable
            pot={roomState.pot}
            street={roomState.street}
            players={roomState.players}
            currentUserId={currentUserId || ''}
            roomPin={currentPin}
            isHost={isHost}
            isAwaitingNextStreet={roomState.isAwaitingNextStreet}
            onNextStreet={handleNextStreet}
            onStartHand={isHost ? handleStartHand : undefined}
            onOpenSeating={isHost ? () => setIsAdminPanelOpen(true) : undefined}
          />

          {/* Bottom Controls */}
          <ActionControls
            player={currentPlayer || activeActor}
            activeActor={activeActor}
            currentHighestBet={roomState.currentHighestBet}
            minRaise={roomState.minRaise}
            isMyTurn={isMyTurn}
            isHandStarted={Boolean(roomState.isFirstHandStarted && roomState.street !== 'showdown')}
            isSubmitting={isSubmittingAction}
            isAwaitingNextStreet={roomState.isAwaitingNextStreet}
            raiseRule={roomState.raiseRule}
            onFold={handleFold}
            onCheck={handleCheck}
            onCall={handleCall}
            onOpenRaiseModal={() => setIsRaiseModalOpen(true)}
            onOpenRebuy={() => setIsRebuyModalOpen(true)}
          />

          {/* Raise Modal */}
          <RaiseModal
            isOpen={isRaiseModalOpen}
            player={activeActor || currentPlayer}
            currentHighestBet={roomState.currentHighestBet}
            minRaise={roomState.minRaise}
            bigBlind={roomState.bigBlind}
            pot={roomState.pot}
            raiseRule={roomState.raiseRule}
            onClose={() => setIsRaiseModalOpen(false)}
            onConfirmRaise={handleConfirmRaise}
          />

          {/* Showdown Modal */}
          <ShowdownModal
            isOpen={roomState.street === 'showdown'}
            pot={roomState.pot}
            sidePots={roomState.sidePots}
            players={roomState.players}
            winnerIds={roomState.winnerIds || []}
            isHost={isHost}
            onConfirmWinners={handleConfirmWinners}
            onNextHand={handleStartHand}
            onUndo={handleUndo}
          />

          {/* Showdown Result Summary Modal (with X close button) */}
          {Boolean(roomState.lastShowdownResult && closedResultId !== roomState.lastShowdownResult.id) && (
            <ShowdownResultModal
              result={roomState.lastShowdownResult}
              onClose={() => setClosedResultId(roomState.lastShowdownResult?.id || null)}
            />
          )}

          {/* Admin Panel (Host Only) */}
          {isHost && (
            <AdminPanel
              isOpen={isAdminPanelOpen}
              state={roomState}
              isHost={isHost}
              currentUserId={currentUserId || ''}
              onClose={() => setIsAdminPanelOpen(false)}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
              onUndo={handleUndo}
              onCreateVote={handleCreateVote}
              onToggleHostPlaying={() => {}}
              onUpdateBlinds={handleUpdateBlinds}
              onSetDealer={handleSetDealer}
              onRandomizeDealer={handleRandomizeDealer}
              onMoveSeat={handleMoveSeat}
              onToggleAfk={handleToggleAfk}
              onKickPlayer={handleKickPlayer}
              onTransferHost={handleTransferHost}
              onOpenLogs={() => setIsRoomLogsOpen(true)}
            />
          )}

          {/* Room Logs & Player Ledger Modal (Host Only) */}
          {isHost && (
            <RoomLogsModal
              isOpen={isRoomLogsOpen}
              state={roomState}
              onClose={() => setIsRoomLogsOpen(false)}
            />
          )}

          {/* Rebuy / Request More Chips Modal */}
          <RebuyModal
            isOpen={isRebuyModalOpen}
            player={currentPlayer || activeActor}
            pendingRequest={roomState.pendingRequests.find(
              r => r.userId === currentUserId && r.type === 'rebuy'
            )}
            onRequestRebuy={handleRequestRebuy}
            onClose={() => setIsRebuyModalOpen(false)}
          />

          {/* Interactive Vote Modal */}
          <VoteModal
            vote={roomState.activeVote || null}
            currentUserId={currentUserId || ''}
            isHost={isHost}
            totalPlayers={roomState.players.length}
            onCastVote={handleCastVote}
            onCloseVote={handleCloseVote}
          />

          {/* Settings Modal */}
          <SettingsModal
            isOpen={isSettingsOpen}
            soundEnabled={soundEnabled}
            hapticEnabled={hapticEnabled}
            isSittingOut={currentPlayer?.status === 'sitting-out'}
            onClose={() => setIsSettingsOpen(false)}
            onToggleSound={setSoundEnabled}
            onToggleHaptic={setHapticEnabled}
            onToggleSittingOut={handleToggleSittingOut}
            onLeaveRoom={handleInitiateLeave}
            onOpenDisclaimer={() => setIsDisclaimerOpen(true)}
            onOpenRebuy={() => setIsRebuyModalOpen(true)}
          />
        </>
      )}

      {/* Host Succession Modal */}
      {roomState && (
        <HostTransferModal
          isOpen={isHostTransferModalOpen}
          players={roomState.players}
          currentUserId={currentUserId || ''}
          onClose={() => setIsHostTransferModalOpen(false)}
          onConfirmTransferAndLeave={(newHostId) => handleLeaveRoom(newHostId)}
        />
      )}

      {/* Join Request Rejected Modal */}
      {isJoinRejected && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', gap: 14, maxWidth: 360 }}>
            <div style={{ fontSize: '2.5rem' }}>🚫</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>
              คำขอเข้าห้องไม่ได้รับอนุมัติ
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Host ได้ปฏิเสธคำขอเข้าร่วมห้อง PIN: <strong style={{ color: '#f59e0b' }}>{currentPin}</strong>
            </p>
            <button
              type="button"
              className="primary-btn"
              style={{ marginTop: 8, padding: '10px 20px' }}
              onClick={() => {
                setIsJoinRejected(false);
                handleLeaveRoom();
              }}
            >
              กลับสู่หน้าแรก
            </button>
          </div>
        </div>
      )}

      {/* Legal Disclaimer Modal */}
      <DisclaimerModal
        isOpen={isDisclaimerOpen}
        onAccept={() => setIsDisclaimerOpen(false)}
      />
    </div>
  );
}
