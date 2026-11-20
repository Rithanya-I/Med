import React, { useEffect, useState } from 'react';
import { AvatarImage, MaterialIcon } from '../components/CommonUI';
import { useAuth } from '../context/AuthContext';
import { BookingDraft } from '../types';

interface ReviewBookingScreenProps {
  draft: BookingDraft;
  rescheduleAppointmentId?: number | null;
  onChangeSlot: () => void;
  onConfirmBooking: (updatedDraft: BookingDraft) => Promise<void>;
}

export const ReviewBookingScreen: React.FC<ReviewBookingScreenProps> = ({
  draft,
  rescheduleAppointmentId,
  onChangeSlot,
  onConfirmBooking,
}) => {
  const { profile, firebaseUser, signInWithGoogle } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(9 * 60 + 42);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [note, setNote] = useState(draft.patientNote);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0');
  const secs = (secondsLeft % 60).toString().padStart(2, '0');

  const { doctor } = draft;
  const insuranceDiscount = Math.max(0, doctor.consultationFee - doctor.insuranceCopay);

  const handleConfirm = async () => {
    setErrorMsg(null);
    if (!firebaseUser) {
      const prof = await signInWithGoogle();
      if (!prof) return;
    }
    setSubmitting(true);
    try {
      await onConfirmBooking({ ...draft, patientNote: note });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not confirm booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-28 flex flex-col gap-5">
      {/* Progress Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
            <MaterialIcon name="auto_awesome" className="text-[15px]" />
            MediSlot Smart Match Verified
          </span>
          <span className="text-on-surface-variant font-medium">Step 2 of 2</span>
        </div>
        <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
          <div className="bg-primary h-full w-full rounded-full" />
        </div>
        <div className="flex justify-between items-center text-xs font-semibold text-primary">
          <span>1. Slot Reserved</span>
          <span>2. Final Review</span>
        </div>
      </div>

      {/* Hold Timer */}
      <div className="bg-surface-container-low rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
            <MaterialIcon name="lock_clock" className="text-[18px]" />
          </div>
          <div>
            <span className="text-xs font-semibold text-on-surface block">Slot Held For You</span>
            <span className="text-xs text-on-surface-variant">
              Expires in <strong className="text-primary tabular-nums">{mins}:{secs}</strong>
            </span>
          </div>
        </div>
        <span className="text-xs font-semibold text-primary">Live Lock</span>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-sm font-medium">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Doctor & Clinic Summary */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <AvatarImage
                src={doctor.avatarUrl}
                alt={doctor.name}
                fallbackText={doctor.name}
                className="w-16 h-16 rounded-full object-cover shrink-0 shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-on-surface truncate">
                  {doctor.name}, {doctor.credentials}
                </h2>
                <p className="text-sm text-on-surface-variant truncate">{doctor.title}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs tabular-nums">
                  <span className="flex items-center gap-0.5 font-semibold text-on-surface">
                    <MaterialIcon name="star" filled className="text-[15px] text-amber-500" />
                    {doctor.rating} ({doctor.reviewCount})
                  </span>
                  <span className="text-outline">·</span>
                  <span className="text-primary font-semibold">In-Network</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-xl p-3 flex items-start gap-2.5">
              <MaterialIcon name="domain" className="text-[20px] text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-semibold text-on-surface block truncate">
                  {doctor.clinicName}
                </span>
                <span className="text-xs text-on-surface-variant block">
                  {doctor.clinicAddress}
                </span>
              </div>
            </div>
          </div>

          {/* Schedule Details */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MaterialIcon name="calendar_month" className="text-primary text-[20px]" />
                <h3 className="text-base font-semibold text-on-surface">Schedule Details</h3>
              </div>
              <button
                type="button"
                onClick={onChangeSlot}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Change
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-low rounded-xl p-3">
                <span className="text-[11px] uppercase font-semibold text-on-surface-variant block">
                  Date
                </span>
                <span className="text-sm font-semibold text-on-surface mt-0.5 block">
                  {draft.appointmentDate}
                </span>
              </div>
              <div className="bg-surface-container-low rounded-xl p-3">
                <span className="text-[11px] uppercase font-semibold text-on-surface-variant block">
                  Time
                </span>
                <span className="text-sm font-semibold text-on-surface mt-0.5 block tabular-nums">
                  {draft.appointmentTime} (30 min)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                <MaterialIcon
                  name={draft.visitFormat === 'Telehealth' ? 'videocam' : 'stethoscope'}
                  className="text-[16px]"
                />
              </div>
              <div>
                <span className="text-xs font-semibold text-on-surface block">
                  {draft.visitFormat === 'Telehealth'
                    ? 'Telehealth Video Visit'
                    : 'In-Clinic Consultation'}
                </span>
                <span className="text-xs text-on-surface-variant">
                  Please arrive or join 10 minutes early for digital check-in.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Patient Info & Editable Note */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MaterialIcon name="badge" className="text-primary text-[20px]" />
                <h3 className="text-base font-semibold text-on-surface">Patient Information</h3>
              </div>
              <span className="text-xs font-semibold text-secondary">Self</span>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-on-surface-variant">Full Name</span>
                <span className="font-semibold text-on-surface">
                  {profile?.fullName || firebaseUser?.displayName || 'Patient (Sign in to confirm)'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-on-surface-variant">Phone</span>
                <span className="font-medium text-on-surface">
                  {profile?.phone || '+1 (555) 234-5678'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-on-surface-variant">Email</span>
                <span className="font-medium text-on-surface truncate max-w-[200px]">
                  {profile?.email || firebaseUser?.email || 'Sign in with Google'}
                </span>
              </div>
            </div>

            <div className="mt-1 bg-surface-container-low rounded-xl p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase">
                  Note to Clinic
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingNote((v) => !v)}
                  className="text-primary text-xs font-semibold flex items-center gap-1 hover:underline"
                >
                  <MaterialIcon name="edit" className="text-[14px]" />
                  <span>{isEditingNote ? 'Save' : 'Edit'}</span>
                </button>
              </div>
              {isEditingNote ? (
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="text-sm text-on-surface bg-surface-container-lowest rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              ) : (
                <p className="text-sm text-on-surface italic">“{note}”</p>
              )}
            </div>
          </div>

          {/* Consultation & Fee */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MaterialIcon name="receipt_long" className="text-primary text-[20px]" />
                <h3 className="text-base font-semibold text-on-surface">Consultation &amp; Fee</h3>
              </div>
              <span className="text-xs font-semibold text-primary">Verified Copay</span>
            </div>

            <div className="space-y-2 text-sm tabular-nums">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Standard Consultation Fee</span>
                <span className="font-medium text-on-surface">${doctor.consultationFee}.00</span>
              </div>
              <div className="flex justify-between">
                <div>
                  <span className="text-on-surface-variant block">Insurance Coverage</span>
                  <span className="text-[11px] text-primary font-medium">
                    {profile?.insuranceProvider || 'Aetna / BlueCross Verified'}
                  </span>
                </div>
                <span className="font-semibold text-primary">-${insuranceDiscount}.00</span>
              </div>
              <div className="bg-surface-container-low rounded-xl p-3 flex justify-between items-center mt-2">
                <div>
                  <span className="text-sm font-bold text-on-surface block">Patient Due Today</span>
                  <span className="text-[11px] text-on-surface-variant">
                    Covers specialist copay
                  </span>
                </div>
                <span className="text-2xl font-bold text-primary">${doctor.insuranceCopay}.00</span>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-1 text-xs text-on-surface-variant">
              <MaterialIcon name="policy" className="text-[16px] mt-0.5 shrink-0" />
              <p>
                <strong className="text-on-surface">Free cancellation</strong> up to 4 hours before
                your scheduled appointment time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-safe">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onChangeSlot}
            className="flex-1 h-12 rounded-xl bg-surface-container-low text-on-surface text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition-colors whitespace-nowrap"
          >
            <MaterialIcon name="calendar_today" className="text-[18px]" />
            <span>Change Slot</span>
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="flex-[2] h-12 rounded-xl bg-primary text-on-primary text-sm font-semibold shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
          >
            <MaterialIcon name="verified_user" className="text-[18px]" />
            <span>
              {submitting
                ? 'Confirming...'
                : rescheduleAppointmentId
                ? 'Confirm Reschedule'
                : firebaseUser
                ? 'Confirm Appointment'
                : 'Sign In & Confirm'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
