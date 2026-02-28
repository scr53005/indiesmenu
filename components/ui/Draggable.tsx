'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  // Constrain position to keep entire element within screen bounds (with small margin)
  const constrainPosition = useCallback((newX: number, newY: number) => {
    if (!elementRef.current) return { x: newX, y: newY };

    const rect = elementRef.current.getBoundingClientRect();
    const elementWidth = rect.width;
    const elementHeight = rect.height;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;

    const minX = margin;
    const maxX = viewportWidth - elementWidth - margin;
    const minY = margin;
    const maxY = viewportHeight - elementHeight - margin;

    return {
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY)),
    };
  }, []);

  // On first drag, read the actual rendered position from the DOM
  const initPositionFromDOM = useCallback((clientX: number, clientY: number) => {
    if (!hasBeenDragged && elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      const actualX = rect.left;
      const actualY = rect.top;
      setPosition({ x: actualX, y: actualY });
      setHasBeenDragged(true);
      dragOffset.current = {
        x: clientX - actualX,
        y: clientY - actualY,
      };
    } else {
      dragOffset.current = {
        x: clientX - position.x,
        y: clientY - position.y,
      };
    }
  }, [hasBeenDragged, position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    initPositionFromDOM(e.clientX, e.clientY);
    setIsDragging(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    initPositionFromDOM(touch.clientX, touch.clientY);
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const raw = { x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y };
        const constrained = constrainPosition(raw.x, raw.y);
        setPosition(constrained);
        onPositionChange?.(constrained);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        const raw = { x: e.touches[0].clientX - dragOffset.current.x, y: e.touches[0].clientY - dragOffset.current.y };
        const constrained = constrainPosition(raw.x, raw.y);
        setPosition(constrained);
        onPositionChange?.(constrained);
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
  }, [isDragging, onPositionChange, constrainPosition]);

  // Before first drag: use CSS style props. After first drag: use pixel position.
  const positionStyle = hasBeenDragged
    ? { left: `${position.x}px`, top: `${position.y}px` }
    : { left: style.left, top: style.top, bottom: style.bottom, right: style.right };

  // Strip positioning props from style to avoid conflicts after dragging
  const { left, top, bottom, right, ...restStyle } = style;

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        ...restStyle,
        ...positionStyle,
        position: 'fixed',
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
