'use client';

import React from 'react';
import { Player } from '@/types/poker';
import { FloatingTip } from './FloatingTip';
import { sound, triggerHaptic } from '@/lib/sound';

interface ActionControlsProps {
  player: Player | null;
  currentHighestBet: number;
  minRaise: number;
  isMyTurn: boolean;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onOpenRaiseModal: () => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  player,
  currentHighestBet,
  minRaise,
  isMyTurn,
  onFold,
  onCheck,
  onCall,
  onOpenRaiseModal,
}) => {
  if (!player) return null;

  const currentBet = player.currentBet || 0;
  const toCall = Math.max(0, currentHighestBet - currentBet);
  const canCheck = toCall === 0;
  const canCall = toCall > 0 && player.chips > 0;
  const callAmount = Math.min(toCall, player.chips);
  const isAllInCall = callAmount === player.chips;

  const minRaiseTotal = currentHighestBet + minRaise;
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
                text={`มีผู้เล่นก่อนหน้าลงเดิมพันไว้สูงสุด ${currentHighestBet} คุณจึงต้องวางชิปเพิ่มอีก ${callAmount} เพื่อให้เท่ากันและได้สิทธิ์เล่นต่อ`}
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

        {/* RAISE BUTTON */}
        <div className="action-btn-wrapper">
          <FloatingTip
            title="การเกทับ (Raise)"
            text={`เพิ่มเงินเดิมพันขั้นต่ำเป็น ${minRaiseTotal} (ต้องเพิ่มขึ้นอย่างน้อยเท่ากับการ Raise ครั้งก่อนหน้า +${minRaise} หรือ Big Blind)`}
          />
          <button
            type="button"
            className="action-btn raise"
            onClick={handleRaiseClick}
            disabled={!isMyTurn || player.status !== 'active' || !canRaise}
          >
            <span>{currentHighestBet === 0 ? 'Bet' : 'Raise'}</span>
            <span className="btn-sub-text">
              {currentHighestBet === 0 ? `ขั้นต่ำ ${minRaise}` : `+${minRaise}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
