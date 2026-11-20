import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  appointments,
  doctors,
  favoriteDoctors,
  medibotMessages,
  specialties,
  users,
} from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  fullName?: string,
  avatarUrl?: string
) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid));
    const displayName =
      fullName?.trim() || existing[0]?.fullName || email.split('@')[0] || 'Patient';

    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        fullName: displayName,
        avatarUrl: avatarUrl || '',
        medId: `#${uid.slice(0, 4).toUpperCase()}-P`,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(avatarUrl ? { avatarUrl } : {}),
        },
      })
      .returning();

    const user = result[0];

    // Seed starter appointments only if this user has zero appointments so dashboard/bookings feel alive immediately
    if (existing.length === 0) {
      const userAppts = await db
        .select()
        .from(appointments)
        .where(eq(appointments.userUid, uid));

      if (userAppts.length === 0) {
        const allDocs = await db.select().from(doctors).orderBy(asc(doctors.id));
        const dermDoc = allDocs.find((d) => d.specialtySlug === 'dermatology') || allDocs[0];
        const cardioDoc = allDocs.find((d) => d.specialtySlug === 'cardiology') || allDocs[1];

        if (dermDoc) {
          const suffix = uid.slice(0, 4).toUpperCase();
          await db
            .insert(appointments)
            .values([
              {
                bookingRef: `MS-${suffix}-DERM`,
                userUid: uid,
                doctorId: dermDoc.id,
                patientName: user.fullName,
                patientEmail: user.email,
                patientPhone: user.phone || '+1 (555) 234-5678',
                appointmentDate: 'Fri, May 24, 2024',
                appointmentTime: '02:30 PM',
                visitFormat: 'In-Clinic',
                status: 'confirmed',
                patientNote: 'Routine skin examination & preventive dermoscopy',
                feeTotal: dermDoc.consultationFee,
                insuranceDiscount: Math.max(0, dermDoc.consultationFee - dermDoc.insuranceCopay),
                patientDue: dermDoc.insuranceCopay,
              },
              ...(cardioDoc
                ? [
                    {
                      bookingRef: `MS-${suffix}-CARD`,
                      userUid: uid,
                      doctorId: cardioDoc.id,
                      patientName: user.fullName,
                      patientEmail: user.email,
                      patientPhone: user.phone || '+1 (555) 234-5678',
                      appointmentDate: 'Mon, Jun 3, 2024',
                      appointmentTime: '10:00 AM',
                      visitFormat: 'In-Clinic',
                      status: 'scheduled',
                      patientNote: 'Annual cardiovascular checkup & ECG review',
                      feeTotal: cardioDoc.consultationFee,
                      insuranceDiscount: Math.max(
                        0,
                        cardioDoc.consultationFee - cardioDoc.insuranceCopay
                      ),
                      patientDue: cardioDoc.insuranceCopay,
                    },
                  ]
                : []),
            ])
            .onConflictDoNothing();
        }
      }
    }

    return user;
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to load user profile.', { cause: error });
  }
}

export async function updateUserProfile(
  uid: string,
  updates: { fullName?: string; phone?: string; insuranceProvider?: string }
) {
  try {
    const result = await db
      .update(users)
      .set({
        ...(updates.fullName !== undefined ? { fullName: updates.fullName } : {}),
        ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
        ...(updates.insuranceProvider !== undefined
          ? { insuranceProvider: updates.insuranceProvider }
          : {}),
      })
      .where(eq(users.uid, uid))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in updateUserProfile:', error);
    throw new Error('Failed to update profile.', { cause: error });
  }
}

export async function listSpecialties() {
  try {
    return await db.select().from(specialties).orderBy(desc(specialties.featured), asc(specialties.id));
  } catch (error) {
    console.error('Database query failed in listSpecialties:', error);
    throw new Error('Failed to load specialties.', { cause: error });
  }
}

export async function listDoctors(specialtySlug?: string) {
  try {
    if (specialtySlug && specialtySlug !== 'all') {
      return await db
        .select()
        .from(doctors)
        .where(eq(doctors.specialtySlug, specialtySlug))
        .orderBy(desc(doctors.isFeatured), asc(doctors.id));
    }
    return await db.select().from(doctors).orderBy(desc(doctors.isFeatured), asc(doctors.id));
  } catch (error) {
    console.error('Database query failed in listDoctors:', error);
    throw new Error('Failed to load doctors.', { cause: error });
  }
}

export async function getDoctorById(doctorId: number) {
  try {
    const rows = await db.select().from(doctors).where(eq(doctors.id, doctorId));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getDoctorById:', error);
    throw new Error('Failed to load doctor profile.', { cause: error });
  }
}

