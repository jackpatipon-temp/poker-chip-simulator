'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Undo2, Check, UserPlus, Vote as VoteIcon, Users, Sliders, ArrowUp, ArrowDown, Dices, Coffee, UserMinus, Crown } from 'lucide-react';
import { RoomState, JoinRequest } from '@/types/poker';
import { sound, triggerHaptic } from '@/lib/sound';

interface AdminPanelProps {
  isOpen: boolean;
  state: RoomState;
  isHost?: boolean;
  currentUserId?: string;
  onClose: () => void;
  onApproveRequest: (requestId: string, chips: number) => void;
  onRejectRequest: (requestId: string) => void;
  onUndo: () => void;
  onCreateVote: (title: string, options: string[]) => void;
  onToggleHostPlaying: (isPlaying: boolean) => void;
  onUpdateBlinds: (sb: number, bb: number) => void;
  onSetDealer?: (playerId: string) => void;
  onRandomizeDealer?: () => void;
  onMoveSeat?: (playerId: string, direction: 'up' | 'down') => void;
  onToggleAfk?: (playerId: string) => void;
  onKickPlayer?: (playerId: string) => void;
  onTransferHost?: (playerId: string) => void;
  onOpenLogs?: () => void;
  initialTab?: 'seating' | 'requests' | 'vote' | 'game';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  state,
  isHost = true,
  currentUserId,
  onClose,
  onApproveRequest,
  onRejectRequest,
  onUndo,
  onCreateVote,
  onToggleHostPlaying,
  onUpdateBlinds,
  onSetDealer,
  onRandomizeDealer,
  onMoveSeat,
  onToggleAfk,
  onKickPlayer,
  onTransferHost,
  onOpenLogs,
  initialTab = 'seating',
}) => {
  const [chipInputs, setChipInputs] = useState<Record<string, number>>({});
  const [voteTitle, setVoteTitle] = useState('');
  const [sbInput, setSbInput] = useState(state.nextSmallBlind ?? state.smallBlind);
  const [bbInput, setBbInput] = useState(state.nextBigBlind ?? state.bigBlind);
  const [activeTab, setActiveTab] = useState<'seating' | 'requests' | 'vote' | 'game'>(initialTab);

  if (!isOpen || !isHost) return null;

  const handleApprove = (req: JoinRequest) => {
    sound.playChip();
    triggerHaptic(20);
    const chips = chipInputs[req.id] || req.requestedChips || 1000;
    onApproveRequest(req.id, chips);
  };

  const handleStartVote = () => {
    if (!voteTitle.trim()) return;
    sound.playChip();
    triggerHaptic(25);
    onCreateVote(voteTitle.trim(), ['เห็นด้วย (Agree)', 'ไม่เห็นด้วย (Disagree)']);
    setVoteTitle('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a78bfa' }}>
            <Users size={22} />
            <h2 className="modal-title" style={{ fontSize: '1.2rem' }}>แผงจัดการห้อง (Room Setup)</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {onOpenLogs && (
              <button
                type="button"
                className="secondary-btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: 'rgba(59, 130, 246, 0.2)',
                  borderColor: '#3b82f6',
                  color: '#93c5fd',
                }}
                onClick={() => {
                  onClose();
                  onOpenLogs();
                }}
                title="ดูประวัติห้องและยอดคงเหลือล่าสุดของผู้เล่นทุกคน"
              >
                📋 ดู Logs
              </button>
            )}
            <button type="button" className="modal-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12 }}>
          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '6px 4px',
              fontSize: '0.74rem',
              background: activeTab === 'seating' ? 'rgba(139, 92, 246, 0.35)' : 'transparent',
              borderColor: activeTab === 'seating' ? '#a78bfa' : 'transparent',
              fontWeight: activeTab === 'seating' ? 700 : 500,
            }}
            onClick={() => setActiveTab('seating')}
          >
            ที่นั่ง & Dealer
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '6px 4px',
              fontSize: '0.74rem',
              background: activeTab === 'requests' ? 'rgba(139, 92, 246, 0.35)' : 'transparent',
              borderColor: activeTab === 'requests' ? '#a78bfa' : 'transparent',
              fontWeight: activeTab === 'requests' ? 700 : 500,
            }}
            onClick={() => setActiveTab('requests')}
          >
            คำขอ ({state.pendingRequests.length})
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '6px 4px',
              fontSize: '0.74rem',
              background: activeTab === 'vote' ? 'rgba(139, 92, 246, 0.35)' : 'transparent',
              borderColor: activeTab === 'vote' ? '#a78bfa' : 'transparent',
              fontWeight: activeTab === 'vote' ? 700 : 500,
            }}
            onClick={() => setActiveTab('vote')}
          >
            สร้างโหวต
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '6px 4px',
              fontSize: '0.74rem',
              background: activeTab === 'game' ? 'rgba(139, 92, 246, 0.35)' : 'transparent',
              borderColor: activeTab === 'game' ? '#a78bfa' : 'transparent',
              fontWeight: activeTab === 'game' ? 700 : 500,
            }}
            onClick={() => setActiveTab('game')}
          >
            ตั้งค่าโต๊ะ
          </button>
        </div>

        {/* TAB 0: SEATING & DEALER MANAGEMENT */}
        {activeTab === 'seating' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Informative Poker Rules Card */}
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: '0.76rem',
                color: '#bfdbfe',
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, color: '#93c5fd', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🎯 กติกาการนั่งโต๊ะ & การวน Dealer</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <li>ก่อนเริ่มเกม สามารถเลือกนั่งตรงไหนก็ได้ หรือกดสลับเก้าอี้/จัดลำดับรอบโต๊ะได้อิสระ</li>
                <li>เมื่อเริ่มเล่นแล้ว ลำดับที่นั่งจะคงที่ และปุ่ม Dealer (D) พร้อม Blinds (SB, BB) จะ <strong>วนซ้ายตามเข็มนาฬิกา</strong> เสมอ</li>
                <li>หากผู้เล่นลุกไปเข้าห้องน้ำ/พักเบรก ให้กด <strong>"พักเบรก (Sit Out)"</strong> ที่นั่งจะถูกจองไว้เดิม และจะข้ามตาให้อัตโนมัติ</li>
              </ul>
            </div>

            {/* Quick Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                ผู้เล่นในโต๊ะ ({state.players.length} คน):
              </span>
              {isHost && onRandomizeDealer && (
                <button
                  type="button"
                  className="secondary-btn"
                  style={{
                    fontSize: '0.74rem',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#f59e0b',
                    borderColor: 'rgba(245, 158, 11, 0.4)',
                  }}
                  onClick={() => {
                    sound.playChip();
                    triggerHaptic(20);
                    onRandomizeDealer();
                  }}
                  title="สุ่มเลือกผู้เล่น 1 คนเป็น Dealer คนแรกของเกม"
                >
                  <Dices size={14} />
                  <span>สุ่มเลือก Dealer</span>
                </button>
              )}
            </div>

            {/* Players Seating List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {state.players.map((p, idx) => {
                const isDealer = p.isDealer || idx === state.dealerIndex;
                const isAfk = p.status === 'sitting-out';

                return (
                  <div
                    key={p.id}
                    style={{
                      background: isDealer ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                      border: isDealer ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                      borderRadius: 12,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    {/* Player Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#9ca3af',
                          flexShrink: 0,
                        }}
                      >
                        #{idx + 1}
                      </div>
                      <Image
                        src={p.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={p.name}
                        width={30}
                        height={30}
                        style={{ borderRadius: '50%', flexShrink: 0 }}
                        unoptimized
                      />
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </span>
                          {p.isHost && (
                            <span style={{ fontSize: '0.65rem', background: 'rgba(139, 92, 246, 0.3)', color: '#c4b5fd', padding: '1px 5px', borderRadius: 4 }}>
                              Host
                            </span>
                          )}
                          {isAfk && (
                            <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5', padding: '1px 5px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Coffee size={10} />
                              พักเบรก
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                          🪙 {p.chips.toLocaleString()} ชิป
                        </div>
                      </div>
                    </div>

                    {/* Actions: Dealer Button + Move Seat + Sit Out */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {/* Set Dealer Button */}
                      {isDealer ? (
                        <div
                          style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: '#000',
                            fontWeight: 900,
                            fontSize: '0.72rem',
                            padding: '4px 8px',
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)',
                          }}
                        >
                          <span>D</span>
                          <span>Dealer</span>
                        </div>
                      ) : (
                        isHost && onSetDealer && (
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{
                              fontSize: '0.7rem',
                              padding: '4px 8px',
                              color: '#d1d5db',
                            }}
                            onClick={() => {
                              sound.playChip();
                              triggerHaptic(20);
                              onSetDealer(p.id);
                            }}
                            title="ตั้งผู้เล่นคนนี้เป็น Dealer"
                          >
                            ตั้งเป็น D
                          </button>
                        )
                      )}

                      {/* Move Seat Up / Down */}
                      {isHost && onMoveSeat && state.players.length > 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ width: 22, height: 20, padding: 0 }}
                            onClick={() => {
                              sound.playChip();
                              onMoveSeat(p.id, 'up');
                            }}
                            title="เลื่อนตำแหน่งที่นั่งขึ้น (ตามเข็มนาฬิกา)"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ width: 22, height: 20, padding: 0 }}
                            onClick={() => {
                              sound.playChip();
                              onMoveSeat(p.id, 'down');
                            }}
                            title="เลื่อนตำแหน่งที่นั่งลง"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                      )}

                      {/* Toggle AFK / Sit Out for player */}
                      {(isHost || p.id === currentUserId) && onToggleAfk && (
                        <button
                          type="button"
                          className="icon-btn"
                          style={{
                            width: 28,
                            height: 28,
                            borderColor: isAfk ? '#f87171' : undefined,
                            color: isAfk ? '#f87171' : '#9ca3af',
                            background: isAfk ? 'rgba(239, 68, 68, 0.15)' : undefined,
                          }}
                          onClick={() => {
                            sound.playChip();
                            onToggleAfk(p.id);
                          }}
                          title={isAfk ? 'ปลดสถานะพักเบรก (กลับเข้าโต๊ะ)' : 'ตั้งสถานะพักเบรก/เข้าห้องน้ำ'}
                        >
                          <Coffee size={14} />
                        </button>
                      )}

                      {/* Transfer Host button (only for non-host players, callable only by Host) */}
                      {!p.isHost && isHost && onTransferHost && (
                        <button
                          type="button"
                          className="icon-btn"
                          style={{
                            width: 28,
                            height: 28,
                            borderColor: 'rgba(245, 158, 11, 0.4)',
                            color: '#f59e0b',
                            background: 'rgba(245, 158, 11, 0.1)',
                          }}
                          onClick={() => {
                            if (confirm(`คุณต้องการโอนสิทธิ์ Host ให้ผู้เล่น "${p.name}" หรือไม่?`)) {
                              sound.playWin();
                              triggerHaptic(30);
                              onTransferHost(p.id);
                            }
                          }}
                          title={`โอนสิทธิ์ Host ให้ ${p.name}`}
                        >
                          <Crown size={14} />
                        </button>
                      )}

                      {/* Kick player button (only for non-host players, callable only by Host) */}
                      {!p.isHost && isHost && onKickPlayer && (
                        <button
                          type="button"
                          className="icon-btn"
                          style={{
                            width: 28,
                            height: 28,
                            borderColor: 'rgba(239, 68, 68, 0.4)',
                            color: '#ef4444',
                            background: 'rgba(239, 68, 68, 0.1)',
                          }}
                          onClick={() => {
                            if (confirm(`คุณต้องการเตะผู้เล่น "${p.name}" ออกจากโต๊ะหรือไม่?`)) {
                              sound.playFold();
                              triggerHaptic(30);
                              onKickPlayer(p.id);
                            }
                          }}
                          title={`เตะ ${p.name} ออกจากโต๊ะ`}
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 1: PENDING REQUESTS */}
        {activeTab === 'requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              อนุมัติผู้เล่นเข้าห้อง และกำหนดจำนวนชิปเริ่มต้น:
            </div>

            {state.pendingRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                ไม่มีคำขอเข้าห้องในขณะนี้
              </div>
            ) : (
              state.pendingRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Image
                      src={req.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={req.userName}
                      width={32}
                      height={32}
                      style={{ borderRadius: '50%' }}
                      unoptimized
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{req.userName}</div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: req.type === 'rebuy' ? '#60a5fa' : 'var(--text-muted)',
                          fontWeight: req.type === 'rebuy' ? 700 : 500,
                        }}
                      >
                        {req.type === 'rebuy' ? '💰 ขอเพิ่มชิป (Rebuy)' : 'ขอเข้าโต๊ะ'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      placeholder="ชิป"
                      value={chipInputs[req.id] ?? req.requestedChips ?? 1000}
                      onChange={(e) =>
                        setChipInputs({ ...chipInputs, [req.id]: Number(e.target.value) })
                      }
                      style={{
                        width: 72,
                        padding: '6px 8px',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 8,
                        color: '#f59e0b',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ background: '#10b981', color: 'white', width: 32, height: 32 }}
                      onClick={() => handleApprove(req)}
                      title="อนุมัติ"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ background: '#ef4444', color: 'white', width: 32, height: 32 }}
                      onClick={() => onRejectRequest(req.id)}
                      title="ปฏิเสธ"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: CREATE VOTE */}
        {activeTab === 'vote' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              เปิดให้ผู้เล่นทุกคนในโต๊ะร่วมลงคะแนนโหวต (เช่น แก้ไขการตัดสินใจ หรือตัดสินกรณีมีข้อพิพาท):
            </div>
            <textarea
              rows={3}
              placeholder="หัวข้อการโหวต เช่น: 'คืนชิปให้ Sam 100 ชิปเนื่องจากกดผิด หรือไม่?'"
              value={voteTitle}
              onChange={(e) => setVoteTitle(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: 10,
                color: 'white',
                fontFamily: 'var(--font-main)',
                fontSize: '0.85rem',
                resize: 'none',
              }}
            />
            <button
              type="button"
              className="primary-btn"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
              onClick={handleStartVote}
              disabled={!voteTitle.trim()}
            >
              <VoteIcon size={18} />
              เปิดการลงคะแนนโหวต
            </button>
          </div>
        )}

        {/* TAB 3: GAME / TABLE SETTINGS */}
        {activeTab === 'game' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* UNDO BUTTON */}
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f87171' }}>ย้อนกลับการกระทำ (Undo)</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    ย้อนสถานะชิปและการตัดสินใจ (มีประวัติย้อนหลัง {state.history.length} สเต็ป)
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => {
                    sound.playFold();
                    triggerHaptic(30);
                    onUndo();
                  }}
                  disabled={state.history.length === 0}
                >
                  <Undo2 size={16} />
                  Undo
                </button>
              </div>
            </div>

            {/* Admin Role Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>บทบาทของ Admin</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {state.isHostPlaying ? 'ลงเล่นในโต๊ะด้วย' : 'เป็นผู้คุมโต๊ะ / ดีลเลอร์อย่างเดียว'}
                </div>
              </div>
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                onClick={() => onToggleHostPlaying(!state.isHostPlaying)}
              >
                {state.isHostPlaying ? 'เปลี่ยนเป็น Spectator' : 'เปลี่ยนเป็น Player'}
              </button>
            </div>

            {/* Blinds Adjustment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>ตั้งค่า Blinds ตาถัดไป:</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ปัจจุบัน: {state.smallBlind} / {state.bigBlind}
                </span>
              </div>
              {state.nextSmallBlind !== undefined && state.nextBigBlind !== undefined && (
                <div style={{ fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '4px 8px', borderRadius: 6 }}>
                  ⏳ ตาถัดไปจะปรับเป็น: {state.nextSmallBlind} / {state.nextBigBlind} (หลังจบตา)
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Small Blind (ตาถัดไป)</label>
                  <input
                    type="number"
                    min={1}
                    value={sbInput}
                    onChange={(e) => setSbInput(Math.max(1, Number(e.target.value)))}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      padding: 8,
                      color: 'white',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Big Blind (ตาถัดไป)</label>
                  <input
                    type="number"
                    min={2}
                    value={bbInput}
                    onChange={(e) => setBbInput(Math.max(2, Number(e.target.value)))}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      padding: 8,
                      color: 'white',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="secondary-btn"
                style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3))', borderColor: '#a78bfa' }}
                onClick={() => {
                  sound.playChip();
                  onUpdateBlinds(sbInput, bbInput);
                }}
              >
                บันทึกค่า Blinds สำหรับตาถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
