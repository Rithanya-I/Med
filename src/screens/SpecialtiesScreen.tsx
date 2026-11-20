import React, { useMemo, useState } from 'react';
import { MaterialIcon } from '../components/CommonUI';
import { ScreenRoute, Specialty } from '../types';

interface SpecialtiesScreenProps {
  specialties: Specialty[];
  onSelectSpecialty: (slug: string) => void;
  onNavigate: (route: ScreenRoute) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Disciplines' },
  { id: 'popular', label: 'Most Booked' },
  { id: 'routine', label: 'Primary & Wellness' },
  { id: 'surgical', label: 'Surgical & Joints' },
  { id: 'pediatric', label: 'Family & Kids' },
];

export const SpecialtiesScreen: React.FC<SpecialtiesScreenProps> = ({
  specialties,
  onSelectSpecialty,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return specialties.filter((spec) => {
      const matchesCat =
        activeCategory === 'all' || spec.categoryTag.toLowerCase().includes(activeCategory);
      const matchesSearch =
        !q ||
        spec.name.toLowerCase().includes(q) ||
        spec.subtitle.toLowerCase().includes(q) ||
        spec.servicesSummary.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [specialties, searchQuery, activeCategory]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-5">
      {/* Search & Category Filter */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary">
            <MaterialIcon name="search" className="text-[20px]" />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medical specialties or services..."
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-container-lowest text-on-surface text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-outline"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-primary"
            >
              <MaterialIcon name="close" className="text-[18px]" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-primary text-on-primary shadow-sm font-semibold'
                  : 'bg-surface-container text-secondary hover:bg-secondary-container hover:text-on-secondary-container'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-secondary font-medium">
          <MaterialIcon name="verified" className="text-[16px] text-primary" />
          <span>{filtered.length} Departments Verified Available</span>
        </div>
        <span className="text-primary font-semibold">Instant AI Booking</span>
      </div>

      {/* Specialties Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((spec) => (
            <div
              key={spec.slug}
              className={`rounded-2xl bg-surface-container-lowest p-4 transition-all hover:shadow-md flex flex-col justify-between gap-3 ${
                spec.featured ? 'shadow-md ring-1 ring-primary/15' : 'shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                    spec.featured
                      ? 'bg-primary-fixed text-on-primary-fixed'
                      : 'bg-surface-container text-primary'
                  }`}
                >
                  <MaterialIcon name={spec.iconName} className="text-[24px]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-on-secondary-fixed truncate">
                      {spec.name}
                    </h2>
                    <span className="text-xs text-secondary font-medium tabular-nums shrink-0">
                      {spec.doctorCount} doctors
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant truncate mt-0.5">
                    {spec.subtitle}
                  </p>
                  <p className="text-xs text-secondary mt-1.5">
                    {spec.servicesSummary} · Next slot: {spec.nextOpenSlot}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-surface-container-low">
                <span className="text-xs text-primary font-medium">
                  {spec.featured ? 'Featured · High Demand' : 'Verified Specialists'}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectSpecialty(spec.slug)}
                  className={`inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    spec.featured
                      ? 'bg-primary text-on-primary hover:bg-primary-container shadow-sm'
                      : 'bg-surface-container hover:bg-secondary-container text-on-secondary-fixed'
                  }`}
                >
                  <span>View Doctors</span>
                  <MaterialIcon
                    name={spec.featured ? 'arrow_forward' : 'chevron_right'}
                    className="text-[15px]"
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-surface-container-lowest rounded-2xl shadow-sm">
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-secondary mb-3">
            <MaterialIcon name="search_off" className="text-[28px]" />
          </div>
          <h3 className="text-lg font-semibold text-on-surface mb-1">No Specialty Found</h3>
          <p className="text-sm text-secondary max-w-xs mb-4">
            Try another keyword or ask MediBot AI to match your symptoms directly to a specialist.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('medibot')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold"
          >
            <MaterialIcon name="smart_toy" className="text-[18px]" />
            <span>Ask MediBot AI</span>
          </button>
        </div>
      )}

      {/* MediBot AI Interactive Symptom Banner */}
      <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="shrink-0 w-11 h-11 rounded-full bg-tertiary-container text-on-tertiary flex items-center justify-center shadow-sm">
            <MaterialIcon name="smart_toy" className="text-[22px]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-on-secondary-fixed">
              Unsure Which Specialty?
            </h3>
            <p className="text-sm text-secondary mt-0.5">
              Describe your symptoms or timing preference to MediBot AI for instant doctor matching.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('medibot')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-sm font-semibold shadow-sm transition-all whitespace-nowrap shrink-0"
        >
          <MaterialIcon name="chat" className="text-[17px]" />
          <span>Start Symptom Check</span>
        </button>
      </div>
    </div>
  );
};
