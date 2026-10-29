'use client';

import React, { useState } from 'react';
import { PlusCircle, Wifi, ShieldAlert, ArrowRight, Sparkles, Loader2, KeyRound } from 'lucide-react';
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
  // Active Tab: 'join' (default for players/phone) | 'create' (for host)
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');

  // Join Room fields (Immediately visible on page load)
  const [joinPin, setJoinPin] = useState('');
  const [joinPlayerName, setJoinPlayerName] = useState('');
  const [joinChips, setJoinChips] = useState(1000);

  // Create Room fields
  const [hostName, setHostName] = useState('Patipon');
  const [startingChips, setStartingChips] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [customPin, setCustomPin] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
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
    } catch {
      // ignore
    }
  };

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (typeof window !== 'undefined' && (window as unknown as { __logEvent?: (t: string, d: unknown) => void }).__logEvent) {
      (window as unknown as { __logEvent: (t: string, d: unknown) => void }).__logEvent('JOIN_BUTTON_PRESSED', {
        pin: joinPin,
        name: joinPlayerName,
        chips: joinChips,
      });
    }
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

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (typeof window !== 'undefined' && (window as unknown as { __logEvent?: (t: string, d: unknown) => void }).__logEvent) {
      (window as unknown as { __logEvent: (t: string, d: unknown) => void }).__logEvent('CREATE_BUTTON_PRESSED', {
        hostName,
        startingChips,
      });
    }
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
        <div
          id="lobby-error-msg"
          style={{
            display: errorMsg ? 'block' : 'none',
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
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              ชื่อของคุณ (Player Name)
            </label>
            <input
              id="input-join-name"
              type="text"
              value={joinPlayerName}
              onChange={(e) => setJoinPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoin();
              }}
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
            <label style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 700 }}>
              ชื่อผู้สร้างห้อง (Admin / Host)
            </label>
            <input
              id="input-host-name"
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
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

      {/* ====================================================================
          BULLETPROOF NATIVE TOUCH/CLICK CONTROLLER
          Executes immediately on DOM ready even if React hydration is delayed!
          ==================================================================== */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function initNativeLobby() {
                // Tab switching fallback
                var tabJoin = document.getElementById('tab-btn-join');
                var tabCreate = document.getElementById('tab-btn-create');
                var contentJoin = document.getElementById('tab-content-join');
                var contentCreate = document.getElementById('tab-content-create');
                var errBox = document.getElementById('lobby-error-msg');

                function showError(msg) {
                  if (errBox) {
                    errBox.textContent = msg;
                    errBox.style.display = 'block';
                  } else {
                    alert(msg);
                  }
                }

                if (tabJoin && tabCreate && contentJoin && contentCreate) {
                  tabJoin.onclick = function() {
                    contentJoin.style.display = 'flex';
                    contentCreate.style.display = 'none';
                    tabJoin.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                    tabJoin.style.color = '#ffffff';
                    tabCreate.style.background = 'transparent';
                    tabCreate.style.color = 'var(--text-muted)';
                    if (errBox) errBox.style.display = 'none';
                  };
                  tabCreate.onclick = function() {
                    contentCreate.style.display = 'flex';
                    contentJoin.style.display = 'none';
                    tabCreate.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                    tabCreate.style.color = '#ffffff';
                    tabJoin.style.background = 'transparent';
                    tabJoin.style.color = 'var(--text-muted)';
                    if (errBox) errBox.style.display = 'none';
                  };
                }

                // Native Join Room action
                var btnJoin = document.getElementById('btn-join-room');
                if (btnJoin) {
                  btnJoin.onclick = function(e) {
                    var pinIn = document.getElementById('input-join-pin');
                    var nameIn = document.getElementById('input-join-name');
                    var chipsIn = document.getElementById('input-join-chips');
                    var pin = pinIn ? pinIn.value.trim() : '';
                    var name = nameIn ? nameIn.value.trim() : '';
                    var chips = chipsIn ? Number(chipsIn.value) || 1000 : 1000;

                    if (!pin) {
                      showError('กรุณากรอกรหัสห้อง (PIN)');
                      if (pinIn) pinIn.focus();
                      return;
                    }
                    if (!name) {
                      showError('กรุณากรอกชื่อของคุณ');
                      if (nameIn) nameIn.focus();
                      return;
                    }

                    btnJoin.innerText = 'กำลังเชื่อมต่อห้อง...';
                    btnJoin.disabled = true;

                    fetch('/api/rooms/' + encodeURIComponent(pin), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'JOIN', playerName: name, requestedChips: chips })
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                      if (data.success) {
                        var targetUserId = data.player ? data.player.id : (data.request ? data.request.userId : '');
                        try {
                          localStorage.setItem('poker_room_pin', pin);
                          if (targetUserId) localStorage.setItem('poker_user_id', targetUserId);
                        } catch(e){}
                        window.location.href = '/?pin=' + encodeURIComponent(pin) + (targetUserId ? '&userId=' + encodeURIComponent(targetUserId) : '');
                      } else {
                        showError(data.error || 'ไม่พบห้องที่ระบุ');
                        btnJoin.innerText = 'เข้าห้องทันที (Join Room)';
                        btnJoin.disabled = false;
                      }
                    })
                    .catch(function(err) {
                      showError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + (err.message || 'Error'));
                      btnJoin.innerText = 'เข้าห้องทันที (Join Room)';
                      btnJoin.disabled = false;
                    });
                  };
                }

                // Native Create Room action
                var btnCreate = document.getElementById('btn-create-room');
                if (btnCreate) {
                  btnCreate.onclick = function(e) {
                    var hostIn = document.getElementById('input-host-name');
                    var chipsIn = document.getElementById('input-host-chips');
                    var customPinIn = document.getElementById('input-custom-pin');
                    var sbIn = document.getElementById('input-sb');
                    var bbIn = document.getElementById('input-bb');

                    var hostName = hostIn ? hostIn.value.trim() : '';
                    var startingChips = chipsIn ? Number(chipsIn.value) || 1000 : 1000;
                    var customPin = customPinIn ? customPinIn.value.trim() : '';
                    var sb = sbIn ? Number(sbIn.value) || 5 : 5;
                    var bb = bbIn ? Number(bbIn.value) || 10 : 10;

                    if (!hostName) {
                      showError('กรุณากรอกชื่อผู้สร้างห้อง');
                      if (hostIn) hostIn.focus();
                      return;
                    }

                    btnCreate.innerText = 'กำลังสร้างห้อง...';
                    btnCreate.disabled = true;

                    fetch('/api/rooms', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        hostName: hostName,
                        startingChips: startingChips,
                        smallBlind: sb,
                        bigBlind: bb,
                        customPin: customPin || undefined
                      })
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                      if (data.success) {
                        var hostId = (data.room && data.room.players && data.room.players[0]) ? data.room.players[0].id : '';
                        try {
                          localStorage.setItem('poker_room_pin', data.pin);
                          if (hostId) {
                            localStorage.setItem('poker_user_id', hostId);
                          }
                        } catch(e){}
                        window.location.href = '/?pin=' + encodeURIComponent(data.pin) + (hostId ? '&userId=' + encodeURIComponent(hostId) : '');
                      } else {
                        showError(data.error || 'สร้างห้องไม่สำเร็จ');
                        btnCreate.innerText = 'สร้างห้องและเข้าโต๊ะ (Create Room)';
                        btnCreate.disabled = false;
                      }
                    })
                    .catch(function(err) {
                      showError('เกิดข้อผิดพลาดในการสร้างห้อง: ' + (err.message || 'Error'));
                      btnCreate.innerText = 'สร้างห้องและเข้าโต๊ะ (Create Room)';
                      btnCreate.disabled = false;
                    });
                  };
                }
              }

              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initNativeLobby);
              } else {
                initNativeLobby();
              }
            })();
          `,
        }}
      />
    </div>
  );
};
