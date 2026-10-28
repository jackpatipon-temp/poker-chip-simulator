'use client';

import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { sound, triggerHaptic } from '@/lib/sound';

interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onAccept }) => {
  if (!isOpen) return null;

  const handleAccept = () => {
    sound.playChip();
    triggerHaptic(30);
    if (typeof window !== 'undefined') {
      localStorage.setItem('poker_disclaimer_accepted', 'true');
    }
    onAccept();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <ShieldAlert size={30} color="#ef4444" />
          </div>
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f3f4f6' }}>
          ข้อตกลงและคำเตือนการใช้งาน
        </h2>

        <div
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: '14px 16px',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            color: '#d1d5db',
            textAlign: 'left',
          }}
        >
          <p style={{ marginBottom: 10, fontWeight: 600, color: '#fca5a5' }}>
            ⚠️ เว็บไซต์นี้ไม่สนับสนุนการพนันที่มีการลงเดิมพันด้วยเงินหรือทรัพย์สินมีค่า
          </p>
          <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>การพนันเป็นสิ่งผิดกฎหมายตามพระราชบัญญัติการพนัน</li>
            <li>ระบบนี้พัฒนาขึ้นเพื่อเป็นเครื่องมือจำลองชิปเสมือน (Digital Ledger)</li>
            <li>ใช้สำหรับ<strong>การแข่งขันกีฬาเชิงกลยุทธ์ และความบันเทิงในครอบครัว/เพื่อนฝูง</strong> โดยใช้สำรับไพ่จริงนอกจอเท่านั้น</li>
            <li>ไม่มีระบบฝาก-ถอน หรือการเดิมพันด้วยเงินจริงใดๆ ทั้งสิ้น</li>
          </ul>
        </div>

        <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          การเข้าใช้งานถือว่าท่านได้รับทราบ ยินยอม และปฏิบัติตามกฎหมายอย่างเคร่งครัด
        </p>

        <button
          type="button"
          className="primary-btn"
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            marginTop: 4,
          }}
          onClick={handleAccept}
        >
          <CheckCircle2 size={18} />
          ข้าพเจ้ารับทราบและยอมรับข้อตกลง
        </button>
      </div>
    </div>
  );
};