export async function listAppointmentsByUser(uid: string) {
  try {
    const rows = await db
      .select({
        id: appointments.id,
        bookingRef: appointments.bookingRef,
        userUid: appointments.userUid,
        doctorId: appointments.doctorId,
        patientName: appointments.patientName,
        patientEmail: appointments.patientEmail,
        patientPhone: appointments.patientPhone,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        visitFormat: appointments.visitFormat,
        status: appointments.status,
        patientNote: appointments.patientNote,
        feeTotal: appointments.feeTotal,
        insuranceDiscount: appointments.insuranceDiscount,
        patientDue: appointments.patientDue,
        createdAt: appointments.createdAt,
        doctorName: doctors.name,
        doctorCredentials: doctors.credentials,
        doctorTitle: doctors.title,
        doctorSpecialty: doctors.specialtyName,
        doctorClinicName: doctors.clinicName,
        doctorClinicAddress: doctors.clinicAddress,
        doctorAvatarUrl: doctors.avatarUrl,
        doctorRating: doctors.rating,
        doctorReviewCount: doctors.reviewCount,
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(eq(appointments.userUid, uid))
      .orderBy(desc(appointments.createdAt));

    return rows;
  } catch (error) {
    console.error('Database query failed in listAppointmentsByUser:', error);
    throw new Error('Failed to load appointments.', { cause: error });
  }
}

export async function createAppointment(input: {
  userUid: string;
  doctorId: number;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  visitFormat: string;
  patientNote: string;
}) {
  try {
    const doctorRows = await db.select().from(doctors).where(eq(doctors.id, input.doctorId));
    const doctor = doctorRows[0];
    if (!doctor) {
      throw new Error('Selected doctor not found.');
    }

    const codePrefix = doctor.specialtySlug.slice(0, 4).toUpperCase();
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const bookingRef = `MS-${randNum}-${codePrefix}`;
    const feeTotal = doctor.consultationFee;
    const patientDue = doctor.insuranceCopay;
    const insuranceDiscount = Math.max(0, feeTotal - patientDue);

    const inserted = await db
      .insert(appointments)
      .values({
        bookingRef,
        userUid: input.userUid,
        doctorId: input.doctorId,
        patientName: input.patientName,
        patientEmail: input.patientEmail,
        patientPhone: input.patientPhone,
        appointmentDate: input.appointmentDate,
        appointmentTime: input.appointmentTime,
        visitFormat: input.visitFormat,
        status: 'confirmed',
        patientNote: input.patientNote,
        feeTotal,
        insuranceDiscount,
        patientDue,
      })
      .returning();

    return {
      ...inserted[0],
      doctorName: doctor.name,
      doctorCredentials: doctor.credentials,
      doctorTitle: doctor.title,
      doctorSpecialty: doctor.specialtyName,
      doctorClinicName: doctor.clinicName,
      doctorClinicAddress: doctor.clinicAddress,
      doctorAvatarUrl: doctor.avatarUrl,
      doctorRating: doctor.rating,
      doctorReviewCount: doctor.reviewCount,
    };
  } catch (error) {
    console.error('Database query failed in createAppointment:', error);
    throw new Error('Failed to create appointment.', { cause: error });
  }
}

export async function updateAppointment(
  appointmentId: number,
  userUid: string,
  updates: {
    status?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    patientNote?: string;
  }
) {
  try {
    const result = await db
      .update(appointments)
      .set({
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        ...(updates.appointmentDate !== undefined
          ? { appointmentDate: updates.appointmentDate }
          : {}),
        ...(updates.appointmentTime !== undefined
          ? { appointmentTime: updates.appointmentTime }
          : {}),
        ...(updates.patientNote !== undefined ? { patientNote: updates.patientNote } : {}),
      })
      .where(and(eq(appointments.id, appointmentId), eq(appointments.userUid, userUid)))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error('Database query failed in updateAppointment:', error);
    throw new Error('Failed to update appointment.', { cause: error });
  }
}

export async function listFavoriteDoctorIds(userUid: string) {
  try {
    const rows = await db
      .select({ doctorId: favoriteDoctors.doctorId })
      .from(favoriteDoctors)
      .where(eq(favoriteDoctors.userUid, userUid));
    return rows.map((r) => r.doctorId);
  } catch (error) {
    console.error('Database query failed in listFavoriteDoctorIds:', error);
    throw new Error('Failed to fetch favorites.', { cause: error });
  }
}

export async function toggleFavoriteDoctor(userUid: string, doctorId: number) {
  try {
    const existing = await db
      .select()
      .from(favoriteDoctors)
      .where(
        and(eq(favoriteDoctors.userUid, userUid), eq(favoriteDoctors.doctorId, doctorId))
      );

    if (existing.length > 0) {
      await db
        .delete(favoriteDoctors)
        .where(
          and(eq(favoriteDoctors.userUid, userUid), eq(favoriteDoctors.doctorId, doctorId))
        );
      return { favorited: false };
    } else {
      await db.insert(favoriteDoctors).values({ userUid, doctorId });
      return { favorited: true };
    }
  } catch (error) {
    console.error('Database query failed in toggleFavoriteDoctor:', error);
    throw new Error('Failed to toggle favorite doctor.', { cause: error });
  }
}

export async function listMedibotMessages(userUid: string) {
  try {
    return await db
      .select()
      .from(medibotMessages)
      .where(eq(medibotMessages.userUid, userUid))
      .orderBy(asc(medibotMessages.id));
  } catch (error) {
    console.error('Database query failed in listMedibotMessages:', error);
    throw new Error('Failed to load MediBot history.', { cause: error });
  }
}

export async function saveMedibotMessage(input: {
  userUid: string;
  role: string;
  content: string;
  recommendedDoctorId?: number | null;
  recommendedSlot?: string | null;
}) {
  try {
    const result = await db
      .insert(medibotMessages)
      .values({
        userUid: input.userUid,
        role: input.role,
        content: input.content,
        recommendedDoctorId: input.recommendedDoctorId ?? null,
        recommendedSlot: input.recommendedSlot ?? null,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in saveMedibotMessage:', error);
    throw new Error('Failed to save MediBot message.', { cause: error });
  }
}

export async function clearMedibotMessages(userUid: string) {
  try {
    await db.delete(medibotMessages).where(eq(medibotMessages.userUid, userUid));
  } catch (error) {
    console.error('Database query failed in clearMedibotMessages:', error);
    throw new Error('Failed to reset MediBot history.', { cause: error });
  }
}
