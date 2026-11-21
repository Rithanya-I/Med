import React, { useEffect, useRef, useState } from 'react';
import { MaterialIcon } from './CommonUI';
import { useAuth } from '../context/AuthContext';
import { Doctor, MediBotChatEntry } from '../types';

interface FloatingChatbotProps {
  doctors: Doctor[];
  onSelectDoctor: (doctor: Doctor) => void;
  onReserveDoctorSlot: (doctor: Doctor, slot?: string) => void;
}

const CHATBOT_PROMPTS = [
  { label: '🩺 Rash / Acne', query: 'I have a sudden skin rash and acne flare-up. Which specialist can see me today?' },
  { label: '❤️ Heart & Chest', query: 'I feel occasional heart palpitations and chest tightness.' },
  { label: '👶 Child Wellness', query: 'Need a pediatrician for infant checkup and vaccines.' },
  { label: '🧠 Migraine & Headache', query: 'I am experiencing chronic throbbing migraines and light sensitivity.' },
  { label: '🦴 Knee / Joint Pain', query: 'My knee hurts after running, I need an orthopedic evaluation.' },
  { label: '💰 Check Copay Fees', query: 'What are the consultation fees and insurance copays for your specialists?' },
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
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

    try {
      const res = await authFetch('/api/medibot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
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

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-3">
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-2 bg-surface-container-lowest/95 backdrop-blur-md px-3.5 py-2 rounded-full shadow-lg border border-outline-variant/30 text-xs font-medium text-on-surface animate-bounce">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Need doctor advice? Ask MediBot</span>
          </div>
        )}

        <button
          type="button"
          onClick={toggleOpen}
          aria-label="Open MediBot AI Triage Chatbot"
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
              : 'bottom-20 md:bottom-24 right-2 sm:right-6 w-[calc(100vw-16px)] sm:w-[420px] max-w-[440px] h-[580px] max-h-[85vh] rounded-3xl'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-container text-white px-4 py-3 flex items-center justify-between shadow-sm select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white ring-2 ring-white/30">
                <MaterialIcon name="smart_toy" className="text-[20px]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-sm leading-tight">
                  <span>MediBot AI Concierge</span>
                  <span className="px-1.5 py-0.2 bg-white/20 text-[10px] font-bold rounded-full tracking-wider uppercase">
                    LIVE
                  </span>
                </div>
                <div className="text-[11px] text-white/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed-dim" />
                  <span>Symptom Triage & Slot Booking</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/90">
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
              {/* Emergency Banner */}
              <div className="bg-error-container/40 border-b border-error/10 px-3.5 py-2 flex items-center justify-between text-xs text-on-error-container">
                <div className="flex items-center gap-1.5 truncate">
                  <MaterialIcon name="emergency" className="text-[16px] text-error shrink-0" />
                  <span className="truncate">Emergency symptoms? Immediate care required.</span>
                </div>
                <a
                  href="tel:911"
                  className="shrink-0 font-bold text-error hover:underline flex items-center gap-0.5 ml-2"
                >
                  <span>Call 911</span>
                  <MaterialIcon name="call" className="text-[13px]" />
                </a>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-background/50">
                {/* Greeting Bubble */}
                <div className="flex items-start gap-2 max-w-[90%]">
                  <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-sm">
                    <MaterialIcon name="smart_toy" className="text-[16px]" />
                  </div>
                  <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl rounded-tl-sm p-3.5 shadow-sm text-xs text-on-surface leading-relaxed">
                    Hello <strong className="text-primary">{firstName}</strong>! 👋 What medical
                    specialist or symptom can I help you check today? You can describe any discomfort
                    or choose a shortcut below.
                  </div>
                </div>

                {/* Quick Suggestion Chips */}
                {messages.length === 0 && (
                  <div className="pt-1 pb-2">
                    <div className="text-[11px] font-medium text-secondary mb-2 px-1">
                      Quick Questions & Symptoms:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CHATBOT_PROMPTS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleSendMessage(p.query)}
                          className="bg-surface-container-lowest hover:bg-primary-container/20 border border-outline-variant/40 hover:border-primary text-on-surface px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all shadow-xs text-left"
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
                      <div className="bg-primary text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-sm text-xs leading-relaxed">
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-secondary mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex flex-col items-start max-w-[92%] space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-sm">
                          <MaterialIcon name="smart_toy" className="text-[16px]" />
                        </div>
                        <div className="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-2xl rounded-tl-sm p-3.5 shadow-sm text-xs leading-relaxed">
                          {msg.content}
                        </div>
                      </div>

                      {/* In-Chat Doctor Recommendation Card */}
                      {msg.recommendedDoctor && (
                        <div className="ml-9 bg-surface-container-lowest border border-primary/20 rounded-xl p-3 shadow-md flex flex-col gap-2.5 w-full">
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
                              className="flex-1 bg-primary hover:bg-primary/90 text-white py-1.5 px-2.5 rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1 transition-all"
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
                              className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all"
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
                      <span className="text-[11px] text-secondary ml-1">Analyzing symptoms...</span>
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
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleSpeech}
                      title={isListening ? 'Listening... click to stop' : 'Voice input'}
                      className={`p-2 rounded-full transition-all shrink-0 ${
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
                    placeholder={isListening ? 'Listening to your symptoms...' : 'Type symptoms or ask doctor question...'}
                    disabled={sending}
                    className="flex-1 bg-surface-container-low text-on-surface placeholder:text-secondary px-3.5 py-2.5 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/30 disabled:opacity-50"
                  />

                  <button
                    type="submit"
                    disabled={!inputValue.trim() || sending}
                    className="w-9 h-9 rounded-full bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all"
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
