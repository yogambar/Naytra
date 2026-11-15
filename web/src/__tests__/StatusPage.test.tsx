import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { StatusPage } from '../pages/StatusPage';

describe('StatusPage Component', () => {
  it('renders the status heading and branding', () => {
    render(
      <BrowserRouter>
        <StatusPage />
      </BrowserRouter>
    );
    expect(screen.getByText('Naytra is running')).toBeInTheDocument();
    expect(screen.getByText('BSE Sensex 30 Paper Trading')).toBeInTheDocument();
  });

  it('renders system status cards', () => {
    render(
      <BrowserRouter>
        <StatusPage />
      </BrowserRouter>
    );
    expect(screen.getByText('Hardened baseline')).toBeInTheDocument();
    expect(screen.getByText('Replay Engine')).toBeInTheDocument();
    expect(screen.getByText('200 OK')).toBeInTheDocument();
  });

  it('renders link to design system', () => {
    render(
      <BrowserRouter>
        <StatusPage />
      </BrowserRouter>
    );
    const link = screen.getByRole('link', { name: /Explore Design System/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/design');
  });
});
