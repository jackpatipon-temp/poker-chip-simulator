'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  PlusCircle,
  Wifi,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Loader2,
  KeyRound,
  LogOut,
  CheckCircle2,
  Lock,
  UserCheck,
} from 'lucide-react';
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
    hostAvatar?: string,
    raiseRule?: 'standard' | 'casual'
  ) => Promise<void>;
  onJoinRoom: (
    pin: string,
    playerName: string,
    chips: number,
    playerAvatar?: string
  ) => Promise<void>;
  onOpenDisclaimer: () => void;
}

const GoogleIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
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
  // Active Tab: 'join' (default) | 'create' (for host)
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');

  // Join Room fields
  const [joinPin, setJoinPin] = useState('');
  const [joinChips, setJoinChips] = useState(1000);

  // Create Room fields
  const [startingChips, setStartingChips] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [customPin, setCustomPin] = useState('');
  const [raiseRule, setRaiseRule] = useState<'standard' | 'casual'>('standard');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fallback for offline dev testing if Supabase is unconfigured
  const [devGuestUser, setDevGuestUser] = useState<GoogleUserProfile | null>(null);

  const activeUser = user || devGuestUser;

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { __logEvent?: (t: string, d: unknown) => void }).__logEvent) {
      (window as unknown as { __logEvent: (t: string, d: unknown) => void }).__logEvent('REACT_HYDRATED', {
        component: 'LobbyView',
        activeTab,
      });
    }
  }, [activeTab]);

  const handleTabChange = (tab: 'join' | 'create') => {
    setActiveTab(tab);
    setErrorMsg('');
    try {
      sound.playChip();
      triggerHaptic(20);
    } catch {}
  };

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!activeUser) {
      onLoginWithGoogle();
      return;
    }

    if (!joinPin.trim()) {
      setErrorMsg('กรุณากรอกรหัสห้อง (PIN)');
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
        activeUser.name,
        joinChips,
        activeUser.avatarUrl
      );
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'ไม่สามารถเข้าร่วมห้องได้ ตรวจสอบ PIN');
      setIsLoading(false);
    }
  };

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!activeUser) {
      onLoginWithGoogle();
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
        activeUser.name,
        startingChips,
        smallBlind,
        bigBlind,
        customPin.trim() || undefined,
        activeUser.avatarUrl,
        raiseRule
      );
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'เกิดข้อผิดพลาดในการสร้างห้อง');
      setIsLoading(false);
    }
  };

  // =========================================================================
  // VIEW 1: LOADING AUTH STATE
  // =========================================================================
  if (isAuthLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          gap: 16,
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
        }}
      >
        <Loader2 size={36} className="animate-spin" color="#3b82f6" />
        <span>กำลังตรวจสอบการเข้าสู่ระบบ Google...</span>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: NOT LOGGED IN -> SHOW ONLY GOOGLE LOGIN
  // =========================================================================
  if (!activeUser) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '36px 16px',
          width: '100%',
          minHeight: '85vh',
          gap: 20,
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
              border: '2px solid rgba(59, 130, 246, 0.5)',
              boxShadow: '0 8px 30px rgba(37, 99, 235, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem',
            }}
          >
            ♠️
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f3f4f6', marginTop: 4 }}>
            Poker Chip Simulator
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.5 }}>
            ระบบจำลองชิปสำหรับเล่นโป๊กเกอร์แบบออฟไลน์ด้วยสำรับไพ่จริง
          </p>
        </div>

        {/* Dedicated Google Sign-In Card */}
        <div
          style={{
            width: '100%',
            maxWidth: 380,
            background: 'var(--bg-card)',
            backdropFilter: 'var(--glass-blur)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 24,
            padding: '28px 20px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            textAlign: 'center',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 20,
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#93c5fd',
                fontSize: '0.74rem',
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              <UserCheck size={14} />
              <span>ยืนยันตัวตนก่อนเข้าเล่น</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
              เข้าสู่ระบบด้วย Google
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              ระบบจะใช้ชื่อและรูปโปรไฟล์ Google ของคุณเพื่อความโปร่งใสในโต๊ะเกม
            </p>
          </div>

          {/* Official Style Google Button */}
          <button
            type="button"
            onClick={onLoginWithGoogle}
            style={{
              width: '100%',
              background: '#ffffff',
              color: '#1f2937',
              border: 'none',
              borderRadius: 12,
              padding: '14px 18px',
              fontSize: '0.95rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
              transition: 'transform 0.1s ease',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <GoogleIcon size={22} />
            <span>เข้าสู่ระบบด้วย Google</span>
          </button>

          {/* Trust & Security Notes */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              paddingTop: 8,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={13} color="#10b981" />
              <span>แสดงชื่อและรูปโปรไฟล์จริงบนเก้าอี้โป๊กเกอร์</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={13} color="#10b981" />
              <span>ป้องกันการปลอมแปลงชื่อในวงปาร์ตี้</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={13} color="#10b981" />
              <span>ปลอดภัยผ่าน Supabase Auth (ไม่บันทึกรหัสผ่าน)</span>
            </div>
          </div>

          {/* Offline / Localhost Dev Fallback Bypass */}
          {!isSupabaseConfigured() && (
            <button
              type="button"
              onClick={() => {
                setDevGuestUser({
                  id: 'dev_user_1',
                  name: 'ทดสอบโหมดออฟไลน์',
                  email: 'dev@local.test',
                  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
                });
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                fontSize: '0.72rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                marginTop: 4,
              }}
            >
              ⚡ เข้าใช้งานแบบ Guest (เฉพาะโหมดพัฒนาในเครื่อง Local)
            </button>
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
            fontSize: '0.74rem',
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
  }

  // =========================================================================
  // VIEW 3: LOGGED IN WITH GOOGLE -> JOIN / CREATE ROOM INTERFACE
  // =========================================================================
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 16px',
        width: '100%',
        minHeight: '100%',
        gap: 14,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Brand Mini Header */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f3f4f6' }}>
          ♠️ Poker Chip Simulator
        </h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          ระบบจำลองชิปสำหรับวงปาร์ตี้ เล่นด้วยสำรับไพ่จริงนอกจอ
        </p>
      </div>

      {/* User Google Profile Banner (Locked Account) */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%)',
          border: '1.5px solid rgba(59, 130, 246, 0.45)',
          borderRadius: 18,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
            <Image
              src={activeUser.avatarUrl}
              alt={activeUser.name}
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
                fontSize: '0.92rem',
                fontWeight: 800,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {activeUser.name}
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                color: '#93c5fd',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <GoogleIcon size={12} />
              <span>{activeUser.email || 'Google Account'}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (devGuestUser) setDevGuestUser(null);
            else onLogoutGoogle();
          }}
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 8,
            color: '#fca5a5',
            fontSize: '0.74rem',
            fontWeight: 700,
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
          <span>สลับบัญชี</span>
        </button>
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
            TAB 1: JOIN WITH PIN (ACTIVE BY DEFAULT)
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

          {/* LOCKED GOOGLE NAME FOR PLAYER */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={12} color="#93c5fd" />
                <span>ชื่อของคุณ (บัญชี Google)</span>
              </label>
              <span style={{ fontSize: '0.68rem', color: '#6ee7b7', fontWeight: 700 }}>
                🔒 ล็อกตามบัญชี Google
              </span>
            </div>
            <input
              id="input-join-name"
              type="text"
              value={activeUser.name}
              readOnly
              disabled
              style={{
                width: '100%',
                background: 'rgba(30, 58, 138, 0.2)',
                border: '1.5px solid rgba(59, 130, 246, 0.4)',
                borderRadius: 10,
                padding: 12,
                color: '#ffffff',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'not-allowed',
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
          {/* LOCKED GOOGLE NAME FOR HOST */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={12} color="#93c5fd" />
                <span>ชื่อผู้สร้างห้อง (บัญชี Google)</span>
              </label>
              <span style={{ fontSize: '0.68rem', color: '#6ee7b7', fontWeight: 700 }}>
                🔒 ล็อกตามบัญชี Google
              </span>
            </div>
            <input
              id="input-host-name"
              type="text"
              value={activeUser.name}
              readOnly
              disabled
              style={{
                width: '100%',
                background: 'rgba(30, 58, 138, 0.2)',
                border: '1.5px solid rgba(59, 130, 246, 0.4)',
                borderRadius: 10,
                padding: 12,
                color: '#ffffff',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'not-allowed',
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

          {/* Raise Rule Option (สากล vs บ้านๆ) */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>กฎการเกทับ (Raise Rule)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  sound.playChip();
                  setRaiseRule('standard');
                }}
                style={{
                  padding: '10px 8px',
                  fontSize: '0.82rem',
                  borderRadius: 10,
                  background: raiseRule === 'standard' ? 'rgba(37, 99, 235, 0.25)' : 'rgba(0,0,0,0.3)',
                  borderColor: raiseRule === 'standard' ? '#3b82f6' : 'var(--border-subtle)',
                  color: raiseRule === 'standard' ? '#93c5fd' : 'var(--text-muted)',
                  fontWeight: raiseRule === 'standard' ? 700 : 500,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                }}
              >
                <span>🌐 แบบสากล</span>
                <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>+Min Raise มาตรฐาน</span>
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  sound.playChip();
                  setRaiseRule('casual');
                }}
                style={{
                  padding: '10px 8px',
                  fontSize: '0.82rem',
                  borderRadius: 10,
                  background: raiseRule === 'casual' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(0,0,0,0.3)',
                  borderColor: raiseRule === 'casual' ? '#f59e0b' : 'var(--border-subtle)',
                  color: raiseRule === 'casual' ? '#fde68a' : 'var(--text-muted)',
                  fontWeight: raiseRule === 'casual' ? 700 : 500,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                }}
              >
                <span>🏠 แบบบ้านๆ</span>
                <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>เท่าไหร่ก็ได้ &gt; ล่าสุด</span>
              </button>
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
