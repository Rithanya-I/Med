export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  avatarUrl: string;
  medId: string;
  insuranceProvider: string;
}

export interface Specialty {
  id: number;
  slug: string;
  name: string;
  subtitle: string;
  servicesSummary: string;
  doctorCount: number;
  categoryTag: string;
  featured: boolean;
  nextOpenSlot: string;
  iconName: string;
}

export interface Doctor {
  id: number;
  specialtySlug: string;
  name: string;
  credentials: string;
  title: string;
  specialtyName: string;
  clinicName: string;
  clinicAddress: string;
  distanceMiles: string;
  rating: string;
  reviewCount: number;
  yearsExp: number;
  patientsTreated: string;
  satisfactionRate: string;
  consultationFee: number;
  insuranceCopay: number;
  nextSlotLabel: string;
  matchPercent: number;
  bio: string;
  education: string;
  fellowship: string;
  licenseNumber: string;
  focusTags: string;
  avatarUrl: string;
  isFeatured: boolean;
  telehealthAvailable: boolean;
}

export interface Appointment {
  id: number;
  bookingRef: string;
  userUid: string;
  doctorId: number;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  visitFormat: string;
  status: string;
  patientNote: string;
  feeTotal: number;
  insuranceDiscount: number;
  patientDue: number;
  createdAt?: string;
  doctorName: string;
  doctorCredentials: string;
  doctorTitle: string;
  doctorSpecialty: string;
  doctorClinicName: string;
  doctorClinicAddress: string;
  doctorAvatarUrl: string;
  doctorRating: string;
  doctorReviewCount: number;
}

export interface ChatSource {
  type: 'document' | 'web';
  title: string;
  snippet: string;
  url?: string;
  score?: number;
}

export interface MediBotChatEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  recommendedDoctor?: Doctor | null;
  recommendedSlot?: string;
  suggestedSpecialtySlug?: string;
  sources?: ChatSource[];
}

export interface BookingDraft {
  doctor: Doctor;
  appointmentDate: string;
  appointmentTime: string;
  visitFormat: 'In-Clinic' | 'Telehealth';
  patientNote: string;
}

export type ScreenRoute =
  | 'welcome'
  | 'dashboard'
  | 'specialties'
  | 'doctors'
  | 'doctor-profile'
  | 'schedule'
  | 'review'
  | 'confirmed'
  | 'appointments'
  | 'medibot'
  | 'profile';
