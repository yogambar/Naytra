import React, { useRef, useState, useCallback } from 'react';
import { Surface, type ElevationLevel, type SurfaceVariant } from './Surface';
import { usePointerFine } from '../hooks/usePointerFine';
import { useMotionPrefs } from '../hooks/useMotionPrefs';

export interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: ElevationLevel;
  variant?: SurfaceVariant;
  tiltMaxDeg?: number;
  interactive?: boolean;
  children?: React.ReactNode;
}

export const Card3D = React.forwardRef<HTMLDivElement, Card3DProps>(
  (
    {
      elevation = 'e2',
      variant = 'raised',
      tiltMaxDeg = 6,
      interactive = true,
      className = '',
      style,
      children,
      onMouseMove,
      onMouseLeave,
      ...props
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const ref = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;
    const isFinePointer = usePointerFine();
    const { prefersReducedMotion } = useMotionPrefs();

    const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number }>({ rotateX: 0, rotateY: 0 });
    const [isPressed, setIsPressed] = useState(false);

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!interactive || !isFinePointer || prefersReducedMotion) {
          onMouseMove?.(e);
          return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate rotation between -tiltMaxDeg and +tiltMaxDeg
        const xPct = (mouseX / width) - 0.5;
        const yPct = (mouseY / height) - 0.5;

        setTilt({
          rotateX: -yPct * tiltMaxDeg,
          rotateY: xPct * tiltMaxDeg,
        });

        onMouseMove?.(e);
      },
      [interactive, isFinePointer, prefersReducedMotion, tiltMaxDeg, onMouseMove]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        setTilt({ rotateX: 0, rotateY: 0 });
        setIsPressed(false);
        onMouseLeave?.(e);
      },
      [onMouseLeave]
    );

    const transformStyle: React.CSSProperties = {
      perspective: '800px',
      transformStyle: 'preserve-3d',
      transform: !prefersReducedMotion && interactive
        ? `perspective(800px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(${isPressed ? 0.98 : 1}, ${isPressed ? 0.98 : 1}, 1)`
        : undefined,
      transition: isPressed ? 'transform 100ms ease-out' : 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
    };

    return (
      <Surface
        ref={ref}
        elevation={isPressed ? 'e1' : elevation}
        variant={variant}
        interactive={interactive}
        className={`select-none ${interactive ? 'cursor-pointer active:translate-y-[1px]' : ''} ${className}`}
        style={{ ...transformStyle, ...style }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={() => interactive && setIsPressed(true)}
        onMouseUp={() => interactive && setIsPressed(false)}
        onTouchStart={() => interactive && setIsPressed(true)}
        onTouchEnd={() => interactive && setIsPressed(false)}
        {...props}
      >
        {children}
      </Surface>
    );
  }
);

Card3D.displayName = 'Card3D';
