import React, { useEffect, useRef, useState } from 'react';
import { AvatarImage, MaterialIcon } from '../components/CommonUI';
import { useAuth } from '../context/AuthContext';
import { Doctor, MediBotChatEntry } from '../types';

interface MediBotScreenProps {
  doctors: Doctor[];
  onSelectDoctor: (doctor: Doctor) => void;
  onReserveDoctorSlot: (doctor: Doctor, slot?: string) => void;
}

const QUICK_PROMPTS = [
  { icon: 'today', text: 'Book Dermatologist for today afternoon' },
  { icon: 'calendar_month', text: 'Find Cardiologist next available slot' },
  { icon: 'psychology', text: 'I have recurring migraines, who should I see?' },
];

export const MediBotScreen: React.FC<MediBotScreenProps> = ({
  doctors,
  onSelectDoctor,
  onReserveDoctorSlot,
}) => {
  const { firebaseUser, profile, authFetch } = useAuth();
  const [messages, setMessages] = useState<MediBotChatEntry[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const firstName =
    profile?.fullName?.split(' ')[0] ||
    firebaseUser?.displayName?.split(' ')[0] ||
    'there';

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      if (!firebaseUser) return;
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
        // Ignore history fetch errors
      }
    };
    loadHistory();
    return () => {
      active = false;
    };
  }, [firebaseUser, authFetch, doctors]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendPrompt = async (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || sending) return;

    setErrorMsg(null);
    const userMsg: MediBotChatEntry = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: clean,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setSending(true);

    try {
      const res = await authFetch('/api/medibot/chat', {
        method: 'POST',
        body: JSON.stringify({ message: clean }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'MediBot could not process your request.');
      }

      const botMsg: MediBotChatEntry = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedDoctor: data.recommendedDoctor || null,
        recommendedSlot: data.recommendedSlot || undefined,
        suggestedSpecialtySlug: data.suggestedSpecialtySlug || undefined,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to reach MediBot AI right now.');
    } finally {
      setSending(false);
    }
  };

  const handleReset = async () => {
    setMessages([]);
    setErrorMsg(null);
    if (firebaseUser) {
      await authFetch('/api/medibot/history', { method: 'DELETE' }).catch(() => {});
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-3 pb-6 flex flex-col gap-4 min-h-[calc(100vh-140px)]">
      {/* Disclaimer Banner */}
      <div className="bg-surface-container-high/70 rounded-xl p-3 flex items-start gap-2.5 shadow-sm">
        <MaterialIcon name="info" className="text-[18px] text-tertiary shrink-0 mt-0.5" />
        <p className="text-xs text-on-surface-variant leading-snug">
          <strong className="text-on-surface">MediBot Scheduling AI:</strong> Assisting solely with
          doctor discovery, calendar matching, and clinic slot booking. For emergency care, call
          911 immediately.
        </p>
      </div>

      {/* Sub-bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
            <MaterialIcon name="smart_toy" className="text-[18px]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-on-surface flex items-center gap-1">
              <span>MediBot AI Concierge</span>
              <MaterialIcon name="auto_awesome" className="text-[14px] text-primary" />
            </div>
            <div className="text-[11px] text-on-surface-variant">
              Connected to live clinic catalog ({doctors.length} specialists)
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant text-xs font-medium transition-colors shadow-sm"
        >
          <MaterialIcon name="restart_alt" className="text-[15px]" />
          <span>Reset</span>
        </button>
      </div>

      {/* Chat Stream */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Initial Welcome Bubble */}
        <div className="flex items-start gap-2.5 max-w-[94%]">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shrink-0 shadow-sm mt-0.5">
            <MaterialIcon name="smart_toy" className="text-[18px]" />
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="bg-surface-container-lowest rounded-2xl rounded-tl-sm p-4 shadow-sm text-sm text-on-surface leading-relaxed">
              Hello <strong className="text-primary">{firstName}</strong>! I&apos;m your MediSlot AI
              scheduling concierge. Tell me which medical specialty, doctor, or symptoms you&apos;d
              like help booking, and what time works best for you.
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.text}
                  type="button"
                  onClick={() => sendPrompt(qp.text)}
                  className="bg-surface-container-lowest hover:bg-surface-container-low text-primary px-3 py-2 rounded-full shadow-sm flex items-center gap-1.5 text-xs font-medium transition-colors text-left"
                >
                  <MaterialIcon name={qp.icon} className="text-[15px] text-tertiary shrink-0" />
                  <span>{qp.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div
              key={msg.id}
              className="flex items-end justify-end gap-2 self-end max-w-[88%] ml-auto"
            >
              <div className="flex flex-col items-end gap-1">
                <div className="bg-primary text-on-primary rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm text-sm leading-relaxed">
                  {msg.content}
                </div>
                <span className="text-[11px] text-on-surface-variant pr-1">{msg.timestamp}</span>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex items-start gap-2.5 max-w-[96%]">
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shrink-0 shadow-sm mt-0.5">
                <MaterialIcon name="smart_toy" className="text-[18px]" />
              </div>
              <div className="flex flex-col gap-3 flex-1 min-w-0">
                <div className="bg-surface-container-lowest rounded-2xl rounded-tl-sm p-4 shadow-sm text-sm text-on-surface leading-relaxed">
                  {msg.content}
                </div>

                {msg.recommendedDoctor && (
                  <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-md flex flex-col gap-3 max-w-md">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-primary tabular-nums">
                        {msg.recommendedDoctor.matchPercent}% Routine Match
                      </span>
                      <span className="text-primary font-semibold">Instant Book</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <AvatarImage
                        src={msg.recommendedDoctor.avatarUrl}
                        alt={msg.recommendedDoctor.name}
                        fallbackText={msg.recommendedDoctor.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-bold text-on-surface truncate">
                          {msg.recommendedDoctor.name}, {msg.recommendedDoctor.credentials}
                        </h4>
                        <p className="text-xs text-primary font-medium truncate">
                          {msg.recommendedDoctor.specialtyName} ·{' '}
                          {msg.recommendedDoctor.clinicName}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant tabular-nums">
                          <span className="flex items-center font-semibold text-on-surface">
                            <MaterialIcon
                              name="star"
                              filled
                              className="text-[14px] text-amber-500 mr-0.5"
                            />
                            {msg.recommendedDoctor.rating}
                          </span>
                          <span>·</span>
                          <span>{msg.recommendedDoctor.distanceMiles}</span>
                          <span>·</span>
                          <span>${msg.recommendedDoctor.insuranceCopay} copay</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface-container-low rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <MaterialIcon name="schedule" className="text-primary text-[16px]" />
                        <span className="font-semibold text-on-surface">
                          {msg.recommendedSlot || msg.recommendedDoctor.nextSlotLabel}
                        </span>
                      </div>
                      <span className="text-primary font-medium">Available</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectDoctor(msg.recommendedDoctor!)}
                        className="py-2.5 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold transition-colors"
                      >
                        View Profile
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onReserveDoctorSlot(
                            msg.recommendedDoctor!,
                            msg.recommendedSlot || '02:30 PM'
                          )
                        }
                        className="py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold shadow-sm transition-colors"
                      >
                        Reserve Slot
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {sending && (
          <div className="flex items-center gap-2.5 text-xs text-on-surface-variant">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
              <MaterialIcon name="smart_toy" className="text-[16px]" />
            </div>
            <div className="bg-surface-container-low px-4 py-2 rounded-full">
              MediBot is cross-referencing specialist schedules...
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Bottom Input Bar */}
      <div className="sticky bottom-16 md:bottom-2 z-30 pt-2 bg-gradient-to-t from-surface via-surface to-transparent">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendPrompt(inputValue);
          }}
          className="flex items-center bg-surface-container-lowest rounded-2xl p-1.5 shadow-md"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Tell MediBot what specialist or slot you need..."
            className="flex-1 bg-transparent border-0 outline-none px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/70 min-w-0"
          />
          <button
            type="submit"
            disabled={sending || !inputValue.trim()}
            aria-label="Send query"
            className="w-10 h-10 rounded-xl bg-primary hover:bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
          >
            <MaterialIcon name="arrow_upward" className="text-[20px]" />
          </button>
        </form>
        <div className="flex items-center justify-center gap-1 pt-1.5 text-[11px] text-on-surface-variant">
          <MaterialIcon name="lock" className="text-[12px]" />
          <span>HIPAA-compliant AI session · Encrypted end-to-end</span>
        </div>
      </div>
    </div>
  );
};
