import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataModeBadge, Badge } from '../design/Badge';

describe('DataModeBadge and Badge', () => {
  it('renders default REPLAY DATA badge', () => {
    render(<DataModeBadge mode="REPLAY" />);
    const badge = screen.getByText('REPLAY DATA');
    expect(badge).toBeInTheDocument();
  });

  it('renders DEMO DATA badge when mode is DEMO', () => {
    render(<DataModeBadge mode="DEMO" />);
    const badge = screen.getByText('DEMO DATA');
    expect(badge).toBeInTheDocument();
  });

  it('renders LIVE with pulse when mode is LIVE', () => {
    render(<DataModeBadge mode="LIVE" />);
    const badge = screen.getByText('LIVE');
    expect(badge).toBeInTheDocument();
  });

  it('renders semantic variants with correct classes', () => {
    const { rerender } = render(<Badge variant="success">Passed</Badge>);
    expect(screen.getByText('Passed')).toHaveClass('bg-brand-up-bg');

    rerender(<Badge variant="error">Failed</Badge>);
    expect(screen.getByText('Failed')).toHaveClass('bg-brand-down-bg');
  });
});
