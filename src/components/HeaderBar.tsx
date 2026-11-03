'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2, Settings, ShieldCheck, Coffee, Menu } from 'lucide-react';
import { Street } from '@/types/poker';
import { sound, triggerHaptic } from '@/lib/sound';

interface HeaderBarProps {
  street: Street;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  isHost: boolean;
  isSittingOut: boolean;
  userAvatar?: string;
  userName?: string;
  onToggleSittingOut: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  street,
  smallBlind,
  bigBlind,
  ante,
  isHost,
  isSittingOut,
  userAvatar,
  userName,
  onToggleSittingOut,
  onOpenSettings,
  onOpenAdmin,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    sound.playChip();
    triggerHaptic(20);
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch {
      // Fullscreen not supported or blocked
    }
  };

  return (
    <header className="header-bar">
      <div className="header-left">
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenSettings}
          title="เมนูและการตั้งค่า"
          aria-label="Settings"
        >
          <Menu size={20} />
        </button>

        {isHost && (
          <button
            type="button"
            className="icon-btn"
            style={{ borderColor: 'rgba(139, 92, 246, 0.4)', color: '#a78bfa' }}
            onClick={onOpenAdmin}
            title="แผงควบคุมโฮสต์ (Admin Controls)"
            aria-label="Admin Controls"
          >
            <ShieldCheck size={20} />
          </button>
        )}

        <button
          type="button"
          className="icon-btn"
          style={{
            borderColor: isSittingOut ? 'rgba(239, 68, 68, 0.6)' : undefined,
            color: isSittingOut ? '#f87171' : undefined,
            background: isSittingOut ? 'rgba(239, 68, 68, 0.15)' : undefined,
          }}
          onClick={onToggleSittingOut}
          title={isSittingOut ? 'กลับเข้าโต๊ะเล่นต่อ' : 'ขอพักชั่วคราว (Sit Out / AFK)'}
          aria-label="Sit Out"
        >
          <Coffee size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span className="street-badge">{street}</span>
        <span className="blinds-pill">
          {bigBlind}/{smallBlind} {ante > 0 ? `• Ante: ${ante}` : ''}
        </span>
      </div>

      <div className="header-right">
        {userAvatar && (
          <div
            style={{
              position: 'relative',
              width: 28,
              height: 28,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '1.5px solid #3b82f6',
              flexShrink: 0,
            }}
            title={userName || 'บัญชีของคุณ'}
          >
            <Image
              src={userAvatar}
              alt={userName || 'Avatar'}
              width={28}
              height={28}
              style={{ objectFit: 'cover' }}
              unoptimized
            />
          </div>
        )}

        <button
          type="button"
          className="icon-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'ขยายเต็มหน้าจอ (ซ่อนแถบ URL)'}
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={onOpenSettings}
          title="ตั้งค่า"
          aria-label="Settings Modal"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
