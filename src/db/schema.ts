import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone').default('').notNull(),
  avatarUrl: text('avatar_url').default('').notNull(),
  medId: text('med_id').default('#8841-P').notNull(),
  insuranceProvider: text('insurance_provider').default('Aetna / BlueCross Verified').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const specialties = pgTable('specialties', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  subtitle: text('subtitle').notNull(),
  servicesSummary: text('services_summary').notNull(),
  doctorCount: integer('doctor_count').notNull(),
  categoryTag: text('category_tag').notNull(),
  featured: boolean('featured').default(false).notNull(),
  nextOpenSlot: text('next_open_slot').default('Today, 2:30 PM').notNull(),
  iconName: text('icon_name').default('medical_services').notNull(),
});

export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  specialtySlug: text('specialty_slug').notNull(),
  name: text('name').notNull(),
  credentials: text('credentials').notNull(),
  title: text('title').notNull(),
  specialtyName: text('specialty_name').notNull(),
  clinicName: text('clinic_name').notNull(),
  clinicAddress: text('clinic_address').notNull(),
  distanceMiles: text('distance_miles').notNull(),
  rating: text('rating').notNull(),
  reviewCount: integer('review_count').notNull(),
  yearsExp: integer('years_exp').notNull(),
  patientsTreated: text('patients_treated').notNull(),
  satisfactionRate: text('satisfaction_rate').notNull(),
  consultationFee: integer('consultation_fee').notNull(),
  insuranceCopay: integer('insurance_copay').notNull(),
  nextSlotLabel: text('next_slot_label').notNull(),
  matchPercent: integer('match_percent').default(95).notNull(),
  bio: text('bio').notNull(),
  education: text('education').notNull(),
  fellowship: text('fellowship').notNull(),
  licenseNumber: text('license_number').notNull(),
  focusTags: text('focus_tags').notNull(),
  avatarUrl: text('avatar_url').notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  telehealthAvailable: boolean('telehealth_available').default(true).notNull(),
});

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  bookingRef: text('booking_ref').notNull().unique(),
  userUid: text('user_uid').notNull(),
  doctorId: integer('doctor_id')
    .references(() => doctors.id)
    .notNull(),
  patientName: text('patient_name').notNull(),
  patientEmail: text('patient_email').notNull(),
  patientPhone: text('patient_phone').default('').notNull(),
  appointmentDate: text('appointment_date').notNull(),
  appointmentTime: text('appointment_time').notNull(),
  visitFormat: text('visit_format').notNull(),
  status: text('status').default('confirmed').notNull(),
  patientNote: text('patient_note').default('').notNull(),
  feeTotal: integer('fee_total').notNull(),
  insuranceDiscount: integer('insurance_discount').notNull(),
  patientDue: integer('patient_due').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const favoriteDoctors = pgTable('favorite_doctors', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  doctorId: integer('doctor_id')
    .references(() => doctors.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const medibotMessages = pgTable('medibot_messages', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  recommendedDoctorId: integer('recommended_doctor_id'),
  recommendedSlot: text('recommended_slot'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const doctorsRelations = relations(doctors, ({ many }) => ({
  appointments: many(appointments),
  favorites: many(favoriteDoctors),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  doctor: one(doctors, {
    fields: [appointments.doctorId],
    references: [doctors.id],
  }),
}));

export const favoriteDoctorsRelations = relations(favoriteDoctors, ({ one }) => ({
  doctor: one(doctors, {
    fields: [favoriteDoctors.doctorId],
    references: [doctors.id],
  }),
}));
