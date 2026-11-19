import React, { Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { LogoN3D } from '../three/LogoN3D';
import { LogoNFallback } from '../three/Fallbacks';
import { Button } from '../design/Button';
import { useAuth } from '../context/AuthContext';
import { hapticTick } from '../utils/haptics';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { signInWithGoogle, isLoading, error } = useAuth();

  const handleGoogleClick = async () => {
    hapticTick();
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch {
      // Error handled by AuthContext
    }
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col justify-between selection:bg-brand-marigold selection:text-brand-ink">
      {/* Top Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <LogoNFallback size={32} />
          <span className="font-extrabold text-lg tracking-wider text-text-primary uppercase font-mono">
            NAYTRA
          </span>
        </div>
        <Link
          to="/signin"
          className="text-sm font-semibold text-text-secondary hover:text-brand-marigold transition-colors"
        >
          Sign In
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full text-center">
        {/* 3D Candlestick N Mark Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-6"
        >
          <div className="w-48 h-48 sm:w-56 sm:h-56 mx-auto flex items-center justify-center">
            <Suspense fallback={<LogoNFallback size={180} />}>
              <LogoN3D size={220} />
            </Suspense>
          </div>
        </motion.div>

        {/* Bonus Announcement Pill */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-marigold-bg border border-brand-marigold/30 text-brand-marigold-text text-xs font-bold tracking-wide uppercase mb-4"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-marigold-text" />
          <span>Educational Paper Trading</span>
        </motion.div>

        {/* Headlines */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-heading leading-tight"
        >
          Get up to <span className="text-brand-marigold-text">₹10,000</span> signup bonus for paper trading!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="mt-4 text-base sm:text-lg text-text-secondary max-w-lg leading-relaxed"
        >
          Create your free account and receive virtual trading cash to start your paper-trading journey. No real money involved.
        </motion.p>

        {/* Virtual funds disclosure */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-2 text-xs font-semibold text-text-tertiary flex items-center justify-center gap-1.5"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-brand-up" />
          <span>Virtual, non-withdrawable funds for BSE Sensex 30 practice.</span>
        </motion.div>

        {/* Error message if any */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-brand-down/10 border border-brand-down/30 text-brand-down text-sm">
            {error}
          </div>
        )}

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-sm"
        >
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => {
              hapticTick();
              navigate('/signup');
            }}
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => {
              hapticTick();
              navigate('/signin');
            }}
          >
            Sign In
          </Button>
        </motion.div>

        {/* Google Sign In Option */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 w-full max-w-sm"
        >
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl border border-surface-border bg-surface-raised hover:bg-surface-inset text-text-primary text-sm font-semibold flex items-center justify-center gap-2.5 transition-all shadow-sm hover:shadow"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-text-tertiary border-t border-surface-border">
        <span>© 2026 Naytra. Educational BSE Sensex 30 Paper Trading Simulator.</span>
      </footer>
    </div>
  );
};
