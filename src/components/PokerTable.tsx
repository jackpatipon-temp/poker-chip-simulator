'use client';

import React from 'react';
import { Player, Street } from '@/types/poker';
import { PlayerSeat } from './PlayerSeat';
import { Play, Copy, Check, Users } from 'lucide-react';
import { sound, triggerHaptic } from '@/lib/sound';

interface PokerTableProps {
  pot: number;
  street: Street;
  players: Player[];
  currentUserId: string;
  roomPin?: string;
  isHost?: boolean;
  onStartHand?: () => void;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  pot,
  street,
  players,
  currentUserId,
  roomPin,
  isHost,
  onStartHand,
}) => {
  const [copied, setCopied] = React.useState(false);

  // Reorder players so current user appears at the bottom
  const currentIdx = players.findIndex(p => p.id === currentUserId);
  const orderedPlayers = currentIdx >= 0
    ? [...players.slice(currentIdx), ...players.slice(0, currentIdx)]
    : players;

  // Active board card counts for physical card tracking indicator
  const cardStates = {
    preflop: [false, false, false, false, false],
    flop: [true, true, true, false, false],
    turn: [true, true, true, true, false],
    river: [true, true, true, true, true],
    showdown: [true, true, true, true, true],
  }[street];

  const handleCopyPin = () => {
    if (!roomPin) return;
    sound.playChip();
    triggerHaptic(20);
    navigator.clipboard.writeText(roomPin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHandActive = pot > 0 || street !== 'preflop';

  return (
    <div className="table-area">
      <div className="poker-table">
        <div className="table-felt-line" />

        {/* Center Display */}
        <div className="pot-container">
          {isHandActive ? (
            <>
              <span className="pot-label">Main Pot</span>
              <div className="pot-amount">
                <span>🪙</span>
                <span>{pot.toLocaleString()}</span>
              </div>

              <div className="community-cards-hint" title="สำรับไพ่จริงนอกจอ">
                {cardStates.map((isActive, idx) => (
                  <div
                    key={idx}
                    className={`dummy-card ${isActive ? 'active' : 'hidden'}`}
                  >
                    {isActive ? '♦' : ''}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PIN ห้อง:</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#f59e0b',
                    letterSpacing: 2,
                  }}
                >
                  {roomPin}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPin}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copied ? '#10b981' : '#9ca3af',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="คัดลอก PIN"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={13} />
                <span>ในโต๊ะมี {players.length} คน</span>
              </div>

              {isHost && players.length >= 2 && onStartHand && (
                <button
                  type="button"
                  className="primary-btn"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    marginTop: 4,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  }}
                  onClick={() => {
                    sound.playWin();
                    triggerHaptic(30);
                    onStartHand();
                  }}
                >
                  <Play size={14} />
                  แจกชิป & เริ่ม Hand
                </button>
              )}

              {!isHost && players.length >= 2 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 6,
                    padding: '8px 14px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: 10,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.76rem', color: '#fcd34d', fontWeight: 700 }}>
                    ⏳ รอ Host กดเริ่มแจกชิปบนคอมพิวเตอร์
                  </div>
                  {onStartHand && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playWin();
                        triggerHaptic(20);
                        onStartHand();
                      }}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        color: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      กดเริ่ม Hand เอง (โหมดทดสอบ)
                    </button>
                  )}
                </div>
              )}

              {players.length < 2 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center', maxWidth: 160 }}>
                  รอผู้เล่นอีกอย่างน้อย 1 คน ใส่ PIN นี้เพื่อเข้าโต๊ะ
                </div>
              )}
            </div>
          )}
        </div>

        {/* Players arranged around the table */}
        {orderedPlayers.map((player, idx) => (
          <PlayerSeat
            key={player.id}
            player={player}
            seatIndex={idx}
            totalSeats={Math.max(orderedPlayers.length, 3)}
            isCurrentUser={player.id === currentUserId}
          />
        ))}
      </div>
    </div>
  );
};
