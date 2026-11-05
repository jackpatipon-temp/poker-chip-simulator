'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RoomState, Player } from '@/types/poker';
import { HeaderBar } from '@/components/HeaderBar';
import { PokerTable } from '@/components/PokerTable';
import { ActionControls } from '@/components/ActionControls';
import { RaiseModal } from '@/components/RaiseModal';
import { ShowdownModal } from '@/components/ShowdownModal';
import { AdminPanel } from '@/components/AdminPanel';
import { VoteModal } from '@/components/VoteModal';
import { SettingsModal } from '@/components/SettingsModal';
import { DisclaimerModal } from '@/components/DisclaimerModal';
import { LobbyView } from '@/components/LobbyView';
import { HostTransferModal } from '@/components/HostTransferModal';
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
  const [currentPin, setCurrentPin] = useState<string | null>(() => {
    if (initialPin) return initialPin;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('poker_room_pin');
    }
    return null;
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    if (initialUserId) return initialUserId;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('poker_user_id');
    }
    return null;
  });

  const [roomState, setRoomState] = useState<RoomState | null>(initialRoom || null);

  // Modals state
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHostTransferModalOpen, setIsHostTransferModalOpen] = useState(false);
  const [isJoinRejected, setIsJoinRejected] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

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

  // Check Disclaimer on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accepted = localStorage.getItem('poker_disclaimer_accepted');
      if (!accepted) {
        setIsDisclaimerOpen(true);
      }
    }
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

  // Instant Real-Time Synchronization via Server-Sent Events (SSE) + fallback polling
  useEffect(() => {
    if (!currentPin) return;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(`/api/rooms/${currentPin}/stream`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.roomId) {
            setRoomState(data);
          }
        } catch {}
      };
      eventSource.onerror = () => {
        // Fallback polling will handle updates if SSE is interrupted
      };
    } catch {}

    const fetchLatestRoomState = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const res = await fetch(`/api/rooms/${currentPin}?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (res.ok) {
          consecutive404Ref.current = 0;
          const data = await res.json();
          if (data.success && data.room) {
            setRoomState(data.room);
          }
        } else if (res.status === 404) {
          consecutive404Ref.current += 1;
          // Resilient network handling: Only consider room permanently dead after 40 consecutive fails (60s)
          if (consecutive404Ref.current >= 40) {
            console.warn('Room persistently missing for 60s');
          }
        }
      } catch {
        // Silently retry on next interval
      } finally {
        isPollingRef.current = false;
      }
    };

    const interval = setInterval(fetchLatestRoomState, 800);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(interval);
    };
  }, [currentPin]);

  // Dispatch game action to the local server
  const sendRoomAction = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!currentPin) return;
      setIsSubmittingAction(true);
      try {
        const res = await fetch(`/api/rooms/${currentPin}?t=${Date.now()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          cache: 'no-store',
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (data?.room) {
          setRoomState(data.room);
        }
      } catch (err) {
        console.error('Failed to dispatch room action:', err);
      } finally {
        setIsSubmittingAction(false);
      }
    },
    [currentPin]
  );

  // Create Room handler
  const handleCreateRoom = async (
    hostName: string,
    chips: number,
    sb: number,
    bb: number,
    customPin?: string,
    hostAvatar?: string
  ) => {
    const avatar =
      hostAvatar ||
      authUser?.avatarUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
    const finalHostName = (hostName || authUser?.name || 'Host Admin').trim();

    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostName: finalHostName,
        hostAvatar: avatar,
        startingChips: chips,
        smallBlind: sb,
        bigBlind: bb,
        customPin,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'สร้างห้องไม่สำเร็จ');
    }

    const hostPlayerId = data.room.players[0].id;
    setCurrentPin(data.pin);
    setCurrentUserId(hostPlayerId);
    setRoomState(data.room);

    if (typeof window !== 'undefined') {
      localStorage.setItem('poker_room_pin', data.pin);
      localStorage.setItem('poker_user_id', hostPlayerId);
      window.history.pushState(
        {},
        '',
        `/?pin=${encodeURIComponent(data.pin)}&userId=${encodeURIComponent(hostPlayerId)}`
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

    const res = await fetch(`/api/rooms/${pin}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'JOIN',
        playerName: finalPlayerName,
        playerAvatar: avatar,
        requestedChips: chips,
        playerId: currentUserId || (typeof window !== 'undefined' ? localStorage.getItem('poker_user_id') : undefined),
      }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'ไม่พบห้องที่ระบุ');
    }

    setCurrentPin(pin);
    setRoomState(data.room);

    let assignedId = '';
    if (data.player) {
      assignedId = data.player.id;
    } else if (data.request) {
      assignedId = data.request.userId;
    } else {
      const existing = data.room.players.find(
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

  // Actions (Optimistic UI: immediately updates player screen for zero-latency feel)
  const handleFold = useCallback(() => {
    const actorId = currentUserId || activeActor?.id;
    if (!actorId) return;

    // Optimistic local update
    setRoomState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map(p =>
          p.id === actorId ? { ...p, status: 'folded', isTurn: false } : p
        ),
      };
    });

    sendRoomAction({ type: 'ACTION', playerId: actorId, action: 'fold' });
  }, [currentUserId, activeActor, sendRoomAction]);

  const handleCheck = useCallback(() => {
    const actorId = currentUserId || activeActor?.id;
    if (!actorId) return;

    // Optimistic local update: disable buttons instantly
    setRoomState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map(p =>
          p.id === actorId ? { ...p, hasActedThisRound: true, isTurn: false } : p
        ),
      };
    });

    sendRoomAction({ type: 'ACTION', playerId: actorId, action: 'check' });
  }, [currentUserId, activeActor, sendRoomAction]);

  const handleCall = useCallback(() => {
    const actorId = currentUserId || activeActor?.id;
    if (!actorId) return;

    // Optimistic local update
    setRoomState(prev => {
      if (!prev) return prev;
      const me = prev.players.find(p => p.id === actorId);
      const callDiff = me ? Math.max(0, prev.currentHighestBet - me.currentBet) : 0;
      const callAmt = me ? Math.min(callDiff, me.chips) : 0;
      return {
        ...prev,
        pot: prev.pot + callAmt,
        players: prev.players.map(p =>
          p.id === actorId
            ? {
                ...p,
                chips: Math.max(0, p.chips - callAmt),
                currentBet: p.currentBet + callAmt,
                totalRoundBet: p.totalRoundBet + callAmt,
                hasActedThisRound: true,
                isTurn: false,
              }
            : p
        ),
      };
    });

    sendRoomAction({ type: 'ACTION', playerId: actorId, action: 'call' });
  }, [currentUserId, activeActor, sendRoomAction]);

  const handleConfirmRaise = useCallback(
    (totalAmount: number) => {
      const actorId = currentUserId || activeActor?.id;
      if (!actorId) return;

      setIsRaiseModalOpen(false);

      // Optimistic local update
      setRoomState(prev => {
        if (!prev) return prev;
        const me = prev.players.find(p => p.id === actorId);
        const addCost = me ? Math.max(0, totalAmount - me.currentBet) : 0;
        const actualWager = me ? Math.min(addCost, me.chips) : 0;
        return {
          ...prev,
          pot: prev.pot + actualWager,
          currentHighestBet: totalAmount,
          players: prev.players.map(p =>
            p.id === actorId
              ? {
                  ...p,
                  chips: Math.max(0, p.chips - actualWager),
                  currentBet: totalAmount,
                  totalRoundBet: p.totalRoundBet + actualWager,
                  hasActedThisRound: true,
                  isTurn: false,
                }
              : p
          ),
        };
      });

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
    sendRoomAction({ type: 'START_HAND' });
  }, [sendRoomAction]);

  const handleUndo = useCallback(() => {
    sendRoomAction({ type: 'UNDO' });
  }, [sendRoomAction]);

  const handleConfirmWinners = useCallback(
    (winnerIds: string[]) => {
      sendRoomAction({ type: 'SHOWDOWN_WINNERS', winnerIds });
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
  }, [currentPin, currentUserId]);

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
                🔔 <strong>{roomState.pendingRequests[0].userName}</strong> ขอเข้าโต๊ะ ({roomState.pendingRequests[0].requestedChips} ชิป)
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
            onOpenAdmin={() => setIsAdminPanelOpen(true)}
          />

          {/* Oval Table */}
          <PokerTable
            pot={roomState.pot}
            street={roomState.street}
            players={roomState.players}
            currentUserId={currentUserId || ''}
            roomPin={currentPin}
            isHost={isHost}
            onStartHand={handleStartHand}
            onOpenSeating={() => setIsAdminPanelOpen(true)}
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
            onFold={handleFold}
            onCheck={handleCheck}
            onCall={handleCall}
            onOpenRaiseModal={() => setIsRaiseModalOpen(true)}
          />

          {/* Raise Modal */}
          <RaiseModal
            isOpen={isRaiseModalOpen}
            player={activeActor || currentPlayer}
            currentHighestBet={roomState.currentHighestBet}
            minRaise={roomState.minRaise}
            bigBlind={roomState.bigBlind}
            pot={roomState.pot}
            onClose={() => setIsRaiseModalOpen(false)}
            onConfirmRaise={handleConfirmRaise}
          />

          {/* Showdown Modal */}
          <ShowdownModal
            isOpen={roomState.street === 'showdown'}
            pot={roomState.pot}
            players={roomState.players}
            winnerIds={roomState.winnerIds || []}
            isHost={isHost}
            onConfirmWinners={handleConfirmWinners}
            onNextHand={handleStartHand}
            onUndo={handleUndo}
          />

          {/* Admin Panel */}
          <AdminPanel
            isOpen={isAdminPanelOpen}
            state={roomState}
            onClose={() => setIsAdminPanelOpen(false)}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            onUndo={handleUndo}
            onCreateVote={handleCreateVote}
            onToggleHostPlaying={() => {}}
            onUpdateBlinds={() => {}}
            onSetDealer={handleSetDealer}
            onRandomizeDealer={handleRandomizeDealer}
            onMoveSeat={handleMoveSeat}
            onToggleAfk={handleToggleAfk}
            onKickPlayer={handleKickPlayer}
            onTransferHost={handleTransferHost}
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
