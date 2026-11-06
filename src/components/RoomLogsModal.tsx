'use client';

import React, { useState } from 'react';
import { RoomState, PlayerLedgerRecord, RoomLogEntry } from '@/types/poker';
import Image from 'next/image';
import { X, Clock, Users, ArrowUpRight, ArrowDownRight, DollarSign, List, Shield, CheckCircle2 } from 'lucide-react';

interface RoomLogsModalProps {
  isOpen: boolean;
  state: RoomState;
  onClose: () => void;
}

export const RoomLogsModal: React.FC<RoomLogsModalProps> = ({
  isOpen,
  state,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'logs'>('ledger');

  if (!isOpen) return null;

  const ledger: PlayerLedgerRecord[] = state.playerLedger || [];
  const logs: RoomLogEntry[] = state.roomLogs || [];

  // Calculate summary metrics
  const totalInPlay = (state.players || []).reduce((sum, p) => sum + p.chips, 0) + (state.pot || 0);
  const activeCount = ledger.filter(l => l.status === 'active' || l.status === 'sitting-out').length;
  const leftCount = ledger.filter(l => l.status === 'left').length;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: 600,
          width: '94%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 18px',
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
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid #3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <List size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                บันทึกยอดชิป &amp; ประวัติห้อง
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                ห้อง PIN: <strong style={{ color: '#f59e0b' }}>{state.roomId}</strong> • เฉพาะ Host
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

        {/* Quick Metrics Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 12,
            padding: '10px 12px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>ชิปในโต๊ะรวม</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b' }}>
              🪙 {totalInPlay.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>ในโต๊ะปัจจุบัน</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981' }}>
              👥 {activeCount} คน
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>ออกแล้ว</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ef4444' }}>
              🚪 {leftCount} คน
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
          <button
            type="button"
            className="secondary-btn"
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'ledger' ? 700 : 500,
              background: activeTab === 'ledger' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              borderColor: activeTab === 'ledger' ? '#3b82f6' : 'transparent',
              color: activeTab === 'ledger' ? '#93c5fd' : 'var(--text-muted)',
            }}
            onClick={() => setActiveTab('ledger')}
          >
            💰 ยอดชิปผู้เล่น ({ledger.length})
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'logs' ? 700 : 500,
              background: activeTab === 'logs' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              borderColor: activeTab === 'logs' ? '#3b82f6' : 'transparent',
              color: activeTab === 'logs' ? '#93c5fd' : 'var(--text-muted)',
            }}
            onClick={() => setActiveTab('logs')}
          >
            📜 ประวัติกิจกรรม ({logs.length})
          </button>
        </div>

        {/* Tab 1: Ledger Record */}
        {activeTab === 'ledger' && (
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
            {ledger.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                ยังไม่มีข้อมูลผู้เล่นในบันทึก
              </div>
            ) : (
              ledger.map((rec) => {
                const isLeft = rec.status === 'left';
                const pnl = rec.currentChips - rec.totalBuyIn;
                const pnlPositive = pnl >= 0;

                return (
                  <div
                    key={rec.playerId}
                    style={{
                      background: isLeft ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                      border: isLeft ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-subtle)',
                      borderRadius: 12,
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: `1.5px solid ${isLeft ? '#ef4444' : '#10b981'}`,
                            position: 'relative',
                            flexShrink: 0,
                          }}
                        >
                          <Image
                            src={rec.playerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                            alt={rec.playerName}
                            width={32}
                            height={32}
                            style={{ objectFit: 'cover' }}
                            unoptimized
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong style={{ fontSize: '0.88rem', color: isLeft ? '#fca5a5' : 'var(--text-main)' }}>
                              {rec.playerName}
                            </strong>
                            {isLeft ? (
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  padding: '1px 6px',
                                  borderRadius: 6,
                                  background: 'rgba(239, 68, 68, 0.25)',
                                  color: '#f87171',
                                  fontWeight: 700,
                                }}
                              >
                                ออกแล้ว
                              </span>
                            ) : rec.status === 'sitting-out' ? (
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  padding: '1px 6px',
                                  borderRadius: 6,
                                  background: 'rgba(245, 158, 11, 0.25)',
                                  color: '#fbbf24',
                                  fontWeight: 700,
                                }}
                              >
                                พักเบรก
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  padding: '1px 6px',
                                  borderRadius: 6,
                                  background: 'rgba(16, 185, 129, 0.25)',
                                  color: '#34d399',
                                  fontWeight: 700,
                                }}
                              >
                                ในเกม
                              </span>
                            )}
                          </div>
                          {isLeft && rec.leftAt && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              ออกห้องเวลา: {formatTime(rec.leftAt)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right chips summary */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b' }}>
                          🪙 {rec.currentChips.toLocaleString()}
                        </div>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: pnlPositive ? '#10b981' : '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 2,
                          }}
                        >
                          {pnlPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          <span>{pnlPositive ? `+${pnl.toLocaleString()}` : pnl.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Buy-in & Pot forfeit breakdown */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.72rem',
                        color: 'var(--text-dim)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        paddingTop: 4,
                      }}
                    >
                      <span>ซื้อเข้ารวม: <strong style={{ color: 'var(--text-muted)' }}>{rec.totalBuyIn.toLocaleString()}</strong></span>
                      {isLeft && rec.lastLeftBetInPot ? (
                        <span style={{ color: '#f87171' }}>
                          เสียใน Pot: <strong>{rec.lastLeftBetInPot.toLocaleString()}</strong>
                        </span>
                      ) : null}
                      <span>คงเหลือล่าสุด: <strong style={{ color: '#fbbf24' }}>{rec.currentChips.toLocaleString()}</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Activity Logs */}
        {activeTab === 'logs' && (
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                ยังไม่มีบันทึกกิจกรรม
              </div>
            ) : (
              logs.map((entry) => {
                const getBadge = () => {
                  switch (entry.type) {
                    case 'leave':
                      return { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', label: 'ออกห้อง' };
                    case 'rebuy':
                      return { bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', label: 'ชิปเพิ่ม' };
                    case 'pot_win':
                      return { bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399', label: 'ชนะ Pot' };
                    case 'join':
                      return { bg: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', label: 'เข้าห้อง' };
                    default:
                      return { bg: 'rgba(255, 255, 255, 0.1)', color: '#d1d5db', label: 'ระบบ' };
                  }
                };
                const badge = getBadge();

                return (
                  <div
                    key={entry.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.78rem',
                    }}
                  >
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', minWidth: 54, fontFamily: 'var(--font-mono)' }}>
                      {formatTime(entry.timestamp)}
                    </span>
                    <span
                      style={{
                        fontSize: '0.62rem',
                        padding: '1px 6px',
                        borderRadius: 6,
                        background: badge.bg,
                        color: badge.color,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {badge.label}
                    </span>
                    <span style={{ color: 'var(--text-main)', wordBreak: 'break-word', flex: 1 }}>
                      {entry.message}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', paddingTop: 6 }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ width: '100%', padding: '10px 0' }}
            onClick={onClose}
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

