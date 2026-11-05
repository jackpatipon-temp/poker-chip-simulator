'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Trophy, Check, Undo2, Award, Coins, Crown, Loader2 } from 'lucide-react';
import { Player, SidePot } from '@/types/poker';
import { sound, triggerHaptic } from '@/lib/sound';

interface ShowdownModalProps {
  isOpen: boolean;
  pot: number;
  sidePots?: SidePot[];
  players: Player[];
  winnerIds: string[];
  isHost: boolean;
  onConfirmWinners: (winnerIds: string[], potWinnerMap?: Record<string, string[]>) => void;
  onNextHand: () => void;
  onUndo: () => void;
}

export const ShowdownModal: React.FC<ShowdownModalProps> = ({
  isOpen,
  pot,
  sidePots,
  players,
  winnerIds: initialWinnerIds,
  isHost,
  onConfirmWinners,
  onNextHand,
  onUndo,
}) => {
  const [selectedWinners, setSelectedWinners] = useState<string[]>(initialWinnerIds || []);
  const [potWinnerMap, setPotWinnerMap] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active or eligible players (non-folded)
  const eligiblePlayers = players.filter(p => p.isApproved && p.status !== 'folded');
  const displayPlayers = eligiblePlayers.length > 0 ? eligiblePlayers : players.filter(p => p.isApproved);
  const isFoldWin = eligiblePlayers.length === 1;
  const soleWinner = isFoldWin ? eligiblePlayers[0] : null;

  const hasMultiplePots = Boolean(sidePots && sidePots.length > 1);
  const totalPotAmount = hasMultiplePots
    ? sidePots!.reduce((sum, p) => sum + p.amount, 0)
    : pot;

  // Unique key to detect if pots actually changed
  const sidePotsSignature = sidePots ? sidePots.map((p, i) => `${p.id || i}:${p.amount}`).join('|') : '';

  // Keep selected winners in sync when modal opens or pots structure changes
  useEffect(() => {
    if (initialWinnerIds && initialWinnerIds.length > 0) {
      setSelectedWinners(initialWinnerIds);
    } else if (eligiblePlayers.length === 1) {
      setSelectedWinners([eligiblePlayers[0].id]);
    }

    // Default setup for side pots if multiple pots exist
    if (sidePots && sidePots.length > 1) {
      const initialMap: Record<string, string[]> = {};
      sidePots.forEach((p, idx) => {
        const key = p.id || String(idx);
        // If single eligible player in this pot, preselect them
        if (p.eligiblePlayerIds.length === 1) {
          initialMap[key] = [p.eligiblePlayerIds[0]];
        } else {
          initialMap[key] = [];
        }
      });
      setPotWinnerMap(initialMap);
    }

    setIsSubmitting(false);
  }, [isOpen, sidePotsSignature]);

  // If pot is 0 and it's not a fold win, showdown is already finished -> do not show modal
  if (!isOpen || (totalPotAmount === 0 && !isFoldWin)) return null;

  const toggleSinglePotWinner = (playerId: string) => {
    sound.playChip();
    triggerHaptic(20);
    setSelectedWinners(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  const toggleSidePotWinner = (potKey: string, playerId: string) => {
    sound.playChip();
    triggerHaptic(20);
    setPotWinnerMap(prev => {
      const current = prev[potKey] || [];
      const updated = current.includes(playerId)
        ? current.filter(id => id !== playerId)
        : [...current, playerId];
      return { ...prev, [potKey]: updated };
    });
  };

  // Quick action: select a single overall winner for all pots they are eligible for
  const handleSelectOverallWinner = (playerId: string) => {
    sound.playChip();
    triggerHaptic(25);
    if (!sidePots) return;
    const nextMap: Record<string, string[]> = {};
    sidePots.forEach((p, idx) => {
      const key = p.id || String(idx);
      if (p.eligiblePlayerIds.includes(playerId)) {
        nextMap[key] = [playerId];
      } else {
        if (p.eligiblePlayerIds.length === 1) {
          nextMap[key] = [p.eligiblePlayerIds[0]];
        } else {
          nextMap[key] = potWinnerMap[key] || [];
        }
      }
    });
    setPotWinnerMap(nextMap);
  };

  const allPotsHaveWinners = hasMultiplePots
    ? sidePots!.every((p, idx) => {
        const key = p.id || String(idx);
        return (potWinnerMap[key]?.length || 0) > 0;
      })
    : selectedWinners.length > 0;

  const handleNextHand = () => {
    if (isSubmitting) return;
    if (!isFoldWin && !allPotsHaveWinners) return;

    setIsSubmitting(true);
    sound.playWin();
    triggerHaptic(40);

    // If classic showdown with chips, award winners & start next hand in one atomic action
    if (!isFoldWin && totalPotAmount > 0) {
      if (hasMultiplePots && sidePots) {
        // Build dual-keyed map (by id, by index, by 'main', and by name)
        const normalizedMap: Record<string, string[]> = {};
        sidePots.forEach((p, idx) => {
          const potKey = p.id || String(idx);
          const chosen = potWinnerMap[potKey] || potWinnerMap[String(idx)] || [];
          normalizedMap[potKey] = chosen;
          normalizedMap[String(idx)] = chosen;
          if (idx === 0) normalizedMap['main'] = chosen;
          if (p.name) normalizedMap[p.name] = chosen;
        });
        const allWinnerIds = Array.from(new Set(Object.values(normalizedMap).flat()));
        onConfirmWinners(allWinnerIds, normalizedMap);
      } else {
        onConfirmWinners(selectedWinners);
      }
    } else {
      onNextHand();
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          maxWidth: hasMultiplePots ? 480 : 390,
          textAlign: 'center',
          padding: '24px 20px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {isFoldWin && soleWinner ? (
          /* SCENARIO A: VICTORY BY FOLD (ALL OTHERS SURRENDERED) */
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#10b981' }}>
              <Trophy size={32} />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>ผู้เล่นอื่นหมอบหมด!</h2>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#9ca3af', margin: '8px 0 16px' }}>
              ผู้เล่นคนอื่นหมอบทั้งหมดในรอบนี้ ชิปถูกโอนให้ผู้ชนะแล้ว
            </p>

            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)',
                border: '1.5px solid rgba(16, 185, 129, 0.4)',
                borderRadius: 16,
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                margin: '0 auto 18px',
                textAlign: 'left',
              }}
            >
              <Image
                src={soleWinner.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={soleWinner.name}
                width={48}
                height={48}
                style={{ borderRadius: '50%', border: '2px solid #10b981' }}
                unoptimized
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={16} color="#fbbf24" />
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>{soleWinner.name}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600, marginTop: 2 }}>
                  ผู้ชนะของรอบนี้ (ยอดชิปปัจจุบัน: 🪙 {soleWinner.chips.toLocaleString()})
                </div>
              </div>
            </div>
          </>
        ) : !isHost ? (
          /* SCENARIO B.1: NON-HOST WAITING OVERLAY */
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#f59e0b', marginBottom: 6 }}>
              <Crown size={28} color="#fbbf24" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                กำลังเลือกผู้ชนะ...
              </h2>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 16px' }}>
              Host กำลังตรวจสอบหน้าไพ่จริงนอกจอ และทำการเลือกผู้ชนะในแต่ละ Pot
            </p>

            {/* Total Pot Banner */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 14,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: '0.72rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>
                {hasMultiplePots ? 'เงินกองกลางทั้งหมด (Total Pot)' : 'Main Pot'}
              </span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>
                🪙 {totalPotAmount.toLocaleString()}
              </div>
            </div>

            {/* Pots breakdown summary */}
            {hasMultiplePots && sidePots && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, textAlign: 'left' }}>
                {sidePots.map((potItem, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 10,
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e5e7eb' }}>
                      {potItem.name || (idx === 0 ? 'Main Pot' : `Side Pot ${idx}`)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#fbbf24', fontSize: '0.92rem' }}>
                      🪙 {potItem.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#93c5fd',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Loader2 size={16} className="animate-spin" />
              <span>รอสักครู่ เมื่อ Host ยืนยัน หน้าต่างสรุปผลผู้ชนะจะแสดงขึ้นทันที</span>
            </div>
          </>
        ) : (
          /* SCENARIO B.2: HOST SELECTION VIEW */
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#f59e0b' }}>
              <Trophy size={28} />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Showdown</h2>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '6px 0 14px' }}>
              เทียบหน้าไพ่จริงนอกจอ แล้วเลือกผู้ชนะของแต่ละ Pot
            </p>

            {/* Total Pot Banner */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 14,
                padding: '10px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>
                {hasMultiplePots ? 'เงินกองกลางทั้งหมด (Total Pot)' : 'Main Pot'}
              </span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>
                🪙 {totalPotAmount.toLocaleString()}
              </div>
            </div>

            {/* SCENARIO B.1: MULTIPLE POTS (SIDE POT ENGINE) */}
            {hasMultiplePots && sidePots ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {/* Quick Overall Winner Selection */}
                {isHost && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: 10, borderRadius: 12, border: '1px dashed var(--border-subtle)', textAlign: 'left' }}>
                    <div style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600, marginBottom: 6 }}>
                      ⚡ ทางลัด: เลือกผู้ชนะคนเดียวรับทุก Pot ที่มีสิทธิ์:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {displayPlayers.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          className="secondary-btn"
                          style={{ fontSize: '0.74rem', padding: '4px 8px', borderRadius: 8 }}
                          onClick={() => handleSelectOverallWinner(p.id)}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pots breakdown */}
                {sidePots.map((potItem, idx) => {
                  const potKey = potItem.id || String(idx);
                  const winnersForPot = potWinnerMap[potKey] || [];
                  const potEligible = displayPlayers.filter(p => potItem.eligiblePlayerIds.includes(p.id));

                  return (
                    <div
                      key={potKey}
                      style={{
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: winnersForPot.length > 0 ? '1.5px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: 14,
                        padding: 12,
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Coins size={16} color="#fbbf24" />
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f3f4f6' }}>
                            {potItem.name || (idx === 0 ? 'Main Pot' : `Side Pot ${idx}`)}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#fbbf24', fontSize: '1rem' }}>
                          🪙 {potItem.amount.toLocaleString()}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        ผู้มีสิทธิ์ลุ้น ({potEligible.length} คน): เลือกผู้ชนะ
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6 }}>
                        {potEligible.map(player => {
                          const isSelected = winnersForPot.includes(player.id);
                          return (
                            <button
                              key={player.id}
                              type="button"
                              onClick={() => isHost && toggleSidePotWinner(potKey, player.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 8px',
                                borderRadius: 8,
                                border: isSelected
                                  ? '1.5px solid #3b82f6'
                                  : '1px solid rgba(255, 255, 255, 0.08)',
                                background: isSelected
                                  ? 'rgba(59, 130, 246, 0.25)'
                                  : 'rgba(255, 255, 255, 0.04)',
                                cursor: isHost ? 'pointer' : 'default',
                                color: 'white',
                                textAlign: 'left',
                              }}
                            >
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {player.name}
                              </span>
                              {isSelected && <Check size={14} color="#38bdf8" strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>

                      {winnersForPot.length === 0 && (
                        <div style={{ fontSize: '0.7rem', color: '#f87171', marginTop: 6 }}>
                          ⚠️ กรุณาเลือกผู้ชนะอย่างน้อย 1 คนสำหรับ Pot นี้
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* SCENARIO B.2: SINGLE MAIN POT */
              <>
                {/* Selectable Player List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', marginBottom: 14 }}>
                  {displayPlayers.map(player => {
                    const isSelected = selectedWinners.includes(player.id);
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => isHost && toggleSinglePotWinner(player.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: 12,
                          border: isSelected
                            ? '1.5px solid #3b82f6'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          background: isSelected
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(255, 255, 255, 0.04)',
                          cursor: isHost ? 'pointer' : 'default',
                          transition: 'all 0.2s ease',
                          color: 'white',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Image
                            src={player.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                            alt={player.name}
                            width={28}
                            height={28}
                            style={{ borderRadius: '50%' }}
                            unoptimized
                          />
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{player.name}</span>
                        </div>

                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && <Check size={16} strokeWidth={3} color="white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* Action Controls */}
        {isHost && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              className="primary-btn"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                padding: '12px 18px',
                fontSize: '0.95rem',
                fontWeight: 700,
              }}
              onClick={handleNextHand}
              disabled={isSubmitting || (!isFoldWin && !allPotsHaveWinners)}
            >
              {isSubmitting
                ? 'กำลังประมวลผล...'
                : isFoldWin
                ? 'เริ่ม Hand ถัดไป'
                : hasMultiplePots
                ? 'แจกชิป Side Pots & เริ่ม Hand ถัดไป'
                : `แจกชิป & เริ่ม Hand ถัดไป (${selectedWinners.length} คน)`}
            </button>

            <button
              type="button"
              className="secondary-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.8rem' }}
              onClick={onUndo}
              disabled={isSubmitting}
            >
              <Undo2 size={15} />
              ย้อนกลับการตัดสินใจ (Undo)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
