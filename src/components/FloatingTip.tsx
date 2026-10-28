'use client';

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface FloatingTipProps {
  text: string;
  className?: string;
  title?: string;
}

export const FloatingTip: React.FC<FloatingTipProps> = ({ text, className = '', title }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className={`floating-tip-btn ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label="Action Tip"
        title="กดเพื่อดูคำอธิบายกติกา"
      >
        <HelpCircle size={11} strokeWidth={2.8} />
      </button>

      {isOpen && (
        <div className="tip-popover" onClick={(e) => e.stopPropagation()}>
          {title && <div style={{ fontWeight: 700, marginBottom: 4, color: '#38bdf8' }}>{title}</div>}
          <div>{text}</div>
        </div>
      )}
    </div>
  );
};
