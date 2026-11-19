import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, RefreshCw, LogOut } from 'lucide-react';
import { LogoNFallback } from '../three/Fallbacks';
import { Button } from '../design/Button';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { hapticTick, hapticSuccess } from '../utils/haptics';

export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, resendVerificationEmail, refreshProfile, logout } = useAuth();
  const [cooldown, setCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const displayEmail = user?.email || profile?.email || 'your registered email';

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    hapticTick();
    try {
      await resendVerificationEmail();
      setResendSuccess(true);
      setCooldown(60);
    } catch {
      // Handled
    }
  };

  const handleCheckStatus = async () => {
    hapticTick();
    setIsChecking(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          hapticSuccess();
          await refreshProfile();
          navigate('/dashboard');
          return;
        }
      }
      const updated = await refreshProfile();
      if (updated?.email_verified) {
        hapticSuccess();
        navigate('/dashboard');
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    hapticTick();
    await logout();
    navigate('/welcome');
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6 text-center">
        {/* Brand */}
        <div className="inline-flex items-center gap-2 mb-2">
          <LogoNFallback size={40} />
          <span className="font-extrabold text-xl tracking-wider text-text-primary uppercase font-mono">
            NAYTRA
          </span>
        </div>

        {/* Card */}
        <div
          className="p-8 rounded-2xl bg-surface-raised border border-surface-border shadow-md"
          style={{ boxShadow: 'var(--shadow-e2)' }}
        >
          {/* Email Icon with pulse */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-marigold/10 border border-brand-marigold/30 flex items-center justify-center text-brand-marigold mb-5 shadow-inner">
            <Mail className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold font-heading text-text-primary">Verify your email</h2>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            We sent a verification link to <strong className="text-text-primary">{displayEmail}</strong>. Please check your inbox and verify your email to unlock your virtual trading wallet.
          </p>

          {resendSuccess && (
            <div className="mt-4 p-3 rounded-xl bg-brand-up/10 border border-brand-up/30 text-brand-up text-xs flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>A new verification link has been dispatched!</span>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {/* Check status button */}
            <Button
              variant="primary"
              size="lg"
              leftIcon={<RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />}
              className="w-full"
              disabled={isChecking}
              onClick={handleCheckStatus}
            >
              I Have Verified My Email
            </Button>

            {/* Resend button */}
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              disabled={cooldown > 0}
              onClick={handleResend}
            >
              {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend Verification Email'}
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-border">
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-semibold text-text-tertiary hover:text-text-primary inline-flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign in with a different account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
