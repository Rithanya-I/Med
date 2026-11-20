import React, { useMemo, useState } from 'react';
import { AvatarImage, MaterialIcon } from '../components/CommonUI';
import { useAuth } from '../context/AuthContext';
import { Appointment, ScreenRoute } from '../types';

interface MyAppointmentsScreenProps {
  appointments: Appointment[];
  loadingAppointments: boolean;
  onNavigate: (route: ScreenRoute) => void;
  onOpenPass: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: number) => Promise<void>;
}

export const MyAppointmentsScreen: React.FC<MyAppointmentsScreenProps> = ({
  appointments,
  loadingAppointments,
  onNavigate,
  onOpenPass,
  onReschedule,
  onCancelAppointment,
}) => {
  const { firebaseUser, signInWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const grouped = useMemo(() => {
    const upcoming = appointments.filter(
      (a) => a.status === 'confirmed' || a.status === 'scheduled'
    );
    const completed = appointments.filter((a) => a.status === 'completed');
    const cancelled = appointments.filter((a) => a.status === 'cancelled');
    return { upcoming, completed, cancelled };
  }, [appointments]);

  const currentList = grouped[activeTab];

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await onCancelAppointment(cancelTarget.id);
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  };

  if (!firebaseUser) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
            <MaterialIcon name="calendar_month" className="text-[28px]" />
          </div>
          <h2 className="text-xl font-bold text-on-surface">Sign In to Manage Bookings</h2>
          <p className="text-sm text-on-surface-variant">
            Your upcoming consultations, digital check-in passes, and rescheduling options are
            securely synced to your patient account.
          </p>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="px-6 py-3 rounded-xl bg-primary text-on-primary text-sm font-semibold shadow-sm hover:bg-primary-container transition-colors"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-5">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
            <MaterialIcon name="calendar_today" filled className="text-[20px]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-on-surface leading-tight">My Appointments</h1>
            <p className="text-xs text-on-surface-variant">
              Manage visits &amp; real-time digital passes
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('specialties')}
          className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-sm hover:bg-primary-container active:scale-95 transition-all whitespace-nowrap"
        >
          <MaterialIcon name="add" className="text-[18px]" />
          <span>New Booking</span>
        </button>
      </div>

      {/* Priority Check-in Banner */}
      {grouped.upcoming[0] && (
        <div className="rounded-2xl bg-gradient-to-r from-secondary-container via-surface-container-low to-secondary-container p-4 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-on-secondary-container text-surface-container-lowest flex items-center justify-center shrink-0">
            <MaterialIcon name="schedule" className="text-[18px]" />
          </div>
          <div>
            <span className="text-xs font-semibold text-on-secondary-container block">
              Priority Check-in
            </span>
            <p className="text-sm text-on-surface mt-0.5">
              Digital check-in for{' '}
              <strong className="text-primary">{grouped.upcoming[0].doctorName}</strong> opens 30
              minutes before your {grouped.upcoming[0].appointmentTime} slot.
            </p>
          </div>
        </div>
      )}

      {/* Segmented Tabs */}
      <div className="grid grid-cols-3 p-1 bg-surface-container rounded-xl shadow-inner gap-1">
        {(
          [
            { key: 'upcoming', label: 'Upcoming', count: grouped.upcoming.length },
            { key: 'completed', label: 'Completed', count: grouped.completed.length },
            { key: 'cancelled', label: 'Cancelled', count: grouped.cancelled.length },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                active
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums ${
                  active
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Appointments List */}
      {loadingAppointments ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-44 rounded-2xl bg-surface-container-lowest animate-pulse p-5" />
          ))}
        </div>
      ) : currentList.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl p-8 text-center shadow-sm">
          <MaterialIcon name="event_note" className="text-[36px] text-secondary mb-2" />
          <p className="text-base font-semibold text-on-surface">
            No {activeTab} appointments
          </p>
          <p className="text-sm text-on-surface-variant mt-1 mb-4">
            {activeTab === 'upcoming'
              ? 'Book a consultation with any verified specialist or ask MediBot AI.'
              : `Your ${activeTab} visit history will appear here.`}
          </p>
          {activeTab === 'upcoming' && (
            <button
              type="button"
              onClick={() => onNavigate('specialties')}
              className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold"
            >
              Browse Specialties
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {currentList.map((appt) => (
            <div
              key={appt.id}
              className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col gap-4"
            >
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`font-semibold uppercase tracking-wide ${
                    appt.status === 'cancelled'
                      ? 'text-error'
                      : appt.status === 'completed'
                      ? 'text-secondary'
                      : 'text-primary'
                  }`}
                >
                  {appt.status} · {appt.visitFormat}
                </span>
                <span className="font-mono text-on-surface-variant tabular-nums">
                  #{appt.bookingRef}
                </span>
              </div>

              <div className="flex items-start gap-3.5">
                <AvatarImage
                  src={appt.doctorAvatarUrl}
                  alt={appt.doctorName}
                  fallbackText={appt.doctorName}
                  className="w-14 h-14 rounded-xl object-cover shadow-sm shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-on-surface truncate">
                    {appt.doctorName}, {appt.doctorCredentials}
                  </h2>
                  <p className="text-sm text-primary font-medium truncate">
                    {appt.doctorSpecialty} · {appt.doctorTitle}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-on-surface-variant tabular-nums">
                    <MaterialIcon name="star" filled className="text-[14px] text-amber-500" />
                    <span className="font-semibold text-on-surface">{appt.doctorRating}</span>
                    <span>({appt.doctorReviewCount} reviews)</span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-low rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shrink-0 shadow-xs">
                    <MaterialIcon name="access_time" className="text-[17px]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-on-surface-variant block">
                      Date &amp; Time Slot
                    </span>
                    <span className="text-xs font-semibold text-on-surface block truncate tabular-nums">
                      {appt.appointmentDate} · {appt.appointmentTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-tertiary shrink-0 shadow-xs">
                    <MaterialIcon name="location_on" className="text-[17px]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-on-surface-variant block">Clinic</span>
                    <span className="text-xs font-semibold text-on-surface block truncate">
                      {appt.doctorClinicName}
                    </span>
                  </div>
                </div>
              </div>

              {appt.status !== 'cancelled' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onOpenPass(appt)}
                      className="flex-1 bg-primary text-on-primary py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary-container transition-colors"
                    >
                      <MaterialIcon name="badge" className="text-[18px]" />
                      <span>View Details &amp; Pass</span>
                    </button>
                    {appt.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => onReschedule(appt)}
                        className="bg-surface-container-low text-on-surface py-2.5 px-4 rounded-xl text-xs font-semibold hover:bg-surface-container transition-colors"
                      >
                        Reschedule
                      </button>
                    )}
                  </div>
                  {appt.status !== 'completed' && (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => setCancelTarget(appt)}
                        className="text-xs text-error hover:underline py-1 font-medium"
                      >
                        Cancel Appointment
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Policy Guarantee Card */}
      <div className="bg-surface-container-low/70 rounded-2xl p-4 flex items-start gap-3">
        <MaterialIcon name="verified_user" className="text-[20px] text-tertiary mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-on-surface">Flexible Patient Policy</h3>
          <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
            Zero cancellation fees apply when notified 4 hours in advance. Need urgent care? Call
            911 immediately.
          </p>
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center">
                <MaterialIcon name="event_busy" className="text-[22px]" />
              </div>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                aria-label="Close modal"
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                <MaterialIcon name="close" className="text-[18px]" />
              </button>
            </div>

            <div>
              <h4 className="text-lg font-bold text-on-surface">Cancel Appointment?</h4>
              <p className="text-sm text-on-surface-variant mt-1">
                Are you sure you want to cancel your visit with{' '}
                <strong className="text-on-surface">{cancelTarget.doctorName}</strong> (
                {cancelTarget.appointmentDate} at {cancelTarget.appointmentTime}) for{' '}
                <span className="font-mono font-semibold">#{cancelTarget.bookingRef}</span>?
              </p>
            </div>

            <div className="p-3 bg-surface-container-low rounded-xl flex items-start gap-2 text-xs text-on-surface-variant">
              <MaterialIcon name="info" className="text-[18px] text-primary shrink-0" />
              <span>
                <strong className="text-on-surface">Zero cancellation fees apply</strong> when
                notified at least 4 hours before your slot.
              </span>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="w-full py-2.5 bg-error text-on-error rounded-xl text-sm font-semibold disabled:opacity-60"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel Appointment'}
              </button>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="w-full py-2.5 bg-surface-container-low text-on-surface rounded-xl text-sm font-semibold hover:bg-surface-container"
              >
                Keep Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
