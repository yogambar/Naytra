import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, UserCheck } from 'lucide-react';
import { LogoNFallback } from '../three/Fallbacks';
import { Button } from '../design/Button';
import { Input } from '../design/Input';
import { useAuth } from '../context/AuthContext';
import { hapticTick, hapticError } from '../utils/haptics';

export const CompleteProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, completeUserProfile, isLoading, error: authError } = useAuth();

  const [name, setName] = useState(user?.displayName || profile?.name || '');
  const [dob, setDob] = useState(profile?.dob || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [city, setCity] = useState(profile?.city || '');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [age, setAge] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Age calculation
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || name.trim().length < 2) {
      setFormError('Full name must be at least 2 characters.');
      hapticError();
      return;
    }

    if (!dob) {
      setFormError('Please provide your date of birth.');
      hapticError();
      return;
    }

    if (age === null || age < 18) {
      setFormError('You must be at least 18 years old to trade on Naytra.');
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
      await completeUserProfile({
        name: name.trim(),
        dob,
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        terms_accepted: true,
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not complete profile';
      setFormError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <LogoNFallback size={40} />
            <span className="font-extrabold text-xl tracking-wider text-text-primary uppercase font-mono">
              NAYTRA
            </span>
          </div>
          <h2 className="text-2xl font-bold font-heading text-text-primary">Complete Your Profile</h2>
          <p className="text-sm text-text-secondary mt-1">
            Required before trading on the BSE Sensex 30 simulator
          </p>
        </div>

        <div
          className="p-6 sm:p-8 rounded-2xl bg-surface-raised border border-surface-border shadow-md"
          style={{ boxShadow: 'var(--shadow-e2)' }}
        >
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
            <div>
              <label htmlFor="profile-name" className="block text-xs font-semibold text-text-secondary mb-1">
                Full Name <span className="text-brand-down">*</span>
              </label>
              <Input
                id="profile-name"
                aria-label="Full Name"
                type="text"
                required
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="profile-dob" className="text-xs font-semibold text-text-secondary">
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
                id="profile-dob"
                aria-label="Date of Birth"
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="profile-phone" className="block text-xs font-semibold text-text-secondary mb-1">
                  Phone <span className="text-text-tertiary">(Optional)</span>
                </label>
                <Input
                  id="profile-phone"
                  aria-label="Phone Number"
                  type="tel"
                  placeholder="+91..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="profile-city" className="block text-xs font-semibold text-text-secondary mb-1">
                  City <span className="text-text-tertiary">(Optional)</span>
                </label>
                <Input
                  id="profile-city"
                  aria-label="City"
                  type="text"
                  placeholder="e.g. Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>

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
                  I accept the Terms & Conditions and understand Naytra is an educational paper-trading simulator with virtual funds. No real money or exchange orders are executed.
                </span>
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading}
                loading={isLoading}
                leftIcon={<UserCheck className="w-4 h-4" />}
                className="w-full"
              >
                Complete & Unlock Portfolio
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
