'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { LogIn, PlusCircle, Users, Sparkles } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { sound, triggerHaptic } from '@/lib/sound';

interface JoinLobbyModalProps {
  isOpen: boolean;
  onEnterAsHost: (userName: string, avatarUrl: string, chips: number) => void;
  onRequestJoin: (roomCode: string, userName: string, avatarUrl: string, requestedChips: number) => void;
}

export const JoinLobbyModal: React.FC<JoinLobbyModalProps> = ({
  isOpen,
  onEnterAsHost,
  onRequestJoin,
}) => {
  const [userName, setUserName] = useState('Patipon');
  const [avatarUrl, setAvatarUrl] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
  );
  const [chips, setChips] = useState(1000);
  const [roomCode, setRoomCode] = useState('POKER-888');
  const [mode, setMode] = useState<'create' | 'join'>('create');

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    sound.playChip();
    triggerHaptic(25);
    if (isSupabaseConfigured()) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
    } else {
      // In demo / localhost without keys, continue with simulated Google user
      if (mode === 'create') {
        onEnterAsHost(userName, avatarUrl, chips);
      } else {
        onRequestJoin(roomCode, userName, avatarUrl, chips);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playChip();
    triggerHaptic(30);
    if (mode === 'create') {
      onEnterAsHost(userName, avatarUrl, chips);
    } else {
      onRequestJoin(roomCode, userName, avatarUrl, chips);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
            }}
          >
            ♠️
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Poker Chip Simulator</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            เข้าสู่ระบบด้วย Google และเข้าร่วมวงปาร์ตี้โป๊กเกอร์
          </p>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12 }}>
          <button
            type="button"
            className="secondary-btn"
            style={{
              fontSize: '0.85rem',
              padding: '8px 12px',
              background: mode === 'create' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
              borderColor: mode === 'create' ? '#3b82f6' : 'transparent',
            }}
            onClick={() => setMode('create')}
          >
            <PlusCircle size={15} style={{ marginRight: 6 }} />
            สร้างห้อง (Admin)
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{
              fontSize: '0.85rem',
              padding: '8px 12px',
              background: mode === 'join' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
              borderColor: mode === 'join' ? '#3b82f6' : 'transparent',
            }}
            onClick={() => setMode('join')}
          >
            <Users size={15} style={{ marginRight: 6 }} />
            เข้าร่วมห้อง
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
          {mode === 'join' && (
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>รหัสห้อง (Room Code)</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="เช่น POKER-888"
                required
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: 10,
                  color: 'white',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: 1,
                  fontWeight: 700,
                }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ชื่อผู้เล่น (Google Name)</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="ชื่อของคุณ"
              required
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: 10,
                color: 'white',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ชิปเริ่มต้น (Chips)</label>
            <input
              type="number"
              value={chips}
              onChange={(e) => setChips(Number(e.target.value))}
              min={100}
              step={50}
              required
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: 10,
                color: '#f59e0b',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
              }}
            />
          </div>

          {/* Google Login / Enter Button */}
          <button
            type="button"
            className="primary-btn"
            style={{
              background: 'white',
              color: '#1f2937',
              marginTop: 6,
              boxShadow: '0 4px 12px rgba(255,255,255,0.2)',
            }}
            onClick={handleGoogleLogin}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            เข้าสู่ระบบด้วย Google
          </button>
        </form>
      </div>
    </div>
  );
};
