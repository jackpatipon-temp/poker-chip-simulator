'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Trophy, Check, Undo2, Award } from 'lucide-react';
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
  const [selectedWinners, setSelectedWinners] = useState<string[]>(initialWinnerIds || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active or eligible players (non-folded)
  const eligiblePlayers = players.filter(p => p.isApproved && p.status !== 'folded');
  const displayPlayers = eligiblePlayers.length > 0 ? eligiblePlayers : players.filter(p => p.isApproved);
  const isFoldWin = eligiblePlayers.length === 1;
  const soleWinner = isFoldWin ? eligiblePlayers[0] : null;

  // Keep selected winners in sync when modal opens or initialWinnerIds changes
  useEffect(() => {
    if (initialWinnerIds && initialWinnerIds.length > 0) {
      setSelectedWinners(initialWinnerIds);
    } else if (eligiblePlayers.length === 1) {
      setSelectedWinners([eligiblePlayers[0].id]);
    }
    setIsSubmitting(false);
  }, [isOpen, initialWinnerIds, eligiblePlayers.length]);

  // If pot is 0 and it's not a fold win, showdown is already finished -> do not show modal
  if (!isOpen || (pot === 0 && !isFoldWin)) return null;

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
    if (isSubmitting) return;
    if (!isFoldWin && selectedWinners.length === 0) return;

    setIsSubmitting(true);
    sound.playWin();
    triggerHaptic(40);

    // If classic showdown with chips, award winners & start next hand in one atomic action
    if (!isFoldWin && pot > 0 && selectedWinners.length > 0) {
      onConfirmWinners(selectedWinners);
    } else {
      onNextHand();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 390, textAlign: 'center', padding: '24px 20px' }}>
        {isFoldWin && soleWinner ? (
          /* SCENARIO A: VICTORY BY FOLD (ALL OTHERS SURRENDERED) */
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#10b981' }}>
              <Trophy size={32} />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>ผู้เล่นอื่นหมอบหมด!</h2>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#9ca3af', margin: '8px 0 16px' }}>
              ผู้เล่นคนอื่นหมอบทั้งหมดในรอบนี้ ชิปถูกโอนให้ผู้ชนะแล้ว
            </p>

            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)',
                border: '1.5px solid rgba(16, 185, 129, 0.4)',
                borderRadius: 16,
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                margin: '0 auto 18px',
                textAlign: 'left',
              }}
            >
              <Image
                src={soleWinner.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={soleWinner.name}
                width={48}
                height={48}
                style={{ borderRadius: '50%', border: '2px solid #10b981' }}
                unoptimized
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={16} color="#fbbf24" />
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>{soleWinner.name}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600, marginTop: 2 }}>
                  ผู้ชนะของรอบนี้ (ยอดชิปปัจจุบัน: 🪙 {soleWinner.chips.toLocaleString()})
                </div>
              </div>
            </div>
          </>
        ) : (
          /* SCENARIO B: CLASSIC MULTI-PLAYER SHOWDOWN */
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#f59e0b' }}>
              <Trophy size={28} />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Showdown</h2>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '6px 0 14px' }}>
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
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>
                Main Pot
              </span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>
                🪙 {pot.toLocaleString()}
              </div>
              {selectedWinners.length > 1 && pot > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#93c5fd' }}>
                  หารเฉลี่ยคนละ ~{Math.floor(pot / selectedWinners.length).toLocaleString()} ชิป
                </span>
              )}
            </div>

            {/* Selectable Player List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', marginBottom: 14 }}>
              {displayPlayers.map(player => {
                const isSelected = selectedWinners.includes(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => isHost && toggleWinner(player.id)}
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
                      cursor: isHost ? 'pointer' : 'default',
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
          </>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isHost ? (
            <button
              type="button"
              className="primary-btn"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                padding: '12px 18px',
                fontSize: '0.95rem',
                fontWeight: 700,
              }}
              onClick={handleNextHand}
              disabled={isSubmitting || (!isFoldWin && selectedWinners.length === 0)}
            >
              {isSubmitting
                ? 'กำลังประมวลผล...'
                : isFoldWin
                ? 'เริ่ม Hand ถัดไป'
                : `แจกชิป & เริ่ม Hand ถัดไป (${selectedWinners.length} คน)`}
            </button>
          ) : (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#9ca3af',
                fontSize: '0.82rem',
              }}
            >
              ⏳ รอให้ Host เป็นผู้กดเริ่ม Hand ถัดไป...
            </div>
          )}

          {isHost && (
            <button
              type="button"
              className="secondary-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.8rem' }}
              onClick={onUndo}
              disabled={isSubmitting}
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
