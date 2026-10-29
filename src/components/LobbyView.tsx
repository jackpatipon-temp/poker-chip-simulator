'use client';

import React, { useState } from 'react';
import { PlusCircle, Users, Wifi, ShieldAlert, ArrowRight, ArrowLeft, Sparkles, Loader2, KeyRound } from 'lucide-react';
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
  // Screen state: 'home' | 'join' | 'create'
  const [currentScreen, setCurrentScreen] = useState<'home' | 'join' | 'create'>('home');

  // Create Room fields
  const [hostName, setHostName] = useState('Patipon');
  const [startingChips, setStartingChips] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [customPin, setCustomPin] = useState('');

  // Join Room fields
  const [joinPin, setJoinPin] = useState('');
  const [joinPlayerName, setJoinPlayerName] = useState('');
  const [joinChips, setJoinChips] = useState(1000);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const navigateTo = (screen: 'home' | 'join' | 'create') => {
    setCurrentScreen(screen);
    setErrorMsg('');
    try {
      sound.playChip();
      triggerHaptic(20);
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
          <strong>เล่นกับเพื่อนในบ้าน (Wi-Fi เดียวกัน):</strong>
          <div style={{ marginTop: 2 }}>
            ให้แฟนเปิดเว็บ:{' '}
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

      {/* Main Container Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 390,
          background: 'var(--bg-card)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 20,
          padding: 20,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: '0.8rem',
              color: '#fca5a5',
              marginBottom: 14,
              textAlign: 'center',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* =======================================================
            SCREEN 1: HOME (2 Big Choice Buttons)
            ======================================================= */}
        {currentScreen === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>เลือกการเข้าใช้งาน</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>คุณต้องการเข้าเล่นเป็นใคร?</div>
            </div>

            {/* BIG BUTTON 1: JOIN WITH PIN (Primary for players/girlfriend) */}
            <button
              type="button"
              onClick={() => navigateTo('join')}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                borderRadius: 16,
                padding: '18px 16px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                touchAction: 'manipulation',
                boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <KeyRound size={22} color="white" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800 }}>เข้าห้องด้วย PIN</div>
                  <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                    สำหรับผู้เล่น / แฟน (กดเพื่อใส่รหัสห้อง)
                  </div>
                </div>
              </div>
              <ArrowRight size={20} color="white" />
            </button>

            {/* BIG BUTTON 2: CREATE ROOM (For Host) */}
            <button
              type="button"
              onClick={() => navigateTo('create')}
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                border: '1px solid rgba(96, 165, 250, 0.4)',
                borderRadius: 16,
                padding: '18px 16px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                touchAction: 'manipulation',
                boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PlusCircle size={22} color="white" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800 }}>สร้างห้องใหม่ (Admin)</div>
                  <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                    สำหรับเจ้าของโต๊ะ (สร้าง PIN ให้คนอื่นเข้า)
                  </div>
                </div>
              </div>
              <ArrowRight size={20} color="white" />
            </button>
          </div>
        )}

        {/* =======================================================
            SCREEN 2: JOIN WITH PIN (Direct screen to enter PIN)
            ======================================================= */}
        {currentScreen === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header with Back Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <button
                type="button"
                onClick={() => navigateTo('home')}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '6px 12px',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={15} />
                <span>ย้อนกลับ</span>
              </button>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#34d399' }}>ใส่ PIN เพื่อเข้าห้อง</div>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                รหัสห้อง (Room PIN)
              </label>
              <input
                type="text"
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value)}
                placeholder="เช่น 5931"
                maxLength={8}
                autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1.5px solid #f59e0b',
                  borderRadius: 12,
                  padding: '14px 10px',
                  color: '#f59e0b',
                  fontSize: 22,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: 4,
                  textAlign: 'center',
                  fontWeight: 900,
                  marginTop: 4,
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
                  marginTop: 4,
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
                  marginTop: 4,
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
                minHeight: 52,
                fontSize: 16,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.45)',
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

        {/* =======================================================
            SCREEN 3: CREATE ROOM (Host / Admin Configuration)
            ======================================================= */}
        {currentScreen === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header with Back Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <button
                type="button"
                onClick={() => navigateTo('home')}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '6px 12px',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={15} />
                <span>ย้อนกลับ</span>
              </button>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#60a5fa' }}>สร้างห้องใหม่ (Admin)</div>
            </div>

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
                  marginTop: 4,
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
                    marginTop: 4,
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
                    marginTop: 4,
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
                    marginTop: 4,
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
                    marginTop: 4,
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              className="primary-btn"
              disabled={isLoading || !hostName.trim()}
              onClick={handleCreate}
              style={{
                marginTop: 6,
                minHeight: 52,
                fontSize: 16,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 6px 20px rgba(37, 99, 235, 0.45)',
              }}
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
