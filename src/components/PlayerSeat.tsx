'use client';

import React from 'react';
import Image from 'next/image';
import { Player } from '@/types/poker';
import { FloatingTip } from './FloatingTip';
import { Coffee } from 'lucide-react';

interface PlayerSeatProps {
  player: Player;
  seatIndex: number;
  totalSeats: number;
  isCurrentUser: boolean;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  seatIndex,
  totalSeats,
  isCurrentUser,
}) => {
  const fallbackAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
  const [avatarSrc, setAvatarSrc] = React.useState(player.avatarUrl || fallbackAvatar);

  React.useEffect(() => {
    if (player.avatarUrl) {
      setAvatarSrc(player.avatarUrl);
    }
  }, [player.avatarUrl]);
  // Calculate elliptical coordinates around portrait poker table
  // For 2 players (heads-up): Seat 0 at bottom (90 deg), Seat 1 directly opposite at top (270 deg)
  // For N players: evenly distribute around the table
  let angle = Math.PI / 2;
  if (totalSeats === 2) {
    angle = seatIndex === 0 ? Math.PI / 2 : (3 * Math.PI) / 2;
  } else {
    angle = (2 * Math.PI * seatIndex) / totalSeats + Math.PI / 2;
  }

  // Optimized radii: seats sit cleanly on felt border without crowding the center pot
  const rx = 35; // horizontal radius in %
  const ry = 39; // vertical radius in %

  const x = 50 + rx * Math.cos(angle);
  const y = 50 + ry * Math.sin(angle);

  // Vector offset for bet chip towards table center (50%, 50%)
  const betOffsetX = (50 - x) * 0.42;
  const betOffsetY = (50 - y) * 0.42;

  const isSittingOut = player.status === 'sitting-out';
  const isFolded = player.status === 'folded';

  return (
    <div
      className="seat-node"
      style={{
        left: `${x}%`,
        top: `${y}%`,
      }}
    >
      {/* 2-Block Bet Display: Total Bet (Block 1) + Recent Bet (Block 2) */}
      {(player.currentBet > 0 || player.totalRoundBet > 0) && (
        <div
          className="seat-bet-container"
          style={{
            position: 'absolute',
            transform: `translate(${betOffsetX}px, ${betOffsetY}px)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            zIndex: 15,
            pointerEvents: 'none',
          }}
        >
          {/* Block 1: ยอดรวมที่ลงเดิมพันใน Hand นี้ */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95) 0%, rgba(217, 119, 6, 0.95) 100%)',
              color: '#000000',
              fontWeight: 800,
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              whiteSpace: 'nowrap',
            }}
            title="ยอดรวมที่ลงเดิมพันใน Hand นี้"
          >
            <span style={{ fontSize: '0.65rem' }}>🪙</span>
            <span style={{ fontSize: '0.62rem', opacity: 0.85, fontWeight: 700 }}>รวม:</span>
            <span>{(player.totalRoundBet || player.currentBet).toLocaleString()}</span>
          </div>

          {/* Block 2: ยอดที่ลงล่าสุดใน Action นี้ */}
          {player.lastBetAmount && player.lastBetAmount > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.66rem',
                padding: '1px 6px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                boxShadow: '0 1px 6px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                whiteSpace: 'nowrap',
              }}
              title="ยอดที่ลงเดิมพันล่าสุด"
            >
              <span style={{ fontSize: '0.58rem', opacity: 0.9 }}>ล่าสุด:</span>
              <span>+{player.lastBetAmount.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Seat Card */}
      <div
        className={`seat-card ${player.isTurn ? 'active-turn' : ''} ${
          isFolded ? 'folded' : ''
        } ${isSittingOut ? 'sitting-out' : ''}`}
        style={{
          outline: isCurrentUser ? '1.5px solid rgba(59, 130, 246, 0.5)' : undefined,
        }}
      >
        {/* Dealer Button */}
        {player.isDealer && <div className="dealer-chip">D</div>}

        {/* Floating Tip for Sitting Out (AFK) */}
        {isSittingOut && (
          <FloatingTip
            title="ขอพักชั่วคราว (AFK)"
            text="ผู้เล่นคนนี้ขอพักทำภารกิจส่วนตัว ระบบจะเล่นเกมต่อไปและหมอบ/เช็คให้อัตโนมัติ"
          />
        )}

        {/* Google Profile Avatar */}
        <div className="avatar-wrapper">
          <Image
            src={avatarSrc}
            alt={player.name}
            className="avatar-img"
            width={32}
            height={32}
            onError={() => setAvatarSrc(fallbackAvatar)}
            unoptimized
          />
          {isSittingOut && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Coffee size={14} color="#fca5a5" />
            </div>
          )}
        </div>

        {/* Player Name and Chip Count */}
        <div className="player-info">
          <div className="player-name" title={player.name}>
            {player.name} {isCurrentUser ? '(ฉัน)' : ''}
          </div>
          <div className="player-chips">{player.chips.toLocaleString()}</div>
        </div>

        {/* Action Badge (Check, Call, Raise, Fold, All-in) */}
        {player.lastAction && (
          <div className={`seat-action-badge ${player.lastAction}`}>
            {player.lastAction}
          </div>
        )}
      </div>
    </div>
  );
};
