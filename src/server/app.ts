import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import express, { Express, Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
} from '../db/queries.ts';
import { createPool, isDbConfigured } from '../db/index.ts';
import { seedDatabase } from '../db/seed.ts';
import { isSupabaseConfigured } from '../lib/supabase.ts';
import { AuthRequest, optionalAuth, requireAuth } from '../middleware/auth.ts';
import { globalRagEngine } from './ragEngine.ts';
import { globalVectorStore } from './vectorStore.ts';
import { DocumentProcessor } from './documentProcessor.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const apiKey = process.env.GEMINI_API_KEY;
const isGeminiKeyValid = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');

const ai = isGeminiKeyValid
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

function fallbackTriage(message: string, allDoctors: any[], _allSpecialties: any[]) {
  const lower = message.toLowerCase();

  // 1. Direct doctor name matching
  for (const doc of allDoctors) {
    const lastName = doc.name.split(' ').slice(-1)[0].toLowerCase();
    const firstName = doc.name.split(' ')[1]?.toLowerCase();
    if (lower.includes(lastName) || (firstName && lower.includes(firstName))) {
      return {
        reply: `${doc.name} is our ${doc.title} (${doc.credentials}) at ${doc.clinicName}. Rated ${doc.rating}★ over ${doc.reviewCount} verified reviews with a ${doc.satisfactionRate} satisfaction rate. Consultation fee is $${doc.consultationFee} ($${doc.insuranceCopay} insurance copay). Next opening: ${doc.nextSlotLabel}.`,
        recommendedDoctorId: doc.id,
        recommendedSlot: doc.nextSlotLabel,
        suggestedSpecialtySlug: doc.specialtySlug,
      };
    }
  }

  // 2. Fees, copay, insurance questions
  if (lower.includes('copay') || lower.includes('fee') || lower.includes('cost') || lower.includes('insurance') || lower.includes('price')) {
    const doc = allDoctors[0];
    return {
      reply:
        'All MediSlot specialist visits are covered under standard in-network health plans (Aetna, BlueCross, UnitedHealthcare). Typical insurance copays range from $20 to $45, while self-pay transparent consultation fees range from $140 to $260. Which specialty or doctor would you like to verify?',
      recommendedDoctorId: doc?.id || 1,
      recommendedSlot: doc?.nextSlotLabel || 'Today, 2:30 PM',
      suggestedSpecialtySlug: doc?.specialtySlug || 'dermatology',
    };
  }

  // 3. Open slots today
  if (lower.includes('today') || lower.includes('now') || lower.includes('open slot') || lower.includes('available today')) {
    const todayDoc = allDoctors.find((d) => d.nextSlotLabel.toLowerCase().includes('today')) || allDoctors[0];
    return {
      reply: `We currently have same-day clinical openings available today! For example, ${todayDoc.name} (${todayDoc.specialtyName}) has an open consultation slot at ${todayDoc.nextSlotLabel}. Would you like to reserve this slot?`,
      recommendedDoctorId: todayDoc.id,
      recommendedSlot: todayDoc.nextSlotLabel,
      suggestedSpecialtySlug: todayDoc.specialtySlug,
    };
  }

  // 4. Mental Health & Psychiatry
  if (lower.includes('anxiety') || lower.includes('depress') || lower.includes('psychiat') || lower.includes('mental') || lower.includes('stress') || lower.includes('therapy')) {
    const doc = allDoctors.find((d) => d.specialtySlug === 'psychiatry') || allDoctors.find((d) => d.specialtySlug === 'neurology') || allDoctors[0];
    return {
      reply:
        'For stress, anxiety, mood support, or behavioral therapy, our compassionate clinical team is here for you. We provide confidential consultations with holistic care plans.',
      recommendedDoctorId: doc?.id || 6,
      recommendedSlot: doc?.nextSlotLabel || 'Tomorrow, 3:00 PM',
      suggestedSpecialtySlug: 'psychiatry',
    };
  }

  if (
    lower.includes('chest') ||
    lower.includes('heart') ||
    lower.includes('palpitat') ||
    lower.includes('cardio') ||
    lower.includes('breath')
  ) {
    const doc = allDoctors.find((d) => d.specialtySlug === 'cardiology') || allDoctors[0];
    return {
      reply:
        'For chest and cardiovascular symptoms, prompt attention is critical. I recommend scheduling an evaluation with our cardiology team or calling 911 if experiencing sudden severe pain or shortness of breath.',
      recommendedDoctorId: doc?.id || 2,
      recommendedSlot: doc?.nextSlotLabel || 'Tomorrow, 10:00 AM',
      suggestedSpecialtySlug: 'cardiology',
    };
  }

  if (
    lower.includes('skin') ||
    lower.includes('rash') ||
    lower.includes('acne') ||
    lower.includes('mole') ||
    lower.includes('derm') ||
    lower.includes('eczema')
  ) {
    const doc = allDoctors.find((d) => d.specialtySlug === 'dermatology') || allDoctors[0];
    return {
      reply:
        'Skin conditions, rashes, and cutaneous lesions are best diagnosed via a direct dermoscopic exam. Dr. Aisha Ray at Beacon Hill Dermatology has open slots today.',
      recommendedDoctorId: doc?.id || 1,
      recommendedSlot: doc?.nextSlotLabel || 'Today, 2:30 PM',
      suggestedSpecialtySlug: 'dermatology',
    };
  }

  if (
    lower.includes('child') ||
    lower.includes('kid') ||
    lower.includes('baby') ||
    lower.includes('pediat') ||
    lower.includes('infant')
  ) {
    const doc = allDoctors.find((d) => d.specialtySlug === 'pediatrics') || allDoctors[0];
    return {
      reply:
        'Our pediatric department provides dedicated care for infants and children. Dr. Sunita Rao is available for comprehensive well-child exams and pediatric triage.',
      recommendedDoctorId: doc?.id || 4,
      recommendedSlot: doc?.nextSlotLabel || 'Today, 4:00 PM',
      suggestedSpecialtySlug: 'pediatrics',
    };
  }

  if (
    lower.includes('headache') ||
    lower.includes('migraine') ||
    lower.includes('nerve') ||
    lower.includes('dizzy') ||
    lower.includes('neuro')
  ) {
    const doc = allDoctors.find((d) => d.specialtySlug === 'neurology') || allDoctors[0];
    return {
      reply:
        'Chronic headaches, neurological discomfort, and neuropathic symptoms can be thoroughly evaluated by our neurology specialists. Dr. Elena Rostova has upcoming consultation slots.',
      recommendedDoctorId: doc?.id || 6,
      recommendedSlot: doc?.nextSlotLabel || 'Wed, May 22, 11:30 AM',
      suggestedSpecialtySlug: 'neurology',
    };
  }

  if (
    lower.includes('bone') ||
    lower.includes('joint') ||
    lower.includes('knee') ||
    lower.includes('ortho') ||
    lower.includes('shoulder') ||
    lower.includes('fracture') ||
    lower.includes('sprain')
  ) {
    const doc = allDoctors.find((d) => d.specialtySlug === 'orthopedics') || allDoctors[0];
    return {
      reply:
        'Joint discomfort, sports injuries, and musculoskeletal conditions can be evaluated with joint imaging and physical exam by Dr. Aris Thorne.',
      recommendedDoctorId: doc?.id || 5,
      recommendedSlot: doc?.nextSlotLabel || 'Thu, May 23, 9:00 AM',
      suggestedSpecialtySlug: 'orthopedics',
    };
  }

  if (
    lower.includes('eye') ||
    lower.includes('vision') ||
    lower.includes('sight') ||
    lower.includes('cataract') ||
    lower.includes('dry eye')
  ) {
    const doc = allDoctors.find((d) => d.specialtySlug === 'ophthalmology') || allDoctors[0];
    return {
      reply:
        'For vision changes, eye irritation, or cornea evaluations, Dr. Maya Patel at Boston Eye Care provides complete diagnostic assessments.',
      recommendedDoctorId: doc?.id || 8,
      recommendedSlot: doc?.nextSlotLabel || 'Fri, May 24, 1:15 PM',
      suggestedSpecialtySlug: 'ophthalmology',
    };
  }

  const doc = allDoctors.find((d) => d.specialtySlug === 'general-medicine') || allDoctors[0];
  return {
    reply: `I can help match you with our top verified specialists. Based on your symptoms, an initial consultation with Primary Care (${doc?.name || 'Dr. David Chen'}) is recommended for a personalized diagnostic review.`,
    recommendedDoctorId: doc?.id || 7,
    recommendedSlot: doc?.nextSlotLabel || 'Today, 1:00 PM',
    suggestedSpecialtySlug: doc?.specialtySlug || 'general-medicine',
  };
}

