import React, { useEffect, useState } from 'react';
import {
  AvatarImage,
  DEFAULT_PATIENT_AVATAR_URL,
  MaterialIcon,
} from '../components/CommonUI';
import { useAuth } from '../context/AuthContext';
import { Doctor, ScreenRoute } from '../types';

interface ProfileScreenProps {
  doctors: Doctor[];
  favoriteDoctorIds: number[];
  onSelectDoctor: (doctor: Doctor) => void;
  onNavigate: (route: ScreenRoute) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  doctors,
  favoriteDoctorIds,
  onSelectDoctor,
  onNavigate,
}) => {
  const { firebaseUser, profile, authFetch, refreshProfile, signOutUser, signInWithGoogle } =
    useAuth();
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [insuranceProvider, setInsuranceProvider] = useState(
    profile?.insuranceProvider || 'Aetna / BlueCross Verified'
  );
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setPhone(profile.phone);
      setInsuranceProvider(profile.insuranceProvider);
    }
  }, [profile]);

  const savedDoctors = doctors.filter((d) => favoriteDoctorIds.includes(d.id));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    try {
      const res = await authFetch('/api/me', {
        method: 'PUT',
        body: JSON.stringify({ fullName, phone, insuranceProvider }),
      });
      if (res.ok) {
        await refreshProfile();
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!firebaseUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm flex flex-col items-center gap-4">
          <MaterialIcon name="account_circle" className="text-[48px] text-primary" />
          <h2 className="text-xl font-bold text-on-surface">Patient Account</h2>
          <p className="text-sm text-on-surface-variant">
            Sign in with Google to manage your contact info, insurance provider, and saved
            specialists.
          </p>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="w-full py-3 rounded-xl bg-primary text-on-primary text-sm font-semibold"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-6">
      {/* Patient Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <AvatarImage
            src={profile?.avatarUrl || firebaseUser.photoURL || DEFAULT_PATIENT_AVATAR_URL}
            alt={profile?.fullName || 'Patient'}
            fallbackText={profile?.fullName || 'PS'}
            className="w-16 h-16 rounded-full object-cover shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-on-surface truncate">
              {profile?.fullName || firebaseUser.displayName}
            </h2>
            <p className="text-sm text-secondary truncate">{profile?.email}</p>
            <p className="text-xs text-primary font-semibold mt-0.5">
              Med ID {profile?.medId || '#8841-P'} · Verified Patient
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOutUser();
            onNavigate('welcome');
          }}
          className="px-3.5 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-error-container hover:text-on-error-container transition-colors shrink-0"
        >
          Sign Out
        </button>
      </div>

      {/* Edit Form */}
      <form
        onSubmit={handleSave}
        className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-on-surface">Personal &amp; Insurance Info</h3>
          {savedNotice && <span className="text-xs font-semibold text-primary">Profile saved</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 234-5678"
              className="px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface">Insurance Network</label>
          <input
            type="text"
            value={insuranceProvider}
            onChange={(e) => setInsuranceProvider(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="self-start px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Saved Specialists */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col gap-3">
        <h3 className="text-base font-bold text-on-surface">
          Saved Specialists ({savedDoctors.length})
        </h3>
        {savedDoctors.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            Tap the heart icon on any doctor&apos;s profile to save them here for rapid re-booking.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savedDoctors.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => onSelectDoctor(doc)}
                className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center gap-3 text-left transition-colors"
              >
                <AvatarImage
                  src={doc.avatarUrl}
                  alt={doc.name}
                  fallbackText={doc.name}
                  className="w-11 h-11 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-on-surface truncate">{doc.name}</div>
                  <div className="text-xs text-secondary truncate">{doc.specialtyName}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
