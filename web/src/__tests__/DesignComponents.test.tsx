import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Surface } from '../design/Surface';
import { Button } from '../design/Button';
import { Input } from '../design/Input';
import { NumberTicker } from '../design/NumberTicker';
import { PriceFlash } from '../design/PriceFlash';
import { ThemeToggle } from '../design/ThemeToggle';
import { useMotionPrefs } from '../hooks/useMotionPrefs';
import { usePointerFine } from '../hooks/usePointerFine';
import { SceneShell } from '../three/SceneShell';
import { LogoNFallback } from '../three/Fallbacks';

describe('Design System Components', () => {
  it('Surface renders with requested elevation and variant', () => {
    const { container } = render(
      <Surface elevation="e3" variant="raised">
        Surface Content
      </Surface>
    );
    expect(screen.getByText('Surface Content')).toBeInTheDocument();
    const div = container.firstChild as HTMLElement;
    expect(div.style.boxShadow).toBe('var(--shadow-e3)');
  });

  it('Button renders keycap styles, handles click and loading states', () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button variant="primary" onClick={handleClick}>
        Trade Now
      </Button>
    );
    const btn = screen.getByRole('button', { name: /Trade Now/i });
    expect(btn).toBeInTheDocument();
    expect(btn.style.boxShadow).toBe('var(--shadow-keycap-primary)');

    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(<Button variant="primary" loading>Trade Now</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('Input displays label, placeholder, and error states', () => {
    render(
      <Input
        label="Share Quantity"
        placeholder="Enter number"
        error="Quantity must be at least 1"
      />
    );
    expect(screen.getByText('Share Quantity')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter number')).toBeInTheDocument();
    const errorMsg = screen.getByRole('alert');
    expect(errorMsg).toHaveTextContent('Quantity must be at least 1');
  });

  it('NumberTicker formats numbers and lands on exact target value', async () => {
    render(<NumberTicker value={10000} prefix="₹" decimals={2} durationMs={0} />);
    // With durationMs=0, settles immediately
    expect(screen.getByText('₹10,000.00')).toBeInTheDocument();
  });

  it('PriceFlash displays directional indicator and change amount', () => {
    render(<PriceFlash value={2500} change={35.5} changePct={1.44} />);
    expect(screen.getByText('₹2,500.00')).toBeInTheDocument();
    expect(screen.getByText('+35.50 (1.44%)')).toBeInTheDocument();
  });

  it('ThemeToggle allows changing theme', () => {
    render(<ThemeToggle />);
    const darkBtn = screen.getByRole('radio', { name: /Dark/i });
    expect(darkBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(darkBtn);
    });

    expect(darkBtn).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('useMotionPrefs returns motion preferences correctly', () => {
    const { result } = renderHook(() => useMotionPrefs());
    expect(typeof result.current.prefersReducedMotion).toBe('boolean');
    expect(typeof result.current.shouldAnimate).toBe('boolean');
  });

  it('usePointerFine returns boolean', () => {
    const { result } = renderHook(() => usePointerFine());
    expect(typeof result.current).toBe('boolean');
  });

  it('SceneShell renders fallback when WebGL is skipped or in test environment', () => {
    render(
      <SceneShell
        accessibleLabel="Test 3D Scene"
        fallback={<LogoNFallback />}
      >
        <div>WebGL Canvas Content</div>
      </SceneShell>
    );
    // In jsdom test environment without full WebGL context, fallback is rendered
    expect(screen.getByRole('img', { name: 'Test 3D Scene' })).toBeInTheDocument();
  });
});
