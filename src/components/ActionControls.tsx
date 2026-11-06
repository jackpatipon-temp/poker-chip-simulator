'use client';

import React from 'react';
import { Player } from '@/types/poker';
import { FloatingTip } from './FloatingTip';
import { sound, triggerHaptic } from '@/lib/sound';
import { Clock, CheckCircle2, Lock } from 'lucide-react';

interface ActionControlsProps {
  player: Player | null;
  activeActor: Player | null;
  currentHighestBet: number;
  minRaise: number;
  isMyTurn: boolean;
  isHandStarted?: boolean;
  isAwaitingNextStreet?: boolean;
  isSubmitting?: boolean;
  raiseRule?: 'standard' | 'casual';
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onOpenRaiseModal: () => void;
  onOpenRebuy?: () => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  player,
  activeActor,
  currentHighestBet,
  minRaise,
  isMyTurn,
  isHandStarted = true,
  isAwaitingNextStreet = false,
  isSubmitting = false,
  raiseRule = 'standard',
  onFold,
  onCheck,
  onCall,
  onOpenRaiseModal,
  onOpenRebuy,
}) => {
  if (!player) return null;

  const currentBet = player.currentBet || 0;
  const toCall = Math.max(0, currentHighestBet - currentBet);
  const canCheck = toCall === 0;
  const canCall = toCall > 0 && player.chips > 0;
  const callAmount = Math.min(toCall, player.chips);
  const isAllInCall = callAmount === player.chips;

  const minRaiseTotal =
    raiseRule === 'casual'
      ? (currentHighestBet === 0 ? minRaise : currentHighestBet + 1)
      : (currentHighestBet === 0 ? minRaise : currentHighestBet + minRaise);
  const canRaise = player.chips > toCall;

  const isActionLocked = isAwaitingNextStreet || !isHandStarted || !isMyTurn || player.status !== 'active';

  const handleFold = () => {
    sound.playFold();
    triggerHaptic(20);
    onFold();
  };

  const handleCheck = () => {
    sound.playCheck();
    triggerHaptic(25);
    onCheck();
  };

  const handleCall = () => {
    sound.playChip();
    triggerHaptic(30);
    onCall();
  };

  const handleRaiseClick = () => {
    sound.playChip();
    triggerHaptic(20);
    onOpenRaiseModal();
  };

  return (
    <div className="bottom-controls">
      {/* Turn Status Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderRadius: 8,
          background: isMyTurn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 0, 0, 0.3)',
          border: isMyTurn ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
          fontSize: '0.78rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {isAwaitingNextStreet ? (
            <>
              <Lock size={15} color="#38bdf8" />
              <span style={{ color: '#38bdf8', fontSize: '0.82rem', fontWeight: 700 }}>
                🔒 จบรอบเดิมพัน • ล็อคการกระทำเพื่อรอเปิด &apos;ไพ่ต่อไป&apos;
              </span>
            </>
          ) : !isHandStarted ? (
            <>
              <Clock size={15} color="#fbbf24" />
              <span style={{ color: '#fbbf24', fontSize: '0.82rem', fontWeight: 700 }}>
                ⏳ รอ Host กด &apos;แจกชิป &amp; เริ่ม Hand&apos; บนโต๊ะเพื่อเริ่มเกม
              </span>
            </>
          ) : isMyTurn ? (
            <>
              <CheckCircle2 size={16} color="#10b981" />
              <span style={{ color: '#6ee7b7', fontWeight: 800 }}>🎯 ถึงตาคุณแล้ว! เลือกลงเดิมพัน</span>
            </>
          ) : (
            <>
              <Clock size={15} color="#fbbf24" />
              <span style={{ color: '#e5e7eb', fontSize: '0.82rem' }}>
                รอตาเดินของ:{' '}
                <strong style={{ color: '#fbbf24', fontSize: '0.85rem' }}>{activeActor?.name || 'ผู้เล่นคนอื่น'}</strong>
              </span>
            </>
          )}
        </div>

        {player.chips === 0 && onOpenRebuy && (
          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '2px 8px',
              fontSize: '0.72rem',
              fontWeight: 800,
              background: 'rgba(245, 158, 11, 0.25)',
              borderColor: '#f59e0b',
              color: '#fef08a',
              borderRadius: 6,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
            onClick={onOpenRebuy}
          >
            🪙 ขอชิปเพิ่ม
          </button>
        )}
      </div>

      <div className="action-buttons-row">
        {/* FOLD BUTTON */}
        <div className="action-btn-wrapper">
          <FloatingTip
            title="การหมอบ (Fold)"
            text="สละสิทธิ์ในรอบนี้และยอมเสียเงินเดิมพันที่ลงไปแล้วในกองกลาง จะไม่ต้องลงชิปเพิ่มอีกจนกว่าจะเริ่ม Hand ถัดไป"
          />
          <button
            type="button"
            className="action-btn fold"
            onClick={handleFold}
            disabled={isActionLocked}
          >
            <span>Fold</span>
          </button>
        </div>

        {/* CHECK OR CALL BUTTON */}
        <div className="action-btn-wrapper">
          {canCheck ? (
            <>
              <FloatingTip
                title="การผ่าน (Check)"
                text="ผ่านตาเดินโดยไม่ต้องวางชิปเพิ่ม เนื่องจากเงินเดิมพันของคุณเท่ากับยอดสูงสุดของรอบนี้แล้ว"
              />
              <button
                type="button"
                className="action-btn check"
                onClick={handleCheck}
                disabled={isActionLocked}
              >
                <span>Check</span>
                <span className="btn-sub-text">ฟรี</span>
              </button>
            </>
          ) : (
            <>
              <FloatingTip
                title={`การคอล (Call ${callAmount})`}
                text={`มียอดเดิมพันสูงสุดในตานี้อยู่ที่ ${currentHighestBet} คุณต้องวางชิปเพิ่มอีก ${callAmount} เพื่อให้เท่ากันและได้สิทธิ์เล่นต่อ`}
              />
              <button
                type="button"
                className="action-btn call"
                onClick={handleCall}
                disabled={isActionLocked || !canCall}
              >
                <span>Call</span>
                <span className="btn-sub-text">
                  {callAmount} {isAllInCall ? '(All-In)' : ''}
                </span>
              </button>
            </>
          )}
        </div>

        {/* RAISE BUTTON */}
        <div className="action-btn-wrapper">
          <FloatingTip
            title={`การเกทับ (Raise ${raiseRule === 'casual' ? 'แบบบ้านๆ' : 'แบบสากล'})`}
            text={
              raiseRule === 'casual'
                ? `มียอดเดิมพันสูงสุดอยู่ที่ ${currentHighestBet} | กฎแบบบ้านๆ: สามารถใส่เท่าไหร่ก็ได้ ขอแค่มากกว่ายอดเดิมพันปัจจุบัน ${currentHighestBet}`
                : `มียอดเดิมพันสูงสุดอยู่ที่ ${currentHighestBet} | กฎ Poker สากล: การ Raise ต้องเพิ่มขึ้นอย่างน้อยเท่ากับการลงเดิมพันครั้งก่อนหน้า (+${minRaise}) รวมเป็นอย่างน้อย ${minRaiseTotal} ชิป`
            }
          />
          <button
            type="button"
            className="action-btn raise"
            onClick={handleRaiseClick}
            disabled={isActionLocked || !canRaise}
          >
            <span>Raise</span>
            <span className="btn-sub-text">
              {currentHighestBet === 0
                ? `ขั้นต่ำ ${minRaise}`
                : raiseRule === 'casual'
                ? `> ${currentHighestBet}`
                : `≥ ${minRaiseTotal}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