export function createExpressApp(): Express {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // CORS support
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  const apiRouter = Router();

  // Health check
  apiRouter.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      supabase: isSupabaseConfigured ? 'configured' : 'not_configured',
      database: isDbConfigured ? 'configured' : 'not_configured',
    });
  });

  // Supabase & Database Integration Status endpoint
  apiRouter.get('/supabase/status', async (_req, res) => {
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
  apiRouter.post('/supabase/setup', async (_req, res) => {
    try {
      if (!isDbConfigured) {
        return res.status(400).json({
          success: false,
          error:
            'DATABASE_URL is not configured in .env. Please configure your Supabase PostgreSQL connection string first.',
        });
      }
      const pool = createPool();
      const schemaPath = path.resolve(rootDir, 'supabase', 'schema.sql');
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
  apiRouter.get('/specialties', async (_req, res) => {
    try {
      const items = await listSpecialties();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load specialties' });
    }
  });

  apiRouter.get('/doctors', async (req, res) => {
    try {
      const specialty = typeof req.query.specialty === 'string' ? req.query.specialty : undefined;
      const items = await listDoctors(specialty);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load doctors' });
    }
  });

  apiRouter.get('/doctors/:id', async (req, res) => {
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
  apiRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
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

  apiRouter.put('/me', requireAuth, async (req: AuthRequest, res) => {
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
  apiRouter.get('/appointments', requireAuth, async (req: AuthRequest, res) => {
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

  apiRouter.post('/appointments', requireAuth, async (req: AuthRequest, res) => {
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

  apiRouter.patch('/appointments/:id', requireAuth, async (req: AuthRequest, res) => {
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
  apiRouter.get('/favorites', requireAuth, async (req: AuthRequest, res) => {
    try {
      const ids = await listFavoriteDoctorIds(req.user!.uid);
      res.json(ids);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load favorites' });
    }
  });

  apiRouter.post('/favorites/:doctorId', requireAuth, async (req: AuthRequest, res) => {
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
  apiRouter.get('/medibot/history', requireAuth, async (req: AuthRequest, res) => {
    try {
      const messages = await listMedibotMessages(req.user!.uid);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch MediBot history' });
    }
  });

  apiRouter.delete('/medibot/history', requireAuth, async (req: AuthRequest, res) => {
    try {
      await clearMedibotMessages(req.user!.uid);
      res.json({ cleared: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to clear MediBot history' });
    }
  });

  // --- RAG Document Knowledge Base Endpoints ---

  apiRouter.get('/rag/documents', (_req, res) => {
    try {
      const docs = globalVectorStore.listDocuments();
      const totalChunks = globalVectorStore.getChunkCount();
      res.json({
        documents: docs,
        totalChunks,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to retrieve knowledge base documents' });
    }
  });

  apiRouter.post('/rag/upload', async (req, res) => {
    try {
      const { filename, fileType, contentBase64 } = req.body || {};
      if (!filename || !contentBase64) {
        return res.status(400).json({ error: 'Filename and base64 content are required.' });
      }

      // Process document into text & overlapping chunks
      const processed = await DocumentProcessor.process(filename, fileType || 'text/plain', contentBase64);
      if (!processed.chunks || processed.chunks.length === 0) {
        return res.status(400).json({ error: 'Could not extract any meaningful text chunks from this file.' });
      }

      // Embed & add to vector store
      const doc = await globalVectorStore.addDocument(
        {
          name: processed.name,
          fileType: processed.fileType,
          size: processed.size,
          description: `User-uploaded document with ${processed.chunks.length} extracted semantic chunks.`,
        },
        processed.chunks
      );

      res.json({
        success: true,
        document: doc,
        chunkCount: processed.chunks.length,
        extractedLength: processed.text.length,
      });
    } catch (error: any) {
      console.error('RAG document upload error:', error);
      res.status(500).json({ error: error.message || 'Failed to process and index document' });
    }
  });

  apiRouter.delete('/rag/documents/:id', (req, res) => {
    try {
      const { id } = req.params;
      const deleted = globalVectorStore.deleteDocument(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Document not found in vector store.' });
      }
      res.json({ success: true, deletedId: id });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete document' });
    }
  });

  // --- RAG Chatbot Endpoint ---

  apiRouter.post('/rag/chat', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { message, history, useWebSearch } = req.body || {};
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Please enter a message for MediBot.' });
      }

      const [allDoctors, allSpecialties] = await Promise.all([
        listDoctors(),
        listSpecialties(),
      ]);

      const ragResult = await globalRagEngine.processChat({
        message: message.trim(),
        history: Array.isArray(history) ? history : [],
        useWebSearch: useWebSearch !== false,
        allDoctors,
        allSpecialties,
      });

      if (req.user?.uid) {
        await saveMedibotMessage({
          userUid: req.user.uid,
          role: 'user',
          content: message.trim(),
        });
        await saveMedibotMessage({
          userUid: req.user.uid,
          role: 'assistant',
          content: ragResult.reply,
          recommendedDoctorId: ragResult.recommendedDoctor?.id ?? null,
          recommendedSlot: ragResult.recommendedSlot || ragResult.recommendedDoctor?.nextSlotLabel || null,
        });
      }

      res.json({
        reply: ragResult.reply,
        sources: ragResult.sources,
        recommendedDoctor: ragResult.recommendedDoctor,
        recommendedSlot: ragResult.recommendedSlot,
        suggestedSpecialtySlug: ragResult.suggestedSpecialtySlug,
      });
    } catch (error: any) {
      console.error('RAG Chat endpoint error:', error);
      res.status(500).json({
        error: error?.message || 'MediBot encountered an error in the RAG retrieval engine.',
      });
    }
  });

  // Backward-compatible alias for existing callers
  apiRouter.post('/medibot/chat', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { message, history, useWebSearch } = req.body || {};
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Please enter a message for MediBot.' });
      }

      const [allDoctors, allSpecialties] = await Promise.all([
        listDoctors(),
        listSpecialties(),
      ]);

      const ragResult = await globalRagEngine.processChat({
        message: message.trim(),
        history: Array.isArray(history) ? history : [],
        useWebSearch: useWebSearch !== false,
        allDoctors,
        allSpecialties,
      });

      if (req.user?.uid) {
        await saveMedibotMessage({
          userUid: req.user.uid,
          role: 'user',
          content: message.trim(),
        });
        await saveMedibotMessage({
          userUid: req.user.uid,
          role: 'assistant',
          content: ragResult.reply,
          recommendedDoctorId: ragResult.recommendedDoctor?.id ?? null,
          recommendedSlot: ragResult.recommendedSlot || ragResult.recommendedDoctor?.nextSlotLabel || null,
        });
      }

      res.json({
        reply: ragResult.reply,
        sources: ragResult.sources,
        recommendedDoctor: ragResult.recommendedDoctor,
        recommendedSlot: ragResult.recommendedSlot,
        suggestedSpecialtySlug: ragResult.suggestedSpecialtySlug,
      });
    } catch (error: any) {
      console.error('MediBot AI error:', error);
      res.status(500).json({
        error: error?.message || 'MediBot encountered an error communicating with the AI service.',
      });
    }
  });

  // Mount API router on both /api and root / for seamless Vercel serverless + local dev routing
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  return app;
}

export default createExpressApp();
