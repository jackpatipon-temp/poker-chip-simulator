'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RoomState, Player, PlayerStatus } from '@/types/poker';
import {
  createInitialRoomState,
  handlePlayerAction,
  startNewHand,
  awardPotToWinners,
  restoreHistorySnapshot,
  DEFAULT_SB,
  DEFAULT_BB,
} from '@/lib/poker-engine';
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
import { JoinLobbyModal } from '@/components/JoinLobbyModal';

// Initial Party Players (inspired by Example 1: Frodo, Merry, Pippin, Sam)
const createDefaultDemoRoom = (): RoomState => {
  const host: Player = {
    id: 'user_patipon',
    name: 'Patipon (ฉัน)',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    chips: 1000,
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

  const sam: Player = {
    id: 'player_sam',
    name: 'Sam',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    chips: 958,
    currentBet: 30,
    totalRoundBet: 30,
    status: 'active',
    seatIndex: 1,
    isDealer: false,
    isSmallBlind: true,
    isBigBlind: false,
    isTurn: false,
    lastAction: 'bet',
    isHost: false,
    isApproved: true,
    hasActedThisRound: true,
  };

  const frodo: Player = {
    id: 'player_frodo',
    name: 'Frodo',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    chips: 988,
    currentBet: 0,
    totalRoundBet: 0,
    status: 'folded',
    seatIndex: 2,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: true,
    isTurn: false,
    lastAction: 'fold',
    isHost: false,
    isApproved: true,
    hasActedThisRound: true,
  };

  const merry: Player = {
    id: 'player_merry',
    name: 'Merry',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80',
    chips: 988,
    currentBet: 0,
    totalRoundBet: 0,
    status: 'active',
    seatIndex: 3,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    isTurn: true,
    isHost: false,
    isApproved: true,
    hasActedThisRound: false,
  };

  return {
    roomId: 'POKER-888',
    roomName: 'Texas Hold\'em Party',
    hostId: host.id,
    isHostPlaying: true,
    smallBlind: DEFAULT_SB,
    bigBlind: DEFAULT_BB,
    ante: 2,
    street: 'flop',
    pot: 78,
    currentHighestBet: 30,
    minRaise: 30,
    dealerIndex: 0,
    activePlayerIndex: 3, // Merry's turn initially
    players: [host, sam, frodo, merry],
    sidePots: [],
    history: [],
    pendingRequests: [
      {
        id: 'req_gandalf',
        userId: 'user_gandalf',
        userName: 'Gandalf (Google)',
        userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
        requestedChips: 1000,
        createdAt: 1700000000000,
      },
    ],
    activeVote: null,
    winnerIds: [],
  };
};

export default function PokerGamePage() {
  const [roomState, setRoomState] = useState<RoomState>(createDefaultDemoRoom());
  const [currentUserId, setCurrentUserId] = useState<string>('user_patipon');

  // Modals state
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);

  // Sound and Haptic preferences
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  // Check Disclaimer on mount (Requirement 2)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accepted = localStorage.getItem('poker_disclaimer_accepted');
      if (!accepted) {
        setIsDisclaimerOpen(true);
      }
    }
  }, []);

  const currentPlayer = roomState.players.find((p) => p.id === currentUserId) || null;
  const isHost = currentUserId === roomState.hostId;
  const activeActor = roomState.players[roomState.activePlayerIndex];
  const isMyTurn = activeActor?.id === currentUserId;

  // Actions
  const handleFold = useCallback(() => {
    if (!activeActor) return;
    setRoomState((prev) => handlePlayerAction(prev, activeActor.id, 'fold'));
  }, [activeActor]);

  const handleCheck = useCallback(() => {
    if (!activeActor) return;
    setRoomState((prev) => handlePlayerAction(prev, activeActor.id, 'check'));
  }, [activeActor]);

  const handleCall = useCallback(() => {
    if (!activeActor) return;
    setRoomState((prev) => handlePlayerAction(prev, activeActor.id, 'call'));
  }, [activeActor]);

  const handleConfirmRaise = useCallback(
    (totalAmount: number) => {
      if (!activeActor) return;
      setRoomState((prev) => handlePlayerAction(prev, activeActor.id, 'raise', totalAmount));
    },
    [activeActor]
  );

  // Undo (Requirement 4)
  const handleUndo = useCallback(() => {
    setRoomState((prev) => {
      const restored = restoreHistorySnapshot(prev);
      return restored || prev;
    });
  }, []);

  // Showdown Next Hand
  const handleNextHand = useCallback(() => {
    setRoomState((prev) => startNewHand(prev));
  }, []);

  const handleConfirmWinners = useCallback((winnerIds: string[]) => {
    setRoomState((prev) => awardPotToWinners(prev, winnerIds));
  }, []);

  // Admin approvals (Requirement 4)
  const handleApproveRequest = useCallback((reqId: string, chips: number) => {
    setRoomState((prev) => {
      const req = prev.pendingRequests.find((r) => r.id === reqId);
      if (!req) return prev;

      const newPlayer: Player = {
        id: req.userId,
        name: req.userName,
        avatarUrl: req.userAvatar,
        chips,
        currentBet: 0,
        totalRoundBet: 0,
        status: 'active',
        seatIndex: prev.players.length,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
        isTurn: false,
        isHost: false,
        isApproved: true,
        hasActedThisRound: false,
      };

      return {
        ...prev,
        players: [...prev.players, newPlayer],
        pendingRequests: prev.pendingRequests.filter((r) => r.id !== reqId),
      };
    });
  }, []);

  const handleRejectRequest = useCallback((reqId: string) => {
    setRoomState((prev) => ({
      ...prev,
      pendingRequests: prev.pendingRequests.filter((r) => r.id !== reqId),
    }));
  }, []);

  // Voting (Requirement 4)
  const handleCreateVote = useCallback((title: string, options: string[]) => {
    setRoomState((prev) => ({
      ...prev,
      activeVote: {
        id: `vote_${Date.now()}`,
        title,
        description: '',
        createdBy: currentUserId,
        options: options.map((label, idx) => ({
          id: `opt_${idx}`,
          label,
          votes: [],
        })),
        resolved: false,
      },
    }));
  }, [currentUserId]);

  const handleCastVote = useCallback((optionId: string) => {
    setRoomState((prev) => {
      if (!prev.activeVote) return prev;
      const updatedOptions = prev.activeVote.options.map((opt) => ({
        ...opt,
        votes: opt.id === optionId
          ? Array.from(new Set([...opt.votes, currentUserId]))
          : opt.votes.filter((id) => id !== currentUserId),
      }));

      return {
        ...prev,
        activeVote: {
          ...prev.activeVote,
          options: updatedOptions,
        },
      };
    });
  }, [currentUserId]);

  const handleCloseVote = useCallback(() => {
    setRoomState((prev) => ({
      ...prev,
      activeVote: null,
    }));
  }, []);

  // Sit out / Take a break (Requirement 6)
  const handleToggleSittingOut = useCallback(() => {
    setRoomState((prev) => {
      const updatedPlayers = prev.players.map((p) => {
        if (p.id === currentUserId) {
          const nextStatus: PlayerStatus = p.status === 'sitting-out' ? 'active' : 'sitting-out';
          return { ...p, status: nextStatus };
        }
        return p;
      });
      return { ...prev, players: updatedPlayers };
    });
  }, [currentUserId]);

  // Leave room (Requirement 6)
  const handleLeaveRoom = useCallback(() => {
    setRoomState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== currentUserId),
    }));
    setIsSettingsOpen(false);
    setIsLobbyOpen(true);
  }, [currentUserId]);

  // Admin toggles host playing
  const handleToggleHostPlaying = useCallback((isPlaying: boolean) => {
    setRoomState((prev) => ({
      ...prev,
      isHostPlaying: isPlaying,
    }));
  }, []);

  const handleUpdateBlinds = useCallback((sb: number, bb: number) => {
    setRoomState((prev) => ({
      ...prev,
      smallBlind: sb,
      bigBlind: bb,
    }));
  }, []);

  // Lobby enter
  const handleEnterAsHost = useCallback((userName: string, avatarUrl: string, chips: number) => {
    const newHost: Player = {
      id: `user_${Date.now()}`,
      name: `${userName} (Admin)`,
      avatarUrl,
      chips,
      currentBet: 0,
      totalRoundBet: 0,
      status: 'active',
      seatIndex: 0,
      isDealer: true,
      isSmallBlind: false,
      isBigBlind: false,
      isTurn: true,
      isHost: true,
      isApproved: true,
      hasActedThisRound: false,
    };
    const newRoom = createInitialRoomState('POKER-777', newHost);
    setRoomState(newRoom);
    setCurrentUserId(newHost.id);
    setIsLobbyOpen(false);
  }, []);

  const handleRequestJoin = useCallback((roomCode: string, userName: string, avatarUrl: string, requestedChips: number) => {
    const newReq = {
      id: `req_${Date.now()}`,
      userId: `user_${Date.now()}`,
      userName,
      userAvatar: avatarUrl,
      requestedChips,
      createdAt: Date.now(),
    };
    setRoomState((prev) => ({
      ...prev,
      pendingRequests: [...prev.pendingRequests, newReq],
    }));
    setIsLobbyOpen(false);
    alert('ส่งคำขอเข้าห้องเรียบร้อยแล้ว! กรุณารอโฮสต์ (Admin) อนุมัติ');
  }, []);

  return (
    <div className="app-container">
      {/* 1. Header Bar with Fullscreen, Street, Blinds, and Break Button */}
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

      {/* 2. Main Oval Poker Table */}
      <PokerTable
        pot={roomState.pot}
        street={roomState.street}
        players={roomState.players}
        currentUserId={currentUserId}
      />

      {/* 3. Bottom Action Controls with Rule Explanation Tips */}
      <ActionControls
        player={activeActor || currentPlayer}
        currentHighestBet={roomState.currentHighestBet}
        minRaise={roomState.minRaise}
        isMyTurn={isMyTurn}
        onFold={handleFold}
        onCheck={handleCheck}
        onCall={handleCall}
        onOpenRaiseModal={() => setIsRaiseModalOpen(true)}
      />

      {/* Modals & Overlays */}

      {/* Requirement 2: Legal Disclaimer Modal */}
      <DisclaimerModal
        isOpen={isDisclaimerOpen}
        onAccept={() => setIsDisclaimerOpen(false)}
      />

      {/* Raise / Bet Modal with Slider & BB buttons */}
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
        onNextHand={handleNextHand}
        onUndo={handleUndo}
      />

      {/* Requirement 4: Admin Panel (Approve, Undo, Vote, Settings) */}
      <AdminPanel
        isOpen={isAdminPanelOpen}
        state={roomState}
        onClose={() => setIsAdminPanelOpen(false)}
        onApproveRequest={handleApproveRequest}
        onRejectRequest={handleRejectRequest}
        onUndo={handleUndo}
        onCreateVote={handleCreateVote}
        onToggleHostPlaying={handleToggleHostPlaying}
        onUpdateBlinds={handleUpdateBlinds}
      />

      {/* Requirement 4: Interactive Vote Modal */}
      <VoteModal
        vote={roomState.activeVote || null}
        currentUserId={currentUserId}
        isHost={isHost}
        totalPlayers={roomState.players.length}
        onCastVote={handleCastVote}
        onCloseVote={handleCloseVote}
      />

      {/* Settings Modal (Sound, Haptics, AFK, Leave Room) */}
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

      {/* Join / Lobby Modal */}
      <JoinLobbyModal
        isOpen={isLobbyOpen}
        onEnterAsHost={handleEnterAsHost}
        onRequestJoin={handleRequestJoin}
      />
    </div>
  );
}
