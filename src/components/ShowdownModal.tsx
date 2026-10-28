'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Trophy, Check, Undo2 } from 'lucide-react';
import { Player } from '@/types/poker';
import { sound, triggerHaptic } from '@/lib/sound';

interface ShowdownModalProps {
  isOpen: boolean;
  pot: number;
  players: Player[];
  winnerIds: string[];
  isHost: boolean;
  onConfirmWinners: (winnerIds: string[]) => void;
  onNextHand: () => void;
  onUndo: () => void;
}

export const ShowdownModal: React.FC<ShowdownModalProps> = ({
  isOpen,
  pot,
  players,
  winnerIds: initialWinnerIds,
  isHost,
  onConfirmWinners,
  onNextHand,
  onUndo,
}) => {
  const [selectedWinners, setSelectedWinners] = useState<string[]>(initialWinnerIds);

  if (!isOpen) return null;

  // Active or eligible players (non-folded)
  const eligiblePlayers = players.filter(p => p.isApproved && p.status !== 'folded');
  const displayPlayers = eligiblePlayers.length > 0 ? eligiblePlayers : players.filter(p => p.isApproved);

  const toggleWinner = (playerId: string) => {
    sound.playChip();
    triggerHaptic(20);
    setSelectedWinners(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  const handleNextHand = () => {
    if (selectedWinners.length === 0) return;
    sound.playWin();
    triggerHaptic(40);
    onConfirmWinners(selectedWinners);
    onNextHand();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 380, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#f59e0b' }}>
          <Trophy size={26} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Showdown</h2>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          เทียบหน้าไพ่จริงนอกจอ แล้วเลือกผู้ชนะของรอบนี้
        </p>

        {/* Pot Display */}
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>
            Main Pot
          </span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>
            🪙 {pot.toLocaleString()}
          </div>
          {selectedWinners.length > 1 && (
            <span style={{ fontSize: '0.75rem', color: '#93c5fd' }}>
              หารเฉลี่ยคนละ ~{Math.floor(pot / selectedWinners.length).toLocaleString()} ชิป
            </span>
          )}
        </div>

        {/* Selectable Player List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
          {displayPlayers.map(player => {
            const isSelected = selectedWinners.includes(player.id);
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => toggleWinner(player.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: isSelected
                    ? '1.5px solid #3b82f6'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'rgba(255, 255, 255, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  color: 'white',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Image
                    src={player.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt={player.name}
                    width={28}
                    height={28}
                    style={{ borderRadius: '50%' }}
                    unoptimized
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{player.name}</span>
                </div>

                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected && <Check size={16} strokeWidth={3} color="white" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            className="primary-btn"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
            onClick={handleNextHand}
            disabled={selectedWinners.length === 0}
          >
            แจกชิป & เริ่ม Hand ถัดไป ({selectedWinners.length} คน)
          </button>

          {isHost && (
            <button
              type="button"
              className="secondary-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.8rem' }}
              onClick={onUndo}
            >
              <Undo2 size={15} />
              ย้อนกลับการตัดสินใจ (Undo)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
