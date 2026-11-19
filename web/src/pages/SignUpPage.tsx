import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, ShieldAlert, Sparkles, Eye, EyeOff } from 'lucide-react';
import { LogoNFallback } from '../three/Fallbacks';
import { Button } from '../design/Button';
import { Input } from '../design/Input';
import { useAuth } from '../context/AuthContext';
import { evaluatePasswordStrength } from '../utils/passwordStrength';
import { checkPasswordBreached } from '../utils/pwnedPasswords';
import { hapticTick, hapticError } from '../utils/haptics';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUpWithEmail, signInWithGoogle, isLoading, error: authError, clearError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Validation states
  const [age, setAge] = useState<number | null>(null);
  const [isBreached, setIsBreached] = useState<boolean>(false);
  const [breachCount, setBreachCount] = useState<number>(0);
  const [isCheckingBreach, setIsCheckingBreach] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Password strength calculation
  const strength = evaluatePasswordStrength(password);

  // Calculate age whenever DOB changes
  useEffect(() => {
    if (!dob) {
      setAge(null);
      return;
    }
    const birth = new Date(dob);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }
    setAge(calculatedAge);
  }, [dob]);

  // Debounced HIBP breached password check
  useEffect(() => {
    if (!password || password.length < 10) {
      setIsBreached(false);
      setBreachCount(0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingBreach(true);
      const res = await checkPasswordBreached(password);
      setIsBreached(res.isBreached);
      setBreachCount(res.count);
      setIsCheckingBreach(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormError(null);

    // Validations
    if (!name.trim() || name.trim().length < 2) {
      setFormError('Full name must be at least 2 characters.');
      hapticError();
      return;
    }

    if (!dob) {
      setFormError('Please enter your date of birth.');
      hapticError();
      return;
    }

    if (age === null || age < 18) {
      setFormError('You must be at least 18 years old to trade on Naytra.');
      hapticError();
      return;
    }

    if (!strength.hasMinLength) {
      setFormError('Password must be at least 10 characters.');
      hapticError();
      return;
    }

    if (isBreached) {
      setFormError(`This password was exposed in ${breachCount.toLocaleString()} data breaches. Please choose a different password.`);
      hapticError();
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      hapticError();
      return;
    }

    if (!termsAccepted) {
      setFormError('You must accept the terms and paper-trading disclaimer.');
      hapticError();
      return;
    }

    hapticTick();
    try {
      await signUpWithEmail(email, password, name, dob, phone, city);
      navigate('/verify-email');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setFormError(msg);
    }
  };

  const handleGoogleSignIn = async () => {
    hapticTick();
    clearError();
    setFormError(null);
    try {
      const res = await signInWithGoogle();
      if (!res?.profileComplete) {
        navigate('/complete-profile', { replace: true });
      } else if (!res?.bonusClaimed) {
        navigate('/signup-bonus', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in was canceled or failed. Please try again.';
      setFormError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Header Branding */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <LogoNFallback size={40} />
            <span className="font-extrabold text-xl tracking-wider text-text-primary uppercase font-mono">
              NAYTRA
            </span>
          </Link>
          <h2 className="text-2xl font-bold font-heading text-text-primary">Create your account</h2>
          <p className="text-sm text-text-secondary mt-1">
            Join the BSE Sensex 30 paper-trading simulator
          </p>
        </div>

        {/* Form Card */}
        <div
          className="p-6 sm:p-8 rounded-2xl bg-surface-raised border border-surface-border shadow-md"
          style={{ boxShadow: 'var(--shadow-e2)' }}
        >
          {/* Error Banner */}
          {(formError || authError) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 mb-5 rounded-xl bg-brand-down/10 border border-brand-down/30 text-brand-down text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{formError || authError}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="signup-name" className="block text-xs font-semibold text-text-secondary mb-1">
                Full Name <span className="text-brand-down">*</span>
              </label>
              <Input
                id="signup-name"
                aria-label="Full Name"
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="signup-email" className="block text-xs font-semibold text-text-secondary mb-1">
                Email Address <span className="text-brand-down">*</span>
              </label>
              <Input
                id="signup-email"
                aria-label="Email Address"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Date of Birth & 18+ Check */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="signup-dob" className="text-xs font-semibold text-text-secondary">
                  Date of Birth <span className="text-brand-down">*</span>
                </label>
                {age !== null && (
                  <span
                    className={`text-[11px] font-bold ${
                      age >= 18 ? 'text-brand-up' : 'text-brand-down'
                    }`}
                  >
                    {age >= 18 ? `Age: ${age} (Eligible)` : `Age: ${age} (Must be 18+)`}
                  </span>
                )}
              </div>
              <Input
                id="signup-dob"
                aria-label="Date of Birth"
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Phone & City (Optional Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="signup-phone" className="block text-xs font-semibold text-text-secondary mb-1">
                  Phone <span className="text-text-tertiary">(Optional)</span>
                </label>
                <Input
                  id="signup-phone"
                  aria-label="Phone Number"
                  type="tel"
                  placeholder="+91..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="signup-city" className="block text-xs font-semibold text-text-secondary mb-1">
                  City <span className="text-text-tertiary">(Optional)</span>
                </label>
                <Input
                  id="signup-city"
                  aria-label="City"
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="signup-password" className="text-xs font-semibold text-text-secondary">
                  Password (min. 10 chars) <span className="text-brand-down">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-text-tertiary hover:text-text-secondary flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <Input
                id="signup-password"
                aria-label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="At least 10 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-tertiary">Strength:</span>
                    <span className="font-bold" style={{ color: strength.color }}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-border overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${strength.percent}%`,
                        backgroundColor: strength.color,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Breached Password Warning & Checking State */}
              {isCheckingBreach && (
                <div className="mt-2 text-[11px] text-text-tertiary flex items-center gap-1.5 animate-pulse">
                  <span>Checking Have I Been Pwned database...</span>
                </div>
              )}
              {isBreached && (
                <div className="mt-2 p-2.5 rounded-lg bg-brand-down/10 border border-brand-down/30 text-brand-down text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Found in {breachCount.toLocaleString()} data breaches. Choose another.</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-text-secondary mb-1">
                Confirm Password <span className="text-brand-down">*</span>
              </label>
              <Input
                id="signup-confirm-password"
                aria-label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword.length > 0 && password === confirmPassword && (
                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-brand-up">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Passwords match</span>
                </div>
              )}
            </div>

            {/* Terms & Paper Trading Disclaimer */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 text-xs text-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded text-brand-marigold focus:ring-brand-marigold/30"
                />
                <span>
                  I accept the Terms & Conditions and understand Naytra is an educational paper-trading simulator with virtual funds. No real money or stock exchange orders are executed.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading}
                loading={isLoading}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="w-full"
              >
                Create Free Account
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-border" />
            </div>
            <span className="relative px-3 bg-surface-raised text-xs text-text-tertiary uppercase">
              Or continue with
            </span>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl border border-surface-border bg-surface-inset hover:bg-surface-inset/80 text-text-primary text-sm font-semibold flex items-center justify-center gap-2.5 transition-all shadow-sm hover:shadow"
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
            <span>Google</span>
          </button>
        </div>

        {/* Existing account link */}
        <p className="text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link to="/signin" className="font-bold text-brand-marigold-text hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
