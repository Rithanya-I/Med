import React, { useState } from 'react';
import {
  AvatarImage,
  DEFAULT_PATIENT_AVATAR_URL,
  MaterialIcon,
} from '../components/CommonUI';
import { useAuth } from '../context/AuthContext';
import { Appointment, Doctor, ScreenRoute, Specialty } from '../types';

interface DashboardScreenProps {
  doctors: Doctor[];
  specialties: Specialty[];
  appointments: Appointment[];
  onNavigate: (route: ScreenRoute) => void;
  onSelectSpecialty: (slug: string) => void;
  onSelectDoctor: (doctor: Doctor) => void;
  onStartBooking: (doctor: Doctor) => void;
  onSearchSubmit: (query: string) => void;
  onOpenAppointmentPass: (appointment: Appointment) => void;
  onRescheduleAppointment: (appointment: Appointment) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  doctors,
  specialties,
  appointments,
  onNavigate,
  onSelectSpecialty,
  onSelectDoctor,
  onStartBooking,
  onSearchSubmit,
  onOpenAppointmentPass,
  onRescheduleAppointment,
}) => {
  const { profile, firebaseUser, signInWithGoogle } = useAuth();
  const [searchText, setSearchText] = useState('');

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'confirmed' || a.status === 'scheduled'
  );
  const nextAppointment = upcomingAppointments[0] || null;
  const recommendedDoctors = doctors.slice(0, 3);
  const firstName =
    profile?.fullName?.split(' ')[0] ||
    firebaseUser?.displayName?.split(' ')[0] ||
    'Guest';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(searchText.trim());
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-6">
      {/* Top Row: Greeting Card + MediBot Smart Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* 1. Greeting Card */}
        <div className="lg:col-span-7 rounded-2xl bg-surface-container-lowest shadow-sm p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <AvatarImage
                src={profile?.avatarUrl || firebaseUser?.photoURL || DEFAULT_PATIENT_AVATAR_URL}
                alt={`${firstName}'s Profile Photo`}
                fallbackText={firstName}
                className="w-14 h-14 rounded-full object-cover shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <h2 className="text-xl font-semibold text-on-surface truncate">
                  Good Morning, {firstName}
                </h2>
                <div className="flex items-center gap-1.5 text-primary text-xs font-medium mt-0.5">
                  <MaterialIcon name="schedule" className="text-[16px]" />
                  <span className="truncate">
                    {nextAppointment
                      ? `Next visit: ${nextAppointment.appointmentDate} · ${nextAppointment.appointmentTime}`
                      : 'No upcoming checkups scheduled'}
                  </span>
                </div>
              </div>
            </div>

            <a
              href="tel:911"
              className="shrink-0 flex items-center gap-1 bg-error-container text-on-error-container px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-transform"
            >
              <MaterialIcon name="emergency" className="text-[16px] text-error" />
              <span>SOS</span>
            </a>
          </div>

          <div className="pt-3 border-t border-surface-container flex flex-wrap items-center justify-between gap-2 text-xs text-secondary">
            <span>
              {firebaseUser
                ? `Med ID ${profile?.medId || '#8841-P'} · Synced`
                : 'Sign in to sync appointments & digital passes'}
            </span>
            {firebaseUser ? (
              <button
                type="button"
                onClick={() => onNavigate('appointments')}
                className="flex items-center gap-1 text-primary font-semibold hover:underline"
              >
                <MaterialIcon name="calendar_month" className="text-[15px]" />
                <span>{upcomingAppointments.length} upcoming</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="text-primary font-semibold hover:underline"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>

        {/* 2. MediBot AI Assistant Smart Card */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-2xl bg-gradient-to-br from-tertiary-container via-primary-container to-primary p-5 text-on-tertiary-container shadow-md flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-surface-container-lowest/20 flex items-center justify-center text-primary-fixed">
                <MaterialIcon name="auto_awesome" className="text-[18px]" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-fixed">
                AI Real-Time Dispatch
              </span>
            </div>
            <span className="text-xs font-semibold text-on-tertiary tabular-nums">98% Match</span>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-on-tertiary">Need a fast appointment?</h2>
            <p className="text-sm text-on-tertiary/90 mt-1">
              Ask MediBot to scan clinic availability &amp; match you with top specialists today.
            </p>
          </div>

          <div className="pt-1 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onNavigate('medibot')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-lowest text-primary text-sm font-semibold shadow-sm hover:bg-surface-bright active:scale-95 transition-transform whitespace-nowrap"
            >
              <MaterialIcon name="smart_toy" className="text-[18px] text-tertiary-container" />
              <span>Chat with MediBot</span>
            </button>
            <span className="text-xs text-primary-fixed font-medium">
              {doctors.length} specialists online
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search Field */}
      <form onSubmit={handleSearch} className="relative w-full">
        <div className="flex items-center bg-surface-container-lowest rounded-xl shadow-sm px-4 h-12 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <MaterialIcon name="search" className="text-secondary mr-2.5 text-[22px]" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search doctors, clinics or medical specialties..."
            className="w-full bg-transparent text-on-surface placeholder:text-secondary text-sm focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-surface-container-low text-primary text-xs font-semibold hover:bg-secondary-container transition-colors whitespace-nowrap"
          >
            Search
          </button>
        </div>
      </form>

      {/* 4. Popular Specialties Horizontal Strip */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">Popular Specialties</h2>
          <button
            type="button"
            onClick={() => onNavigate('specialties')}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View All
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
          {specialties.slice(0, 8).map((spec, idx) => (
            <button
              key={spec.slug}
              type="button"
              onClick={() => onSelectSpecialty(spec.slug)}
              className={`flex flex-col items-center gap-2 shrink-0 w-24 p-3 rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all ${
                idx === 0 ? 'ring-2 ring-primary/30' : ''
              }`}
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center ${
                  idx === 0
                    ? 'bg-secondary-container text-on-secondary-container'
                    : idx === 1
                    ? 'bg-error-container/60 text-error'
                    : idx === 2
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                    : 'bg-primary-fixed text-on-primary-fixed-variant'
                }`}
              >
                <MaterialIcon name={spec.iconName} className="text-[22px]" />
              </div>
              <span className="text-xs font-semibold text-on-surface text-center truncate w-full">
                {spec.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Upcoming Appointment + Recommended Doctors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Upcoming Appointment & Discover Banner */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MaterialIcon name="calendar_today" className="text-primary text-[20px]" />
                <h2 className="text-lg font-semibold text-on-surface">Upcoming Appointment</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('appointments')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                See All ({upcomingAppointments.length})
              </button>
            </div>

            {nextAppointment ? (
              <div className="rounded-2xl bg-surface-container-lowest shadow-sm p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarImage
                      src={nextAppointment.doctorAvatarUrl}
                      alt={nextAppointment.doctorName}
                      fallbackText={nextAppointment.doctorName}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-on-surface truncate">
                        {nextAppointment.doctorName}
                      </span>
                      <span className="text-xs text-secondary truncate">
                        {nextAppointment.doctorSpecialty} · {nextAppointment.doctorClinicName}
                      </span>
                      <span className="text-xs text-secondary mt-0.5 truncate">
                        {nextAppointment.visitFormat} · Ref {nextAppointment.bookingRef}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary capitalize shrink-0">
                    {nextAppointment.status}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-3">
                  <div className="flex items-center gap-2 text-on-surface min-w-0">
                    <MaterialIcon
                      name="event_available"
                      className="text-primary text-[20px] shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold tabular-nums truncate">
                        {nextAppointment.appointmentDate} · {nextAppointment.appointmentTime}
                      </span>
                      <span className="text-[11px] text-secondary truncate">
                        Digital Check-in Pass Ready
                      </span>
                    </div>
                  </div>
                  <MaterialIcon name="qr_code_2" className="text-primary text-[22px] shrink-0" />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onRescheduleAppointment(nextAppointment)}
                    className="py-2.5 px-3 rounded-lg bg-surface-container text-on-surface-variant text-xs font-semibold hover:bg-surface-container-high transition-colors"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAppointmentPass(nextAppointment)}
                    className="py-2.5 px-3 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors shadow-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-surface-container-lowest shadow-sm p-5 flex flex-col gap-3 text-center">
                <div className="w-11 h-11 rounded-full bg-surface-container-low text-primary mx-auto flex items-center justify-center">
                  <MaterialIcon name="event_available" className="text-[22px]" />
                </div>
                <p className="text-sm font-medium text-on-surface">
                  {firebaseUser
                    ? 'You have no upcoming appointments.'
                    : 'Sign in with Google to view your booked appointments and passes.'}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    firebaseUser ? onNavigate('specialties') : signInWithGoogle()
                  }
                  className="py-2.5 px-4 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors"
                >
                  {firebaseUser ? 'Book a Specialist' : 'Sign In with Google'}
                </button>
              </div>
            )}
          </div>

          {/* Discover Specialties Banner */}
          <div className="rounded-2xl bg-surface-container-low p-5 flex flex-col gap-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[11px] text-tertiary font-semibold uppercase tracking-wider">
                  Comprehensive Care
                </span>
                <h3 className="text-lg font-semibold text-on-surface mt-0.5">
                  Discover Specialties
                </h3>
                <p className="text-sm text-secondary mt-1">
                  Explore Cardiology, Dermatology, Neurology, Pediatrics &amp; more.
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <MaterialIcon name="diversity_1" className="text-[26px]" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('specialties')}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm"
            >
              <span>Explore All Specialties</span>
              <MaterialIcon name="arrow_forward" className="text-[18px]" />
            </button>
          </div>
        </div>

        {/* Right Column: Recommended Top Doctors + Health Alerts */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MaterialIcon name="verified" className="text-primary text-[20px]" />
                <h2 className="text-lg font-semibold text-on-surface">Recommended Doctors</h2>
              </div>
              <button
                type="button"
                onClick={() => onSelectSpecialty('all')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                See All Specialists
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {recommendedDoctors.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div
                      onClick={() => onSelectDoctor(doc)}
                      className="flex items-center gap-3 min-w-0 cursor-pointer"
                    >
                      <AvatarImage
                        src={doc.avatarUrl}
                        alt={doc.name}
                        fallbackText={doc.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-on-surface truncate">
                            {doc.name}
                          </span>
                          <MaterialIcon
                            name="check_circle"
                            className="text-primary text-[16px] shrink-0"
                          />
                        </div>
                        <span className="text-xs text-secondary truncate">
                          {doc.specialtyName} · {doc.clinicName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-lg text-on-surface text-xs font-semibold tabular-nums shrink-0">
                      <MaterialIcon name="star" filled className="text-amber-500 text-[14px]" />
                      <span>{doc.rating}/5</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
                      <MaterialIcon name="bolt" className="text-[16px]" />
                      <span>Next slot: {doc.nextSlotLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectDoctor(doc)}
                        className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors"
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartBooking(doc)}
                        className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container active:scale-95 transition-all shadow-sm"
                      >
                        Book Slot
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Health Alerts & Activity Feed */}
          <div className="flex flex-col gap-2.5">
            <h2 className="text-lg font-semibold text-on-surface">Health Alerts &amp; Activity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low">
                <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0">
                  <MaterialIcon name="qr_code_2" className="text-[18px]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-on-surface">
                    Clinic Check-in Pass Ready
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    Digital QR &amp; barcode pass activates automatically when an appointment is
                    confirmed.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low">
                <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                  <MaterialIcon name="event_repeat" className="text-[18px]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-on-surface">
                    Zero Wait-Time Guarantee
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    Free cancellation or instant rescheduling up to 4 hours prior to visit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
