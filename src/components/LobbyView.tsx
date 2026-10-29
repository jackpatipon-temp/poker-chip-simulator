'use client';

import React, { useState } from 'react';
import { PlusCircle, Users, Wifi, ShieldAlert, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
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

  const handleCreate = async () => {
    if (!hostName.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้สร้างห้อง');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    sound.playChip();
    triggerHaptic(30);

    try {
      await onCreateRoom(hostName.trim(), startingChips, smallBlind, bigBlind, customPin || undefined);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'เกิดข้อผิดพลาดในการสร้างห้อง');
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinPin.trim()) {
      setErrorMsg('กรุณากรอกรหัสห้อง (PIN)');
      return;
    }
    if (!joinPlayerName.trim()) {
      setErrorMsg('กรุณากรอกชื่อของคุณ');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    sound.playChip();
    triggerHaptic(30);

    try {
      await onJoinRoom(joinPin.trim(), joinPlayerName.trim(), joinChips);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'ไม่สามารถเข้าร่วมห้องได้ ตรวจสอบ PIN');
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
        padding: '20px 16px',
        minHeight: '100%',
        gap: 16,
        overflowY: 'auto',
      }}
    >
      {/* Brand Hero */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
            border: '1.5px solid rgba(59, 130, 246, 0.4)',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
          }}
        >
          ♠️
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f3f4f6', marginTop: 4 }}>
          Texas Hold&apos;em Simulator
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 320 }}>
          จำลองชิปและเงินเดิมพันสำหรับวงปาร์ตี้ เล่นด้วยสำรับไพ่จริงนอกจอ
        </p>
      </div>

      {/* LAN Wi-Fi Help Box */}
      <div
        style={{
          width: '100%',
          maxWidth: 390,
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 14,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <Wifi size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '0.76rem', color: '#bfdbfe', lineHeight: 1.4 }}>
          <strong>ทดสอบเล่นด้วยกันในบ้าน (Wi-Fi เดียวกัน):</strong>
          <div style={{ marginTop: 2 }}>
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
        </div>
      </div>

      {/* Main Tab Box */}
      <div
        style={{
          width: '100%',
          maxWidth: 390,
          background: 'var(--bg-card)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 18,
          padding: 18,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Tab Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
            background: 'rgba(0,0,0,0.4)',
            padding: 4,
            borderRadius: 12,
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '8px 10px',
              fontSize: '0.85rem',
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
            <PlusCircle size={15} />
            <span>สร้างห้อง (Admin)</span>
          </button>

          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '8px 10px',
              fontSize: '0.85rem',
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
            <Users size={15} />
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
              fontSize: '0.78rem',
              color: '#fca5a5',
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* CREATE ROOM CONTENT (DIV instead of FORM to prevent mobile browser navigation) */}
        {activeTab === 'create' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                ชื่อผู้สร้างห้อง (Admin / Host)
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="เช่น Patipon"
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>ชิปเริ่มต้น</label>
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
                <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  กำหนด PIN (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={customPin}
                  onChange={(e) => setCustomPin(e.target.value)}
                  placeholder="สุ่ม 4 หลัก"
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Small Blind</label>
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
                <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Big Blind</label>
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
              type="button"
              className="primary-btn"
              disabled={isLoading || !hostName.trim()}
              onClick={handleCreate}
              style={{ marginTop: 6 }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>กำลังสร้างห้อง...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>สร้างห้องและเข้าโต๊ะ</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* JOIN WITH PIN CONTENT */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                รหัสห้อง (Room PIN)
              </label>
              <input
                type="text"
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value)}
                placeholder="ใส่ PIN เช่น 1234"
                maxLength={8}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: 10,
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
              <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                ชื่อของคุณ (Player Name)
              </label>
              <input
                type="text"
                value={joinPlayerName}
                onChange={(e) => setJoinPlayerName(e.target.value)}
                placeholder="เช่น แฟน / ผู้เล่น 2"
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
              <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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
              type="button"
              className="primary-btn"
              disabled={isLoading || !joinPin.trim() || !joinPlayerName.trim()}
              onClick={handleJoin}
              style={{
                marginTop: 6,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>กำลังเชื่อมต่อห้อง...</span>
                </>
              ) : (
                <>
                  <ArrowRight size={18} />
                  <span>เข้าห้องทันที</span>
                </>
              )}
            </button>
          </div>
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
