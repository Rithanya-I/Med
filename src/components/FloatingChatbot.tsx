import React, { useEffect, useRef, useState } from 'react';
import { MaterialIcon } from './CommonUI';
import { useAuth } from '../context/AuthContext';
import { Doctor, MediBotChatEntry, ChatSource } from '../types';

interface FloatingChatbotProps {
  doctors: Doctor[];
  onSelectDoctor: (doctor: Doctor) => void;
  onReserveDoctorSlot: (doctor: Doctor, slot?: string) => void;
}

interface KnowledgeDoc {
  id: string;
  name: string;
  fileType: string;
  size: number;
  chunkCount: number;
  uploadedAt: string;
  description?: string;
}

const CHATBOT_PROMPTS = [
  { label: '📋 Clinic Cancellation Policy', query: 'What is the MediSlot cancellation and rescheduling policy?' },
  { label: '💰 Specialist Copay Rates', query: 'What are the consultation fees and insurance copays for your specialists?' },
  { label: '🩺 Rash / Acne Evaluation', query: 'I have a sudden skin rash and acne flare-up. Which specialist can see me today?' },
  { label: '❤️ Palpitations & Heart', query: 'I feel occasional heart palpitations and chest tightness.' },
  { label: '👶 Pediatric Telehealth', query: 'Are routine pediatric checkups available via telehealth video?' },
  { label: '🧠 Migraine & Light Sensitivity', query: 'I am experiencing chronic throbbing migraines and light sensitivity.' },
  { label: '📅 Open Slots Today', query: 'Which doctors have open slots available today?' },
];

