import React, { useState } from 'react';
import { Card3D } from '../design/Card3D';
import { ThemeToggle } from '../design/ThemeToggle';
import { DataModeBadge } from '../design/Badge';
import { Button } from '../design/Button';
import { hapticTick } from '../utils/haptics';
import { Smartphone, ExternalLink, Sliders, Palette, LogOut, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, logout, deleteAccount } = useAuth();
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const toggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    if (next) {
      hapticTick();
    }
  };

  const handleLogout = async () => {
    hapticTick();
    await logout();
    navigate('/welcome');
  };

  const handleDeleteAccount = async () => {
    hapticTick();
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      navigate('/welcome');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      setDeleteError(msg);
      setIsDeleting(false);
    }
  };

  const displayName = profile?.name || user?.displayName || 'Registered Paper Trader';
  const displayEmail = profile?.email || user?.email || 'trader@naytra.local';
  const isVerified = Boolean(profile?.email_verified || user?.emailVerified);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Profile & Settings
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Account preferences, theme settings, and Android native controls
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleLogout}
          leftIcon={<LogOut className="w-3.5 h-3.5" />}
          className="text-brand-down"
        >
          Sign Out
        </Button>
      </div>

      {/* Account Info Card */}
      <Card3D elevation="e2" className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-ink flex items-center justify-center text-brand-marigold font-bold text-xl border border-brand-marigold/40">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary">{displayName}</h2>
              <DataModeBadge mode="REPLAY" />
            </div>
            <p className="text-xs text-text-secondary mt-0.5 font-mono">
              {displayEmail}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-up">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Account</span>
                </span>
              ) : (
                <Link
                  to="/verify-email"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-marigold-text hover:underline"
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>Verify Email</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        <Link to="/status" className="hidden sm:inline-flex">
          <Button variant="secondary" size="sm">
            Status Page
          </Button>
        </Link>
      </Card3D>

      {/* App Appearance Settings */}
      <Card3D elevation="e2" className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-text-primary border-b border-surface-border pb-3">
          <Palette className="w-4 h-4 text-brand-marigold" />
          Appearance & Themes
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-sm font-semibold text-text-primary block">Color Theme</span>
            <span className="text-xs text-text-tertiary">
              Full depth system with light and dark mode elevation palettes
            </span>
          </div>
          <ThemeToggle />
        </div>
      </Card3D>

      {/* Device & Native Android Settings */}
      <Card3D elevation="e2" className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-text-primary border-b border-surface-border pb-3">
          <Smartphone className="w-4 h-4 text-brand-marigold" />
          Native Android Controls
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-text-primary block">Haptic Feedback</span>
            <span className="text-xs text-text-tertiary">
              Tactile vibrations on tab changes, order execution, and errors
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hapticsEnabled}
            onClick={toggleHaptics}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              hapticsEnabled ? 'bg-brand-marigold' : 'bg-surface-inset border border-surface-border'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                hapticsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-surface-border">
          <div>
            <span className="text-sm font-semibold text-text-primary block">Capacitor Native AppId</span>
            <span className="text-xs font-mono text-text-tertiary">com.rgc.naytra</span>
          </div>
          <span className="text-xs font-bold text-brand-up bg-brand-up-bg px-2.5 py-0.5 rounded-full border border-brand-up/30">
            CONFIGURED
          </span>
        </div>
      </Card3D>

      {/* Developer & Design Links */}
      <Card3D elevation="e2" className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-text-primary border-b border-surface-border pb-3">
          <Sliders className="w-4 h-4 text-brand-marigold" />
          Developer & Design Quick Links
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Link
            to="/design"
            className="p-3 rounded-xl bg-surface-inset border border-surface-border hover:border-brand-marigold/40 transition-colors flex items-center justify-between"
          >
            <div>
              <span className="text-xs font-bold text-text-primary block">Design System Showcase</span>
              <span className="text-[11px] text-text-tertiary">3D tokens, components & WebGL scenes</span>
            </div>
            <ExternalLink className="w-4 h-4 text-text-tertiary" />
          </Link>

          <Link
            to="/status"
            className="p-3 rounded-xl bg-surface-inset border border-surface-border hover:border-brand-marigold/40 transition-colors flex items-center justify-between"
          >
            <div>
              <span className="text-xs font-bold text-text-primary block">API Status & Health</span>
              <span className="text-[11px] text-text-tertiary">Server diagnostics & version meta</span>
            </div>
            <ExternalLink className="w-4 h-4 text-text-tertiary" />
          </Link>
        </div>
      </Card3D>

      {/* Danger Zone: Delete Account */}
      <Card3D elevation="e2" className="p-5 space-y-3 border-brand-down/30 bg-brand-down/5">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-down border-b border-brand-down/20 pb-3">
          <Trash2 className="w-4 h-4 text-brand-down" />
          Danger Zone
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <span className="text-sm font-semibold text-text-primary block">Delete Account</span>
            <span className="text-xs text-text-secondary">
              Permanently erase your account, virtual wallet, and trading history from Firestore.
            </span>
          </div>

          {!showDeleteConfirm ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Account
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={isDeleting}
                disabled={isDeleting}
                onClick={handleDeleteAccount}
              >
                Confirm Delete
              </Button>
            </div>
          )}
        </div>

        {deleteError && (
          <p className="text-xs text-brand-down mt-2 font-medium">
            {deleteError}
          </p>
        )}
      </Card3D>
    </div>
  );
};
