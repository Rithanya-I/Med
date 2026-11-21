import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  fileType: string;
  size: number;
  chunkCount: number;
  uploadedAt: string;
  description?: string;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

/**
 * Deterministic semantic TF-IDF hashing embedding generator (384 dimensions)
 * Used as high-reliability local fallback when Gemini API key is missing or quota-limited.
 */
function generateDeterministicEmbedding(text: string, dimensions = 384): number[] {
  const vector = new Float64Array(dimensions);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = normalized.split(/\s+/).filter((w) => w.length > 1);

  if (words.length === 0) {
    return Array.from(vector);
  }

  // Common medical and stopword weighting
  const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'have']);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (stopWords.has(word)) continue;

    // Word hash
    const hash = crypto.createHash('md5').update(word).digest();
    const index1 = hash.readUInt16LE(0) % dimensions;
    const index2 = hash.readUInt16LE(2) % dimensions;
    const index3 = hash.readUInt16LE(4) % dimensions;

    vector[index1] += 1.5;
    vector[index2] += 0.8;
    vector[index3] += 0.4;

    // Bigram context for word sequences
    if (i < words.length - 1) {
      const bigram = `${word}_${words[i + 1]}`;
      const biHash = crypto.createHash('md5').update(bigram).digest();
      const biIndex = biHash.readUInt16LE(0) % dimensions;
      vector[biIndex] += 1.2;
    }
  }

  // L2 Normalize
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= norm;
    }
  }

  return Array.from(vector);
}

