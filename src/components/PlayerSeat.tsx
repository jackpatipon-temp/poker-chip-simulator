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

  // Distance from seat center to bet chip on the felt (outside the seat card towards center pot)
  // Horizontal clearance: card half-width (~54px) + margin = 66px
  // Vertical clearance: card half-height + action badge (~38px) + margin = 52px
  const betOffsetX = -Math.cos(angle) * 66;
  const betOffsetY = -Math.sin(angle) * 52;

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
      {/* Latest Bet Badge (ยอดที่ลงล่าสุด หรือ ยอดจาก Street ก่อนหน้าแบบจางๆ) */}
      {!isFolded && (
        <>
          {Boolean(player.lastBetAmount && player.lastBetAmount > 0) ? (
            <div
              className="seat-bet-badge"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${betOffsetX}px), calc(-50% + ${betOffsetY}px))`,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.96) 0%, rgba(217, 119, 6, 0.96) 100%)',
                color: '#000000',
                fontWeight: 800,
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                padding: '2px 7px',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.5), 0 0 6px rgba(245, 158, 11, 0.4)',
                border: '1.5px solid rgba(255, 255, 255, 0.6)',
                whiteSpace: 'nowrap',
                zIndex: 16,
                pointerEvents: 'none',
              }}
              title={`ยอดที่ลงล่าสุด: ${player.lastBetAmount?.toLocaleString()} ชิป`}
            >
              <span style={{ fontSize: '0.66rem' }}>🪙</span>
              <span>{player.lastBetAmount?.toLocaleString()}</span>
            </div>
          ) : Boolean(player.prevStreetBet && player.prevStreetBet > 0) ? (
            <div
              className="seat-bet-badge prev-street"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${betOffsetX}px), calc(-50% + ${betOffsetY}px))`,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                background: 'rgba(245, 158, 11, 0.16)',
                color: 'rgba(255, 255, 255, 0.65)',
                fontWeight: 700,
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                padding: '1px 6px',
                borderRadius: 10,
                border: '1px dashed rgba(245, 158, 11, 0.45)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap',
                zIndex: 14,
                pointerEvents: 'none',
                opacity: 0.55,
              }}
              title={`ยอดลงในรอบก่อนหน้า: ${player.prevStreetBet?.toLocaleString()} ชิป`}
            >
              <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>🪙</span>
              <span>{player.prevStreetBet?.toLocaleString()}</span>
            </div>
          ) : null}
        </>
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
