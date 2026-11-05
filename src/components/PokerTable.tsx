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
  onOpenSeating?: () => void;
}

interface FlyingCoin {
  id: string;
  startX: number;
  startY: number;
  delay: number;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  pot,
  street,
  players,
  currentUserId,
  roomPin,
  isHost,
  onStartHand,
  onOpenSeating,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [flyingCoins, setFlyingCoins] = React.useState<FlyingCoin[]>([]);
  const prevBetsRef = React.useRef<Record<string, number>>({});

  // Reorder players so current user appears at the bottom
  const currentIdx = players.findIndex(p => p.id === currentUserId);
  const orderedPlayers = currentIdx >= 0
    ? [...players.slice(currentIdx), ...players.slice(0, currentIdx)]
    : players;

  // Track bet changes to trigger rapid shooting coin stream towards center pot
  React.useEffect(() => {
    const newCoins: FlyingCoin[] = [];
    const currentBets: Record<string, number> = {};

    orderedPlayers.forEach((player, idx) => {
      const committed = player.totalRoundBet > 0 ? player.totalRoundBet : player.currentBet;
      currentBets[player.id] = committed;

      const prev = prevBetsRef.current[player.id];
      if (prev !== undefined && committed > prev && committed > 0) {
        let angle = Math.PI / 2;
        if (orderedPlayers.length === 2) {
          angle = idx === 0 ? Math.PI / 2 : (3 * Math.PI) / 2;
        } else {
          angle = (2 * Math.PI * idx) / orderedPlayers.length + Math.PI / 2;
        }
        const rx = 35;
        const ry = 39;
        const startX = 50 + rx * Math.cos(angle);
        const startY = 50 + ry * Math.sin(angle);

        // Spawn a stream of 7 rapid coins
        for (let i = 0; i < 7; i++) {
          newCoins.push({
            id: `${player.id}-${Date.now()}-${i}`,
            startX,
            startY,
            delay: i * 0.05,
          });
        }
        sound.playChip();
      }
    });

    prevBetsRef.current = currentBets;

    if (newCoins.length > 0) {
      setFlyingCoins(prev => [...prev, ...newCoins]);
      const timer = setTimeout(() => {
        setFlyingCoins(prev => prev.filter(c => !newCoins.some(nc => nc.id === c.id)));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [orderedPlayers]);

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

              {/* Seating and Dealer Setup Trigger (Host Only) */}
              {isHost && onOpenSeating && (
                <button
                  type="button"
                  className="secondary-btn"
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.74rem',
                    color: '#f59e0b',
                    borderColor: 'rgba(245, 158, 11, 0.4)',
                    background: 'rgba(245, 158, 11, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    sound.playChip();
                    triggerHaptic(20);
                    onOpenSeating();
                  }}
                  title="จัดลำดับที่นั่ง และเลือก Dealer คนแรกของเกม"
                >
                  <span>🎯 จัดที่นั่ง & Dealer</span>
                </button>
              )}

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
                  <div style={{ fontSize: '0.78rem', color: '#fcd34d', fontWeight: 700 }}>
                    ⏳ รอ Host กดเริ่มแจกชิปบนโต๊ะ
                  </div>
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

        {/* Rapid Coin Stream Layer */}
        {flyingCoins.length > 0 && (
          <div className="coin-stream-layer" aria-hidden="true">
            {flyingCoins.map(coin => (
              <div
                key={coin.id}
                className="stream-coin"
                style={
                  {
                    '--start-x': `${coin.startX}%`,
                    '--start-y': `${coin.startY}%`,
                    animationDelay: `${coin.delay}s`,
                  } as React.CSSProperties
                }
              >
                🪙
              </div>
            ))}
          </div>
        )}

        {/* Players arranged around the table */}
        {orderedPlayers.map((player, idx) => (
          <PlayerSeat
            key={player.id}
            player={player}
            seatIndex={idx}
            totalSeats={orderedPlayers.length}
            isCurrentUser={player.id === currentUserId}
          />
        ))}
      </div>
    </div>
  );
};