export const FloatingChatbot: React.FC<FloatingChatbotProps> = ({
  doctors,
  onSelectDoctor,
  onReserveDoctorSlot,
}) => {
  const { firebaseUser, profile, authFetch } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<MediBotChatEntry[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // RAG Features State
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const firstName =
    profile?.fullName?.split(' ')[0] ||
    firebaseUser?.displayName?.split(' ')[0] ||
    'there';

  // Check speech recognition support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  // Fetch knowledge base documents list
  const loadKnowledgeDocs = async () => {
    try {
      const res = await authFetch('/api/rag/documents');
      if (res.ok) {
        const data = await res.json();
        setKnowledgeDocs(data.documents || []);
        setTotalChunks(data.totalChunks || 0);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadKnowledgeDocs();
    }
  }, [isOpen]);

  // Sync history when opened
  useEffect(() => {
    if (!isOpen || !firebaseUser) return;
    let active = true;

    const loadHistory = async () => {
      try {
        const res = await authFetch('/api/medibot/history');
        if (!res.ok) return;
        const rows: Array<{
          id: number;
          role: 'user' | 'assistant';
          content: string;
          recommendedDoctorId: number | null;
          recommendedSlot: string | null;
        }> = await res.json();
        if (!active || rows.length === 0) return;

        const mapped: MediBotChatEntry[] = rows.map((r) => ({
          id: String(r.id),
          role: r.role,
          content: r.content,
          timestamp: 'Synced',
          recommendedDoctor: r.recommendedDoctorId
            ? doctors.find((d) => d.id === r.recommendedDoctorId) || null
            : null,
          recommendedSlot: r.recommendedSlot || undefined,
        }));
        setMessages(mapped);
      } catch {
        // Fall through
      }
    };

    loadHistory();
    return () => {
      active = false;
    };
  }, [isOpen, firebaseUser, authFetch, doctors]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending, isOpen]);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
    setIsMinimized(false);
    setHasUnread(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  const toggleSpeech = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setUploadStatus(`Indexing ${file.name}...`);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Content = (reader.result as string).split(',')[1];
        try {
          const res = await authFetch('/api/rag/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              fileType: file.type || 'text/plain',
              contentBase64: base64Content,
            }),
          });

          const data = await res.json();
          if (res.ok) {
            setUploadStatus(`Indexed ${file.name} (${data.chunkCount} semantic chunks)`);
            await loadKnowledgeDocs();
            setTimeout(() => setUploadStatus(null), 4000);

            // Add notification bubble in chat
            const sysNotice: MediBotChatEntry = {
              id: `sys-${Date.now()}`,
              role: 'assistant',
              content: `📄 **Document Indexed**: Successfully integrated **"${file.name}"** into your active knowledge base (${data.chunkCount} semantic vector chunks). You can now ask questions directly about this document!`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, sysNotice]);
          } else {
            setUploadStatus(`Failed: ${data.error || 'Upload error'}`);
            setTimeout(() => setUploadStatus(null), 4000);
          }
        } catch {
          setUploadStatus('Failed to upload document.');
          setTimeout(() => setUploadStatus(null), 4000);
        } finally {
          setUploadingDoc(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingDoc(false);
      setUploadStatus('Error reading file.');
      setTimeout(() => setUploadStatus(null), 4000);
    }

    // Reset file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (id: string, name: string) => {
    try {
      const res = await authFetch(`/api/rag/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKnowledgeDocs((prev) => prev.filter((d) => d.id !== id));
        setUploadStatus(`Deleted ${name}`);
        setTimeout(() => setUploadStatus(null), 3000);
      }
    } catch {
      // Ignored
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputValue).trim();
    if (!text || sending) return;

    const userMessage: MediBotChatEntry = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setSending(true);

    // Prepare multi-turn history for context continuity
    const historyPayload = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await authFetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          useWebSearch,
        }),
      });
      const data = await res.json();

      const botMessage: MediBotChatEntry = {
        id: `b-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'I found a specialist matching your needs.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedDoctor: data.recommendedDoctor || null,
        recommendedSlot: data.recommendedSlot || undefined,
        suggestedSpecialtySlug: data.suggestedSpecialtySlug || undefined,
        sources: Array.isArray(data.sources) ? data.sources : undefined,
      };

      setMessages((prev) => [...prev, botMessage]);
      if (!isOpen) {
        setHasUnread(true);
      }
    } catch {
      const errorMsg: MediBotChatEntry = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          'I am having trouble connecting to the clinic network. Please try again or select a doctor from the directory.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleReset = async () => {
    setMessages([]);
    if (firebaseUser) {
      await authFetch('/api/medibot/history', { method: 'DELETE' }).catch(() => {});
    }
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  return (
    <>
      {/* Hidden File Input for Document RAG */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.md,.json,.csv"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Floating Trigger Button */}
      <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-3">
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-2 bg-surface-container-lowest/95 backdrop-blur-md px-3.5 py-2 rounded-full shadow-lg border border-outline-variant/30 text-xs font-medium text-on-surface animate-bounce">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Need advice or docs info? Ask MediBot RAG</span>
          </div>
        )}

        <button
          type="button"
          onClick={toggleOpen}
          aria-label="Open MediBot AI RAG Chatbot"
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-primary-container text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-primary/20"
        >
          {isOpen ? (
            <MaterialIcon name="close" className="text-[26px]" />
          ) : (
            <MaterialIcon name="smart_toy" className="text-[28px]" />
          )}

          {hasUnread && !isOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-error ring-2 ring-surface animate-pulse" />
          )}
        </button>
      </div>

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out flex flex-col bg-surface-container-lowest shadow-2xl border border-outline-variant/40 overflow-hidden ${
            isMinimized
              ? 'bottom-20 right-4 sm:right-6 w-[360px] h-14 rounded-2xl'
              : 'bottom-20 md:bottom-24 right-2 sm:right-6 w-[calc(100vw-16px)] sm:w-[440px] max-w-[460px] h-[620px] max-h-[85vh] rounded-3xl'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-container text-white px-4 py-3 flex items-center justify-between shadow-sm select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white ring-2 ring-white/30">
                <MaterialIcon name="psychology" className="text-[20px]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-sm leading-tight">
                  <span>MediBot RAG AI</span>
                  <span className="px-1.5 py-0.2 bg-white/25 text-[9px] font-bold rounded-full tracking-wider uppercase">
                    RAG Active
                  </span>
                </div>
                <div className="text-[11px] text-white/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>Clinical Knowledge & Live Search</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/90">
              <button
                type="button"
                onClick={() => setShowKnowledgeBase((prev) => !prev)}
                title="Knowledge Base & Documents"
                className={`p-1.5 rounded-lg transition-all ${
                  showKnowledgeBase ? 'bg-white text-primary shadow-xs' : 'hover:bg-white/10 text-white/80 hover:text-white'
                }`}
              >
                <MaterialIcon name="folder_open" className="text-[18px]" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Reset conversation"
                className="p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all text-white/80 hover:text-white"
              >
                <MaterialIcon name="refresh" className="text-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                className="p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all"
              >
                <MaterialIcon
                  name={isMinimized ? 'expand_less' : 'expand_more'}
                  className="text-[20px]"
                />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all"
              >
                <MaterialIcon name="close" className="text-[20px]" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Secondary Status & Feature Bar */}
              <div className="bg-surface-container-low px-3 py-1.5 border-b border-outline-variant/30 flex items-center justify-between text-[11px] text-secondary">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseWebSearch((prev) => !prev)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all text-[10px] font-semibold ${
                      useWebSearch
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'bg-surface-container-high text-secondary hover:text-on-surface'
                    }`}
                    title={useWebSearch ? 'Live Web Search enabled' : 'Live Web Search disabled'}
                  >
                    <MaterialIcon name="public" className="text-[12px]" />
                    <span>Live Web Search: {useWebSearch ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowKnowledgeBase((prev) => !prev)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high hover:bg-primary/10 hover:text-primary transition-all text-[10px] font-medium"
                    title="View indexed knowledge documents"
                  >
                    <MaterialIcon name="menu_book" className="text-[12px]" />
                    <span>{knowledgeDocs.length} Docs ({totalChunks} chunks)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingDoc}
                  className="flex items-center gap-1 text-primary hover:underline font-semibold cursor-pointer disabled:opacity-50 text-[10px]"
                  title="Upload PDF, DOCX, TXT, or MD to the knowledge base"
                >
                  <MaterialIcon name="upload_file" className="text-[13px]" />
                  <span>{uploadingDoc ? 'Uploading...' : 'Upload Doc'}</span>
                </button>
              </div>

              {/* Upload Status Toast */}
              {uploadStatus && (
                <div className="bg-primary-container/80 text-on-primary-container px-3 py-1.5 text-[11px] flex items-center justify-between border-b border-primary/20">
                  <div className="flex items-center gap-1.5 truncate">
                    <MaterialIcon name="info" className="text-[14px] shrink-0" />
                    <span className="truncate">{uploadStatus}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadStatus(null)}
                    className="text-on-primary-container/80 hover:text-on-primary-container ml-2"
                  >
                    <MaterialIcon name="close" className="text-[12px]" />
                  </button>
                </div>
              )}

              {/* Knowledge Base Drawer Panel */}
              {showKnowledgeBase && (
                <div className="bg-surface-container-lowest border-b border-outline-variant/30 p-3 max-h-[190px] overflow-y-auto space-y-2 shadow-inner">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-on-surface flex items-center gap-1">
                      <MaterialIcon name="auto_stories" className="text-[14px] text-primary" />
                      <span>RAG Knowledge Base Documents</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-md font-medium hover:bg-primary/90 flex items-center gap-0.5"
                    >
                      <MaterialIcon name="add" className="text-[12px]" />
                      <span>Add File</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {knowledgeDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between bg-surface-container-low p-2 rounded-lg text-[11px] border border-outline-variant/20"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-semibold text-on-surface truncate flex items-center gap-1">
                            <MaterialIcon name="description" className="text-[13px] text-primary shrink-0" />
                            <span className="truncate">{doc.name}</span>
                          </div>
                          <div className="text-[10px] text-secondary truncate">
                            {doc.chunkCount} chunks • {Math.round(doc.size / 1024 * 10) / 10} KB • {doc.fileType}
                          </div>
                        </div>

                        {!doc.id.startsWith('doc_seed_') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id, doc.name)}
                            title="Delete document"
                            className="p-1 text-error/70 hover:text-error hover:bg-error/10 rounded transition-all"
                          >
                            <MaterialIcon name="delete" className="text-[14px]" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency Banner */}
              <div className="bg-error-container/40 border-b border-error/10 px-3.5 py-1.5 flex items-center justify-between text-xs text-on-error-container">
                <div className="flex items-center gap-1.5 truncate">
                  <MaterialIcon name="emergency" className="text-[15px] text-error shrink-0" />
                  <span className="truncate text-[11px]">Emergency symptoms? Immediate care required.</span>
                </div>
                <a
                  href="tel:911"
                  className="shrink-0 font-bold text-error hover:underline flex items-center gap-0.5 ml-2 text-[11px]"
                >
                  <span>Call 911</span>
                  <MaterialIcon name="call" className="text-[12px]" />
                </a>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-background/50">
                {/* Greeting Bubble */}
                <div className="flex items-start gap-2 max-w-[92%]">
                  <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-sm">
                    <MaterialIcon name="smart_toy" className="text-[16px]" />
                  </div>
                  <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl rounded-tl-sm p-3.5 shadow-sm text-xs text-on-surface leading-relaxed">
                    Hello <strong className="text-primary">{firstName}</strong>! 👋 I am your{' '}
                    <strong>RAG-powered clinical assistant</strong>. I have indexed our clinic policies,
                    emergency protocols, and doctor directory, and I can search live web medical literature or
                    answer questions from your uploaded documents (PDF, DOCX, TXT). What would you like to explore today?
                  </div>
                </div>

                {/* Quick Suggestion Chips */}
                {messages.length === 0 && (
                  <div className="pt-1 pb-2">
                    <div className="text-[11px] font-semibold text-secondary mb-2 px-1 flex items-center gap-1">
                      <MaterialIcon name="lightbulb" className="text-[13px] text-amber-500" />
                      <span>Suggested RAG Questions:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CHATBOT_PROMPTS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleSendMessage(p.query)}
                          className="bg-surface-container-lowest hover:bg-primary-container/20 border border-outline-variant/40 hover:border-primary text-on-surface px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all shadow-xs text-left cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Stream */}
                {messages.map((msg) =>
                  msg.role === 'user' ? (
                    <div key={msg.id} className="flex flex-col items-end max-w-[85%] ml-auto">
                      <div className="bg-primary text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-sm text-xs leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-secondary mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex flex-col items-start max-w-[94%] space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-sm">
                          <MaterialIcon name="smart_toy" className="text-[16px]" />
                        </div>
                        <div className="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-2xl rounded-tl-sm p-3.5 shadow-sm text-xs leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>

                      {/* Expandable Grounding Sources & Citations Accordion */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="ml-9 w-[calc(100%-36px)]">
                          <button
                            type="button"
                            onClick={() => toggleSources(msg.id)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 transition-all cursor-pointer"
                          >
                            <MaterialIcon name="menu_book" className="text-[13px]" />
                            <span>
                              {expandedSources[msg.id] ? 'Hide Sources' : `📚 Verified Sources (${msg.sources.length})`}
                            </span>
                            <MaterialIcon
                              name={expandedSources[msg.id] ? 'expand_less' : 'expand_more'}
                              className="text-[14px]"
                            />
                          </button>

                          {expandedSources[msg.id] && (
                            <div className="mt-2 space-y-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-2.5 shadow-xs text-[11px]">
                              {msg.sources.map((src, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1"
                                >
                                  <div className="flex items-center justify-between font-semibold text-on-surface">
                                    <div className="flex items-center gap-1 truncate text-primary">
                                      <MaterialIcon
                                        name={src.type === 'document' ? 'article' : 'public'}
                                        className="text-[13px] shrink-0"
                                      />
                                      <span className="truncate">{src.title}</span>
                                    </div>
                                    {src.score !== undefined && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                                        {Math.round(src.score * 100)}% match
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[10px] text-secondary leading-relaxed line-clamp-3">
                                    {src.snippet}
                                  </div>

                                  {src.url && (
                                    <div className="pt-0.5">
                                      <a
                                        href={src.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-medium"
                                      >
                                        <span>Read original source</span>
                                        <MaterialIcon name="open_in_new" className="text-[10px]" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* In-Chat Doctor Recommendation Card */}
                      {msg.recommendedDoctor && (
                        <div className="ml-9 bg-surface-container-lowest border border-primary/20 rounded-xl p-3 shadow-md flex flex-col gap-2.5 w-[calc(100%-36px)]">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-semibold uppercase tracking-wider">
                              Recommended Specialist
                            </span>
                            <span className="text-[11px] text-primary font-semibold flex items-center gap-0.5">
                              <MaterialIcon name="star" className="text-[13px] text-amber-500 fill-current" />
                              <span>{msg.recommendedDoctor.rating}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <img
                              src={msg.recommendedDoctor.avatarUrl}
                              alt={msg.recommendedDoctor.name}
                              className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-primary/20"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-on-surface truncate">
                                {msg.recommendedDoctor.name}
                              </div>
                              <div className="text-[11px] text-secondary truncate">
                                {msg.recommendedDoctor.specialtyName} • {msg.recommendedDoctor.distanceMiles}
                              </div>
                              <div className="text-[10px] text-primary font-medium mt-0.5 flex items-center gap-1">
                                <MaterialIcon name="schedule" className="text-[12px]" />
                                <span>{msg.recommendedSlot || msg.recommendedDoctor.nextSlotLabel}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/20">
                            <button
                              type="button"
                              onClick={() => {
                                onReserveDoctorSlot(
                                  msg.recommendedDoctor!,
                                  msg.recommendedSlot || msg.recommendedDoctor?.nextSlotLabel
                                );
                                setIsOpen(false);
                              }}
                              className="flex-1 bg-primary hover:bg-primary/90 text-white py-1.5 px-2.5 rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              <MaterialIcon name="calendar_month" className="text-[14px]" />
                              <span>Book Slot</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onSelectDoctor(msg.recommendedDoctor!);
                                setIsOpen(false);
                              }}
                              className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                            >
                              Profile
                            </button>
                          </div>
                        </div>
                      )}

                      <span className="text-[10px] text-secondary ml-9">{msg.timestamp}</span>
                    </div>
                  )
                )}

                {/* Sending typing indicator */}
                {sending && (
                  <div className="flex items-center gap-2 ml-1 text-xs text-secondary">
                    <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 text-xs">
                      <MaterialIcon name="smart_toy" className="text-[16px]" />
                    </div>
                    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl rounded-tl-sm px-3.5 py-2 shadow-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse delay-75" />
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150" />
                      <span className="text-[11px] text-secondary ml-1">
                        Retrieving knowledge & grounding answer...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <div className="p-3 bg-surface-container-lowest border-t border-outline-variant/30">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  {/* File Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload document (PDF, DOCX, TXT, MD)"
                    disabled={uploadingDoc || sending}
                    className="p-2 rounded-full bg-surface-container-high text-secondary hover:text-primary transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <MaterialIcon name="attach_file" className="text-[18px]" />
                  </button>

                  {/* Speech to text */}
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleSpeech}
                      title={isListening ? 'Listening... click to stop' : 'Voice input'}
                      className={`p-2 rounded-full transition-all shrink-0 cursor-pointer ${
                        isListening
                          ? 'bg-error text-white animate-pulse'
                          : 'bg-surface-container-high text-secondary hover:text-primary'
                      }`}
                    >
                      <MaterialIcon name={isListening ? 'mic' : 'mic_none'} className="text-[18px]" />
                    </button>
                  )}

                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={
                      isListening
                        ? 'Listening to your symptoms or question...'
                        : 'Ask questions, symptoms, or document details...'
                    }
                    disabled={sending}
                    className="flex-1 bg-surface-container-low text-on-surface placeholder:text-secondary px-3.5 py-2.5 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/30 disabled:opacity-50"
                  />

                  <button
                    type="submit"
                    disabled={!inputValue.trim() || sending}
                    className="w-9 h-9 rounded-full bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <MaterialIcon name="send" className="text-[16px]" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
