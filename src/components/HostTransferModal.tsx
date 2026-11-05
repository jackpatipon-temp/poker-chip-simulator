'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Crown, X, Check, ArrowRight } from 'lucide-react';
import { Player } from '@/types/poker';
import { sound, triggerHaptic } from '@/lib/sound';

interface HostTransferModalProps {
  isOpen: boolean;
  players: Player[];
  currentUserId: string;
  onClose: () => void;
  onConfirmTransferAndLeave: (newHostId: string) => void;
}

export const HostTransferModal: React.FC<HostTransferModalProps> = ({
  isOpen,
  players,
  currentUserId,
  onClose,
  onConfirmTransferAndLeave,
}) => {
  const eligibleCandidates = players.filter(p => p.id !== currentUserId);
  const [selectedHostId, setSelectedHostId] = useState<string>(
    eligibleCandidates[0]?.id || ''
  );

  if (!isOpen) return null;

  const handleSelect = (id: string) => {
    sound.playChip();
    triggerHaptic(20);
    setSelectedHostId(id);
  };

  const handleConfirm = () => {
    if (!selectedHostId) return;
    sound.playWin();
    triggerHaptic(30);
    onConfirmTransferAndLeave(selectedHostId);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 420 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b' }}>
            <Crown size={24} />
            <span className="modal-title" style={{ fontSize: '1.15rem' }}>
              ส่งมอบสิทธิ์ Host ก่อนออกจากห้อง
            </span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Description */}
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 10px', lineHeight: 1.5 }}>
          คุณเป็น Host ของห้องนี้ เพื่อให้ผู้เล่นคนอื่นสามารถเล่นเกมต่อได้อย่างราบรื่น
          กรุณาเลือกผู้เล่น 1 คนเพื่อรับสิทธิ์เป็น Host คนต่อไป:
        </p>

        {/* Candidates List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '280px', overflowY: 'auto' }}>
          {eligibleCandidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              ไม่มีผู้เล่นคนอื่นในโต๊ะ
            </div>
          ) : (
            eligibleCandidates.map((candidate) => {
              const isSelected = selectedHostId === candidate.id;
              return (
                <div
                  key={candidate.id}
                  onClick={() => handleSelect(candidate.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: isSelected
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected
                      ? '1.5px solid #f59e0b'
                      : '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Image
                      src={candidate.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={candidate.name}
                      width={36}
                      height={36}
                      style={{ borderRadius: '50%', objectFit: 'cover' }}
                      unoptimized
                    />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6' }}>
                        {candidate.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                        🪙 {candidate.chips.toLocaleString()} ชิป
                      </div>
                    </div>
                  </div>

                  {/* Radio indicator */}
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)',
                      color: isSelected ? '#000' : 'transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ flex: 1, padding: '10px' }}
            onClick={onClose}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="primary-btn"
            disabled={!selectedHostId}
            style={{
              flex: 1.5,
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: selectedHostId
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'rgba(255, 255, 255, 0.1)',
              color: selectedHostId ? '#000' : '#6b7280',
              fontWeight: 700,
            }}
            onClick={handleConfirm}
          >
            <span>มอบสิทธิ์และออกจากห้อง</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
