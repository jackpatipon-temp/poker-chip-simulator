'use client';

import React from 'react';
import { Player, Street } from '@/types/poker';
import { PlayerSeat } from './PlayerSeat';

interface PokerTableProps {
  pot: number;
  street: Street;
  players: Player[];
  currentUserId: string;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  pot,
  street,
  players,
  currentUserId,
}) => {
  // Reorder players so current user appears at the bottom (seatIndex = 0)
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

  return (
    <div className="table-area">
      <div className="poker-table">
        <div className="table-felt-line" />

        {/* Center Pot & Physical Board Cards Indicator */}
        <div className="pot-container">
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
          <span style={{ fontSize: '0.6rem', color: '#6ee7b7', opacity: 0.8, marginTop: 2 }}>
            (ไพ่จริงนอกจอ)
          </span>
        </div>

        {/* Players arranged around the table */}
        {orderedPlayers.map((player, idx) => (
          <PlayerSeat
            key={player.id}
            player={player}
            seatIndex={idx}
            totalSeats={Math.max(orderedPlayers.length, 4)}
            isCurrentUser={player.id === currentUserId}
          />
        ))}
      </div>
    </div>
  );
};
