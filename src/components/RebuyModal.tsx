'use client';

import React, { useState } from 'react';
import { Player, JoinRequest } from '@/types/poker';
import { X, Coins, Plus, Clock, CheckCircle2 } from 'lucide-react';
import { sound, triggerHaptic } from '@/lib/sound';

interface RebuyModalProps {
  isOpen: boolean;
  player: Player | null;
  pendingRequest?: JoinRequest | null;
  onRequestRebuy: (chips: number) => void;
  onClose: () => void;
}

export const RebuyModal: React.FC<RebuyModalProps> = ({
  isOpen,
  player,
  pendingRequest,
  onRequestRebuy,
  onClose,
}) => {
  const [requestedAmount, setRequestedAmount] = useState<number>(1000);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen || !player) return null;

  const quickPills = [500, 1000, 2000, 5000];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requestedAmount <= 0) return;
    sound.playChip();
    triggerHaptic(25);
    onRequestRebuy(requestedAmount);
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: 420,
          width: '92%',
          padding: '22px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
              }}
            >
              <Coins size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                ขอเพิ่มชิป (Rebuy)
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
                ส่งคำขอไปยัง Host เพื่ออนุมัติชิปเข้าโต๊ะ
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            style={{ width: 32, height: 32, borderRadius: '50%' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Stack Status */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 12,
            padding: '12px 14px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>ชิปปัจจุบันของคุณ:</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: player.chips === 0 ? '#ef4444' : '#10b981' }}>
            🪙 {player.chips.toLocaleString()}
          </span>
        </div>

        {/* Pending Request Alert if exists */}
        {pendingRequest ? (
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Clock size={22} color="#60a5fa" className="animate-spin" />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#93c5fd' }}>
                มีคำขอค้างอยู่: ขอเพิ่ม {pendingRequest.requestedChips.toLocaleString()} ชิป
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                กำลังรอ Host อนุมัติบนหน้าจอ...
              </div>
            </div>
          </div>
        ) : isSent ? (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              borderRadius: 12,
              padding: '14px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <CheckCircle2 size={26} color="#10b981" />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#34d399' }}>
              ส่งคำขอขอชิปเพิ่มเรียบร้อย!
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                จำนวนชิปที่ต้องการขอเพิ่ม:
              </label>
              <input
                type="number"
                min="100"
                step="100"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="input-field"
                style={{
                  width: '100%',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  color: '#f59e0b',
                  padding: '10px 12px',
                  borderRadius: 10,
                }}
                required
              />
            </div>

            {/* Quick Preset Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {quickPills.map((val) => (
                <button
                  key={val}
                  type="button"
                  className="secondary-btn"
                  style={{
                    padding: '8px 4px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: requestedAmount === val ? 'rgba(245, 158, 11, 0.25)' : undefined,
                    borderColor: requestedAmount === val ? '#f59e0b' : undefined,
                    color: requestedAmount === val ? '#fef08a' : undefined,
                  }}
                  onClick={() => setRequestedAmount(val)}
                >
                  +{val.toLocaleString()}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="primary-btn"
              style={{
                marginTop: 6,
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Plus size={18} />
              <span>ส่งคำขอขอเพิ่มชิป</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

