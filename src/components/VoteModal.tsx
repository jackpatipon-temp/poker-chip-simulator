'use client';

import React from 'react';
import { Vote as VoteIcon, CheckCircle2, X } from 'lucide-react';
import { Vote } from '@/types/poker';
import { sound, triggerHaptic } from '@/lib/sound';

interface VoteModalProps {
  vote: Vote | null;
  currentUserId: string;
  isHost: boolean;
  totalPlayers: number;
  onCastVote: (optionId: string) => void;
  onCloseVote: () => void;
}

export const VoteModal: React.FC<VoteModalProps> = ({
  vote,
  currentUserId,
  isHost,
  totalPlayers,
  onCastVote,
  onCloseVote,
}) => {
  if (!vote) return null;

  const userVotedOption = vote.options.find(opt => opt.votes.includes(currentUserId));
  const totalVotesCast = vote.options.reduce((acc, opt) => acc + opt.votes.length, 0);

  const handleVote = (optionId: string) => {
    sound.playChip();
    triggerHaptic(25);
    onCastVote(optionId);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 380, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#8b5cf6' }}>
          <VoteIcon size={26} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>การลงมติในโต๊ะ (Vote)</h2>
        </div>

        <div
          style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: 12,
            padding: '14px 16px',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#f3f4f6',
            lineHeight: 1.5,
          }}
        >
          {vote.title}
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          ลงคะแนนแล้ว {totalVotesCast} จากทั้งหมด {totalPlayers} คน
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {vote.options.map(option => {
            const isSelected = userVotedOption?.id === option.id;
            const percentage = totalVotesCast > 0 ? Math.round((option.votes.length / totalVotesCast) * 100) : 0;

            return (
              <button
                key={option.id}
                type="button"
                className="secondary-btn"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderColor: isSelected ? '#8b5cf6' : undefined,
                  background: isSelected ? 'rgba(139, 92, 246, 0.25)' : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                }}
                onClick={() => handleVote(option.id)}
              >
                {/* Progress bar fill */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${percentage}%`,
                    background: 'rgba(139, 92, 246, 0.15)',
                    pointerEvents: 'none',
                    transition: 'width 0.3s ease',
                  }}
                />

                <span style={{ fontWeight: 600, zIndex: 2 }}>{option.label}</span>
                <span style={{ fontSize: '0.8rem', color: '#c4b5fd', zIndex: 2, fontFamily: 'var(--font-mono)' }}>
                  {option.votes.length} ({percentage}%)
                </span>
              </button>
            );
          })}
        </div>

        {/* Host Close Button */}
        {isHost && (
          <button
            type="button"
            className="secondary-btn"
            style={{ marginTop: 6, fontSize: '0.8rem', color: '#f87171' }}
            onClick={onCloseVote}
          >
            ปิดการโหวตนี้
          </button>
        )}
      </div>
    </div>
  );
};
