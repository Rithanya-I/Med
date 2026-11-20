import React, { useState } from 'react';
import { AvatarImage, MaterialIcon } from '../components/CommonUI';
import { BookingDraft, Doctor } from '../types';

interface ScheduleScreenProps {
  doctor: Doctor;
  initialTime?: string;
  initialDate?: string;
  initialFormat?: 'In-Clinic' | 'Telehealth';
  onProceedToReview: (draft: BookingDraft) => void;
}

const DATES = [
  { label: 'Wed', day: '22', full: 'Wed, May 22, 2024', slots: 'Passed', disabled: true },
  { label: 'Thu', day: '23', full: 'Thu, May 23, 2024', slots: 'Full', disabled: true },
  { label: 'Fri', day: '24', full: 'Fri, May 24, 2024', slots: '3 slots', isToday: true, disabled: false },
  { label: 'Sat', day: '25', full: 'Sat, May 25, 2024', slots: '5 slots', disabled: false },
  { label: 'Mon', day: '27', full: 'Mon, May 27, 2024', slots: '8 slots', disabled: false },
  { label: 'Tue', day: '28', full: 'Tue, May 28, 2024', slots: '2 slots', disabled: false },
  { label: 'Wed', day: '29', full: 'Wed, May 29, 2024', slots: '6 slots', disabled: false },
];

