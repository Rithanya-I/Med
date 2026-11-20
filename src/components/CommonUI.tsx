import React, { useState } from 'react';
import { ScreenRoute } from '../types';

export const MEDISLOT_LOGO_URL =
  'https://lh3.googleusercontent.com/aida/ALJJyrBbOO8KiSrb2OWbviZaMIIkUdHYZjxVWdSbb_p5grDkJDYHzyr-5eY7whqAUXV_uGD4x55PIuTnKaMNnI18a6GlIlMzJuVojIPgn8pEyi1KG95Y9fnkzEAE95c3f-GSTykp2qtnAEHPFd_h4BfkIk1hOAyqqlh9BMNpIEjvKDVoIivvrTzsY3Kx-Fo8HBLhVk8qeOqkuVAED4mCTtWO4_EetBgT7KYK1vufA5Xevc2O';

export const DEFAULT_PATIENT_AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAgF-hHQXsqFrs_a859-yn2RY-JYocm1ndw-40JTb5Z4U21S4P3L79vc4WJC3G90TcU9QkRWQocOa3kfymtj2cZW1lNMtF3OpY3sXrHgc20u4xWchBdtF6RO0Ce389BsCH0IbCtMPq_phZrxnUIi0wg0NS8YJ7ujtwdgha868EstubVfNlbBXEuUsiNpgaWghgvST2Lr9TX3g4KlhsavLNPIVTmuoTHXjt6aUCYpLc';

export const MaterialIcon: React.FC<{
  name: string;
  className?: string;
  filled?: boolean;
}> = ({ name, className = 'text-[20px]', filled = false }) => (
  <span
    aria-hidden="true"
    className={`material-symbols-outlined ${className}`}
    style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
  >
    {name}
  </span>
);

export const AvatarImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
  fallbackText?: string;
}> = ({ src, alt, className = 'w-12 h-12 rounded-xl object-cover', fallbackText = 'MS' }) => {
  const [failed, setFailed] = useState(false);
  const initials = fallbackText
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  if (!src || failed) {
    return (
      <div
        aria-label={alt}
        className={`${className} bg-primary-fixed text-on-primary-fixed font-semibold flex items-center justify-center shrink-0 select-none`}
      >
        <span>{initials || 'MS'}</span>
      </div>
    );
  }

  return (
    <img
      alt={alt}
      src={src}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

interface TopAppHeaderProps {
  mode: 'tab' | 'stack';
  title: string;
  activeRoute: ScreenRoute;
  onNavigate: (route: ScreenRoute) => void;
  onBack?: () => void;
  avatarUrl?: string;
  isAuthenticated: boolean;
  onNotificationsClick?: () => void;
}

export const TopAppHeader: React.FC<TopAppHeaderProps> = ({
  mode,
  title,
  activeRoute,
  onNavigate,
  onBack,
  avatarUrl,
  isAuthenticated,
  onNotificationsClick,
}) => {
  const navItems: { route: ScreenRoute; label: string }[] = [
    { route: 'dashboard', label: 'Home' },
    { route: 'specialties', label: 'Specialties' },
    { route: 'medibot', label: 'MediBot' },
    { route: 'appointments', label: 'Bookings' },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(15,41,66,0.04)] pt-safe">
      <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        {mode === 'stack' ? (
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container transition-colors shrink-0"
            >
              <MaterialIcon name="arrow_back" className="text-[22px]" />
            </button>
            <h1 className="text-[19px] font-semibold text-on-surface tracking-tight truncate">
              {title}
            </h1>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-left shrink-0 whitespace-nowrap"
          >
            <AvatarImage
              src={MEDISLOT_LOGO_URL}
              alt="MediSlot AI Logo"
              fallbackText="MS"
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="text-[20px] font-bold tracking-tight text-primary whitespace-nowrap">
              MediSlot <span className="text-tertiary">AI</span>
            </span>
          </button>
        )}

        {/* Desktop navigation links */}
        <nav className="hidden md:flex items-center gap-7">
          {navItems.map((item) => {
            const isActive = activeRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => onNavigate(item.route)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive
                    ? 'text-primary border-primary font-semibold'
                    : 'text-secondary border-transparent hover:text-on-surface'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {mode === 'stack' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low text-primary text-[11px] font-semibold uppercase tracking-wider">
              <MaterialIcon name="verified_user" className="text-[14px]" />
              HIPAA
            </span>
          ) : (
            <button
              type="button"
              onClick={onNotificationsClick}
              aria-label="Notifications"
              className="w-11 h-11 flex items-center justify-center rounded-full text-secondary hover:text-primary hover:bg-surface-container transition-colors"
            >
              <MaterialIcon name="notifications" className="text-[22px]" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate(isAuthenticated ? 'profile' : 'welcome')}
            aria-label={isAuthenticated ? 'Open patient profile' : 'Sign in'}
            className="flex items-center justify-center p-0.5 rounded-full hover:ring-2 hover:ring-primary/25 transition-all"
          >
            {isAuthenticated ? (
              <AvatarImage
                src={avatarUrl || DEFAULT_PATIENT_AVATAR_URL}
                alt="Patient Profile"
                fallbackText="PS"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold whitespace-nowrap">
                Sign In
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export const MobileBottomNav: React.FC<{
  activeRoute: ScreenRoute;
  onNavigate: (route: ScreenRoute) => void;
}> = ({ activeRoute, onNavigate }) => {
  const tabs: { route: ScreenRoute; label: string; icon: string }[] = [
    { route: 'dashboard', label: 'Home', icon: 'dashboard' },
    { route: 'specialties', label: 'Specialties', icon: 'medical_services' },
    { route: 'medibot', label: 'MediBot', icon: 'smart_toy' },
    { route: 'appointments', label: 'Bookings', icon: 'calendar_month' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/95 backdrop-blur-xl shadow-[0_-1px_12px_rgba(15,41,66,0.06)]">
      <div className="grid grid-cols-4 items-center h-16 px-2">
        {tabs.map((tab) => {
          const isActive = activeRoute === tab.route;
          return (
            <button
              key={tab.route}
              type="button"
              onClick={() => onNavigate(tab.route)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors ${
                isActive ? 'text-primary font-semibold' : 'text-secondary hover:text-on-surface'
              }`}
            >
              <MaterialIcon name={tab.icon} className="text-[22px]" filled={isActive} />
              <span className="text-[11px] leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
