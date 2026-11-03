'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { PlusCircle, Wifi, ShieldAlert, ArrowRight, Sparkles, Loader2, KeyRound, LogOut, CheckCircle2 } from 'lucide-react';
import { sound, triggerHaptic } from '@/lib/sound';
import { GoogleUserProfile, isSupabaseConfigured } from '@/lib/supabase';

interface LobbyViewProps {
  localIp: string;
  user: GoogleUserProfile | null;
  isAuthLoading?: boolean;
  onLoginWithGoogle: () => void;
  onLogoutGoogle: () => void;
  onCreateRoom: (
    hostName: string,
    chips: number,
    sb: number,
    bb: number,
    customPin?: string,
    hostAvatar?: string
  ) => Promise<void>;
  onJoinRoom: (
    pin: string,
    playerName: string,
    chips: number,
    playerAvatar?: string
  ) => Promise<void>;
  onOpenDisclaimer: () => void;
}

const GoogleIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.64-5.2 3.64-9.15z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.73-2.1-6.66-4.94H1.32v3.13C3.33 21.36 7.37 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.34 14.26c-.24-.72-.38-1.49-.38-2.26s.14-1.54.38-2.26V6.61H1.32C.48 8.28 0 10.09 0 12s.48 3.72 1.32 5.39l4.02-3.13z"
    />
    <path
      fill="#EA4335"
      d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.22 15.24 0 12 0 7.37 0 3.33 2.64 1.32 6.61l4.02 3.13c.93-2.84 3.56-4.97 6.66-4.97z"
    />
  </svg>
);

