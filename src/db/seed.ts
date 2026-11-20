import { db } from './index.ts';
import { doctors, specialties } from './schema.ts';

export const INITIAL_SPECIALTIES = [
  {
    slug: 'dermatology',
    name: 'Dermatology',
    subtitle: 'Advanced Skin & Laser Medicine',
    servicesSummary: 'Dermoscopy, Acne, Skin Cancer Screening & Cosmetic Laser Surgery',
    doctorCount: 14,
    categoryTag: 'Popular',
    featured: true,
    nextOpenSlot: 'Today, 2:30 PM',
    iconName: 'dermatology',
  },
  {
    slug: 'cardiology',
    name: 'Cardiology',
    subtitle: 'Heart, Vascular & Preventive Care',
    servicesSummary: 'ECG, Echocardiogram, Hypertension, Lipid Management & Heart Health',
    doctorCount: 18,
    categoryTag: 'Critical',
    featured: true,
    nextOpenSlot: 'Tomorrow, 10:00 AM',
    iconName: 'cardiology',
  },
  {
    slug: 'neurology',
    name: 'Neurology',
    subtitle: 'Brain, Nerve & Cognitive Health',
    servicesSummary: 'Migraine, Stroke Care, Epilepsy, Neuropathy & Neuro-rehabilitation',
    doctorCount: 11,
    categoryTag: 'Specialized',
    featured: true,
    nextOpenSlot: 'Wed, May 22, 11:30 AM',
    iconName: 'psychology',
  },
  {
    slug: 'pediatrics',
    name: 'Pediatrics',
    subtitle: 'Child Wellness & Preventive Health',
    servicesSummary: 'Well-Child Exams, Immunizations, Pediatric Urgent Care & Growth Tracking',
    doctorCount: 22,
    categoryTag: 'Family',
    featured: true,
    nextOpenSlot: 'Today, 4:00 PM',
    iconName: 'child_care',
  },
  {
    slug: 'orthopedics',
    name: 'Orthopedics',
    subtitle: 'Bone, Joint & Sports Medicine',
    servicesSummary: 'Arthroscopy, Joint Replacement, Fracture Care & Sports Rehab',
    doctorCount: 15,
    categoryTag: 'Surgical',
    featured: false,
    nextOpenSlot: 'Thu, May 23, 9:00 AM',
    iconName: 'sports_gymnastics',
  },
  {
    slug: 'ophthalmology',
    name: 'Ophthalmology',
    subtitle: 'Complete Vision & Eye Care',
    servicesSummary: 'Comprehensive Eye Exams, Cataract Evaluation, Glaucoma & Retina Care',
    doctorCount: 9,
    categoryTag: 'Senses',
    featured: false,
    nextOpenSlot: 'Fri, May 24, 1:15 PM',
    iconName: 'visibility',
  },
  {
    slug: 'psychiatry',
    name: 'Psychiatry & Wellness',
    subtitle: 'Mental Health & Behavioral Therapy',
    servicesSummary: 'Anxiety, Depression, Cognitive Behavioral Therapy & Medication Management',
    doctorCount: 16,
    categoryTag: 'Mental Health',
    featured: false,
    nextOpenSlot: 'Tomorrow, 3:00 PM',
    iconName: 'mood',
  },
  {
    slug: 'general-medicine',
    name: 'Primary Care',
    subtitle: 'Internal Medicine & Family Health',
    servicesSummary: 'Annual Physicals, Preventive Screenings, Diabetes & Chronic Care',
    doctorCount: 28,
    categoryTag: 'Essential',
    featured: false,
    nextOpenSlot: 'Today, 1:00 PM',
    iconName: 'medical_services',
  },
];

