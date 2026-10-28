'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Undo2, Check, UserPlus, Vote as VoteIcon, Users, Sliders } from 'lucide-react';
import { RoomState, JoinRequest } from '@/types/poker';
import { sound, triggerHaptic } from '@/lib/sound';

interface AdminPanelProps {
  isOpen: boolean;
  state: RoomState;
  onClose: () => void;
  onApproveRequest: (requestId: string, chips: number) => void;
  onRejectRequest: (requestId: string) => void;
  onUndo: () => void;
  onCreateVote: (title: string, options: string[]) => void;
  onToggleHostPlaying: (isPlaying: boolean) => void;
  onUpdateBlinds: (sb: number, bb: number) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  state,
  onClose,
  onApproveRequest,
  onRejectRequest,
  onUndo,
  onCreateVote,
  onToggleHostPlaying,
  onUpdateBlinds,
}) => {
  const [chipInputs, setChipInputs] = useState<Record<string, number>>({});
  const [voteTitle, setVoteTitle] = useState('');
  const [sbInput, setSbInput] = useState(state.smallBlind);
  const [bbInput, setBbInput] = useState(state.bigBlind);
  const [activeTab, setActiveTab] = useState<'requests' | 'vote' | 'game'>('requests');

  if (!isOpen) return null;

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
            <h2 className="modal-title" style={{ fontSize: '1.2rem' }}>แผงควบคุมโฮสต์ (Admin)</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12 }}>
          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '6px 8px',
              fontSize: '0.78rem',
              background: activeTab === 'requests' ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
              borderColor: activeTab === 'requests' ? '#a78bfa' : 'transparent',
            }}
            onClick={() => setActiveTab('requests')}
          >
            คำขอ ({state.pendingRequests.length})
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '6px 8px',
              fontSize: '0.78rem',
              background: activeTab === 'vote' ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
              borderColor: activeTab === 'vote' ? '#a78bfa' : 'transparent',
            }}
            onClick={() => setActiveTab('vote')}
          >
            สร้างโหวต
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '6px 8px',
              fontSize: '0.78rem',
              background: activeTab === 'game' ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
              borderColor: activeTab === 'game' ? '#a78bfa' : 'transparent',
            }}
            onClick={() => setActiveTab('game')}
          >
            ตั้งค่าโต๊ะ
          </button>
        </div>

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
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ขอเข้าโต๊ะ</div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>ปรับขนาด Blinds:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Small Blind</label>
                  <input
                    type="number"
                    value={sbInput}
                    onChange={(e) => setSbInput(Number(e.target.value))}
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
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Big Blind</label>
                  <input
                    type="number"
                    value={bbInput}
                    onChange={(e) => setBbInput(Number(e.target.value))}
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
                onClick={() => {
                  sound.playChip();
                  onUpdateBlinds(sbInput, bbInput);
                }}
              >
                บันทึกค่า Blinds
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
