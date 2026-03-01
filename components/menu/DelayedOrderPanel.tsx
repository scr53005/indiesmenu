'use client';

import React, { useState, useMemo } from 'react';
import TimeWheelPicker from './TimeWheelPicker';
import { getValidTimeSlots } from '@/lib/config/kitchen-hours';

interface DelayedOrderPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (timing: { type: 'pickup' | 'dinein'; hour: number; minute: number; date: string }) => void;
  cartHasDishes: boolean;
  currentDay: number;
  hasTable: boolean;
}

export default function DelayedOrderPanel({
  isOpen,
  onClose,
  onConfirm,
  cartHasDishes,
  currentDay,
  hasTable,
}: DelayedOrderPanelProps) {
  const [orderType, setOrderType] = useState<'pickup' | 'dinein'>(hasTable ? 'dinein' : 'pickup');
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const validSlots = useMemo(
    () => getValidTimeSlots(currentDay, cartHasDishes),
    [currentDay, cartHasDishes]
  );

  // Initialize to first valid slot
  useMemo(() => {
    if (validSlots.length > 0) {
      setSelectedHour(validSlots[0].hour);
      setSelectedMinute(validSlots[0].minute);
    }
  }, [validSlots]);

  if (!isOpen) return null;

  const isPickup = orderType === 'pickup';

  // All slots share the same date (getValidTimeSlots returns one day's worth)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const targetDate = validSlots.length > 0 ? validSlots[0].date : todayStr;

  const handleConfirm = () => {
    onConfirm({ type: orderType, hour: selectedHour, minute: selectedMinute, date: targetDate });
  };

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 9998,
        }}
      />

      {/* Fixed centered panel — no Draggable needed */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: 280,
          borderRadius: 18,
          overflow: 'hidden',
          background: 'rgba(255, 252, 248, 0.95)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.22), 0 1.5px 4px rgba(0,0,0,0.08)',
          border: '1px solid rgba(180, 160, 130, 0.25)',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px 16px 10px',
            borderBottom: '1px solid rgba(180, 160, 130, 0.15)',
            gap: 7,
          }}
        >
          <span style={{ fontSize: 18 }}>&#128340;</span>
          <div style={{ textAlign: 'center' }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: '#3a2e1e',
              }}
            >
              Commande différée
            </span>
            <div style={{ fontSize: 12, color: '#8b6e4e', fontWeight: 600, marginTop: 2 }}>
              {new Date(targetDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
        </div>

        {/* ── Toggle Switch ── */}
        <div style={{ padding: '12px 20px 6px' }}>
          <div
            style={{
              position: 'relative',
              height: 42,
              borderRadius: 21,
              background: 'rgba(0, 0, 0, 0.06)',
              boxShadow: 'inset 0 1.5px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              overflow: 'hidden',
            }}
            onClick={() => setOrderType(isPickup ? 'dinein' : 'pickup')}
          >
            {/* Sliding knob */}
            <div
              style={{
                position: 'absolute',
                top: 3,
                left: isPickup ? 3 : 'calc(50% + 1px)',
                width: 'calc(50% - 4px)',
                height: 36,
                borderRadius: 18,
                background: isPickup
                  ? 'linear-gradient(135deg, #6b7c3f 0%, #8a9e52 100%)'
                  : 'linear-gradient(135deg, #6b3fa0 0%, #8b5fc0 100%)',
                boxShadow: isPickup
                  ? '0 2px 8px rgba(107, 124, 63, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                  : '0 2px 8px rgba(107, 63, 160, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s, box-shadow 0.3s',
              }}
            />
            {/* Labels */}
            <div style={{ position: 'relative', display: 'flex', height: '100%', zIndex: 1 }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  color: isPickup ? '#fff' : '#777',
                  transition: 'color 0.25s',
                  userSelect: 'none',
                }}
              >
                À emporter
              </div>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  color: !isPickup ? '#fff' : '#777',
                  transition: 'color 0.25s',
                  userSelect: 'none',
                }}
              >
                Sur place
              </div>
            </div>
          </div>
        </div>

        {/* ── Time Picker ── */}
        <div style={{ padding: '6px 20px 10px' }}>
          <TimeWheelPicker
            validSlots={validSlots}
            selectedHour={selectedHour}
            selectedMinute={selectedMinute}
            onHourChange={setSelectedHour}
            onMinuteChange={setSelectedMinute}
          />
        </div>

        {/* ── Actions: Confirmer + red X cancel on same row ── */}
        <div style={{ padding: '4px 20px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              border: 'none',
              background: isPickup
                ? 'linear-gradient(135deg, #6b7c3f 0%, #7d9048 100%)'
                : 'linear-gradient(135deg, #6b3fa0 0%, #7b4fb0 100%)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: isPickup
                ? '0 2px 10px rgba(107, 124, 63, 0.35)'
                : '0 2px 10px rgba(107, 63, 160, 0.35)',
              transition: 'transform 0.1s, background 0.3s',
            }}
          >
            Confirmer — {selectedHour.toString().padStart(2, '0')}h{selectedMinute.toString().padStart(2, '0')}
          </button>
          <button
            onClick={onClose}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              border: 'none',
              background: '#dc3545',
              color: '#fff',
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(220, 53, 69, 0.35)',
              transition: 'transform 0.1s',
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
