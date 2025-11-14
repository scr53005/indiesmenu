'use client';

import React, { useState, useEffect, useRef } from 'react';

interface DraggableProps {
  children: React.ReactNode;
  initialPosition?: { x: number; y: number };
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  onPositionChange?: (position: { x: number; y: number }) => void;
}

export default function Draggable({
  children,
  initialPosition = { x: 0, y: 0 },
  className = '',
  style = {},
  disabled = false,
  onPositionChange,
}: DraggableProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Handle mouse drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  // Handle touch drag start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragOffset.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
  };

  // Handle dragging (mouse and touch)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newPosition = {
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        };
        setPosition(newPosition);
        onPositionChange?.(newPosition);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        const newPosition = {
          x: e.touches[0].clientX - dragOffset.current.x,
          y: e.touches[0].clientY - dragOffset.current.y,
        };
        setPosition(newPosition);
        onPositionChange?.(newPosition);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, onPositionChange]);

  return (
    <div
      className={className}
      style={{
        ...style,
        position: 'fixed',
        left: position.x === 0 && !isDragging ? style.left : `${position.x}px`,
        top: position.y === 0 && !isDragging ? style.top : `${position.y}px`,
        cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {children}
    </div>
  );
}
