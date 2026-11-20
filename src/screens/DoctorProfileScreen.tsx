import React, { useState } from 'react';
import { AvatarImage, MaterialIcon } from '../components/CommonUI';
import { Doctor } from '../types';

interface DoctorProfileScreenProps {
  doctor: Doctor;
  isFavorited: boolean;
  onToggleFavorite: (doctorId: number) => void;
  onBack: () => void;
  onProceedToSchedule: (doctor: Doctor, preselectedTime?: string) => void;
}

export const DoctorProfileScreen: React.FC<DoctorProfileScreenProps> = ({
  doctor,
  isFavorited,
  onToggleFavorite,
  onBack,
  onProceedToSchedule,
}) => {
  const [selectedSlot, setSelectedSlot] = useState('02:30 PM');
  const [bioExpanded, setBioExpanded] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const focusTags = doctor.focusTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${doctor.name}, ${doctor.credentials}`,
          text: `Book an appointment with ${doctor.name} (${doctor.specialtyName}) at ${doctor.clinicName}.`,
          url: window.location.href,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      }
    } catch {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-28 flex flex-col gap-5">
      {/* Top Quick Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-primary hover:text-primary-container transition-colors py-1 text-xs font-semibold uppercase tracking-wide"
        >
          <MaterialIcon name="arrow_back" className="text-[18px]" />
          <span>Doctors Listing</span>
        </button>

        <div className="flex items-center gap-2">
          {shareToast && (
            <span className="text-xs font-medium text-primary">Profile link copied</span>
          )}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share Profile"
            className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-secondary transition-all shadow-sm"
          >
            <MaterialIcon name="share" className="text-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => onToggleFavorite(doctor.id)}
            aria-label={isFavorited ? 'Remove from saved doctors' : 'Save doctor'}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
              isFavorited
                ? 'bg-error-container text-error'
                : 'bg-surface-container-low hover:bg-surface-container text-secondary'
            }`}
          >
            <MaterialIcon name="favorite" filled={isFavorited} className="text-[18px]" />
          </button>
        </div>
      </div>

      {/* Hero Profile Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <AvatarImage
              src={doctor.avatarUrl}
              alt={doctor.name}
              fallbackText={doctor.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover object-top shadow-sm"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
              <MaterialIcon name="verified" filled className="text-on-primary text-[14px]" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs text-primary font-semibold mb-1">
              Board Certified · Top Rated Specialist
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
              {doctor.name}, {doctor.credentials}
            </h2>
            <p className="text-sm text-secondary mt-0.5">{doctor.title}</p>
            <div className="flex items-center gap-1.5 mt-2 text-sm tabular-nums">
              <MaterialIcon name="star" filled className="text-[16px] text-amber-500" />
              <strong className="font-bold text-on-surface">{doctor.rating}</strong>
              <span className="text-on-surface-variant">
                ({doctor.reviewCount} verified patient reviews)
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <MaterialIcon name="auto_awesome" className="text-[16px]" />
            <span>{doctor.matchPercent}% Match for Preventive &amp; Specialist Screening</span>
          </div>
          <span className="text-secondary font-medium">In-Network</span>
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-container-lowest rounded-2xl p-3.5 shadow-sm flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary mb-1">
            <MaterialIcon name="clinical_notes" className="text-[18px]" />
          </div>
          <span className="text-xl font-bold text-on-surface tabular-nums">
            {doctor.yearsExp}+
          </span>
          <span className="text-xs text-on-surface-variant">Years Exp.</span>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-3.5 shadow-sm flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container mb-1">
            <MaterialIcon name="payments" className="text-[18px]" />
          </div>
          <span className="text-xl font-bold text-on-surface tabular-nums">
            ${doctor.insuranceCopay}
          </span>
          <span className="text-xs text-on-surface-variant">Insurance Copay</span>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-3.5 shadow-sm flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed mb-1">
            <MaterialIcon name="groups" className="text-[18px]" />
          </div>
          <span className="text-xl font-bold text-on-surface tabular-nums">
            {doctor.patientsTreated}
          </span>
          <span className="text-xs text-on-surface-variant">Patients</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Qualifications & Credentials */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MaterialIcon name="workspace_premium" className="text-primary text-[20px]" />
                <h3 className="text-base font-bold text-on-surface">
                  Qualifications &amp; Credentials
                </h3>
              </div>
              <span className="text-xs font-semibold text-primary">Verified</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                  <MaterialIcon name="school" className="text-[18px]" />
                </div>
                <div>
                  <h4 className="font-semibold text-on-surface">Medical Education</h4>
                  <p className="text-on-surface-variant">{doctor.education}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                  <MaterialIcon name="stars" className="text-[18px]" />
                </div>
                <div>
                  <h4 className="font-semibold text-on-surface">Fellowship Status</h4>
                  <p className="text-on-surface-variant">{doctor.fellowship}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                  <MaterialIcon name="verified_user" className="text-[18px]" />
                </div>
                <div>
                  <h4 className="font-semibold text-on-surface">Active Licensure</h4>
                  <p className="text-on-surface-variant">{doctor.licenseNumber}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Biography */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2.5">
              <MaterialIcon name="psychology" className="text-primary text-[20px]" />
              <h3 className="text-base font-bold text-on-surface">Professional Biography</h3>
            </div>
            <p
              className={`text-sm text-on-surface-variant leading-relaxed ${
                bioExpanded ? '' : 'line-clamp-3'
              }`}
            >
              {doctor.bio}
            </p>
            <button
              type="button"
              onClick={() => setBioExpanded((v) => !v)}
              className="mt-2 text-primary text-xs font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>{bioExpanded ? 'Read Less' : 'Read More'}</span>
              <MaterialIcon
                name={bioExpanded ? 'expand_less' : 'expand_more'}
                className="text-[16px]"
              />
            </button>

            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-surface-container-low text-xs text-secondary font-medium">
              {focusTags.map((tag, i) => (
                <span key={tag}>
                  {i > 0 && <span className="mr-2 text-outline">·</span>}
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Clinic & Location */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MaterialIcon name="apartment" className="text-primary text-[20px]" />
                <h3 className="text-base font-bold text-on-surface">Clinic &amp; Location</h3>
              </div>
              <span className="text-xs font-bold text-primary tabular-nums">
                {doctor.distanceMiles}
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <MaterialIcon name="pin_drop" className="text-primary text-[18px] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-on-surface">{doctor.clinicName}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{doctor.clinicAddress}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-on-surface-variant pt-1">
              <span className="flex items-center gap-1">
                <MaterialIcon name="local_parking" className="text-[16px] text-primary" />
                Free Valet
              </span>
              <span className="flex items-center gap-1">
                <MaterialIcon name="accessible" className="text-[16px] text-primary" />
                Wheelchair OK
              </span>
              {doctor.telehealthAvailable && (
                <span className="flex items-center gap-1">
                  <MaterialIcon name="videocam" className="text-[16px] text-primary" />
                  Telehealth
                </span>
              )}
            </div>
          </div>

          {/* Next Available Slots */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MaterialIcon name="calendar_today" className="text-primary text-[20px]" />
                <h3 className="text-base font-bold text-on-surface">Next Available Slots</h3>
              </div>
              <span className="text-xs font-semibold text-primary">Today</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { time: '02:30 PM', tag: 'Fastest' },
                { time: '04:00 PM', tag: 'Regular' },
                { time: '05:15 PM', tag: 'Evening' },
              ].map((slot) => {
                const active = selectedSlot === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setSelectedSlot(slot.time)}
                    className={`py-2.5 px-2 rounded-xl text-center text-xs font-semibold transition-all flex flex-col items-center gap-0.5 ${
                      active
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className="tabular-nums">{slot.time}</span>
                    <span
                      className={`text-[10px] font-normal ${
                        active ? 'text-primary-fixed' : 'text-on-surface-variant'
                      }`}
                    >
                      {slot.tag}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onProceedToSchedule(doctor, selectedSlot)}
              className="w-full p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary">
                  <MaterialIcon name="edit_calendar" className="text-[18px]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface">
                    Choose a custom date and time
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    View complete calendar schedule
                  </p>
                </div>
              </div>
              <MaterialIcon name="chevron_right" className="text-secondary text-[20px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Confirmation Bar */}
      <aside className="fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1 tabular-nums">
              <span className="text-xl font-bold text-on-surface">${doctor.insuranceCopay}</span>
              <span className="text-xs text-on-surface-variant">
                copay (${doctor.consultationFee} standard)
              </span>
            </div>
            <p className="text-xs text-primary font-medium truncate">
              Selected slot: Today {selectedSlot}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onProceedToSchedule(doctor, selectedSlot)}
            className="bg-primary hover:bg-primary-container text-on-primary text-sm font-semibold px-5 py-3 rounded-xl flex items-center gap-2 shrink-0 shadow-md active:scale-95 transition-all whitespace-nowrap"
          >
            <span>Select Date &amp; Time</span>
            <MaterialIcon name="arrow_forward" className="text-[18px]" />
          </button>
        </div>
      </aside>
    </div>
  );
};
