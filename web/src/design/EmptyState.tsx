import React from 'react';
import { Surface } from './Surface';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <Surface
      elevation="e1"
      variant="inset"
      className={`flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto rounded-2xl border border-surface-border-subtle ${className}`}
    >
      {icon && <div className="mb-4 text-text-tertiary flex justify-center">{icon}</div>}
      <h3 className="text-base font-bold text-text-primary">{title}</h3>
      <p className="text-xs text-text-secondary mt-1.5 leading-relaxed max-w-xs">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Surface>
  );
};
