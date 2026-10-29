'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RoomState, Player } from '@/types/poker';
import { sound, triggerHaptic } from '@/lib/sound';
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

export default function PokerGamePage() {
  const [currentPin, setCurrentPin] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  // Check Disclaimer on mount (Requirement 2)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accepted = localStorage.getItem('poker_disclaimer_accepted');
      if (!accepted) {
        setIsDisclaimerOpen(true);
      }
    }
  }, []);

  // Real-time synchronization polling (500ms) over LAN
  useEffect(() => {
    if (!currentPin) return;

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
        }
      } catch {
        // Silently retry on next interval
      } finally {
        isPollingRef.current = false;
      }
    };

    fetchLatestRoomState();
    const interval = setInterval(fetchLatestRoomState, 600);
    return () => clearInterval(interval);
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
    setCurrentUserId(data.room.players[0].id);
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
    if (data.request) {
      setCurrentUserId(data.request.userId);
      alert('ส่งคำขอเข้าห้องเรียบร้อย! กรุณารอ Admin อนุมัติบนเครื่องโฮสต์');
    } else {
      // Re-joined existing seat
      const existing = data.room.players.find(
        (p: Player) => p.name.toLowerCase() === playerName.toLowerCase()
      );
      if (existing) setCurrentUserId(existing.id);
    }
  };

  // Helper variables
  const currentPlayer = roomState?.players.find((p) => p.id === currentUserId) || null;
  const isHost = currentUserId === roomState?.hostId;
  const activeActor = roomState ? roomState.players[roomState.activePlayerIndex] : null;
  const isMyTurn = activeActor?.id === currentUserId;

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
    if (currentUserId) {
      sendRoomAction({ type: 'LEAVE', playerId: currentUserId });
    }
    setCurrentPin(null);
    setRoomState(null);
    setCurrentUserId(null);
    setIsSettingsOpen(false);
  }, [currentUserId, sendRoomAction]);

  return (
    <div className="app-container">
      {/* SCENARIO A: LOBBY VIEW (CLEAN START SCREEN) */}
      {!currentPin || !roomState ? (
        <LobbyView
          localIp="192.168.1.106"
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onOpenDisclaimer={() => setIsDisclaimerOpen(true)}
        />
      ) : (
        /* SCENARIO B: ACTIVE POKER TABLE */
        <>
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

      {/* Requirement 2: Legal Disclaimer Modal */}
      <DisclaimerModal
        isOpen={isDisclaimerOpen}
        onAccept={() => setIsDisclaimerOpen(false)}
      />
    </div>
  );
}