const PERIOD_SLOTS: Record<'Morning' | 'Afternoon' | 'Evening', { time: string; booked?: boolean; fastest?: boolean }[]> = {
  Morning: [
    { time: '09:00 AM' },
    { time: '09:30 AM', fastest: true },
    { time: '10:15 AM', booked: true },
    { time: '11:00 AM' },
  ],
  Afternoon: [
    { time: '02:30 PM', fastest: true },
    { time: '03:15 PM' },
    { time: '04:00 PM' },
    { time: '04:45 PM', booked: true },
  ],
  Evening: [
    { time: '05:15 PM', fastest: true },
    { time: '05:45 PM' },
    { time: '06:15 PM' },
    { time: '06:45 PM' },
  ],
};

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
  doctor,
  initialTime = '02:30 PM',
  initialDate = 'Fri, May 24, 2024',
  initialFormat = 'In-Clinic',
  onProceedToReview,
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [period, setPeriod] = useState<'Morning' | 'Afternoon' | 'Evening'>('Afternoon');
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [visitFormat, setVisitFormat] = useState<'In-Clinic' | 'Telehealth'>(initialFormat);

  const slots = PERIOD_SLOTS[period];

  const handleReview = () => {
    onProceedToReview({
      doctor,
      appointmentDate: selectedDate,
      appointmentTime: selectedTime,
      visitFormat,
      patientNote: `Routine ${doctor.specialtyName.toLowerCase()} consultation & review`,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-28 flex flex-col gap-5">
      {/* Doctor Mini-Summary */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <AvatarImage
            src={doctor.avatarUrl}
            alt={doctor.name}
            fallbackText={doctor.name}
            className="w-14 h-14 rounded-full object-cover shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-semibold text-on-surface truncate">
                {doctor.name}, {doctor.credentials}
              </h2>
              <MaterialIcon name="verified" filled className="text-primary text-[18px] shrink-0" />
            </div>
            <p className="text-sm text-on-surface-variant truncate">{doctor.title}</p>
            <p className="text-xs text-secondary truncate mt-0.5">{doctor.clinicName}</p>
          </div>
        </div>
        <div className="text-right shrink-0 tabular-nums">
          <div className="inline-flex items-center gap-1 bg-surface-container-low px-2.5 py-1 rounded-full text-xs font-semibold">
            <MaterialIcon name="star" filled className="text-amber-500 text-[14px]" />
            <span>{doctor.rating}</span>
          </div>
          <div className="text-xs text-on-surface-variant mt-1">{doctor.reviewCount} reviews</div>
        </div>
      </div>

      {/* AI Suggestion Banner */}
      <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MaterialIcon name="auto_awesome" className="text-primary text-[20px] shrink-0" />
          <p className="text-sm text-primary font-medium truncate">
            AI Suggestion: <span className="font-semibold text-on-surface">{doctor.nextSlotLabel}</span> fits your calendar
          </p>
        </div>
        <span className="text-xs font-semibold text-primary shrink-0 tabular-nums">
          {doctor.matchPercent}% Match
        </span>
      </div>

      {/* Calendar Header */}
      <div>
        <h3 className="text-lg font-bold text-on-surface">May 2024</h3>
        <p className="text-xs text-on-surface-variant">Timezone: Eastern Time (US &amp; Canada)</p>
      </div>

      {/* Horizontal Date Selector */}
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {DATES.map((d) => {
          const isSelected = selectedDate === d.full;
          return (
            <button
              key={d.full}
              type="button"
              disabled={d.disabled}
              onClick={() => setSelectedDate(d.full)}
              className={`shrink-0 w-[84px] p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                d.disabled
                  ? 'bg-surface-container-high/60 opacity-55 cursor-not-allowed text-on-surface-variant'
                  : isSelected
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'bg-surface-container-lowest shadow-sm hover:bg-surface-container-low text-on-surface'
              }`}
            >
              <span
                className={`text-[11px] font-medium ${
                  isSelected ? 'text-primary-fixed' : 'text-on-surface-variant'
                }`}
              >
                {d.isToday ? 'Today · ' + d.label : d.label}
              </span>
              <span className="text-lg font-bold my-0.5 tabular-nums">{d.day}</span>
              <span
                className={`text-[11px] font-medium whitespace-nowrap ${
                  isSelected ? 'text-primary-fixed-dim' : 'text-primary'
                }`}
              >
                {d.slots}
              </span>
            </button>
          );
        })}
      </div>

      {/* Time Slot Grid */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-on-surface">Available Slots</h4>
            <p className="text-xs text-on-surface-variant">{selectedDate}</p>
          </div>

          <div className="flex items-center bg-surface-container-low p-1 rounded-xl self-start">
            {(['Morning', 'Afternoon', 'Evening'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setPeriod(tab);
                  const firstValid = PERIOD_SLOTS[tab].find((s) => !s.booked);
                  if (firstValid) setSelectedTime(firstValid.time);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === tab
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {slots.map((slot) => {
            const isSelected = selectedTime === slot.time;
            if (slot.booked) {
              return (
                <div
                  key={slot.time}
                  className="p-3 rounded-xl bg-surface-container-high/60 text-outline flex flex-col items-center justify-center text-center cursor-not-allowed opacity-60"
                >
                  <span className="text-sm font-medium line-through tabular-nums">
                    {slot.time}
                  </span>
                  <span className="text-[11px] mt-0.5">Booked</span>
                </div>
              );
            }
            return (
              <button
                key={slot.time}
                type="button"
                onClick={() => setSelectedTime(slot.time)}
                className={`p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                  isSelected
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                }`}
              >
                <span className="text-sm font-bold tabular-nums">{slot.time}</span>
                <span
                  className={`text-[11px] mt-0.5 ${
                    isSelected ? 'text-primary-fixed-dim' : 'text-on-surface-variant'
                  }`}
                >
                  {slot.fastest ? 'Fastest · 30 min' : '30 min session'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Consultation Format Selector */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-on-surface">Consultation Format</h4>
          <span className="text-xs text-primary font-medium">Standard Insurance Covered</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setVisitFormat('In-Clinic')}
            className={`text-left p-4 rounded-xl transition-all flex items-start gap-3 ${
              visitFormat === 'In-Clinic'
                ? 'bg-surface-container-low ring-2 ring-primary/30'
                : 'bg-surface-container-lowest border border-surface-container hover:bg-surface-container-low'
            }`}
          >
            <MaterialIcon
              name={visitFormat === 'In-Clinic' ? 'radio_button_checked' : 'radio_button_unchecked'}
              className="text-primary text-[20px] mt-0.5 shrink-0"
            />
            <div>
              <div className="text-sm font-semibold text-on-surface">In-Clinic Consultation</div>
              <p className="text-xs text-on-surface-variant mt-0.5">{doctor.clinicAddress}</p>
              <p className="text-xs text-primary font-medium mt-1.5">
                Full clinical diagnostics included
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={!doctor.telehealthAvailable}
            onClick={() => setVisitFormat('Telehealth')}
            className={`text-left p-4 rounded-xl transition-all flex items-start gap-3 ${
              !doctor.telehealthAvailable
                ? 'opacity-50 cursor-not-allowed bg-surface-container-high/40'
                : visitFormat === 'Telehealth'
                ? 'bg-surface-container-low ring-2 ring-primary/30'
                : 'bg-surface-container-lowest border border-surface-container hover:bg-surface-container-low'
            }`}
          >
            <MaterialIcon
              name={visitFormat === 'Telehealth' ? 'radio_button_checked' : 'radio_button_unchecked'}
              className="text-primary text-[20px] mt-0.5 shrink-0"
            />
            <div>
              <div className="text-sm font-semibold text-on-surface">Telehealth Video Visit</div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                MediSlot Secure HD Video · Join via phone or desktop
              </p>
              <p className="text-xs text-secondary font-medium mt-1.5">
                {doctor.telehealthAvailable
                  ? 'Encrypted room link sent 15m prior'
                  : 'In-clinic only for this specialty'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Arrival Info */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0">
          <MaterialIcon name="directions_walk" className="text-[24px]" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Arrival Instructions
          </span>
          <p className="text-sm font-medium text-on-surface">
            Parking validated at Garage B · Please arrive 10 min early for digital check-in
          </p>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-safe">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase text-primary tracking-wide block">
              Selected Slot
            </span>
            <p className="text-base font-bold text-on-surface truncate tabular-nums">
              {selectedDate} · {selectedTime}
            </p>
            <span className="text-xs text-on-surface-variant truncate block">
              {visitFormat} · {doctor.name}
            </span>
          </div>
          <button
            type="button"
            onClick={handleReview}
            className="shrink-0 h-12 px-5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-sm font-semibold flex items-center gap-2 shadow-md active:scale-95 transition-all whitespace-nowrap"
          >
            <span>Review Details</span>
            <MaterialIcon name="arrow_forward" className="text-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
};
