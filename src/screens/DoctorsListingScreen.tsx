import React, { useMemo, useState } from 'react';
import { AvatarImage, MaterialIcon } from '../components/CommonUI';
import { Doctor, Specialty } from '../types';

interface DoctorsListingScreenProps {
  doctors: Doctor[];
  specialties: Specialty[];
  selectedSpecialtySlug: string;
  initialSearchQuery?: string;
  onChangeSpecialty: (slug: string) => void;
  onSelectDoctor: (doctor: Doctor) => void;
  onStartBooking: (doctor: Doctor) => void;
  onBackToSpecialties: () => void;
}

export const DoctorsListingScreen: React.FC<DoctorsListingScreenProps> = ({
  doctors,
  specialties,
  selectedSpecialtySlug,
  initialSearchQuery = '',
  onChangeSpecialty,
  onSelectDoctor,
  onStartBooking,
  onBackToSpecialties,
}) => {
  const [searchText, setSearchText] = useState(initialSearchQuery);
  const [todayOnly, setTodayOnly] = useState(false);
  const [exp10Plus, setExp10Plus] = useState(false);
  const [rating49Plus, setRating49Plus] = useState(false);
  const [telehealthOnly, setTelehealthOnly] = useState(false);

  const activeSpec = specialties.find((s) => s.slug === selectedSpecialtySlug);

  const filteredDoctors = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return doctors.filter((doc) => {
      if (
        selectedSpecialtySlug &&
        selectedSpecialtySlug !== 'all' &&
        doc.specialtySlug !== selectedSpecialtySlug
      ) {
        return false;
      }
      if (todayOnly && !doc.nextSlotLabel.toLowerCase().includes('today')) {
        return false;
      }
      if (exp10Plus && doc.yearsExp < 10) {
        return false;
      }
      if (rating49Plus && Number(doc.rating) < 4.9) {
        return false;
      }
      if (telehealthOnly && !doc.telehealthAvailable) {
        return false;
      }
      if (q) {
        const hay = `${doc.name} ${doc.specialtyName} ${doc.clinicName} ${doc.focusTags}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    doctors,
    selectedSpecialtySlug,
    searchText,
    todayOnly,
    exp10Plus,
    rating49Plus,
    telehealthOnly,
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-5">
      {/* Header Context */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToSpecialties}
            className="inline-flex items-center gap-1 text-primary hover:text-primary-container text-sm font-semibold"
          >
            <MaterialIcon name="chevron_left" className="text-[18px]" />
            <span>Back to Specialties</span>
          </button>
          <span className="text-xs font-semibold text-on-secondary-container tabular-nums">
            {filteredDoctors.length} Verified Specialists
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-on-surface tracking-tight">
              {activeSpec ? `${activeSpec.name} Specialists` : 'All Medical Specialists'}
            </h2>
            <p className="text-sm text-on-surface-variant">
              {activeSpec
                ? activeSpec.subtitle
                : 'Board-certified clinical & telehealth physicians'}
            </p>
          </div>
          {selectedSpecialtySlug !== 'all' && (
            <button
              type="button"
              onClick={() => onChangeSpecialty('all')}
              className="text-xs font-semibold text-primary hover:underline shrink-0"
            >
              Show All Departments
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
            <MaterialIcon name="search" className="text-[20px]" />
          </div>
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search specialists by name, clinic, or focus..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
          />
        </div>
      </div>

      {/* Filter Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => {
            setTodayOnly(false);
            setExp10Plus(false);
            setRating49Plus(false);
            setTelehealthOnly(false);
          }}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
            !todayOnly && !exp10Plus && !rating49Plus && !telehealthOnly
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-lowest text-on-surface shadow-sm'
          }`}
        >
          <MaterialIcon name="bolt" className="text-[15px]" />
          <span>Earliest Slot</span>
        </button>

        <button
          type="button"
          onClick={() => setTodayOnly((v) => !v)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
            todayOnly
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low'
          }`}
        >
          <span>Available Today</span>
        </button>

        <button
          type="button"
          onClick={() => setExp10Plus((v) => !v)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
            exp10Plus
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low'
          }`}
        >
          <MaterialIcon name="verified" className="text-[15px]" />
          <span>Exp. 10+ Yrs</span>
        </button>

        <button
          type="button"
          onClick={() => setRating49Plus((v) => !v)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
            rating49Plus
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low'
          }`}
        >
          <MaterialIcon name="star" filled className="text-[15px] text-amber-500" />
          <span>Rating 4.9+</span>
        </button>

        <button
          type="button"
          onClick={() => setTelehealthOnly((v) => !v)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
            telehealthOnly
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low'
          }`}
        >
          <MaterialIcon name="videocam" className="text-[15px]" />
          <span>Telehealth</span>
        </button>
      </div>

      {/* Doctors List */}
      {filteredDoctors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary tabular-nums">
                    {doc.matchPercent}% Routine Match
                  </span>
                  <span className="text-secondary font-medium">
                    {doc.telehealthAvailable ? 'In-Clinic & Virtual' : 'In-Clinic Only'}
                  </span>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="relative shrink-0">
                    <AvatarImage
                      src={doc.avatarUrl}
                      alt={doc.name}
                      fallbackText={doc.name}
                      className="w-20 h-20 rounded-xl object-cover shadow-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-on-surface truncate">
                      {doc.name}, {doc.credentials}
                    </h3>
                    <p className="text-sm text-primary font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-on-surface-variant truncate mt-0.5">
                      {doc.education}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs tabular-nums">
                      <span className="inline-flex items-center font-semibold text-on-surface">
                        <MaterialIcon
                          name="star"
                          filled
                          className="text-[15px] text-amber-500 mr-0.5"
                        />
                        {doc.rating}
                      </span>
                      <span className="text-outline">·</span>
                      <span className="text-on-surface-variant">{doc.reviewCount} reviews</span>
                      <span className="text-outline">·</span>
                      <span className="font-semibold text-secondary">{doc.yearsExp} Yrs Exp</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-container-low text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <MaterialIcon
                      name="apartment"
                      className="text-[18px] text-secondary shrink-0"
                    />
                    <span className="truncate text-on-surface">{doc.clinicName}</span>
                  </div>
                  <span className="text-xs text-on-surface-variant font-medium shrink-0 tabular-nums">
                    {doc.distanceMiles}
                  </span>
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container text-sm">
                  <div className="flex items-center gap-2">
                    <MaterialIcon name="schedule" className="text-[18px] text-primary" />
                    <div>
                      <span className="text-[11px] text-on-surface-variant block leading-tight">
                        Next Slot
                      </span>
                      <span className="text-xs font-semibold text-on-surface">
                        {doc.nextSlotLabel}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary tabular-nums">
                    ${doc.insuranceCopay} copay
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectDoctor(doc)}
                  className="py-2.5 px-3 rounded-xl bg-surface-container text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5"
                >
                  <MaterialIcon name="account_circle" className="text-[18px]" />
                  <span>View Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => onStartBooking(doc)}
                  className="py-2.5 px-3 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <MaterialIcon name="calendar_month" className="text-[18px]" />
                  <span>Book Slot</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-container-lowest p-8 text-center shadow-sm">
          <p className="text-base font-semibold text-on-surface">
            No specialists match your active filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchText('');
              setTodayOnly(false);
              setExp10Plus(false);
              setRating49Plus(false);
              setTelehealthOnly(false);
              onChangeSpecialty('all');
            }}
            className="mt-3 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Bottom Policy Banner */}
      <div className="px-4 py-3.5 rounded-2xl bg-surface-container flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shrink-0 shadow-sm">
          <MaterialIcon name="timer" className="text-[20px]" />
        </div>
        <div>
          <span className="text-[11px] uppercase tracking-wider text-primary font-bold block">
            Patient Guarantee
          </span>
          <p className="text-sm text-on-surface font-medium">
            Zero wait-time policy enforced on all verified clinic bookings.
          </p>
        </div>
      </div>
    </div>
  );
};
