'use client';

import React, { useState } from 'react';
import { PlusCircle, Users, Wifi, ShieldAlert, ArrowRight, Sparkles } from 'lucide-react';
import { sound, triggerHaptic } from '@/lib/sound';

interface LobbyViewProps {
  localIp: string;
  onCreateRoom: (hostName: string, chips: number, sb: number, bb: number, customPin?: string) => Promise<void>;
  onJoinRoom: (pin: string, playerName: string, chips: number) => Promise<void>;
  onOpenDisclaimer: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  localIp,
  onCreateRoom,
  onJoinRoom,
  onOpenDisclaimer,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [hostName, setHostName] = useState('Patipon');
  const [startingChips, setStartingChips] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [customPin, setCustomPin] = useState('');

  const [joinPin, setJoinPin] = useState('');
  const [joinPlayerName, setJoinPlayerName] = useState('');
  const [joinChips, setJoinChips] = useState(1000);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    sound.playChip();
    triggerHaptic(30);

    try {
      await onCreateRoom(hostName.trim(), startingChips, smallBlind, bigBlind, customPin || undefined);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'เกิดข้อผิดพลาดในการสร้างห้อง');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinPin.trim() || !joinPlayerName.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    sound.playChip();
    triggerHaptic(30);

    try {
      await onJoinRoom(joinPin.trim(), joinPlayerName.trim(), joinChips);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'ไม่สามารถเข้าร่วมห้องได้ ตรวจสอบ PIN');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        minHeight: '100%',
        gap: 20,
      }}
    >
      {/* Brand Hero */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
            border: '1.5px solid rgba(59, 130, 246, 0.4)',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
          }}
        >
          ♠️
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f3f4f6', marginTop: 4 }}>
          Texas Hold&apos;em Simulator
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 320 }}>
          จำลองชิปและเงินเดิมพันสำหรับวงปาร์ตี้ เล่นด้วยสำรับไพ่จริงนอกจอ
        </p>
      </div>

      {/* LAN Wi-Fi Help Box */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 14,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <Wifi size={20} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '0.78rem', color: '#bfdbfe', lineHeight: 1.5 }}>
          <strong>ทดสอบกับเพื่อนในบ้าน (Wi-Fi เดียวกัน):</strong>
          <div>
            ให้แฟนเปิดเบราว์เซอร์แล้วเข้า:{' '}
            <code
              style={{
                background: 'rgba(0,0,0,0.5)',
                padding: '2px 6px',
                borderRadius: 4,
                color: '#facc15',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
              }}
            >
              http://{localIp || '192.168.1.106'}:3000
            </code>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#93c5fd' }}>
            *ไม่ต้องใช้ Vercel หรือต่อเน็ตนอกบ้าน ระบบเชื่อมต่อกันภายในทันที
          </span>
        </div>
      </div>

      {/* Main Tab Box */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--bg-card)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 20,
          padding: 20,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Tab Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            background: 'rgba(0,0,0,0.4)',
            padding: 4,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '10px 12px',
              fontSize: '0.88rem',
              background: activeTab === 'create' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              borderColor: activeTab === 'create' ? '#3b82f6' : 'transparent',
              color: activeTab === 'create' ? '#93c5fd' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            onClick={() => {
              setActiveTab('create');
              setErrorMsg('');
            }}
          >
            <PlusCircle size={16} />
            <span>สร้างห้อง (Admin)</span>
          </button>

          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '10px 12px',
              fontSize: '0.88rem',
              background: activeTab === 'join' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              borderColor: activeTab === 'join' ? '#3b82f6' : 'transparent',
              color: activeTab === 'join' ? '#93c5fd' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            onClick={() => {
              setActiveTab('join');
              setErrorMsg('');
            }}
          >
            <Users size={16} />
            <span>เข้าด้วย PIN</span>
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: '0.8rem',
              color: '#fca5a5',
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* CREATE ROOM FORM */}
        {activeTab === 'create' ? (
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                ชื่อผู้สร้างห้อง (Admin / Host)
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="เช่น Patipon"
                required
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: 10,
                  color: 'white',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ชิปเริ่มต้น</label>
                <input
                  type="number"
                  value={startingChips}
                  onChange={(e) => setStartingChips(Number(e.target.value))}
                  min={100}
                  step={100}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    padding: 10,
                    color: '#f59e0b',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  กำหนด PIN (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={customPin}
                  onChange={(e) => setCustomPin(e.target.value)}
                  placeholder="สุ่มให้อัตโนมัติ"
                  maxLength={6}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    padding: 10,
                    color: '#93c5fd',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Small Blind</label>
                <input
                  type="number"
                  value={smallBlind}
                  onChange={(e) => setSmallBlind(Number(e.target.value))}
                  min={1}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: 8,
                    color: 'white',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Big Blind</label>
                <input
                  type="number"
                  value={bigBlind}
                  onChange={(e) => setBigBlind(Number(e.target.value))}
                  min={2}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
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
              type="submit"
              className="primary-btn"
              disabled={isLoading || !hostName.trim()}
              style={{ marginTop: 8 }}
            >
              <Sparkles size={18} />
              {isLoading ? 'กำลังสร้างห้อง...' : 'สร้างห้องและเข้าโต๊ะ'}
            </button>
          </form>
        ) : (
          /* JOIN WITH PIN FORM */
          <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                รหัสห้อง (Room PIN)
              </label>
              <input
                type="text"
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value)}
                placeholder="ใส่ PIN เช่น 1234"
                maxLength={8}
                required
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: 12,
                  color: '#f59e0b',
                  fontSize: '1.2rem',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: 3,
                  textAlign: 'center',
                  fontWeight: 800,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                ชื่อของคุณ (Player Name)
              </label>
              <input
                type="text"
                value={joinPlayerName}
                onChange={(e) => setJoinPlayerName(e.target.value)}
                placeholder="เช่น แฟน / ผู้เล่น 2"
                required
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: 10,
                  color: 'white',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                จำนวนชิปที่ต้องการ
              </label>
              <input
                type="number"
                value={joinChips}
                onChange={(e) => setJoinChips(Number(e.target.value))}
                min={100}
                step={100}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: 10,
                  color: '#f59e0b',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                }}
              />
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={isLoading || !joinPin.trim() || !joinPlayerName.trim()}
              style={{
                marginTop: 8,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              }}
            >
              <ArrowRight size={18} />
              {isLoading ? 'กำลังเชื่อมต่อ...' : 'ส่งคำขอเข้าห้อง'}
            </button>
          </form>
        )}
      </div>

      {/* Footer Disclaimer Link */}
      <button
        type="button"
        onClick={onOpenDisclaimer}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-dim)',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
        }}
      >
        <ShieldAlert size={14} color="#ef4444" />
        <span>ข้อตกลงและคำเตือนการใช้งาน (ไม่สนับสนุนการพนันเงินจริง)</span>
      </button>
    </div>
  );
};
