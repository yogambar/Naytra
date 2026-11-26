import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';

describe('App Router', () => {
  it('redirects unauthenticated user at root / to /welcome', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(
      await screen.findByRole('heading', {
        name: /Get up to ₹100 signup bonus when you join!/i,
      })
    ).toBeInTheDocument();
  });

  it('renders status page at /status', async () => {
    render(
      <MemoryRouter initialEntries={['/status']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByText('Naytra is running')).toBeInTheDocument();
  });

  it('renders signin page at /signin', async () => {
    render(
      <MemoryRouter initialEntries={['/signin']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
  });

  it('renders signup page at /signup', async () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: /Create your account/i })).toBeInTheDocument();
  });
});
