'use client';

import React from 'react';
import { X, Volume2, VolumeX, Smartphone, LogOut, Coffee, ShieldAlert, Maximize2, Coins } from 'lucide-react';
import { sound, triggerHaptic } from '@/lib/sound';

interface SettingsModalProps {
  isOpen: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  isSittingOut: boolean;
  onClose: () => void;
  onToggleSound: (enabled: boolean) => void;
  onToggleHaptic: (enabled: boolean) => void;
  onToggleSittingOut: () => void;
  onLeaveRoom: () => void;
  onOpenDisclaimer: () => void;
  onOpenRebuy?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  soundEnabled,
  hapticEnabled,
  isSittingOut,
  onClose,
  onToggleSound,
  onToggleHaptic,
  onToggleSittingOut,
  onLeaveRoom,
  onOpenDisclaimer,
  onOpenRebuy,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 380 }}>
        {/* Header */}
        <div className="modal-header">
          <span className="modal-title">Settings & Player Options</span>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Sound Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {soundEnabled ? <Volume2 size={20} color="#3b82f6" /> : <VolumeX size={20} color="#9ca3af" />}
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>เสียงประกอบ (Sound FX)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>เสียงชิป ไพ่ และชัยชนะ</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => {
                onToggleSound(e.target.checked);
                sound.setEnabled(e.target.checked);
                if (e.target.checked) sound.playChip();
              }}
              style={{ width: 20, height: 20, accentColor: '#3b82f6', cursor: 'pointer' }}
            />
          </div>

          {/* Haptic Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Smartphone size={20} color="#3b82f6" />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>การสั่น (Haptics)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>สั่นตอบสนองเมื่อกดปุ่มบนมือถือ</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={hapticEnabled}
              onChange={(e) => {
                onToggleHaptic(e.target.checked);
                if (e.target.checked) triggerHaptic(30);
              }}
              style={{ width: 20, height: 20, accentColor: '#3b82f6', cursor: 'pointer' }}
            />
          </div>

          <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

          {/* Requirement 6: Sit out / Take a break */}
          <button
            type="button"
            className="secondary-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderColor: isSittingOut ? '#ef4444' : undefined,
              background: isSittingOut ? 'rgba(239, 68, 68, 0.15)' : undefined,
            }}
            onClick={() => {
              triggerHaptic(20);
              onToggleSittingOut();
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Coffee size={18} color={isSittingOut ? '#f87171' : '#f59e0b'} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {isSittingOut ? 'กลับเข้าโต๊ะเล่นต่อ' : 'ขอพักทำภารกิจ (Sit Out / AFK)'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  เกมจะหมุนรอบต่อไป และมีปุ่มแจ้งเตือนให้ผู้เล่นคนอื่นทราบ
                </div>
              </div>
            </div>
          </button>

          {/* Request More Chips (Rebuy) */}
          {onOpenRebuy && (
            <button
              type="button"
              className="secondary-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: 'rgba(245, 158, 11, 0.4)',
                background: 'rgba(245, 158, 11, 0.1)',
              }}
              onClick={() => {
                onClose();
                onOpenRebuy();
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Coins size={18} color="#f59e0b" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fef08a' }}>
                    ขอเพิ่มชิป (Rebuy)
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    ส่งคำขอเพิ่มชิปไปยัง Host
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* View Legal Disclaimer */}
          <button
            type="button"
            className="secondary-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem' }}
            onClick={() => {
              onClose();
              onOpenDisclaimer();
            }}
          >
            <ShieldAlert size={18} color="#ef4444" />
            <span>อ่านคำเตือนและข้อตกลงการใช้งาน</span>
          </button>

          {/* Requirement 6: Leave Room */}
          <button
            type="button"
            className="secondary-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: '#ef4444',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              marginTop: 6,
            }}
            onClick={() => {
              triggerHaptic(30);
              onLeaveRoom();
            }}
          >
            <LogOut size={16} />
            <span>ออกจากห้อง (Leave Room)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
