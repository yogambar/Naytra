import React, { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, ShieldCheck, Gift, TrendingUp } from 'lucide-react';
import { CoinVirtualFallback } from '../three/Fallbacks';
import { Button } from '../design/Button';
import { useAuth } from '../context/AuthContext';
import { hapticTick, hapticSuccess } from '../utils/haptics';

const CoinVirtual3D = React.lazy(() =>
  import('../three/CoinVirtual3D').then((m) => ({ default: m.CoinVirtual3D }))
);

export const SignupBonusPage: React.FC = () => {
  const navigate = useNavigate();
  const { claimBonus } = useAuth();
  const [claiming, setClaiming] = useState(false);

  const handleStartTrading = async () => {
    hapticTick();
    setClaiming(true);
    try {
      await claimBonus();
      hapticSuccess();
      navigate('/dashboard', { replace: true });
    } catch {
      hapticSuccess();
      navigate('/dashboard', { replace: true });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col items-center justify-center px-4 sm:px-6 py-12 selection:bg-brand-marigold selection:text-brand-ink">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Animated Coin */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto"
        >
          <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto flex items-center justify-center">
            <Suspense fallback={<CoinVirtualFallback size={160} />}>
              <CoinVirtual3D size={180} />
            </Suspense>
          </div>
        </motion.div>

        {/* Celebration Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-marigold-bg border border-brand-marigold/30 text-brand-marigold-text text-xs font-bold tracking-wide uppercase"
        >
          <Gift className="w-4 h-4" />
          <span>Signup Bonus</span>
        </motion.div>

        {/* Main Heading */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="space-y-3"
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading leading-tight">
            Congratulations! 🎉
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary leading-relaxed">
            You've received{' '}
            <span className="text-brand-marigold-text font-extrabold text-2xl sm:text-3xl">
              ₹10,000
            </span>{' '}
            in virtual practice funds!
          </p>
        </motion.div>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-raised border border-surface-border text-xs font-semibold text-text-secondary">
            <TrendingUp className="w-3.5 h-3.5 text-brand-up" />
            <span>BSE Sensex 30 Stocks</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-raised border border-surface-border text-xs font-semibold text-text-secondary">
            <Sparkles className="w-3.5 h-3.5 text-brand-marigold" />
            <span>Zero Risk Practice</span>
          </div>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-sm text-text-secondary leading-relaxed max-w-sm mx-auto"
        >
          Use your virtual funds to explore paper trading on the BSE Sensex 30. 
          Learn market strategies with zero risk — no real money is involved.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="pt-2"
        >
          <Button
            variant="primary"
            size="lg"
            rightIcon={<ArrowRight className="w-5 h-5" />}
            className="w-full max-w-sm mx-auto"
            onClick={handleStartTrading}
            loading={claiming}
            disabled={claiming}
          >
            Start Trading
          </Button>
        </motion.div>

        {/* Virtual funds disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-xs font-semibold text-text-tertiary flex items-center justify-center gap-1.5 pt-2"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-brand-up" />
          <span>Virtual, non-withdrawable funds for educational practice only.</span>
        </motion.div>
      </div>
    </div>
  );
};
