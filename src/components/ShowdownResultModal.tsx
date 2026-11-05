'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { Trophy, X, Award, Coins, CheckCircle2 } from 'lucide-react';
import { ShowdownResult } from '@/types/poker';
import { sound, triggerHaptic } from '@/lib/sound';

interface ShowdownResultModalProps {
  result?: ShowdownResult | null;
  onClose: () => void;
}

export const ShowdownResultModal: React.FC<ShowdownResultModalProps> = ({
  result,
  onClose,
}) => {
  useEffect(() => {
    if (result) {
      sound.playWin();
      triggerHaptic([60, 40, 100]);
    }
  }, [result?.id]);

  if (!result) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 120 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: 440,
          textAlign: 'center',
          padding: '24px 20px',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          border: '1.5px solid rgba(245, 158, 11, 0.4)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 24px rgba(245, 158, 11, 0.25)',
        }}
      >
        {/* Close Button [X] at Top-Right */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e5e7eb',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="ปิดหน้าต่างสรุปผล"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#f59e0b', marginBottom: 4 }}>
          <Trophy size={28} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
            สรุปผลผู้ชนะ (Showdown Results)
          </h2>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 16px' }}>
          ยอดเงินกองกลางทั้งหมดได้รับการแจกจ่ายให้ผู้ชนะเรียบร้อยแล้ว
        </p>

        {/* Total Pot Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: 14,
            padding: '10px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>
            ยอดชิปกองกลางที่แจกในรอบนี้
          </span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>
            🪙 {result.totalPot.toLocaleString()}
          </div>
        </div>

        {/* SCENARIO A: VICTORY BY FOLD */}
        {result.isFoldWin && result.soleWinnerName ? (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)',
              border: '1.5px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 14,
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 18,
              textAlign: 'left',
            }}
          >
            <Image
              src={result.soleWinnerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={result.soleWinnerName}
              width={44}
              height={44}
              style={{ borderRadius: '50%', border: '2px solid #10b981' }}
              unoptimized
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Award size={16} color="#fbbf24" />
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>{result.soleWinnerName}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600, marginTop: 2 }}>
                ชนะเพราะคนอื่นหมอบหมด (+🪙 {result.totalPot.toLocaleString()})
              </div>
            </div>
          </div>
        ) : (
          /* SCENARIO B: MULTI-POT / CLASSIC POTS BREAKDOWN */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18, textAlign: 'left' }}>
            {result.potResults.map((pot, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Coins size={15} color="#fbbf24" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f3f4f6' }}>
                      {pot.potName}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#fbbf24', fontSize: '0.95rem' }}>
                    🪙 {pot.amount.toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pot.winners.length > 0 ? (
                    pot.winners.map(winner => (
                      <div
                        key={winner.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: 8,
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Image
                            src={winner.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                            alt={winner.name}
                            width={24}
                            height={24}
                            style={{ borderRadius: '50%' }}
                            unoptimized
                          />
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                            {winner.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#34d399', fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                          <CheckCircle2 size={13} color="#10b981" />
                          <span>+🪙 {winner.prize.toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>
                      ไม่มีผู้รับรางวัลในกองนี้
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          className="primary-btn"
          style={{
            width: '100%',
            padding: '12px 18px',
            fontSize: '0.92rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
          }}
          onClick={onClose}
        >
          รับทราบ / ปิดหน้าต่าง (X)
        </button>
      </div>
    </div>
  );
};

