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

  const handleTabSwitch = (tab: 'create' | 'join') => {
    setActiveTab(tab);
    setErrorMsg('');
    try {
      sound.playChip();
      triggerHaptic(15);
    } catch {
      // ignore
    }
  };

  const handleCreate = async () => {
    if (!hostName.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้สร้างห้อง');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      sound.playChip();
      triggerHaptic(25);
    } catch {
      // ignore
    }

    try {
      await onCreateRoom(hostName.trim(), startingChips, smallBlind, bigBlind, customPin.trim() || undefined);
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
    try {
      sound.playChip();
      triggerHaptic(25);
    } catch {
      // ignore
    }

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
        padding: '24px 16px',
        width: '100%',
        minHeight: '100%',
        gap: 16,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Brand Hero */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div
          style={{
            width: 56,
            height: 56,
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
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f3f4f6', marginTop: 4 }}>
          Poker Chip Simulator
        </h1>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 300 }}>
          จำลองชิปและเงินเดิมพันสำหรับวงปาร์ตี้ เล่นด้วยสำรับไพ่จริงนอกจอ
        </p>
      </div>

      {/* LAN Wi-Fi Help Box */}
      <div
        style={{
          width: '100%',
          maxWidth: 390,
          background: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
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
          padding: 16,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Large Touch-Friendly Tab Buttons */}
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
            style={{
              padding: '12px 10px',
              minHeight: 46,
              fontSize: '0.88rem',
              fontWeight: 700,
              background: activeTab === 'create' ? '#2563eb' : 'transparent',
              borderColor: activeTab === 'create' ? '#60a5fa' : 'transparent',
              color: activeTab === 'create' ? '#ffffff' : '#9ca3af',
              borderWidth: 1,
              borderStyle: 'solid',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
            onClick={() => handleTabSwitch('create')}
            onTouchEnd={() => handleTabSwitch('create')}
          >
            <PlusCircle size={16} />
            <span>สร้างห้อง (Admin)</span>
          </button>

          <button
            type="button"
            style={{
              padding: '12px 10px',
              minHeight: 46,
              fontSize: '0.88rem',
              fontWeight: 700,
              background: activeTab === 'join' ? '#10b981' : 'transparent',
              borderColor: activeTab === 'join' ? '#34d399' : 'transparent',
              color: activeTab === 'join' ? '#ffffff' : '#9ca3af',
              borderWidth: 1,
              borderStyle: 'solid',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
            onClick={() => handleTabSwitch('join')}
            onTouchEnd={() => handleTabSwitch('join')}
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

        {/* TAB 1: CREATE ROOM */}
        {activeTab === 'create' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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
                  padding: 12,
                  color: 'white',
                  fontSize: 16,
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
                    padding: 12,
                    color: '#f59e0b',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: 16,
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
                  placeholder="สุ่ม 4 หลัก"
                  maxLength={6}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    padding: 12,
                    color: '#93c5fd',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Small Blind</label>
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
                    padding: 10,
                    color: 'white',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 16,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Big Blind</label>
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
                    padding: 10,
                    color: 'white',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 16,
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              className="primary-btn"
              disabled={isLoading || !hostName.trim()}
              onClick={handleCreate}
              style={{ marginTop: 8, minHeight: 50, fontSize: 16 }}
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
          /* TAB 2: JOIN WITH PIN */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                รหัสห้อง (Room PIN 4-6 หลัก)
              </label>
              <input
                type="text"
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value)}
                placeholder="เช่น 5931"
                maxLength={8}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  borderRadius: 10,
                  padding: 12,
                  color: '#f59e0b',
                  fontSize: 20,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: 4,
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
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: 12,
                  color: 'white',
                  fontSize: 16,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                จำนวนชิปเริ่มต้น
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
                  padding: 12,
                  color: '#f59e0b',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: 16,
                }}
              />
            </div>

            <button
              type="button"
              className="primary-btn"
              disabled={isLoading || !joinPin.trim() || !joinPlayerName.trim()}
              onClick={handleJoin}
              style={{
                marginTop: 8,
                minHeight: 50,
                fontSize: 16,
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
          padding: 8,
        }}
      >
        <ShieldAlert size={14} color="#ef4444" />
        <span>ข้อตกลงและคำเตือนการใช้งาน (ไม่สนับสนุนการพนันเงินจริง)</span>
      </button>
    </div>
  );
};
