import React from 'react';
import { useMotionPrefs } from '../hooks/useMotionPrefs';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  className = '',
  style,
  ...props
}) => {
  const { prefersReducedMotion } = useMotionPrefs();

  let roundedClass = 'rounded-lg';
  if (variant === 'circular') roundedClass = 'rounded-full';
  if (variant === 'text') roundedClass = 'rounded h-4';

  const defaultHeight = variant === 'text' ? '1rem' : variant === 'circular' ? width || '2.5rem' : '2.5rem';

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden bg-surface-inset border border-surface-border-subtle ${roundedClass} ${
        prefersReducedMotion ? '' : 'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent'
      } ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? defaultHeight,
        ...style,
      }}
      {...props}
    />
  );
};
