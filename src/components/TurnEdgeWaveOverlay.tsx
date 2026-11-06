'use client';

import React from 'react';

interface TurnEdgeWaveOverlayProps {
  isActive: boolean;
}

/**
 * TurnEdgeWaveOverlay
 * Displays an animated glowing wave and ambient neon pulse along the 4 edges of the screen
 * when it is the viewing player's turn to act.
 */
export const TurnEdgeWaveOverlay: React.FC<TurnEdgeWaveOverlayProps> = ({ isActive }) => {
  if (!isActive) return null;

  return (
    <div className="turn-edge-wave-overlay" aria-hidden="true">
      {/* Ambient Inward Wave Vignette */}
      <div className="edge-wave-ambient" />

      {/* 4 Animated Traveling Wave Bars */}
      <div className="edge-wave-bar edge-top" />
      <div className="edge-wave-bar edge-bottom" />
      <div className="edge-wave-bar edge-left" />
      <div className="edge-wave-bar edge-right" />

      {/* 4 Corner Neon Wave Accents */}
      <div className="edge-corner corner-tl" />
      <div className="edge-corner corner-tr" />
      <div className="edge-corner corner-bl" />
      <div className="edge-corner corner-br" />
    </div>
  );
};

