import { GoogleGenAI, Type } from '@google/genai';
import { globalVectorStore, SearchResult } from './vectorStore.ts';
import { WebSearchService, WebSearchResult } from './webSearch.ts';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface RagSource {
  type: 'document' | 'web';
  title: string;
  snippet: string;
  url?: string;
  score?: number;
}

export interface RagResponse {
  reply: string;
  sources: RagSource[];
  recommendedDoctor?: any | null;
  recommendedSlot?: string;
  suggestedSpecialtySlug?: string;
}

export class RagEngine {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        this.ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'medislot-rag-agent',
            },
          },
        });
      } catch (err) {
        console.warn('RagEngine: Gemini initialization error:', err);
      }
    }
  }

  /**
   * Check for life-threatening acute red flag emergencies
   */
  private checkEmergency(query: string): string | null {
    const lower = query.toLowerCase();
    const emergencyPatterns = [
      /\bchest pain\b/,
      /\bheart attack\b/,
      /\bradiating (to|down) (my|the)? ?left arm\b/,
      /\bcan't breathe\b/,
      /\bcannot breathe\b/,
      /\bsevere shortness of breath\b/,
      /\bstroke\b/,
      /\bface drooping\b/,
      /\bsudden numbness\b/,
      /\bthunderclap headache\b/,
      /\bworst headache of my life\b/,
      /\bsevere bleeding\b/,
      /\bhemorrhage\b/,
      /\banaphylaxis\b/,
      /\bthroat closing\b/,
    ];

    for (const pattern of emergencyPatterns) {
      if (pattern.test(lower)) {
        return (
          '🚨 **EMERGENCY MEDICAL NOTICE**:\n\n' +
          'Based on the symptoms you reported, this may be an acute, life-threatening medical emergency. ' +
          '**Please immediately call 911 (or your local emergency services) or proceed to the nearest emergency room.**\n\n' +
          'MediSlot is designed strictly for scheduled outpatient consultations and cannot triage acute emergencies.'
        );
      }
    }
    return null;
  }

  /**
   * Intelligent RAG answer generator when Gemini API is offline/unconfigured
   */
  private generateGroundedFallback(
    message: string,
    history: ChatMessage[],
    docResults: SearchResult[],
    webResults: WebSearchResult[],
    allDoctors: any[],
    allSpecialties: any[]
  ): {
    reply: string;
    recommendedDoctorId: number;
    recommendedSlot: string;
    suggestedSpecialtySlug: string;
  } {
    const lower = message.toLowerCase();

    // 1. Doctor matching
    let matchedDoc: any = null;
    for (const doc of allDoctors) {
      const parts = doc.name.toLowerCase().split(' ');
      const lastName = parts[parts.length - 1];
      const firstName = parts[1] || '';
      if (lower.includes(lastName) || (firstName && lower.includes(firstName))) {
        matchedDoc = doc;
        break;
      }
    }

    // 2. Specialty matching
    let matchedSpecialty: any = null;
    for (const spec of allSpecialties) {
      if (
        lower.includes(spec.name.toLowerCase()) ||
        lower.includes(spec.slug.toLowerCase()) ||
        (spec.subtitle && lower.includes(spec.subtitle.toLowerCase()))
      ) {
        matchedSpecialty = spec;
        if (!matchedDoc) {
          matchedDoc = allDoctors.find((d) => d.specialtySlug === spec.slug);
        }
        break;
      }
    }

    // 2b. Symptom to Specialty & Doctor mapping
    if (!matchedDoc) {
      if (
        lower.includes('rash') ||
        lower.includes('acne') ||
        lower.includes('acnee') ||
        lower.includes('skin') ||
        lower.includes('eczema') ||
        lower.includes('mole')
      ) {
        matchedDoc = allDoctors.find((d) => d.specialtySlug === 'dermatology');
      } else if (
        lower.includes('heart') ||
        lower.includes('palpitat') ||
        lower.includes('cardio') ||
        lower.includes('bp') ||
        lower.includes('blood pressure')
      ) {
        matchedDoc = allDoctors.find((d) => d.specialtySlug === 'cardiology');
      } else if (
        lower.includes('pediatric') ||
        lower.includes('child') ||
        lower.includes('infant') ||
        lower.includes('baby') ||
        lower.includes('vaccin')
      ) {
        matchedDoc = allDoctors.find((d) => d.specialtySlug === 'pediatrics');
      } else if (
        lower.includes('migraine') ||
        lower.includes('headache') ||
        lower.includes('neuro') ||
        lower.includes('dizzy')
      ) {
        matchedDoc = allDoctors.find((d) => d.specialtySlug === 'neurology');
      } else if (
        lower.includes('knee') ||
        lower.includes('joint') ||
        lower.includes('ortho') ||
        lower.includes('bone') ||
        lower.includes('back pain')
      ) {
        matchedDoc = allDoctors.find((d) => d.specialtySlug === 'orthopedics');
      } else if (
        lower.includes('mental') ||
        lower.includes('anxiety') ||
        lower.includes('depress') ||
        lower.includes('stress') ||
        lower.includes('psychiat')
      ) {
        matchedDoc = allDoctors.find((d) => d.specialtySlug === 'psychiatry');
      } else if (
        lower.includes('diabetes') ||
        lower.includes('thyroid') ||
        lower.includes('hormone') ||
        lower.includes('endocrine')
      ) {
        matchedDoc = allDoctors.find((d) => d.specialtySlug === 'endocrinology');
      }
    }

    // 3. Build answer grounded on retrieved chunks
    const parts: string[] = [];

    if (docResults.length > 0) {
      const topChunk = docResults[0];
      const secondChunk = docResults[1];

      parts.push(`**Based on our verified knowledge base (${topChunk.chunk.documentName}):**\n`);
      parts.push(topChunk.chunk.text.trim());

      if (secondChunk && secondChunk.score > 0.15 && secondChunk.chunk.documentName !== topChunk.chunk.documentName) {
        parts.push(`\n\n*Additional reference from ${secondChunk.chunk.documentName}:*\n${secondChunk.chunk.text.trim()}`);
      }
    } else if (webResults.length > 0) {
      const topWeb = webResults[0];
      parts.push(`**Live Reference Search (${topWeb.title}):**\n`);
      parts.push(`${topWeb.snippet}\n\nSource: [${topWeb.title}](${topWeb.url})`);
    } else {
      // General question handling
      if (lower.includes('cost') || lower.includes('fee') || lower.includes('copay') || lower.includes('insurance')) {
        parts.push(
          'MediSlot participates with leading insurance networks (BlueCross, Aetna, UnitedHealthcare, Medicare). ' +
          'Specialist insurance copays generally range from **$20 to $45**. Transparent self-pay rates range between **$140 and $260** depending on the clinical specialty.'
        );
      } else if (lower.includes('slot') || lower.includes('today') || lower.includes('appointment') || lower.includes('book')) {
        const doc = matchedDoc || allDoctors[0];
        parts.push(
          `Same-day appointment slots are released daily at 7:00 AM. For example, **${doc.name}** (${doc.specialtyName}) has an open consultation slot at **${doc.nextSlotLabel}**.`
        );
      } else {
        parts.push(
          `Thank you for asking: "${message.trim()}". ` +
          'I am MediBot, your clinical scheduling and triage assistant. ' +
          'I can help you review clinic policies, explain our doctors’ specialties, evaluate your symptoms for appropriate outpatient referral, or retrieve details from uploaded medical documents.'
        );
      }
    }

    // 4. Clinical recommendation recommendation
    if (matchedDoc) {
      parts.push(
        `\n\n💡 **Recommended Specialist**: **${matchedDoc.name}** (${matchedDoc.title}, ${matchedDoc.clinicName}). Next opening is **${matchedDoc.nextSlotLabel}** with a $${matchedDoc.insuranceCopay} copay.`
      );
    }

    return {
      reply: parts.join('\n'),
      recommendedDoctorId: matchedDoc?.id || 0,
      recommendedSlot: matchedDoc?.nextSlotLabel || '',
      suggestedSpecialtySlug: matchedSpecialty?.slug || matchedDoc?.specialtySlug || '',
    };
  }

  /**
   * Main RAG Chat Execution
   */
  async processChat(params: {
    message: string;
    history?: ChatMessage[];
    useWebSearch?: boolean;
    allDoctors: any[];
    allSpecialties: any[];
  }): Promise<RagResponse> {
    const { message, history = [], useWebSearch = true, allDoctors, allSpecialties } = params;

    // 1. Emergency Safety Filter
    const emergencyReply = this.checkEmergency(message);
    if (emergencyReply) {
      return {
        reply: emergencyReply,
        sources: [],
        recommendedDoctor: null,
        recommendedSlot: undefined,
      };
    }

    // 2. Vector Search (Semantic Retrieval)
    const docResults = await globalVectorStore.search(message, 4, 0.12);

    // 3. Live Web Search (if enabled or if question asks for current/external info)
    let webResults: WebSearchResult[] = [];
    if (useWebSearch) {
      // Check if question asks about external facts, research, definitions, or recent news
      const searchRes = await WebSearchService.search(message, 3);
      if (searchRes.available && searchRes.results.length > 0) {
        webResults = searchRes.results;
      }
    }

    // 4. Assemble Grounding Sources
    const sources: RagSource[] = [];

    for (const res of docResults) {
      sources.push({
        type: 'document',
        title: res.chunk.documentName,
        snippet: res.chunk.text.slice(0, 300) + (res.chunk.text.length > 300 ? '...' : ''),
        score: Math.round(res.score * 100) / 100,
      });
    }

    for (const w of webResults) {
      sources.push({
        type: 'web',
        title: w.title,
        snippet: w.snippet,
        url: w.url,
      });
    }

    // 5. Generate Grounded Response with LLM (or Fallback)
    let reply = '';
    let recommendedDoctorId = 0;
    let recommendedSlot = '';
    let suggestedSpecialtySlug = '';

    if (this.ai) {
      try {
        // Build Doctor & Specialty Catalog text
        const catalogContext = allDoctors
          .map(
            (d) =>
              `ID:${d.id} | ${d.name} (${d.credentials}) | Specialty: ${d.specialtyName} (${d.specialtySlug}) | Clinic: ${d.clinicName} (${d.distanceMiles}) | Rating: ${d.rating}★ (${d.reviewCount} reviews) | NextSlot: ${d.nextSlotLabel} | Copay: $${d.insuranceCopay} | Focus: ${d.focusTags}`
          )
          .join('\n');

        const specialtyContext = allSpecialties
          .map((s) => `${s.name} (${s.slug}): ${s.subtitle} — ${s.servicesSummary}`)
          .join('\n');

        // Build Knowledge Context
        const docsContext = docResults.length > 0
          ? docResults
              .map(
                (r, idx) =>
                  `[DOCUMENT ${idx + 1}: ${r.chunk.documentName} (Match: ${Math.round(r.score * 100)}%)]\n${r.chunk.text}`
              )
              .join('\n\n')
          : 'No directly matching knowledge base document found.';

        const webContext = webResults.length > 0
          ? webResults
              .map(
                (w, idx) =>
                  `[WEB RESULT ${idx + 1}: "${w.title}" - URL: ${w.url}]\n${w.snippet}`
              )
              .join('\n\n')
          : 'No external web search results retrieved.';

        // Build Multi-turn History Context
        const conversationContext = history
          .slice(-6)
          .map((h) => `${h.role === 'user' ? 'Patient' : 'MediBot'}: ${h.content}`)
          .join('\n');

        const systemPrompt = `You are MediBot, an intelligent Retrieval-Augmented Generation (RAG) clinical and scheduling assistant for MediSlot.

CORE OPERATIONAL RULES:
1. ACCURACY & GROUNDING: Ground your answers firmly in the provided KNOWLEDGE BASE DOCUMENTS and LIVE WEB RESULTS.
2. CITATIONS: When information is drawn from documents or web search, cite the source clearly (e.g. "[Source: Document Name]" or "[Source: Web Title](URL)").
3. HONESTY: If the retrieved documents or web results do not contain enough information to answer a question completely, explain the limitation honestly and suggest how the user can verify or find the answer. Never invent or hallucinate facts.
4. INTELLIGENT QUESTION HANDLING:
   - Handle spelling mistakes, typos, and incomplete questions with semantic understanding.
   - Answer multi-part questions thoroughly.
   - Explain complex medical topics in simple, accessible language.
   - Maintain multi-turn context from conversation history.
5. CLINICAL BOUNDARIES:
   - Never provide definitive medical diagnoses or prescribe medications.
   - Always recommend the most appropriate medical specialty and specialist from the clinic catalog when symptoms or clinical care are discussed.
   - For life-threatening emergencies, insist on calling 911 immediately.
6. FORMATTING: Use clean, friendly markdown with bullet points where appropriate.

RETRIEVED KNOWLEDGE BASE DOCUMENTS:
${docsContext}

RETRIEVED LIVE WEB SEARCH RESULTS:
${webContext}

AVAILABLE SPECIALTIES:
${specialtyContext}

AVAILABLE CLINIC DOCTORS:
${catalogContext}`;

        const promptText = conversationContext
          ? `Conversation History:\n${conversationContext}\n\nCurrent User Question: ${message.trim()}`
          : `User Question: ${message.trim()}`;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: promptText,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.STRING,
                  description: 'Comprehensive, accurate, grounded answer with clear citations.',
                },
                recommendedDoctorId: {
                  type: Type.INTEGER,
                  description:
                    'ID of the best matching doctor from the catalog, or 0 if no specific doctor applies.',
                },
                recommendedSlot: {
                  type: Type.STRING,
                  description: 'Suggested time slot string from catalog, or empty string.',
                },
                suggestedSpecialtySlug: {
                  type: Type.STRING,
                  description: 'Matching specialty slug from catalog, or empty string.',
                },
              },
              required: ['reply', 'recommendedDoctorId', 'recommendedSlot', 'suggestedSpecialtySlug'],
            },
          },
        });

        const raw = (response.text ?? '{}').trim();
        const parsed = JSON.parse(raw);
        reply = parsed.reply || '';
        recommendedDoctorId = parsed.recommendedDoctorId || 0;
        recommendedSlot = parsed.recommendedSlot || '';
        suggestedSpecialtySlug = parsed.suggestedSpecialtySlug || '';
      } catch (genErr) {
        console.warn('Gemini RAG generation error, falling back to grounded synthesis:', genErr);
        const fallback = this.generateGroundedFallback(
          message,
          history,
          docResults,
          webResults,
          allDoctors,
          allSpecialties
        );
        reply = fallback.reply;
        recommendedDoctorId = fallback.recommendedDoctorId;
        recommendedSlot = fallback.recommendedSlot;
        suggestedSpecialtySlug = fallback.suggestedSpecialtySlug;
      }
    } else {
      const fallback = this.generateGroundedFallback(
        message,
        history,
        docResults,
        webResults,
        allDoctors,
        allSpecialties
      );
      reply = fallback.reply;
      recommendedDoctorId = fallback.recommendedDoctorId;
      recommendedSlot = fallback.recommendedSlot;
      suggestedSpecialtySlug = fallback.suggestedSpecialtySlug;
    }

    const matchedDoctor =
      recommendedDoctorId > 0
        ? allDoctors.find((d) => d.id === recommendedDoctorId) || null
        : null;

    return {
      reply,
      sources,
      recommendedDoctor: matchedDoctor,
      recommendedSlot: recommendedSlot || matchedDoctor?.nextSlotLabel || '',
      suggestedSpecialtySlug: suggestedSpecialtySlug || matchedDoctor?.specialtySlug || '',
    };
  }
}

export const globalRagEngine = new RagEngine();
