import React, { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_PATIENT_AVATAR_URL,
  MaterialIcon,
  MobileBottomNav,
  TopAppHeader,
} from './components/CommonUI';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookingConfirmedScreen } from './screens/BookingConfirmedScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { DoctorProfileScreen } from './screens/DoctorProfileScreen';
import { DoctorsListingScreen } from './screens/DoctorsListingScreen';
import { MediBotScreen } from './screens/MediBotScreen';
import { MyAppointmentsScreen } from './screens/MyAppointmentsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ReviewBookingScreen } from './screens/ReviewBookingScreen';
import { ScheduleScreen } from './screens/ScheduleScreen';
import { SpecialtiesScreen } from './screens/SpecialtiesScreen';
import { WelcomePortalScreen } from './screens/WelcomePortalScreen';
import { Appointment, BookingDraft, Doctor, ScreenRoute, Specialty } from './types';

function MediSlotShell() {
  const { firebaseUser, profile, loading: authLoading, authFetch } = useAuth();

  const [routeStack, setRouteStack] = useState<ScreenRoute[]>(['dashboard']);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [selectedSpecialtySlug, setSelectedSpecialtySlug] = useState<string>('dermatology');
  const [doctorSearchQuery, setDoctorSearchQuery] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [preselectedTime, setPreselectedTime] = useState<string>('02:30 PM');
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const currentRoute = routeStack[routeStack.length - 1];

  const navigate = useCallback((next: ScreenRoute) => {
    setRouteStack((prev) => {
      if (['dashboard', 'specialties', 'medibot', 'appointments', 'welcome'].includes(next)) {
        return [next];
      }
      return [...prev, next];
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goBack = useCallback(() => {
    setRouteStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : ['dashboard']));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Load public catalog on mount
  useEffect(() => {
    let active = true;
    const loadCatalog = async () => {
      try {
        const [specRes, docRes] = await Promise.all([
          fetch('/api/specialties'),
          fetch('/api/doctors'),
        ]);
        if (specRes.ok) {
          const sData: Specialty[] = await specRes.json();
          if (active) setSpecialties(sData);
        }
        if (docRes.ok) {
          const dData: Doctor[] = await docRes.json();
          if (active) {
            setDoctors(dData);
            if (!selectedDoctor && dData.length > 0) {
              setSelectedDoctor(dData[0]);
            }
          }
        }
      } finally {
        if (active) setLoadingCatalog(false);
      }
    };
    loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  // Load authenticated user appointments and favorites
  const refreshUserData = useCallback(async () => {
    if (!firebaseUser) {
      setAppointments([]);
      setFavoriteIds([]);
      return;
    }
    setLoadingAppointments(true);
    try {
      const [apptsRes, favsRes] = await Promise.all([
        authFetch('/api/appointments'),
        authFetch('/api/favorites'),
      ]);
      if (apptsRes.ok) {
        const appts: Appointment[] = await apptsRes.json();
        setAppointments(appts);
      }
      if (favsRes.ok) {
        const favs: number[] = await favsRes.json();
        setFavoriteIds(favs);
      }
    } finally {
      setLoadingAppointments(false);
    }
  }, [firebaseUser, authFetch]);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  // If user is not signed in initially after auth finishes loading, start on WelcomePortal
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);
  useEffect(() => {
    if (!authLoading && !initialRedirectDone) {
      setInitialRedirectDone(true);
      if (!firebaseUser) {
        setRouteStack(['welcome']);
      }
    }
  }, [authLoading, firebaseUser, initialRedirectDone]);

  const handleSelectSpecialty = (slug: string) => {
    setSelectedSpecialtySlug(slug);
    setDoctorSearchQuery('');
    navigate('doctors');
  };

  const handleSearchFromDashboard = (query: string) => {
    setSelectedSpecialtySlug('all');
    setDoctorSearchQuery(query);
    navigate('doctors');
  };

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    navigate('doctor-profile');
  };

  const handleStartBooking = (doctor: Doctor, slot?: string) => {
    setSelectedDoctor(doctor);
    setPreselectedTime(slot || '02:30 PM');
    setRescheduleAppointmentId(null);
    navigate('schedule');
  };

  const handleToggleFavorite = async (doctorId: number) => {
    if (!firebaseUser) {
      navigate('welcome');
      return;
    }
    const res = await authFetch(`/api/favorites/${doctorId}`, { method: 'POST' });
    if (res.ok) {
      const { favorited } = await res.json();
      setFavoriteIds((prev) =>
        favorited ? Array.from(new Set([...prev, doctorId])) : prev.filter((id) => id !== doctorId)
      );
    }
  };

  const handleConfirmBooking = async (draft: BookingDraft) => {
    if (rescheduleAppointmentId) {
      const res = await authFetch(`/api/appointments/${rescheduleAppointmentId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          appointmentDate: draft.appointmentDate,
          appointmentTime: draft.appointmentTime,
          patientNote: draft.patientNote,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to reschedule appointment');
      }
      await refreshUserData();
      const updatedAppt = appointments.find((a) => a.id === rescheduleAppointmentId);
      setConfirmedAppointment(
        updatedAppt
          ? {
              ...updatedAppt,
              appointmentDate: draft.appointmentDate,
              appointmentTime: draft.appointmentTime,
              patientNote: draft.patientNote,
            }
          : null
      );
      setRescheduleAppointmentId(null);
      navigate('confirmed');
      return;
    }

    const res = await authFetch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        doctorId: draft.doctor.id,
        patientName: profile?.fullName || firebaseUser?.displayName || 'Patient',
        patientEmail: profile?.email || firebaseUser?.email || '',
        patientPhone: profile?.phone || '+1 (555) 234-5678',
        appointmentDate: draft.appointmentDate,
        appointmentTime: draft.appointmentTime,
        visitFormat: draft.visitFormat,
        patientNote: draft.patientNote,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to confirm appointment');
    }

    const created: Appointment = await res.json();
    setConfirmedAppointment(created);
    await refreshUserData();
    navigate('confirmed');
  };

  const handleCancelAppointment = async (appointmentId: number) => {
    const res = await authFetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
    });
    if (res.ok) {
      await refreshUserData();
    }
  };

  const handleRescheduleAppointment = (appt: Appointment) => {
    const doc = doctors.find((d) => d.id === appt.doctorId);
    if (!doc) return;
    setSelectedDoctor(doc);
    setPreselectedTime(appt.appointmentTime);
    setRescheduleAppointmentId(appt.id);
    navigate('schedule');
  };

  const isTabScreen = ['dashboard', 'specialties', 'medibot', 'appointments'].includes(
    currentRoute
  );
  const isWelcomeScreen = currentRoute === 'welcome';

  const stackTitles: Partial<Record<ScreenRoute, string>> = {
    doctors: 'Doctors Listing',
    'doctor-profile': 'Doctor Profile',
    schedule: 'Appointment Booking',
    review: 'Review Appointment',
    confirmed: 'Booking Confirmation',
    profile: 'Patient Profile',
  };

  if (loadingCatalog) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-secondary">Loading MediSlot AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      {!isWelcomeScreen && (
        <TopAppHeader
          mode={isTabScreen ? 'tab' : 'stack'}
          title={stackTitles[currentRoute] || 'MediSlot AI'}
          activeRoute={currentRoute}
          onNavigate={navigate}
          onBack={goBack}
          avatarUrl={profile?.avatarUrl || firebaseUser?.photoURL || DEFAULT_PATIENT_AVATAR_URL}
          isAuthenticated={!!firebaseUser}
          onNotificationsClick={() => setShowNotifications((v) => !v)}
        />
      )}

      {/* Notifications Popover */}
      {showNotifications && !isWelcomeScreen && (
        <div className="fixed top-16 right-4 z-50 w-80 bg-surface-container-lowest rounded-2xl shadow-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-on-surface">Health Alerts</span>
            <button
              type="button"
              onClick={() => setShowNotifications(false)}
              className="text-xs font-semibold text-primary"
            >
              Close
            </button>
          </div>
          {appointments
            .filter((a) => a.status === 'confirmed' || a.status === 'scheduled')
            .slice(0, 2)
            .map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setConfirmedAppointment(a);
                  setShowNotifications(false);
                  navigate('confirmed');
                }}
                className="p-3 rounded-xl bg-surface-container-low text-left hover:bg-surface-container transition-colors"
              >
                <div className="text-xs font-semibold text-primary">
                  Pass Ready · #{a.bookingRef}
                </div>
                <div className="text-xs text-on-surface mt-0.5">
                  {a.doctorName} · {a.appointmentDate} at {a.appointmentTime}
                </div>
              </button>
            ))}
          {appointments.filter((a) => a.status === 'confirmed' || a.status === 'scheduled')
            .length === 0 && (
            <p className="text-xs text-on-surface-variant">No active check-in alerts.</p>
          )}
        </div>
      )}

      <main
        className={`flex-1 w-full ${
          isWelcomeScreen ? '' : isTabScreen ? 'pt-16 pb-20 md:pb-8' : 'pt-16 pb-8'
        }`}
      >
        {currentRoute === 'welcome' && (
          <WelcomePortalScreen
            doctors={doctors}
            specialties={specialties}
            onNavigate={navigate}
            onSelectSpecialty={handleSelectSpecialty}
            onSelectDoctor={handleSelectDoctor}
            onStartBooking={handleStartBooking}
          />
        )}

        {currentRoute === 'dashboard' && (
          <DashboardScreen
            doctors={doctors}
            specialties={specialties}
            appointments={appointments}
            onNavigate={navigate}
            onSelectSpecialty={handleSelectSpecialty}
            onSelectDoctor={handleSelectDoctor}
            onStartBooking={(doc) => handleStartBooking(doc)}
            onSearchSubmit={handleSearchFromDashboard}
            onOpenAppointmentPass={(appt) => {
              setConfirmedAppointment(appt);
              navigate('confirmed');
            }}
            onRescheduleAppointment={handleRescheduleAppointment}
          />
        )}

        {currentRoute === 'specialties' && (
          <SpecialtiesScreen
            specialties={specialties}
            onSelectSpecialty={handleSelectSpecialty}
            onNavigate={navigate}
          />
        )}

        {currentRoute === 'doctors' && (
          <DoctorsListingScreen
            doctors={doctors}
            specialties={specialties}
            selectedSpecialtySlug={selectedSpecialtySlug}
            initialSearchQuery={doctorSearchQuery}
            onChangeSpecialty={setSelectedSpecialtySlug}
            onSelectDoctor={handleSelectDoctor}
            onStartBooking={(doc) => handleStartBooking(doc)}
            onBackToSpecialties={() => navigate('specialties')}
          />
        )}

        {currentRoute === 'doctor-profile' && selectedDoctor && (
          <DoctorProfileScreen
            doctor={selectedDoctor}
            isFavorited={favoriteIds.includes(selectedDoctor.id)}
            onToggleFavorite={handleToggleFavorite}
            onBack={goBack}
            onProceedToSchedule={(doc, slot) => handleStartBooking(doc, slot)}
          />
        )}

        {currentRoute === 'schedule' && selectedDoctor && (
          <ScheduleScreen
            doctor={selectedDoctor}
            initialTime={preselectedTime}
            onProceedToReview={(draft) => {
              setBookingDraft(draft);
              navigate('review');
            }}
          />
        )}

        {currentRoute === 'review' && bookingDraft && (
          <ReviewBookingScreen
            draft={bookingDraft}
            rescheduleAppointmentId={rescheduleAppointmentId}
            onChangeSlot={goBack}
            onConfirmBooking={handleConfirmBooking}
          />
        )}

        {currentRoute === 'confirmed' && confirmedAppointment && (
          <BookingConfirmedScreen
            appointment={confirmedAppointment}
            onNavigate={navigate}
          />
        )}

        {currentRoute === 'appointments' && (
          <MyAppointmentsScreen
            appointments={appointments}
            loadingAppointments={loadingAppointments}
            onNavigate={navigate}
            onOpenPass={(appt) => {
              setConfirmedAppointment(appt);
              navigate('confirmed');
            }}
            onReschedule={handleRescheduleAppointment}
            onCancelAppointment={handleCancelAppointment}
          />
        )}

        {currentRoute === 'medibot' && (
          <MediBotScreen
            doctors={doctors}
            onSelectDoctor={handleSelectDoctor}
            onReserveDoctorSlot={handleStartBooking}
          />
        )}

        {currentRoute === 'profile' && (
          <ProfileScreen
            doctors={doctors}
            favoriteDoctorIds={favoriteIds}
            onSelectDoctor={handleSelectDoctor}
            onNavigate={navigate}
          />
        )}
      </main>

      {isTabScreen && (
        <MobileBottomNav activeRoute={currentRoute} onNavigate={navigate} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MediSlotShell />
    </AuthProvider>
  );
}
