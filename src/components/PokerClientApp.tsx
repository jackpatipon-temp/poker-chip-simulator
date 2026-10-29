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
import { Check, X, Loader2 } from 'lucide-react';

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

  // Sound and Haptic preferences
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  // Polling ref to prevent overlapping requests
  const isPollingRef = useRef(false);

  // Check Disclaimer on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accepted = localStorage.getItem('poker_disclaimer_accepted');
      if (!accepted) {
        setIsDisclaimerOpen(true);
      }
    }
  }, []);

  // Instant Real-Time Synchronization via Server-Sent Events (SSE) + fallback polling
  useEffect(() => {
    if (!currentPin) return;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(`/api/rooms/${currentPin}/stream`);
      eventSource.onmessage = (event) => {
        try {
          const room = JSON.parse(event.data);
          if (room && room.roomId) {
            setRoomState(room);
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
        const res = await fetch(`/api/rooms/${currentPin}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.room) {
            setRoomState(data.room);
          }
        } else if (res.status === 404) {
          setCurrentPin(null);
          setRoomState(null);
          setCurrentUserId(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('poker_room_pin');
            localStorage.removeItem('poker_user_id');
            window.location.replace('/');
          }
        }
      } catch {
        // Silently retry on next interval
      } finally {
        isPollingRef.current = false;
      }
    };

    const interval = setInterval(fetchLatestRoomState, 1500);

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
      try {
        const res = await fetch(`/api/rooms/${currentPin}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.room) {
            setRoomState(data.room);
          }
        }
      } catch (err) {
        console.error('Failed to dispatch room action:', err);
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
    customPin?: string
  ) => {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostName,
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

    setCurrentPin(data.pin);
    setRoomState(data.room);
    const hostPlayerId = data.room.players[0].id;
    setCurrentUserId(hostPlayerId);

    if (typeof window !== 'undefined') {
      localStorage.setItem('poker_room_pin', data.pin);
      localStorage.setItem('poker_user_id', hostPlayerId);
      window.location.href = `/?pin=${encodeURIComponent(data.pin)}&userId=${encodeURIComponent(hostPlayerId)}`;
    }
  };

  // Join Room handler
  const handleJoinRoom = async (pin: string, playerName: string, chips: number) => {
    const res = await fetch(`/api/rooms/${pin}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'JOIN',
        playerName,
        requestedChips: chips,
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
        window.location.href = `/?pin=${encodeURIComponent(pin)}&userId=${encodeURIComponent(assignedId)}`;
      }
    }
  };

  // Helper variables
  const currentPlayer = roomState?.players.find((p) => p.id === currentUserId) || null;
  const isHost = currentUserId === roomState?.hostId;
  const activeActor = roomState ? roomState.players[roomState.activePlayerIndex] : null;
  const isMyTurn = activeActor?.id === currentUserId;
  const isWaitingForApproval = roomState?.pendingRequests.some((r) => r.userId === currentUserId);

  // Actions
  const handleFold = useCallback(() => {
    if (!activeActor) return;
    sendRoomAction({ type: 'ACTION', playerId: activeActor.id, action: 'fold' });
  }, [activeActor, sendRoomAction]);

  const handleCheck = useCallback(() => {
    if (!activeActor) return;
    sendRoomAction({ type: 'ACTION', playerId: activeActor.id, action: 'check' });
  }, [activeActor, sendRoomAction]);

  const handleCall = useCallback(() => {
    if (!activeActor) return;
    sendRoomAction({ type: 'ACTION', playerId: activeActor.id, action: 'call' });
  }, [activeActor, sendRoomAction]);

  const handleConfirmRaise = useCallback(
    (totalAmount: number) => {
      if (!activeActor) return;
      sendRoomAction({
        type: 'ACTION',
        playerId: activeActor.id,
        action: 'raise',
        raiseAmount: totalAmount,
      });
    },
    [activeActor, sendRoomAction]
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

  const handleLeaveRoom = useCallback(() => {
    if (currentUserId && currentPin) {
      try {
        fetch(`/api/rooms/${currentPin}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'LEAVE', playerId: currentUserId }),
        }).catch(() => {});
      } catch {}
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('poker_room_pin');
        localStorage.removeItem('poker_user_id');
      } catch {}
      window.location.replace('/');
    }
    setCurrentPin(null);
    setRoomState(null);
    setCurrentUserId(null);
    setIsSettingsOpen(false);
  }, [currentPin, currentUserId]);

  return (
    <div className="app-container">
      {/* SCENARIO A: LOBBY VIEW (NO ROOM PIN IN URL OR STATE) */}
      {!currentPin ? (
        <LobbyView
          localIp="192.168.1.106"
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
          />

          {/* Bottom Controls */}
          <ActionControls
            player={currentPlayer || activeActor}
            activeActor={activeActor}
            currentHighestBet={roomState.currentHighestBet}
            minRaise={roomState.minRaise}
            isMyTurn={isMyTurn}
            onFold={handleFold}
            onCheck={handleCheck}
            onCall={handleCall}
            onOpenRaiseModal={() => setIsRaiseModalOpen(true)}
            onSwitchActor={(actorId) => setCurrentUserId(actorId)}
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
            onLeaveRoom={handleLeaveRoom}
            onOpenDisclaimer={() => setIsDisclaimerOpen(true)}
          />
        </>
      )}

      {/* Legal Disclaimer Modal */}
      <DisclaimerModal
        isOpen={isDisclaimerOpen}
        onAccept={() => setIsDisclaimerOpen(false)}
      />
    </div>
  );
}
