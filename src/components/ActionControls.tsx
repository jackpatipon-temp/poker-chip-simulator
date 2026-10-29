'use client';

import React from 'react';
import { Player } from '@/types/poker';
import { FloatingTip } from './FloatingTip';
import { sound, triggerHaptic } from '@/lib/sound';
import { Clock, CheckCircle2 } from 'lucide-react';

interface ActionControlsProps {
  player: Player | null;
  activeActor: Player | null;
  currentHighestBet: number;
  minRaise: number;
  isMyTurn: boolean;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onOpenRaiseModal: () => void;
  onSwitchActor?: (playerId: string) => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  player,
  activeActor,
  currentHighestBet,
  minRaise,
  isMyTurn,
  onFold,
  onCheck,
  onCall,
  onOpenRaiseModal,
  onSwitchActor,
}) => {
  if (!player) return null;

  const currentBet = player.currentBet || 0;
  const toCall = Math.max(0, currentHighestBet - currentBet);
  const canCheck = toCall === 0;
  const canCall = toCall > 0 && player.chips > 0;
  const callAmount = Math.min(toCall, player.chips);
  const isAllInCall = callAmount === player.chips;

  const minRaiseTotal = currentHighestBet === 0 ? minRaise : currentHighestBet + minRaise;
  const canRaise = player.chips > toCall;

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
          {isMyTurn ? (
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

        {/* LAN testing switcher: allows acting on behalf of active actor when testing alone */}
        {!isMyTurn && activeActor && onSwitchActor && (
          <button
            type="button"
            onClick={() => onSwitchActor(activeActor.id)}
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 8,
              color: '#ffffff',
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '6px 12px',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(37, 99, 235, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="กดเพื่อสลับมาทดสอบเล่นในบทบาทของคนนี้"
          >
            <span>⚡ สลับมาเล่นแทน</span>
            <span style={{ color: '#fef08a' }}>{activeActor.name}</span>
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
            disabled={!isMyTurn || player.status !== 'active'}
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
                disabled={!isMyTurn || player.status !== 'active'}
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
                disabled={!isMyTurn || player.status !== 'active' || !canCall}
              >
                <span>Call</span>
                <span className="btn-sub-text">
                  {callAmount} {isAllInCall ? '(All-In)' : ''}
                </span>
              </button>
            </>
          )}
        </div>

        {/* RAISE BUTTON (Always Raise with minimum starting at currentHighestBet) */}
        <div className="action-btn-wrapper">
          <FloatingTip
            title="การเกทับ (Raise)"
            text={`มียอดเดิมพันสูงสุดอยู่ที่ ${currentHighestBet} | กฎ Poker: การ Raise ต้องเพิ่มขึ้นอย่างน้อยเท่ากับการลงเดิมพันครั้งก่อนหน้า (+${minRaise}) รวมเป็นอย่างน้อย ${minRaiseTotal} ชิป (ไม่สามารถใส่ยอดต่ำกว่าเงินเดิมพันปัจจุบันได้)`}
          />
          <button
            type="button"
            className="action-btn raise"
            onClick={handleRaiseClick}
            disabled={!isMyTurn || player.status !== 'active' || !canRaise}
          >
            <span>Raise</span>
            <span className="btn-sub-text">
              {currentHighestBet === 0 ? `ขั้นต่ำ ${minRaise}` : `≥ ${minRaiseTotal}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
