import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  clearMedibotMessages,
  createAppointment,
  getDoctorById,
  getOrCreateUser,
  listAppointmentsByUser,
  listDoctors,
  listFavoriteDoctorIds,
  listMedibotMessages,
  listSpecialties,
  saveMedibotMessage,
  toggleFavoriteDoctor,
  updateAppointment,
  updateUserProfile,
} from './src/db/queries.ts';
import { createPool, isDbConfigured } from './src/db/index.ts';
import { seedDatabase } from './src/db/seed.ts';
import { isSupabaseConfigured } from './src/lib/supabase.ts';
import { AuthRequest, optionalAuth, requireAuth } from './src/middleware/auth.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function autoMigrateDatabase() {
  if (!isDbConfigured) return;
  try {
    const pool = createPool();
    const schemaPath = path.resolve(__dirname, 'supabase', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      await pool.query(sql);
      console.log('✓ Supabase PostgreSQL schema auto-verified and applied.');
    }
    await seedDatabase();
  } catch (err: any) {
    console.warn('[Supabase Setup] Auto-migration notice:', err?.message || err);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      supabase: isSupabaseConfigured ? 'configured' : 'not_configured',
      database: isDbConfigured ? 'configured' : 'not_configured',
    });
  });

  // Supabase & Database Integration Status endpoint
  app.get('/api/supabase/status', async (_req, res) => {
    let dbStatus = 'disconnected';
    let dbError: string | null = null;
    let tables: string[] = [];

    if (isDbConfigured) {
      try {
        const pool = createPool();
        const testRes = await pool.query('SELECT NOW() AS current_time');
        if (testRes.rows.length > 0) {
          dbStatus = 'connected';
          const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
          `);
          tables = tablesRes.rows.map((r: any) => r.table_name);
        }
      } catch (err: any) {
        dbStatus = 'error';
        dbError = err?.message || 'Database connection error';
      }
    } else {
      dbStatus = 'not_configured';
    }

    res.json({
      supabaseApi: {
        configured: isSupabaseConfigured,
        hasUrl: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
        hasKey: Boolean(
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_ANON_KEY ||
            process.env.VITE_SUPABASE_ANON_KEY
        ),
      },
      postgresDatabase: {
        configured: isDbConfigured,
        status: dbStatus,
        error: dbError,
        hasConnectionString: Boolean(
          process.env.DATABASE_URL ||
            process.env.SUPABASE_DATABASE_URL ||
            process.env.POSTGRES_URL
        ),
        existingTables: tables,
      },
      schemaReady:
        tables.includes('users') &&
        tables.includes('doctors') &&
        tables.includes('specialties') &&
        tables.includes('appointments'),
    });
  });

  // Trigger Supabase schema migration and seeding
  app.post('/api/supabase/setup', async (_req, res) => {
    try {
      if (!isDbConfigured) {
        return res.status(400).json({
          success: false,
          error:
            'DATABASE_URL is not configured in .env. Please configure your Supabase PostgreSQL connection string first.',
        });
      }
      const pool = createPool();
      const schemaPath = path.resolve(__dirname, 'supabase', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf-8');
        await pool.query(sql);
      }
      await seedDatabase();
      res.json({
        success: true,
        message: 'Supabase schema verified and initial catalog seeded successfully.',
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to apply Supabase schema or seed data.',
      });
    }
  });

  // Public catalog: Specialties & Doctors
  app.get('/api/specialties', async (_req, res) => {
    try {
      const items = await listSpecialties();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load specialties' });
    }
  });

  app.get('/api/doctors', async (req, res) => {
    try {
      const specialty = typeof req.query.specialty === 'string' ? req.query.specialty : undefined;
      const items = await listDoctors(specialty);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load doctors' });
    }
  });

  app.get('/api/doctors/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: 'Invalid doctor ID' });
      }
      const doc = await getDoctorById(id);
      if (!doc) {
        return res.status(404).json({ error: 'Doctor not found' });
      }
      res.json(doc);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load doctor' });
    }
  });

  // Authenticated Patient Profile
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@medislot.local`;
      const name = typeof req.user!.name === 'string' ? req.user!.name : undefined;
      const picture = typeof req.user!.picture === 'string' ? req.user!.picture : undefined;
      const profile = await getOrCreateUser(uid, email, name, picture);
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load profile' });
    }
  });

  app.put('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { fullName, phone, insuranceProvider } = req.body || {};
      const updated = await updateUserProfile(uid, {
        fullName: typeof fullName === 'string' ? fullName.trim() : undefined,
        phone: typeof phone === 'string' ? phone.trim() : undefined,
        insuranceProvider:
          typeof insuranceProvider === 'string' ? insuranceProvider.trim() : undefined,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update profile' });
    }
  });

  // Authenticated Appointments
  app.get('/api/appointments', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@medislot.local`;
      await getOrCreateUser(uid, email);
      const items = await listAppointmentsByUser(uid);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load appointments' });
    }
  });

  app.post('/api/appointments', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@medislot.local`;
      const user = await getOrCreateUser(uid, email);

      const {
        doctorId,
        patientName,
        patientEmail,
        patientPhone,
        appointmentDate,
        appointmentTime,
        visitFormat,
        patientNote,
      } = req.body || {};

      if (!doctorId || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ error: 'Doctor, date, and time slot are required.' });
      }

      const created = await createAppointment({
        userUid: uid,
        doctorId: Number(doctorId),
        patientName: String(patientName || user.fullName),
        patientEmail: String(patientEmail || user.email),
        patientPhone: String(patientPhone || user.phone || '+1 (555) 234-5678'),
        appointmentDate: String(appointmentDate),
        appointmentTime: String(appointmentTime),
        visitFormat: String(visitFormat || 'In-Clinic'),
        patientNote: String(patientNote || 'Routine clinical consultation'),
      });

      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to book appointment' });
    }
  });

  app.patch('/api/appointments/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: 'Invalid appointment ID' });
      }
      const { status, appointmentDate, appointmentTime, patientNote } = req.body || {};
      const updated = await updateAppointment(id, uid, {
        status: typeof status === 'string' ? status : undefined,
        appointmentDate: typeof appointmentDate === 'string' ? appointmentDate : undefined,
        appointmentTime: typeof appointmentTime === 'string' ? appointmentTime : undefined,
        patientNote: typeof patientNote === 'string' ? patientNote : undefined,
      });

      if (!updated) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update appointment' });
    }
  });

  // Authenticated Favorite Doctors
  app.get('/api/favorites', requireAuth, async (req: AuthRequest, res) => {
    try {
      const ids = await listFavoriteDoctorIds(req.user!.uid);
      res.json(ids);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load favorites' });
    }
  });

  app.post('/api/favorites/:doctorId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const doctorId = Number(req.params.doctorId);
      if (!Number.isFinite(doctorId)) {
        return res.status(400).json({ error: 'Invalid doctor ID' });
      }
      const result = await toggleFavoriteDoctor(req.user!.uid, doctorId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update favorite' });
    }
  });

  // MediBot AI Concierge
  app.get('/api/medibot/history', requireAuth, async (req: AuthRequest, res) => {
    try {
      const messages = await listMedibotMessages(req.user!.uid);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch MediBot history' });
    }
  });

  app.delete('/api/medibot/history', requireAuth, async (req: AuthRequest, res) => {
    try {
      await clearMedibotMessages(req.user!.uid);
      res.json({ cleared: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to clear MediBot history' });
    }
  });

  app.post('/api/medibot/chat', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { message } = req.body || {};
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Please enter a message for MediBot.' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured. Please check Settings > Secrets.',
        });
      }

      const [allDoctors, allSpecialties] = await Promise.all([
        listDoctors(),
        listSpecialties(),
      ]);

      const catalogContext = allDoctors
        .map(
          (d) =>
            `ID:${d.id} | ${d.name} (${d.credentials}) | Specialty: ${d.specialtyName} (${d.specialtySlug}) | Clinic: ${d.clinicName} (${d.distanceMiles}) | Rating: ${d.rating} (${d.reviewCount} reviews) | NextSlot: ${d.nextSlotLabel} | Copay: $${d.insuranceCopay} | Focus: ${d.focusTags}`
        )
        .join('\n');

      const specialtyContext = allSpecialties
        .map((s) => `${s.name} (${s.slug}): ${s.subtitle} — ${s.servicesSummary}`)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: message.trim(),
        config: {
          systemInstruction: `You are MediBot, the MediSlot AI scheduling concierge.
You assist solely with doctor discovery, symptom-to-specialty guidance, calendar matching, and clinic slot booking.
If a user describes severe emergency symptoms (chest pain radiating to arm, difficulty breathing, stroke signs), immediately advise calling 911.
Never diagnose diseases; recommend the most relevant medical specialty and doctor from the live clinic catalog below.
Keep replies warm, concise (2-4 sentences), and actionable.

Available Specialties:
${specialtyContext}

Available Doctors:
${catalogContext}`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Helpful, concise conversational response from MediBot.',
              },
              recommendedDoctorId: {
                type: Type.INTEGER,
                description:
                  'ID of the single best matching doctor from the catalog, or 0 if no specific doctor applies.',
              },
              recommendedSlot: {
                type: Type.STRING,
                description: 'Suggested time slot string, e.g. "Today at 2:30 PM" or empty.',
              },
              suggestedSpecialtySlug: {
                type: Type.STRING,
                description: 'Matching specialty slug from catalog, e.g. "dermatology" or empty.',
              },
            },
            required: ['reply', 'recommendedDoctorId', 'recommendedSlot', 'suggestedSpecialtySlug'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      let parsed: {
        reply: string;
        recommendedDoctorId: number;
        recommendedSlot: string;
        suggestedSpecialtySlug: string;
      };
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {
          reply: rawText || 'I can help match you with a verified specialist. Which specialty or symptom can I check for you?',
          recommendedDoctorId: 0,
          recommendedSlot: '',
          suggestedSpecialtySlug: '',
        };
      }

      const matchedDoctor =
        parsed.recommendedDoctorId > 0
          ? allDoctors.find((d) => d.id === parsed.recommendedDoctorId) || null
          : null;

      if (req.user?.uid) {
        await saveMedibotMessage({
          userUid: req.user.uid,
          role: 'user',
          content: message.trim(),
        });
        await saveMedibotMessage({
          userUid: req.user.uid,
          role: 'assistant',
          content: parsed.reply,
          recommendedDoctorId: matchedDoctor?.id ?? null,
          recommendedSlot: parsed.recommendedSlot || matchedDoctor?.nextSlotLabel || null,
        });
      }

      res.json({
        reply: parsed.reply,
        recommendedDoctor: matchedDoctor,
        recommendedSlot: parsed.recommendedSlot || matchedDoctor?.nextSlotLabel || '',
        suggestedSpecialtySlug: parsed.suggestedSpecialtySlug || '',
      });
    } catch (error: any) {
      console.error('MediBot AI error:', error);
      res.status(500).json({
        error: error?.message || 'MediBot encountered an error communicating with the AI service.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await autoMigrateDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MediSlot AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