/**
 * Compute Cosine Similarity between two normalized vectors:
 * dot(A, B) / (||A|| * ||B||)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class VectorStore {
  private documents: Map<string, KnowledgeDocument> = new Map();
  private chunks: DocumentChunk[] = [];
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        this.ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'medislot-rag' } },
        });
      } catch (err) {
        console.warn('VectorStore: Gemini API initialization error, using local embeddings:', err);
      }
    }
    this.seedDefaultKnowledgeBase();
  }

  /**
   * Generate vector embedding for a piece of text
   */
  async embed(text: string): Promise<number[]> {
    if (this.ai) {
      try {
        const response: any = await this.ai.models.embedContent({
          model: 'text-embedding-004',
          contents: text.slice(0, 2048),
        });
        if (response?.embedding?.values && response.embedding.values.length > 0) {
          return response.embedding.values;
        }
        if (response?.embeddings?.[0]?.values && response.embeddings[0].values.length > 0) {
          return response.embeddings[0].values;
        }
      } catch (err) {
        // Fall back gracefully to local deterministic semantic vectors
      }
    }
    return generateDeterministicEmbedding(text);
  }

  /**
   * Add a document and its pre-chunked texts
   */
  async addDocument(
    doc: Omit<KnowledgeDocument, 'id' | 'chunkCount' | 'uploadedAt'>,
    chunkTexts: string[]
  ): Promise<KnowledgeDocument> {
    const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newDoc: KnowledgeDocument = {
      ...doc,
      id,
      chunkCount: chunkTexts.length,
      uploadedAt: new Date().toISOString(),
    };

    this.documents.set(id, newDoc);

    for (let i = 0; i < chunkTexts.length; i++) {
      const text = chunkTexts[i];
      const embedding = await this.embed(text);
      this.chunks.push({
        id: `${id}_chunk_${i}`,
        documentId: id,
        documentName: doc.name,
        chunkIndex: i,
        text,
        embedding,
        metadata: {
          fileType: doc.fileType,
          totalChunks: chunkTexts.length,
        },
      });
    }

    return newDoc;
  }

  /**
   * Search vector store using cosine similarity
   */
  async search(query: string, topK = 4, threshold = 0.1): Promise<SearchResult[]> {
    if (this.chunks.length === 0 || !query.trim()) return [];

    const queryEmbedding = await this.embed(query);

    const scored: SearchResult[] = this.chunks.map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    // Filter by threshold and sort descending by score
    return scored
      .filter((item) => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * List all indexed documents
   */
  listDocuments(): KnowledgeDocument[] {
    return Array.from(this.documents.values());
  }

  /**
   * Get total chunk count
   */
  getChunkCount(): number {
    return this.chunks.length;
  }

  /**
   * Delete a document and its chunks
   */
  deleteDocument(documentId: string): boolean {
    const existed = this.documents.delete(documentId);
    if (existed) {
      this.chunks = this.chunks.filter((c) => c.documentId !== documentId);
    }
    return existed;
  }

  /**
   * Pre-seed standard clinical knowledge base documents
   */
  private seedDefaultKnowledgeBase() {
    const seedDocs = [
      {
        name: 'MediSlot Clinical Operations & Scheduling Protocols.md',
        fileType: 'markdown',
        size: 3840,
        description: 'Comprehensive policy on clinical booking, copay rates, cancellations, telehealth, and specialist intake.',
        chunks: [
          `MediSlot Scheduling Policies & Timelines:
Patients can reserve in-clinic and telehealth consultations up to 30 days in advance. Same-day appointments are released daily at 7:00 AM local time for urgent specialist consultations across all participating outpatient clinics.
Walk-in slots are subject to triage assessment and specialist availability. Appointments can be rescheduled or cancelled without fee up to 2 hours before the scheduled consultation window. Cancellations within 2 hours or no-shows may incur a $25 administrative clinic fee.`,

          `Insurance Coverage & Transparent Copays:
MediSlot partners with major healthcare networks including BlueCross BlueShield, Aetna, UnitedHealthcare, Cigna, Medicare, and Kaiser Permanente.
Standard specialist copays range between $20 and $45 depending on the tier of your healthcare insurance plan.
For self-pay or uninsured patients, MediSlot guarantees upfront transparent pricing ranging from $140 for initial primary consultations to $260 for advanced specialty evaluations (cardiology, neurology, endocrinology). Lab orders and diagnostic imaging are billed separately at negotiated discount rates.`,

          `Telehealth & Virtual Care Guidelines:
Virtual consultations are conducted via end-to-end encrypted HIPAA-compliant HD video. Telehealth is available for dermatology visual follow-ups, psychiatric medication management, routine pediatric follow-ups, and chronic endocrine management (diabetes, thyroid).
Patients must have a smartphone, tablet, or webcam-enabled computer. If a physical palpation, ECG, dermatologic biopsy, or joint manipulation is clinically indicated, the specialist will immediately transition the session to an in-clinic expedited visit.`,

          `Prescription Refills and Lab Orders:
Clinicians can transmit digital e-prescriptions directly to your designated retail or mail-order pharmacy during your consultation. Controlled substance refills require an active verified identity check and an in-person or synchronous video evaluation within the last 90 days in compliance with federal telemedicine statutes.`,
        ],
      },
      {
        name: 'Emergency Medical Triage & Red-Flag Guidance.md',
        fileType: 'markdown',
        size: 2950,
        description: 'Protocols for detecting acute life-threatening symptoms and escalating to emergency medical services.',
        chunks: [
          `Red-Flag Medical Emergencies (Immediate 911 / ER Escalation):
MediSlot and MediBot do not treat emergent or life-threatening conditions. If a patient reports any of the following symptoms, the system MUST advise calling 911 or visiting the nearest hospital emergency department immediately:
1. Chest pain, heavy pressure, squeezing, or pain radiating to the left arm, neck, jaw, or back.
2. Sudden onset of severe shortness of breath, gasping, or inability to speak in full sentences.
3. Sudden numbness, weakness, or paralysis of the face, arm, or leg, especially on one side (FAST stroke symptoms).
4. Sudden confusion, difficulty speaking or understanding speech.
5. Sudden severe headache described as "the worst headache of my life" (thunderclap headache).
6. Severe uncontrolled hemorrhage, coughing up large amounts of blood, or severe trauma.
7. Anaphylaxis: facial/tongue swelling, throat constriction, wheezing, or widespread hives after allergen exposure.`,

          `Urgent Care vs Outpatient Specialist Guidelines:
When symptoms are severe but not immediately life-threatening—such as moderate fever with ear pain, minor lacerations requiring sutures, simple sprains without bone deformity, or mild asthma flare responsive to rescue inhaler—patients should visit an urgent care center or book a same-day MediSlot outpatient slot.
Chronic conditions, recurrent migraines, persistent skin eruptions, routine endocrine checks, or joint wear are ideal for scheduled specialist appointments.`,
        ],
      },
      {
        name: 'MediSlot Specialist Directory & Clinical Specialties.md',
        fileType: 'markdown',
        size: 3420,
        description: 'Detailed overview of medical specialties, conditions treated, and board-certified clinic teams.',
        chunks: [
          `Dermatology Services:
Conditions treated: Acne vulgaris, eczema, psoriasis, dermatitis, suspicious moles, skin cancer screening, rosacea, hair loss (alopecia), and acute allergic rashes.
Clinic: Bay Area Skin & Wellness Center.
Lead Specialist: Dr. Sarah Jenkins, MD, FAAD (12+ years experience, Harvard Medical School trained).
Procedures offered: Cryotherapy, mole biopsies, patch testing, and laser therapy. Consult fee: $180 ($30 copay).`,

          `Cardiology & Heart Health:
Conditions treated: Hypertension, arrhythmias, palpitations, coronary artery disease monitoring, hyperlipidemia, congestive heart failure follow-up, and preventive cardiovascular screening.
Clinic: Metro Heart & Vascular Institute.
Lead Specialist: Dr. Marcus Vance, MD, FACC (16+ years experience, Johns Hopkins Fellow).
Procedures: Resting 12-lead ECG, 24-hour Holter monitoring, echocardiograms, and stress testing. Consult fee: $240 ($40 copay).`,

          `Pediatrics & Adolescent Care:
Conditions treated: Well-child physicals, childhood immunizations, developmental milestones, pediatric asthma, ear infections (otitis media), and acute childhood fevers.
Clinic: Sunshine Valley Pediatric Care.
Lead Specialist: Dr. Emily Chen, MD, FAAP (9+ years experience, Stanford Children's Health).
Features: Same-day sick appointments, child-friendly examination rooms. Consult fee: $150 ($25 copay).`,

          `Neurology & Headache Clinic:
Conditions treated: Intractable migraines, cluster headaches, peripheral neuropathy, epilepsy management, tremors, and cognitive assessments.
Clinic: Golden Gate Neurological Specialists.
Lead Specialist: Dr. Robert Patel, MD, PhD (14+ years experience, UCSF Neurology).
Advanced therapies: Botox for chronic migraine, nerve blocks, and EEG evaluations. Consult fee: $220 ($35 copay).`,

          `Orthopedics & Sports Medicine:
Conditions treated: ACL/meniscus injuries, runner's knee, rotator cuff tears, osteoarthritis, tendonitis, lumbar strains, and fracture management.
Clinic: Apex Sports Medicine & Ortho Group.
Lead Specialist: Dr. James Wilson, MD (11+ years experience).
Features: Onsite digital X-ray, ultrasound-guided joint injections, and personalized physical therapy referrals. Consult fee: $200 ($35 copay).`,

          `Psychiatry & Behavioral Health:
Conditions treated: Major depressive disorder, generalized anxiety, panic disorder, adult ADHD evaluations, and PTSD.
Clinic: Mindful Path Psychiatric Health.
Lead Specialist: Dr. Anita Roy, MD (10+ years experience).
Modality: Combined evidence-based psychopharmacology and cognitive supportive therapy. Telehealth available. Consult fee: $210 ($30 copay).`,
        ],
      },
      {
        name: 'Patient Rights, HIPAA Compliance & Data Security.md',
        fileType: 'markdown',
        size: 2150,
        description: 'Security policies, confidentiality, encrypted communications, and HIPAA privacy safeguards.',
        chunks: [
          `HIPAA Privacy & Security Compliance:
MediSlot strictly adheres to Health Insurance Portability and Accountability Act (HIPAA) standards and HITECH requirements. All electronic protected health information (ePHI) is encrypted at rest using AES-256 and in transit using TLS 1.3.
Patient consultation notes, uploaded diagnostic documents, and chat histories are segregated and accessible solely to authorized clinical providers and the individual patient.`,

          `Data Retention and Erasure:
Patients have the full right to review, download, or request permanent deletion of their uploaded medical files and chat histories at any time through their MediSlot account settings or by clicking "Clear Chat History" in the MediBot interface.`,
        ],
      },
    ];

    for (const doc of seedDocs) {
      const id = `doc_seed_${Math.random().toString(36).slice(2, 8)}`;
      const newDoc: KnowledgeDocument = {
        id,
        name: doc.name,
        fileType: doc.fileType,
        size: doc.size,
        chunkCount: doc.chunks.length,
        uploadedAt: new Date().toISOString(),
        description: doc.description,
      };
      this.documents.set(id, newDoc);

      doc.chunks.forEach((text, i) => {
        this.chunks.push({
          id: `${id}_chunk_${i}`,
          documentId: id,
          documentName: doc.name,
          chunkIndex: i,
          text,
          embedding: generateDeterministicEmbedding(text),
          metadata: {
            isSeed: true,
            description: doc.description,
          },
        });
      });
    }
  }
}

export const globalVectorStore = new VectorStore();