export const LobbyView: React.FC<LobbyViewProps> = ({
  localIp,
  user,
  isAuthLoading = false,
  onLoginWithGoogle,
  onLogoutGoogle,
  onCreateRoom,
  onJoinRoom,
  onOpenDisclaimer,
}) => {
  // Active Tab: 'join' (default for players/phone) | 'create' (for host)
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');

  // Join Room fields (Immediately visible on page load)
  const [joinPin, setJoinPin] = useState('');
  const [joinPlayerName, setJoinPlayerName] = useState(user?.name || '');
  const [joinChips, setJoinChips] = useState(1000);

  // Create Room fields
  const [hostName, setHostName] = useState(user?.name || 'Host Admin');
  const [startingChips, setStartingChips] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [customPin, setCustomPin] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync Google user name to inputs whenever user logs in
  useEffect(() => {
    if (user?.name) {
      setJoinPlayerName(user.name);
      setHostName(user.name);
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { __logEvent?: (t: string, d: unknown) => void }).__logEvent) {
      (window as unknown as { __logEvent: (t: string, d: unknown) => void }).__logEvent('REACT_HYDRATED', {
        component: 'LobbyView',
        activeTab,
      });
    }
  }, [activeTab]);

  const handleTabChange = (tab: 'join' | 'create') => {
    if (typeof window !== 'undefined' && (window as unknown as { __logEvent?: (t: string, d: unknown) => void }).__logEvent) {
      (window as unknown as { __logEvent: (t: string, d: unknown) => void }).__logEvent('TAB_CLICK', { tab });
    }
    setActiveTab(tab);
    setErrorMsg('');
    try {
      sound.playChip();
      triggerHaptic(20);
    } catch {}
  };

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Check if Google Login is required
    if (isSupabaseConfigured() && !user) {
      setErrorMsg('กรุณาเข้าสู่ระบบด้วย Google ก่อนเข้าห้อง');
      onLoginWithGoogle();
      return;
    }

    const finalName = (joinPlayerName || user?.name || '').trim();
    if (!joinPin.trim()) {
      setErrorMsg('กรุณากรอกรหัสห้อง (PIN)');
      return;
    }
    if (!finalName) {
      setErrorMsg('กรุณากรอกชื่อของคุณ');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      sound.playChip();
      triggerHaptic(25);
    } catch {}

    try {
      await onJoinRoom(
        joinPin.trim(),
        finalName,
        joinChips,
        user?.avatarUrl
      );
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'ไม่สามารถเข้าร่วมห้องได้ ตรวจสอบ PIN');
      setIsLoading(false);
    }
  };

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Check if Google Login is required
    if (isSupabaseConfigured() && !user) {
      setErrorMsg('กรุณาเข้าสู่ระบบด้วย Google ก่อนสร้างห้อง');
      onLoginWithGoogle();
      return;
    }

    const finalName = (hostName || user?.name || '').trim();
    if (!finalName) {
      setErrorMsg('กรุณากรอกชื่อผู้สร้างห้อง');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      sound.playChip();
      triggerHaptic(25);
    } catch {}

    try {
      await onCreateRoom(
        finalName,
        startingChips,
        smallBlind,
        bigBlind,
        customPin.trim() || undefined,
        user?.avatarUrl
      );
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'เกิดข้อผิดพลาดในการสร้างห้อง');
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
        gap: 14,
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
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f3f4f6', marginTop: 4 }}>
          Poker Chip Simulator
        </h1>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 300 }}>
          จำลองชิปและเงินเดิมพันสำหรับวงปาร์ตี้ เล่นด้วยสำรับไพ่จริงนอกจอ
        </p>
      </div>

      {/* =========================================================
          SECTION: GOOGLE AUTHENTICATION (LOGIN STATUS / BUTTON)
          ========================================================= */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {isAuthLoading ? (
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 16,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'var(--text-muted)',
              fontSize: '0.82rem',
            }}
          >
            <Loader2 size={16} className="animate-spin" color="#3b82f6" />
            <span>กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</span>
          </div>
        ) : user ? (
          /* LOGGED IN: User Profile Card */
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.35) 0%, rgba(15, 23, 42, 0.6) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: 16,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                <Image
                  src={user.avatarUrl}
                  alt={user.name}
                  width={44}
                  height={44}
                  style={{
                    borderRadius: '50%',
                    border: '2px solid #3b82f6',
                    objectFit: 'cover',
                  }}
                  unoptimized
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    background: '#10b981',
                    borderRadius: '50%',
                    width: 14,
                    height: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #0f172a',
                  }}
                  title="เข้าสู่ระบบผ่าน Google แล้ว"
                >
                  <CheckCircle2 size={10} color="#ffffff" />
                </div>
              </div>

              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.name}
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: '#93c5fd',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.email || 'เข้าสู่ระบบด้วย Google แล้ว'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogoutGoogle}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 8,
                color: '#fca5a5',
                fontSize: '0.74rem',
                fontWeight: 600,
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
              }}
              title="ออกจากระบบเพื่อสลับบัญชี Google"
            >
              <LogOut size={13} />
              <span>ออก</span>
            </button>
          </div>
        ) : (
          /* NOT LOGGED IN: Google Sign-in Prompt */
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.18)',
              borderRadius: 16,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <GoogleIcon />
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>
                  เข้าสู่ระบบด้วย Google ก่อนเริ่มเล่น
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  เพื่อดึงรูปโปรไฟล์และชื่อจริงของคุณไปแสดงบนโต๊ะเกม
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLoginWithGoogle}
              style={{
                width: '100%',
                background: '#ffffff',
                color: '#1f2937',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <GoogleIcon />
              <span>เข้าสู่ระบบด้วย Google (Sign in)</span>
            </button>
          </div>
        )}
      </div>

      {/* LAN Wi-Fi Connection Box */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
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
          <strong>เล่นด้วยกันบนมือถือ & คอมพิวเตอร์:</strong>
          <div style={{ marginTop: 2 }}>
            เปิดลิงก์เว็บเดียวกันแล้วใส่รหัส PIN เพื่อลงชื่อนั่งโต๊ะด้วยกันแบบ Real-time
          </div>
        </div>
      </div>

      {/* Main Card with Tabs */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--bg-card)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 20,
          padding: '18px 16px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* TAB SELECTOR: Join Room (Default) vs Create Room */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
            background: 'rgba(0,0,0,0.45)',
            padding: 4,
            borderRadius: 14,
            marginBottom: 16,
          }}
        >
          <button
            id="tab-btn-join"
            type="button"
            onClick={() => handleTabChange('join')}
            style={{
              padding: '12px 6px',
              borderRadius: 10,
              border: 'none',
              background: activeTab === 'join' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
              color: activeTab === 'join' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: activeTab === 'join' ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <KeyRound size={16} />
            <span>เข้าห้องด้วย PIN</span>
          </button>

          <button
            id="tab-btn-create"
            type="button"
            onClick={() => handleTabChange('create')}
            style={{
              padding: '12px 6px',
              borderRadius: 10,
              border: 'none',
              background: activeTab === 'create' ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'transparent',
              color: activeTab === 'create' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: activeTab === 'create' ? '0 4px 14px rgba(37, 99, 235, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <PlusCircle size={16} />
            <span>สร้างห้อง (Admin)</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div
            id="lobby-error-msg"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: '0.8rem',
              color: '#fca5a5',
              marginBottom: 14,
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* =========================================================
            TAB 1: JOIN WITH PIN (ACTIVE BY DEFAULT FOR MOBILE PLAYERS)
            ========================================================= */}
        <div
          id="tab-content-join"
          style={{
            display: activeTab === 'join' ? 'flex' : 'none',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <label style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>🔑 รหัสห้อง (Room PIN)</span>
            </label>
            <input
              id="input-join-pin"
              type="text"
              value={joinPin}
              onChange={(e) => setJoinPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoin();
              }}
              placeholder="เช่น 5931"
              maxLength={8}
              autoFocus
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.55)',
                border: '2px solid #f59e0b',
                borderRadius: 12,
                padding: '12px 10px',
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                ชื่อของคุณ (Player Name)
              </label>
              {user && (
                <span style={{ fontSize: '0.7rem', color: '#6ee7b7', fontWeight: 600 }}>
                  ✓ ใช้บัญชี Google
                </span>
              )}
            </div>
            <input
              id="input-join-name"
              type="text"
              value={joinPlayerName}
              onChange={(e) => setJoinPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoin();
              }}
              placeholder={user?.name || "เช่น ผู้เล่น 1"}
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
              id="input-join-chips"
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
            id="btn-join-room"
            type="button"
            className="primary-btn"
            disabled={isLoading}
            onClick={() => handleJoin()}
            style={{
              marginTop: 4,
              minHeight: 52,
              fontSize: '1rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.45)',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              cursor: 'pointer',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>กำลังเชื่อมต่อห้อง...</span>
              </>
            ) : (
              <>
                <ArrowRight size={20} />
                <span>เข้าห้องทันที (Join Room)</span>
              </>
            )}
          </button>
        </div>

        {/* =========================================================
            TAB 2: CREATE ROOM (FOR HOST / ADMIN)
            ========================================================= */}
        <div
          id="tab-content-create"
          style={{
            display: activeTab === 'create' ? 'flex' : 'none',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 700 }}>
                ชื่อผู้สร้างห้อง (Admin / Host)
              </label>
              {user && (
                <span style={{ fontSize: '0.7rem', color: '#6ee7b7', fontWeight: 600 }}>
                  ✓ ใช้บัญชี Google
                </span>
              )}
            </div>
            <input
              id="input-host-name"
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              placeholder={user?.name || "เช่น Host Admin"}
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
                id="input-host-chips"
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
                id="input-custom-pin"
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
                id="input-sb"
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
                id="input-bb"
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
            id="btn-create-room"
            type="button"
            className="primary-btn"
            disabled={isLoading}
            onClick={() => handleCreate()}
            style={{
              marginTop: 4,
              minHeight: 52,
              fontSize: '1rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              boxShadow: '0 6px 20px rgba(37, 99, 235, 0.45)',
              border: '1px solid rgba(96, 165, 250, 0.4)',
              cursor: 'pointer',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>กำลังสร้างห้อง...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>สร้างห้องและเข้าโต๊ะ (Create Room)</span>
              </>
            )}
          </button>
        </div>
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
