import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { LogoNFallback } from '../three/Fallbacks';
import { Button } from '../design/Button';
import { Input } from '../design/Input';
import { useAuth } from '../context/AuthContext';
import { hapticTick, hapticSuccess } from '../utils/haptics';

export const ForgotPasswordPage: React.FC = () => {
  const { sendPasswordReset, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    hapticTick();
    await sendPasswordReset(email);
    setSent(true);
    hapticSuccess();
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <LogoNFallback size={40} />
            <span className="font-extrabold text-xl tracking-wider text-text-primary uppercase font-mono">
              NAYTRA
            </span>
          </Link>
          <h2 className="text-2xl font-bold font-heading text-text-primary">Reset your password</h2>
          <p className="text-sm text-text-secondary mt-1">
            We will send a secure password reset link to your email
          </p>
        </div>

        <div
          className="p-6 sm:p-8 rounded-2xl bg-surface-raised border border-surface-border shadow-md"
          style={{ boxShadow: 'var(--shadow-e2)' }}
        >
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 text-center py-2"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-up/10 text-brand-up flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">Check your inbox</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                If an account exists with <strong className="text-text-primary">{email}</strong>, a password reset link has been dispatched. Please check your spam folder if it doesn&apos;t arrive within a few minutes.
              </p>
              <div className="pt-2">
                <Link to="/signin">
                  <Button variant="secondary" size="md" className="w-full">
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="block text-xs font-semibold text-text-secondary mb-1">
                  Email Address
                </label>
                <Input
                  id="forgot-email"
                  aria-label="Email Address"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Reset Link</span>
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-surface-border text-center">
            <Link
              to="/signin"
              className="text-xs font-semibold text-text-tertiary hover:text-text-primary inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
