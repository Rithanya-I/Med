import React, { useState } from 'react';
import { AvatarImage, MaterialIcon } from '../components/CommonUI';
import { useAuth } from '../context/AuthContext';
import { Doctor, ScreenRoute, Specialty } from '../types';

interface WelcomePortalScreenProps {
  doctors: Doctor[];
  specialties: Specialty[];
  onNavigate: (route: ScreenRoute) => void;
  onSelectSpecialty: (slug: string) => void;
  onSelectDoctor: (doctor: Doctor) => void;
  onStartBooking: (doctor: Doctor, slot?: string) => void;
}

export const WelcomePortalScreen: React.FC<WelcomePortalScreenProps> = ({
  doctors,
  specialties,
  onNavigate,
  onSelectSpecialty,
  onSelectDoctor,
  onStartBooking,
}) => {
  const { signInWithGoogle, authError, clearAuthError, firebaseUser, authFetch, refreshProfile } =
    useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'register' | 'login'>('overview');
  const [signingIn, setSigningIn] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regInsurance, setRegInsurance] = useState('Aetna / BlueCross Verified');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const featuredDoctors = doctors.slice(0, 2);

  const handleGoogleAuth = async (isRegisterFlow = false) => {
    clearAuthError();
    setStatusNotice(null);
    setSigningIn(true);
    const profile = await signInWithGoogle();
    if (profile && isRegisterFlow && (regName.trim() || regPhone.trim())) {
      await authFetch('/api/me', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: regName.trim() || profile.fullName,
          phone: regPhone.trim() || profile.phone,
          insuranceProvider: regInsurance,
        }),
      });
      await refreshProfile();
    }
    setSigningIn(false);
    if (profile) {
      onNavigate('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Top Segment Switcher */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-safe px-4 py-3">
        <div className="max-w-4xl mx-auto bg-surface-container p-1 rounded-full grid grid-cols-3 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setActiveTab('overview');
              setStatusNotice(null);
            }}
            className={`py-2 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <MaterialIcon name="home_health" className="text-[16px]" />
            <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setStatusNotice(null);
            }}
            className={`py-2 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'register'
                ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <MaterialIcon name="person_add" className="text-[16px]" />
            <span>Register</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setStatusNotice(null);
            }}
            className={`py-2 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'login'
                ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <MaterialIcon name="lock" className="text-[16px]" />
            <span>Sign In</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-2">
        {authError && (
          <div className="mb-4 p-3.5 rounded-xl bg-error-container text-on-error-container text-sm flex items-center justify-between gap-2">
            <span>{authError}</span>
            <button
              type="button"
              onClick={clearAuthError}
              className="text-xs font-semibold underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {statusNotice && (
          <div className="mb-4 p-3.5 rounded-xl bg-secondary-container text-on-secondary-fixed text-sm flex items-center gap-2">
            <MaterialIcon name="info" className="text-[18px] text-primary shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 flex flex-col gap-5">
              {/* Hero Banner Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-secondary-container/30 p-6 shadow-sm">
                <div className="relative z-10 flex flex-col gap-3">
                  <div className="inline-flex items-center gap-1.5 text-primary text-xs font-semibold tracking-wide">
                    <MaterialIcon name="auto_awesome" className="text-[15px]" />
                    <span>Clinical AI Intelligence</span>
                  </div>
                  <h1 className="text-[28px] sm:text-[34px] leading-[1.2] font-semibold text-on-surface tracking-tight text-balance">
                    Your Time Matters.
                    <br />
                    <span className="text-primary">Book Smarter with AI.</span>
                  </h1>
                  <p className="text-sm text-on-surface-variant leading-relaxed max-w-xl">
                    Discover trusted healthcare professionals, explore medical specialties, and book
                    appointments effortlessly with intelligent AI assistance.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        firebaseUser ? onNavigate('dashboard') : setActiveTab('register')
                      }
                      className="w-full py-3 px-4 rounded-xl bg-primary text-on-primary text-sm font-semibold shadow-sm hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <span>{firebaseUser ? 'Open Dashboard' : 'Get Started (Register)'}</span>
                      <MaterialIcon name="arrow_forward" className="text-[18px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('specialties')}
                      className="w-full py-3 px-4 rounded-xl bg-surface-container-lowest text-secondary text-sm font-semibold shadow-sm hover:bg-surface-container active:scale-[0.99] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <MaterialIcon name="stethoscope" className="text-[18px]" />
                      <span>Explore Doctors</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Popular Specialties Strip */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-on-surface">Popular Specialties</h2>
                  <button
                    type="button"
                    onClick={() => onNavigate('specialties')}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {specialties.length} Available
                  </button>
                </div>
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                  {specialties.slice(0, 6).map((spec, idx) => (
                    <button
                      key={spec.slug}
                      type="button"
                      onClick={() => onSelectSpecialty(spec.slug)}
                      className={`shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                        idx === 0
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container'
                      }`}
                    >
                      <MaterialIcon
                        name={spec.iconName}
                        className={`text-[16px] ${idx === 0 ? 'text-on-primary' : 'text-primary'}`}
                      />
                      <span>{spec.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Top Rated Specialists */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-on-surface">Top Rated Specialists</h2>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSpecialty('all');
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View All
                  </button>
                </div>

                {featuredDoctors.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <AvatarImage
                        src={doc.avatarUrl}
                        alt={doc.name}
                        fallbackText={doc.name}
                        className="w-14 h-14 rounded-full object-cover shadow-sm shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectDoctor(doc)}
                            className="text-base font-semibold text-on-surface hover:text-primary truncate text-left"
                          >
                            {doc.name}
                          </button>
                          <div className="flex items-center gap-1 text-xs font-semibold text-on-surface tabular-nums shrink-0">
                            <MaterialIcon
                              name="star"
                              filled
                              className="text-[15px] text-amber-500"
                            />
                            <span>{doc.rating}</span>
                          </div>
                        </div>
                        <p className="text-sm text-secondary truncate">{doc.title}</p>
                        <p className="text-xs text-on-surface-variant mt-1">
                          Board Certified · {doc.yearsExp}+ yrs exp · {doc.clinicName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                      {['09:30 AM', '11:00 AM', '02:30 PM'].map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => onStartBooking(doc, slot)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                            slot === '02:30 PM'
                              ? 'bg-primary-fixed text-on-primary-fixed-variant font-semibold'
                              : 'bg-surface-container-low text-on-surface hover:bg-primary hover:text-on-primary'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: MediBot Predictive Slot Matcher + Quick Auth Card */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm">
                      <MaterialIcon name="smart_toy" className="text-[20px]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-on-surface">
                        MediBot AI Assistant
                      </div>
                      <div className="text-xs text-primary">Triage engine ready</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary tabular-nums">
                    98% Match
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container-low flex items-start gap-2.5">
                  <MaterialIcon name="psychology" className="text-primary text-[20px] mt-0.5" />
                  <p className="text-sm text-on-surface leading-snug">
                    “Based on real-time clinic cancellations, we found expedited openings across
                    Dermatology and Cardiology today.”
                  </p>
                </div>

                {featuredDoctors[0] && (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-tertiary-fixed/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <MaterialIcon
                        name="calendar_today"
                        className="text-tertiary text-[18px] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-on-surface truncate">
                          {featuredDoctors[0].nextSlotLabel}
                        </div>
                        <div className="text-xs text-secondary truncate">
                          {featuredDoctors[0].name} · In-Clinic or Telehealth
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartBooking(featuredDoctors[0], '02:30 PM')}
                      className="px-3 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold shadow-sm hover:bg-primary-container active:scale-95 transition-all whitespace-nowrap shrink-0"
                    >
                      1-Click Reserve
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1">
                  <span className="flex items-center gap-1">
                    <MaterialIcon name="verified_user" className="text-[14px] text-primary" />
                    HIPAA Verified
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('medibot')}
                    className="text-primary font-semibold flex items-center gap-0.5 hover:underline"
                  >
                    <span>Open MediBot Chat</span>
                    <MaterialIcon name="chevron_right" className="text-[16px]" />
                  </button>
                </div>
              </div>

              {/* Instant Sign-In CTA Card */}
              <div className="rounded-2xl bg-surface-container-low p-5 flex flex-col gap-3">
                <h3 className="text-base font-semibold text-on-surface">
                  Sync Your Patient Portal
                </h3>
                <p className="text-sm text-on-surface-variant">
                  Sign in with Google to persist bookings, digital check-in passes, saved
                  specialists, and MediBot triage history in your private patient record.
                </p>
                <button
                  type="button"
                  disabled={signingIn}
                  onClick={() => handleGoogleAuth(false)}
                  className="w-full py-3 px-4 rounded-xl bg-surface-container-lowest text-on-surface font-semibold text-sm shadow-sm hover:bg-surface-container transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
                >
                  <GoogleGlyph />
                  <span>{signingIn ? 'Connecting...' : 'Continue with Google'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === 'register' && (
          <div className="max-w-md mx-auto rounded-2xl bg-surface-container-lowest p-6 shadow-md mt-2">
            <div className="mb-5">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                Step 1 of 1 · Instant Verified Access
              </div>
              <h2 className="text-2xl font-semibold text-on-surface">Create Your Account</h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Get immediate AI triage, rapid slot matching, and automated clinical passes.
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Full Name</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface-container-low">
                  <MaterialIcon name="person" className="text-secondary text-[20px]" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Priya Sharma"
                    className="w-full bg-transparent text-on-surface text-sm outline-none placeholder:text-outline"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Phone Number</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface-container-low">
                  <MaterialIcon name="call" className="text-secondary text-[20px]" />
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full bg-transparent text-on-surface text-sm outline-none placeholder:text-outline"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Insurance Network</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface-container-low">
                  <MaterialIcon name="verified_user" className="text-secondary text-[20px]" />
                  <input
                    type="text"
                    value={regInsurance}
                    onChange={(e) => setRegInsurance(e.target.value)}
                    placeholder="Aetna / BlueCross Verified"
                    className="w-full bg-transparent text-on-surface text-sm outline-none placeholder:text-outline"
                  />
                </div>
              </div>

              <p className="text-xs text-on-surface-variant">
                By creating an account with Google, your patient profile is secured with 256-bit
                encryption and synced directly to Cloud SQL.
              </p>

              <button
                type="button"
                disabled={signingIn}
                onClick={() => handleGoogleAuth(true)}
                className="w-full py-3 px-4 rounded-xl bg-primary text-on-primary text-sm font-semibold shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 mt-1 disabled:opacity-60"
              >
                <GoogleGlyph whiteBg />
                <span>{signingIn ? 'Creating Patient Account...' : 'Create Account with Google'}</span>
              </button>

              <div className="text-center mt-2">
                <span className="text-sm text-on-surface-variant">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-sm text-primary font-semibold hover:underline"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SIGN IN */}
        {activeTab === 'login' && (
          <div className="max-w-md mx-auto rounded-2xl bg-surface-container-lowest p-6 shadow-md mt-2">
            <div className="mb-5">
              <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shadow-sm mb-3">
                <MaterialIcon name="lock_open" className="text-[26px]" />
              </div>
              <h2 className="text-2xl font-semibold text-on-surface">Welcome Back</h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Access your patient appointments, digital check-in passes, and MediBot triage
                consultations.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-surface-container-lowest text-primary flex items-center justify-center shrink-0 shadow-sm">
                <MaterialIcon name="verified_user" filled className="text-[20px]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-primary">256-Bit HIPAA Encrypted</div>
                <div className="text-xs text-on-surface-variant">
                  Protected Google Sign-In powered by Firebase Auth
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={signingIn}
              onClick={() => handleGoogleAuth(false)}
              className="w-full py-3.5 px-4 rounded-xl bg-primary text-on-primary text-sm font-semibold shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
            >
              <GoogleGlyph whiteBg />
              <span>{signingIn ? 'Authenticating...' : 'Sign In with Google'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="w-full mt-3 py-2.5 px-4 rounded-xl bg-surface-container-low text-on-surface text-sm font-medium hover:bg-surface-container transition-colors"
            >
              Browse Specialists as Guest
            </button>

            <div className="text-center mt-4">
              <span className="text-sm text-on-surface-variant">New to MediSlot AI? </span>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-sm text-primary font-semibold hover:underline"
              >
                Register now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const GoogleGlyph: React.FC<{ whiteBg?: boolean }> = ({ whiteBg }) => (
  <span
    className={`inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${
      whiteBg ? 'bg-white p-0.5' : ''
    }`}
  >
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.675-5.17 3.675-9.15z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.25v3.15C3.26 21.36 7.34 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24 0-.75.13-1.52.38-2.24V6.61H1.25C.45 8.22 0 10.05 0 12c0 1.95.45 3.78 1.25 5.39l4.02-3.15z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
        fill="#EA4335"
      />
    </svg>
  </span>
);
