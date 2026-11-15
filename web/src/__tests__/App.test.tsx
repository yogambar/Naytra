import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';

describe('App Router', () => {
  it('renders dashboard at root /', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: /Market Dashboard/i })).toBeInTheDocument();
  });

  it('renders status page at /status', async () => {
    render(
      <MemoryRouter initialEntries={['/status']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByText('Naytra is running')).toBeInTheDocument();
  });

  it('redirects unknown route to /', async () => {
    render(
      <MemoryRouter initialEntries={['/some-unknown-path']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: /Market Dashboard/i })).toBeInTheDocument();
  });
});
