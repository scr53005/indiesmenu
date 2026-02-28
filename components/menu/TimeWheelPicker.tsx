'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';

interface TimeWheelPickerProps {
  validSlots: { hour: number; minute: number }[];
  selectedHour: number;
  selectedMinute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
}

const ITEM_HEIGHT = 52; // px per item — bigger for fat fingers
const VISIBLE_ITEMS = 3; // compact: only 3 visible

function WheelColumn({
  items,
  selectedValue,
  onChange,
  formatItem,
}: {
  items: number[];
  selectedValue: number;
  onChange: (value: number) => void;
  formatItem: (value: number) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollTop = useRef(0);

  const selectedIndex = useMemo(() => {
    const idx = items.indexOf(selectedValue);
    return idx >= 0 ? idx : 0;
  }, [items, selectedValue]);

  // Scroll to selected item on mount and when selection changes externally
  useEffect(() => {
    if (containerRef.current && !isScrollingRef.current) {
      const targetScroll = selectedIndex * ITEM_HEIGHT;
      containerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    isScrollingRef.current = true;

    // Brake: limit scroll speed to 1 item per event cycle for small lists
    if (items.length <= 12 && containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const delta = scrollTop - lastScrollTop.current;
      const maxDelta = ITEM_HEIGHT * 1.2;
      if (Math.abs(delta) > maxDelta) {
        const braked = lastScrollTop.current + Math.sign(delta) * maxDelta;
        containerRef.current.scrollTop = braked;
      }
      lastScrollTop.current = containerRef.current.scrollTop;
    }

    // Snap after scroll settles — use longer timeout to let momentum die
    scrollTimerRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));

      containerRef.current.scrollTo({ top: clampedIndex * ITEM_HEIGHT, behavior: 'smooth' });
      lastScrollTop.current = clampedIndex * ITEM_HEIGHT;

      if (items[clampedIndex] !== selectedValue) {
        onChange(items[clampedIndex]);
      }
      isScrollingRef.current = false;
    }, 120);
  }, [items, selectedValue, onChange]);

  const paddingItems = Math.floor(VISIBLE_ITEMS / 2); // 1 item padding top/bottom
  const viewportHeight = VISIBLE_ITEMS * ITEM_HEIGHT;

  return (
    <div
      className="wheel-column"
      style={{
        height: viewportHeight,
        overflow: 'hidden',
        position: 'relative',
        minWidth: 70,
      }}
    >
      {/* Highlight band for center item */}
      <div
        style={{
          position: 'absolute',
          top: paddingItems * ITEM_HEIGHT,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
          background: 'rgba(59, 130, 246, 0.12)',
          borderRadius: 8,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      {/* Fade overlays */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: paddingItems * ITEM_HEIGHT, background: 'linear-gradient(to bottom, rgba(255,252,248,0.95), transparent)', pointerEvents: 'none', zIndex: 2 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: paddingItems * ITEM_HEIGHT, background: 'linear-gradient(to top, rgba(255,252,248,0.95), transparent)', pointerEvents: 'none', zIndex: 2 }} />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: viewportHeight,
          overflowY: 'scroll',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        {/* Top padding */}
        {Array.from({ length: paddingItems }).map((_, i) => (
          <div key={`pad-top-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
        {items.map((value, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={value}
              onClick={() => {
                onChange(value);
                if (containerRef.current) {
                  containerRef.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
                }
              }}
              style={{
                height: ITEM_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isSelected ? 28 : 20,
                fontWeight: isSelected ? 800 : 500,
                color: isSelected ? '#1d4ed8' : '#aaa',
                cursor: 'pointer',
                transition: 'all 0.15s',
                userSelect: 'none',
                fontFamily: "'SF Pro Rounded', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
              }}
            >
              {formatItem(value)}
            </div>
          );
        })}
        {/* Bottom padding */}
        {Array.from({ length: paddingItems }).map((_, i) => (
          <div key={`pad-bot-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
      </div>
    </div>
  );
}

export default function TimeWheelPicker({
  validSlots,
  selectedHour,
  selectedMinute,
  onHourChange,
  onMinuteChange,
}: TimeWheelPickerProps) {
  const hours = useMemo(() => {
    const set = new Set(validSlots.map(s => s.hour));
    return Array.from(set).sort((a, b) => a - b);
  }, [validSlots]);

  const minutesForHour = useMemo(() => {
    return validSlots
      .filter(s => s.hour === selectedHour)
      .map(s => s.minute)
      .sort((a, b) => a - b);
  }, [validSlots, selectedHour]);

  // If selected minute is not valid for new hour, snap to first available
  useEffect(() => {
    if (minutesForHour.length > 0 && !minutesForHour.includes(selectedMinute)) {
      onMinuteChange(minutesForHour[0]);
    }
  }, [minutesForHour, selectedMinute, onMinuteChange]);

  if (hours.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '16px', color: '#999', fontSize: 14 }}>
        Aucun créneau disponible
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <WheelColumn
        items={hours}
        selectedValue={selectedHour}
        onChange={onHourChange}
        formatItem={(h) => h.toString().padStart(2, '0')}
      />
      <div style={{ fontSize: 28, fontWeight: 800, color: '#1d4ed8', userSelect: 'none' }}>:</div>
      <WheelColumn
        items={minutesForHour}
        selectedValue={selectedMinute}
        onChange={onMinuteChange}
        formatItem={(m) => m.toString().padStart(2, '0')}
      />
    </div>
  );
}