export const INITIAL_DOCTORS = [
  {
    specialtySlug: 'dermatology',
    name: 'Dr. Aisha Ray',
    credentials: 'MD, FAAD',
    title: 'Lead Dermatologist & Cutaneous Oncologist',
    specialtyName: 'Dermatology',
    clinicName: 'Beacon Hill Dermatology & Laser Center',
    clinicAddress: '142 Bowdoin St, Boston, MA 02108',
    distanceMiles: '0.8 mi',
    rating: '4.9',
    reviewCount: 312,
    yearsExp: 14,
    patientsTreated: '12k+',
    satisfactionRate: '99%',
    consultationFee: 180,
    insuranceCopay: 35,
    nextSlotLabel: 'Today, 2:30 PM',
    matchPercent: 98,
    bio: 'Board-certified dermatologist specializing in early detection of melanoma, complex acne regimens, psoriasis biologics, and laser skin resurfacing. Dr. Ray trained at Harvard Medical School and has served as clinical lead for over a decade.',
    education: 'Harvard Medical School (MD, 2010)',
    fellowship: 'Massachusetts General Hospital — Cutaneous Oncology Fellowship',
    licenseNumber: 'MA-MED-849201',
    focusTags: 'Acne, Mole Mapping, Psoriasis, Eczema, Preventive Dermoscopy',
    avatarUrl:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
    isFeatured: true,
    telehealthAvailable: true,
  },
  {
    specialtySlug: 'cardiology',
    name: 'Dr. Marcus Vance',
    credentials: 'MD, FACC',
    title: 'Senior Cardiovascular Specialist',
    specialtyName: 'Cardiology',
    clinicName: 'Metro Heart & Vascular Pavilion',
    clinicAddress: '300 Longwood Ave, Boston, MA 02115',
    distanceMiles: '1.4 mi',
    rating: '4.8',
    reviewCount: 428,
    yearsExp: 19,
    patientsTreated: '18k+',
    satisfactionRate: '97%',
    consultationFee: 240,
    insuranceCopay: 45,
    nextSlotLabel: 'Tomorrow, 10:00 AM',
    matchPercent: 96,
    bio: 'Fellow of the American College of Cardiology with extensive experience in coronary artery disease prevention, echocardiography, cardiac arrhythmias, and post-infarct rehabilitation.',
    education: 'Johns Hopkins School of Medicine (MD, 2005)',
    fellowship: 'Brigham and Women’s Hospital — Interventional Cardiology',
    licenseNumber: 'MA-MED-621980',
    focusTags: 'Chest Pain, Arrhythmia, High Cholesterol, Hypertension, Holter Monitoring',
    avatarUrl:
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
    isFeatured: true,
    telehealthAvailable: true,
  },
  {
    specialtySlug: 'cardiology',
    name: 'Dr. Sarah Jenkins',
    credentials: 'MD, FACC',
    title: 'Consultant Cardiologist & Heart Failure Specialist',
    specialtyName: 'Cardiology',
    clinicName: 'Cambridge Heart Wellness Center',
    clinicAddress: '75 Mount Auburn St, Cambridge, MA 02138',
    distanceMiles: '2.1 mi',
    rating: '4.9',
    reviewCount: 289,
    yearsExp: 12,
    patientsTreated: '9k+',
    satisfactionRate: '98%',
    consultationFee: 210,
    insuranceCopay: 40,
    nextSlotLabel: 'Wed, May 22, 11:00 AM',
    matchPercent: 94,
    bio: 'Dedicated preventive cardiologist focusing on women’s cardiovascular health, structural heart disease, early atherosclerosis screening, and lifestyle-integrated heart recovery.',
    education: 'Columbia University Vagelos College of Physicians and Surgeons (MD, 2012)',
    fellowship: 'Mount Sinai Hospital — Advanced Heart Failure Fellowship',
    licenseNumber: 'MA-MED-910243',
    focusTags: 'Women’s Heart Health, Heart Failure, Stress Testing, ECG Interpretation',
    avatarUrl:
      'https://images.unsplash.com/photo-1594824813570-5b20689b6574?auto=format&fit=crop&q=80&w=300',
    isFeatured: true,
    telehealthAvailable: true,
  },
  {
    specialtySlug: 'pediatrics',
    name: 'Dr. Sunita Rao',
    credentials: 'MD, PhD, FAAP',
    title: 'Director of Pediatric Medicine',
    specialtyName: 'Pediatrics',
    clinicName: 'Riverside Children’s Clinic',
    clinicAddress: '55 Fruit St, Boston, MA 02114',
    distanceMiles: '1.1 mi',
    rating: '5.0',
    reviewCount: 512,
    yearsExp: 16,
    patientsTreated: '22k+',
    satisfactionRate: '100%',
    consultationFee: 150,
    insuranceCopay: 25,
    nextSlotLabel: 'Today, 4:00 PM',
    matchPercent: 99,
    bio: 'Renowned pediatrician and child health researcher. Specializes in newborn wellness, pediatric developmental milestones, childhood asthma, allergies, and preventive vaccines.',
    education: 'Stanford University School of Medicine (MD/PhD, 2008)',
    fellowship: 'Boston Children’s Hospital — Pediatric Ambulatory Medicine',
    licenseNumber: 'MA-MED-734109',
    focusTags: 'Immunizations, Asthma, Newborn Care, Developmental Milestones, Pediatric Triage',
    avatarUrl:
      'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=300',
    isFeatured: true,
    telehealthAvailable: true,
  },
  {
    specialtySlug: 'orthopedics',
    name: 'Dr. Aris Thorne',
    credentials: 'MD, MS',
    title: 'Orthopedic Surgeon & Sports Medicine Director',
    specialtyName: 'Orthopedics',
    clinicName: 'Back Bay Orthopedics & Joint Institute',
    clinicAddress: '800 Boylston St, Boston, MA 02199',
    distanceMiles: '1.7 mi',
    rating: '4.8',
    reviewCount: 374,
    yearsExp: 15,
    patientsTreated: '11k+',
    satisfactionRate: '96%',
    consultationFee: 260,
    insuranceCopay: 50,
    nextSlotLabel: 'Thu, May 23, 9:00 AM',
    matchPercent: 93,
    bio: 'Orthopedic specialist in sports injury rehabilitation, knee and shoulder arthroscopy, ACL reconstruction, tendon repairs, and joint preservation therapies.',
    education: 'University of Pennsylvania School of Medicine (MD, 2009)',
    fellowship: 'Hospital for Special Surgery (HSS) — Sports Medicine',
    licenseNumber: 'MA-MED-592817',
    focusTags: 'Knee Pain, Shoulder Arthroscopy, Sports Injuries, Joint Injections, Fractures',
    avatarUrl:
      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300',
    isFeatured: false,
    telehealthAvailable: false,
  },
  {
    specialtySlug: 'neurology',
    name: 'Dr. Elena Rostova',
    credentials: 'MD',
    title: 'Neurologist & Headache Specialist',
    specialtyName: 'Neurology',
    clinicName: 'New England Neurological Associates',
    clinicAddress: '170 Commonwealth Ave, Boston, MA 02116',
    distanceMiles: '1.9 mi',
    rating: '4.9',
    reviewCount: 245,
    yearsExp: 13,
    patientsTreated: '7.5k+',
    satisfactionRate: '98%',
    consultationFee: 220,
    insuranceCopay: 40,
    nextSlotLabel: 'Wed, May 22, 11:30 AM',
    matchPercent: 95,
    bio: 'Board-certified neurologist specializing in chronic refractory migraine, cluster headaches, peripheral neuropathy, cognitive disorders, and Botox therapeutic injections.',
    education: 'Yale School of Medicine (MD, 2011)',
    fellowship: 'Mayo Clinic — Clinical Neurophysiology & Headache Medicine',
    licenseNumber: 'MA-MED-819302',
    focusTags: 'Migraine, Neuropathy, Botox for Migraines, Dizziness, Sleep Disorders',
    avatarUrl:
      'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=300',
    isFeatured: true,
    telehealthAvailable: true,
  },
  {
    specialtySlug: 'general-medicine',
    name: 'Dr. David Chen',
    credentials: 'MD',
    title: 'Lead Primary Care Physician',
    specialtyName: 'Primary Care',
    clinicName: 'Downtown Medical Associates',
    clinicAddress: '100 Summer St, Boston, MA 02110',
    distanceMiles: '0.4 mi',
    rating: '4.9',
    reviewCount: 620,
    yearsExp: 17,
    patientsTreated: '25k+',
    satisfactionRate: '99%',
    consultationFee: 140,
    insuranceCopay: 20,
    nextSlotLabel: 'Today, 1:00 PM',
    matchPercent: 97,
    bio: 'Dedicated primary care physician with extensive experience in chronic disease management (diabetes, hypertension, thyroid conditions), preventive screenings, and patient-centered lifestyle medicine.',
    education: 'Tufts University School of Medicine (MD, 2007)',
    fellowship: 'Beth Israel Deaconess Medical Center — Internal Medicine Residency',
    licenseNumber: 'MA-MED-482019',
    focusTags: 'Annual Physical, Diabetes, Preventive Health, Blood Pressure, Wellness Checks',
    avatarUrl:
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300',
    isFeatured: false,
    telehealthAvailable: true,
  },
  {
    specialtySlug: 'ophthalmology',
    name: 'Dr. Maya Patel',
    credentials: 'MD',
    title: 'Comprehensive Ophthalmologist & Cornea Specialist',
    specialtyName: 'Ophthalmology',
    clinicName: 'Boston Eye & Vision Care',
    clinicAddress: '243 Charles St, Boston, MA 02114',
    distanceMiles: '0.9 mi',
    rating: '4.8',
    reviewCount: 198,
    yearsExp: 11,
    patientsTreated: '6.8k+',
    satisfactionRate: '97%',
    consultationFee: 175,
    insuranceCopay: 35,
    nextSlotLabel: 'Fri, May 24, 1:15 PM',
    matchPercent: 92,
    bio: 'Ophthalmologist providing advanced diagnostics for dry eye syndrome, cataract surgery evaluations, diabetic retinopathy screening, and prescription vision corrections.',
    education: 'Georgetown University School of Medicine (MD, 2013)',
    fellowship: 'Massachusetts Eye and Ear — Cornea & External Disease',
    licenseNumber: 'MA-MED-940182',
    focusTags: 'Dry Eye, Cataracts, Glaucoma Screening, Vision Loss, Diabetic Eye Exam',
    avatarUrl:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
    isFeatured: false,
    telehealthAvailable: false,
  },
];

export async function seedDatabase() {
  console.log('Seeding Supabase / PostgreSQL database...');

  // 1. Seed Specialties
  const existingSpecialties = await db.select().from(specialties);
  if (existingSpecialties.length === 0) {
    console.log(`Inserting ${INITIAL_SPECIALTIES.length} specialties...`);
    await db.insert(specialties).values(INITIAL_SPECIALTIES);
    console.log('Specialties inserted successfully.');
  } else {
    console.log(`Specialties already exist (${existingSpecialties.length} records). Skipping.`);
  }

  // 2. Seed Doctors
  const existingDoctors = await db.select().from(doctors);
  if (existingDoctors.length === 0) {
    console.log(`Inserting ${INITIAL_DOCTORS.length} doctors...`);
    await db.insert(doctors).values(INITIAL_DOCTORS);
    console.log('Doctors inserted successfully.');
  } else {
    console.log(`Doctors already exist (${existingDoctors.length} records). Skipping.`);
  }

  console.log('Database seed check complete!');
}

// If executed directly via CLI
if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase()
    .then(() => {
      console.log('Seeding finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
