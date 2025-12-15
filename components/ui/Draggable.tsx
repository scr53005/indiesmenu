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
  const elementRef = useRef<HTMLDivElement>(null);

  // Constrain position to keep element center visible on screen
  const constrainPosition = (newX: number, newY: number) => {
    if (!elementRef.current) return { x: newX, y: newY };

    const rect = elementRef.current.getBoundingClientRect();
    const elementWidth = rect.width;
    const elementHeight = rect.height;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Ensure at least 40% of the element width is visible horizontally
    const minVisibleWidth = elementWidth * 0.4;
    const maxX = viewportWidth - minVisibleWidth;
    const minX = -(elementWidth - minVisibleWidth);

    // Ensure at least 60% of the element height is visible vertically
    const minVisibleHeight = elementHeight * 0.6;
    const maxY = viewportHeight - minVisibleHeight;
    const minY = -(elementHeight - minVisibleHeight);

    return {
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY)),
    };
  };

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
        const rawPosition = {
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        };
        const constrainedPosition = constrainPosition(rawPosition.x, rawPosition.y);
        setPosition(constrainedPosition);
        onPositionChange?.(constrainedPosition);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        const rawPosition = {
          x: e.touches[0].clientX - dragOffset.current.x,
          y: e.touches[0].clientY - dragOffset.current.y,
        };
        const constrainedPosition = constrainPosition(rawPosition.x, rawPosition.y);
        setPosition(constrainedPosition);
        onPositionChange?.(constrainedPosition);
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
      ref={elementRef}
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
