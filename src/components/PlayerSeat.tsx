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
      {/* Current Bet Chip placed on table towards center */}
      {player.currentBet > 0 && (
        <div
          className="seat-bet-chip"
          style={{
            transform: `translate(${betOffsetX}px, ${betOffsetY}px)`,
          }}
        >
          <span style={{ fontSize: '0.62rem' }}>🪙</span>
          <span>{player.currentBet}</span>
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
