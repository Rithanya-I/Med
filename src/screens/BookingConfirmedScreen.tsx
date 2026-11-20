import React, { useState } from 'react';
import { AvatarImage, MaterialIcon } from '../components/CommonUI';
import { Appointment, ScreenRoute } from '../types';

interface BookingConfirmedScreenProps {
  appointment: Appointment;
  onNavigate: (route: ScreenRoute) => void;
}

export const BookingConfirmedScreen: React.FC<BookingConfirmedScreenProps> = ({
  appointment,
  onNavigate,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const handleDownloadIcs = () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MediSlot AI//Appointment//EN',
      'BEGIN:VEVENT',
      `UID:${appointment.bookingRef}@medislot.ai`,
      `SUMMARY:Appointment with ${appointment.doctorName}`,
      `DESCRIPTION:${appointment.doctorSpecialty} (${appointment.visitFormat}) - Ref ${appointment.bookingRef}`,
      `LOCATION:${appointment.doctorClinicName}, ${appointment.doctorClinicAddress}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${appointment.bookingRef}.ics`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast('Calendar invite downloaded');
  };

  const handleCopyDirections = async () => {
    try {
      await navigator.clipboard.writeText(
        `${appointment.doctorClinicName}, ${appointment.doctorClinicAddress}`
      );
      triggerToast('Clinic address copied to clipboard');
    } catch {
      triggerToast(appointment.doctorClinicAddress);
    }
  };

  const handleSavePass = () => {
    const passText = `MEDISLOT AI CHECK-IN PASS\nRef: ${appointment.bookingRef}\nDoctor: ${appointment.doctorName} (${appointment.doctorSpecialty})\nPatient: ${appointment.patientName}\nDate: ${appointment.appointmentDate} at ${appointment.appointmentTime}\nFormat: ${appointment.visitFormat}\nClinic: ${appointment.doctorClinicName} — ${appointment.doctorClinicAddress}`;
    const blob = new Blob([passText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MediSlot-Pass-${appointment.bookingRef}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast('Digital pass saved');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* Celebration Header */}
      <div className="flex flex-col items-center text-center pt-2">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
          <MaterialIcon name="check" className="text-[34px] text-on-primary font-bold" />
        </div>
        <h2 className="text-2xl font-semibold text-on-surface tracking-tight">
          Your Appointment is Confirmed!
        </h2>
        <p className="text-sm text-on-surface-variant mt-1 max-w-sm">
          Booking confirmed &amp; synchronized with {appointment.doctorClinicName}.
        </p>
      </div>

      {toastMsg && (
        <div className="px-4 py-2.5 rounded-xl bg-secondary-container text-on-secondary-fixed text-xs font-semibold text-center">
          {toastMsg}
        </div>
      )}

      {/* Digital Ticket Card */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-md overflow-hidden">
        <div className="h-2 w-full bg-gradient-to-r from-primary via-primary-container to-tertiary" />

        <div className="p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block">
                Booking Reference
              </span>
              <span className="text-xl font-bold text-on-surface tracking-tight tabular-nums">
                #{appointment.bookingRef}
              </span>
            </div>
            <span className="text-xs font-semibold text-primary">Confirmed · AI Verified</span>
          </div>

          <div className="flex items-center gap-3.5 p-3 bg-surface-container-low rounded-xl">
            <AvatarImage
              src={appointment.doctorAvatarUrl}
              alt={appointment.doctorName}
              fallbackText={appointment.doctorName}
              className="w-14 h-14 rounded-full object-cover shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <span className="text-[11px] text-primary font-semibold uppercase tracking-wider block">
                Specialist
              </span>
              <span className="text-base font-bold text-on-surface block truncate">
                {appointment.doctorName}, {appointment.doctorCredentials}
              </span>
              <span className="text-xs text-on-surface-variant block truncate">
                {appointment.doctorSpecialty} · {appointment.visitFormat}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block">
                Date &amp; Time
              </span>
              <span className="text-sm font-semibold text-on-surface mt-0.5 block">
                {appointment.appointmentDate}
              </span>
              <span className="text-xs text-primary font-medium tabular-nums">
                {appointment.appointmentTime}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block">
                Patient Name
              </span>
              <span className="text-sm font-semibold text-on-surface mt-0.5 block">
                {appointment.patientName}
              </span>
              <span className="text-xs text-on-surface-variant">Self (Primary)</span>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <MaterialIcon name="location_on" className="text-primary text-[20px] mt-0.5 shrink-0" />
            <div>
              <span className="text-sm font-semibold text-on-surface block">
                {appointment.doctorClinicName}
              </span>
              <span className="text-xs text-on-surface-variant">
                {appointment.doctorClinicAddress}
              </span>
            </div>
          </div>
        </div>

        {/* Tear Line */}
        <div className="relative w-full flex items-center justify-between px-2">
          <div className="w-4 h-8 bg-surface rounded-r-full -ml-2 shadow-inner" />
          <div className="flex-1 mx-2 border-b-2 border-dashed border-outline-variant/40" />
          <div className="w-4 h-8 bg-surface rounded-l-full -mr-2 shadow-inner" />
        </div>

        {/* Barcode Footer */}
        <div className="p-5 bg-surface-container-low/50 flex flex-col items-center text-center gap-2">
          <div className="w-full flex items-center justify-center gap-1 h-10 px-6">
            {[2, 1, 3, 1, 2, 1, 4, 1, 2, 2, 1, 3, 1, 2, 1, 2, 3, 1, 2].map((w, i) => (
              <div
                key={i}
                style={{ width: `${w * 3}px` }}
                className="bg-on-surface h-full rounded-[1px]"
              />
            ))}
          </div>
          <span className="text-[11px] text-on-surface-variant font-mono tracking-widest">
            SCAN AT RECEPTION CHECK-IN KIOSK
          </span>
        </div>
      </div>

      {/* 3 Quick Utility Tiles */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={handleDownloadIcs}
          className="flex flex-col items-center justify-center p-3.5 bg-surface-container-lowest rounded-2xl shadow-sm hover:bg-surface-container-low transition-all active:scale-95"
        >
          <div className="w-10 h-10 rounded-full bg-secondary-container/60 text-primary flex items-center justify-center mb-1.5">
            <MaterialIcon name="calendar_add_on" className="text-[20px]" />
          </div>
          <span className="text-xs font-semibold text-on-surface">Add to Cal</span>
        </button>

        <button
          type="button"
          onClick={handleCopyDirections}
          className="flex flex-col items-center justify-center p-3.5 bg-surface-container-lowest rounded-2xl shadow-sm hover:bg-surface-container-low transition-all active:scale-95"
        >
          <div className="w-10 h-10 rounded-full bg-secondary-container/60 text-primary flex items-center justify-center mb-1.5">
            <MaterialIcon name="directions" className="text-[20px]" />
          </div>
          <span className="text-xs font-semibold text-on-surface">Copy Address</span>
        </button>

        <button
          type="button"
          onClick={handleSavePass}
          className="flex flex-col items-center justify-center p-3.5 bg-surface-container-lowest rounded-2xl shadow-sm hover:bg-surface-container-low transition-all active:scale-95"
        >
          <div className="w-10 h-10 rounded-full bg-secondary-container/60 text-primary flex items-center justify-center mb-1.5">
            <MaterialIcon name="download" className="text-[20px]" />
          </div>
          <span className="text-xs font-semibold text-on-surface">Save Pass</span>
        </button>
      </div>

      {/* Confirmation Notice */}
      <div className="flex items-start gap-3 p-4 bg-surface-container-low rounded-2xl text-sm text-on-surface-variant">
        <MaterialIcon name="mark_email_read" className="text-primary text-[20px] mt-0.5 shrink-0" />
        <p>
          Pre-visit intake details and pass <strong className="text-on-surface">#{appointment.bookingRef}</strong> are synced for{' '}
          <strong className="text-on-surface">{appointment.patientEmail}</strong>.
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => onNavigate('appointments')}
          className="flex-1 h-12 bg-primary-container hover:bg-primary text-on-primary rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all"
        >
          <span>View in My Appointments</span>
          <MaterialIcon name="arrow_forward" className="text-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="flex-1 h-12 bg-secondary-container hover:bg-surface-container-high text-on-secondary-container rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <MaterialIcon name="home" className="text-[18px]" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
