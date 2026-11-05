'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { Player } from '@/types/poker';
import { sound, triggerHaptic } from '@/lib/sound';

interface RaiseModalProps {
  isOpen: boolean;
  player: Player | null;
  currentHighestBet: number;
  minRaise: number;
  bigBlind: number;
  pot: number;
  raiseRule?: 'standard' | 'casual';
  onClose: () => void;
  onConfirmRaise: (totalAmount: number) => void;
}

export const RaiseModal: React.FC<RaiseModalProps> = ({
  isOpen,
  player,
  currentHighestBet,
  minRaise,
  bigBlind,
  pot,
  raiseRule = 'standard',
  onClose,
  onConfirmRaise,
}) => {
  const isCasual = raiseRule === 'casual';
  const maxPossible = (player?.chips ?? 0) + (player?.currentBet ?? 0);
  const minPossible = Math.min(
    maxPossible,
    currentHighestBet === 0
      ? bigBlind
      : isCasual
      ? currentHighestBet + 1
      : currentHighestBet + minRaise
  );

  const [raiseAmount, setRaiseAmount] = useState<number>(minPossible);

  useEffect(() => {
    if (isOpen) {
      setRaiseAmount(minPossible);
    }
  }, [isOpen, minPossible]);

  if (!isOpen || !player) return null;

  const currentBet = player.currentBet || 0;
  const additionalCost = Math.max(0, raiseAmount - currentBet);
  const toCall = Math.max(0, currentHighestBet - currentBet);
  const isAllIn = raiseAmount >= maxPossible;

  const handleStep = (delta: number) => {
    sound.playChip();
    triggerHaptic(15);
    setRaiseAmount((prev) => {
      const next = prev + delta;
      return Math.max(minPossible, Math.min(maxPossible, next));
    });
  };

  const handlePreset = (amount: number) => {
    sound.playChip();
    triggerHaptic(20);
    setRaiseAmount(Math.max(minPossible, Math.min(maxPossible, Math.round(amount))));
  };

  const handleConfirm = () => {
    sound.playChip();
    triggerHaptic(30);
    onConfirmRaise(raiseAmount);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 360 }}>
        {/* Header */}
        <div className="modal-header">
          <span className="modal-title">
            {currentHighestBet === 0 ? 'Raise (เปิดเดิมพัน)' : 'Raise (เกทับ)'}
          </span>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Informative Poker Tip */}
        <div
          style={{
            background: isCasual ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)',
            border: isCasual ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: '0.74rem',
            color: isCasual ? '#fef08a' : '#bfdbfe',
            lineHeight: 1.4,
          }}
        >
          {isCasual ? (
            <>
              💡 <strong>กฎการ Raise (แบบบ้านๆ)</strong>: เกทับเท่าไหร่ก็ได้ ขอแค่มากกว่ายอดเดิมพันปัจจุบัน{' '}
              <strong style={{ color: '#fff' }}>{currentHighestBet}</strong> (ขั้นต่ำ{' '}
              <strong style={{ color: '#6ee7b7' }}>{minPossible}</strong>)
            </>
          ) : (
            <>
              💡 <strong>กฎการ Raise (แบบสากล)</strong>: ยอดสูงสุดตานี้{' '}
              <strong style={{ color: '#fef08a' }}>{currentHighestBet}</strong> + ขั้นต่ำ{' '}
              <strong style={{ color: '#fef08a' }}>{minRaise}</strong> รวมเป็นอย่างน้อย{' '}
              <strong style={{ color: '#6ee7b7' }}>{minPossible}</strong>
            </>
          )}
        </div>

        {/* Big Number Display */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
            padding: '16px 20px',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '2.4rem',
            fontWeight: 800,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: '1.4rem', color: '#f59e0b' }}>🪙</span>
          <span>{raiseAmount}</span>
        </div>

        {/* Range Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0' }}>
          <input
            type="range"
            min={minPossible}
            max={maxPossible}
            step={Math.max(1, Math.floor(bigBlind / 2))}
            value={raiseAmount}
            onChange={(e) => {
              triggerHaptic(10);
              setRaiseAmount(Number(e.target.value));
            }}
            style={{
              width: '100%',
              accentColor: '#3b82f6',
              height: 8,
              borderRadius: 4,
              cursor: 'pointer',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span>Min: {minPossible}</span>
            <span>Max (All-in): {maxPossible}</span>
          </div>
        </div>

        {/* Step Buttons (- / +) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => handleStep(-Math.max(minRaise, bigBlind))}
            disabled={raiseAmount <= minPossible}
          >
            <Minus size={18} />
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => handleStep(Math.max(minRaise, bigBlind))}
            disabled={raiseAmount >= maxPossible}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Quick Min / Max Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => handlePreset(minPossible)}
          >
            Min ({minPossible})
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{ color: '#f87171' }}
            onClick={() => handlePreset(maxPossible)}
          >
            All-In ({maxPossible})
          </button>
        </div>

        {/* Adaptive Preset Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {currentHighestBet === 0 ? (
            <>
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '0.8rem', padding: '8px 4px' }}
                onClick={() => handlePreset(bigBlind * 2)}
              >
                2 BB
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '0.8rem', padding: '8px 4px' }}
                onClick={() => handlePreset(bigBlind * 3)}
              >
                3 BB
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '0.8rem', padding: '8px 4px' }}
                onClick={() => handlePreset(pot || bigBlind * 4)}
              >
                Pot
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '0.8rem', padding: '8px 4px' }}
                onClick={() => handlePreset(currentHighestBet * 2)}
              >
                2x Bet
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '0.8rem', padding: '8px 4px' }}
                onClick={() => handlePreset(currentHighestBet * 3)}
              >
                3x Bet
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '0.8rem', padding: '8px 4px' }}
                onClick={() => handlePreset(currentHighestBet + pot)}
              >
                + Pot
              </button>
            </>
          )}
        </div>

        {/* Breakdown Text */}
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
          }}
        >
          จ่ายเพิ่มรอบนี้: <strong style={{ color: '#fff' }}>{additionalCost}</strong> (รวมคอล {toCall})
        </div>

        {/* Confirm Raise Button */}
        <button
          type="button"
          className="primary-btn"
          style={{
            background: isAllIn
              ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
              : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
          }}
          onClick={handleConfirm}
        >
          {isAllIn ? 'All-In' : 'Raise'} {raiseAmount}
        </button>
      </div>
    </div>
  );
};
