'use client';

import { useState, useEffect, useMemo, ReactNode, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type FilterOption = {
  value: string;
  label: string;
};

type SearchFilterProps = {
  data: unknown[];
  searchPlaceholder?: string;
  filterOptions?: FilterOption[];
  filterPlaceholder?: string;
  children: (filteredData: unknown[], page: number, setPage: (p: number) => void) => ReactNode;
  itemsPerPage?: number;
};

export function useSearchFilter<T>(items: T[], searchFields: string[]) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => setCurrentPage(1), [search, filter]);

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const s = search.toLowerCase();
      result = items.filter(item =>
        searchFields.some(f => {
          const v = (item as Record<string, unknown>)[f];
          return v != null && String(v).toLowerCase().includes(s);
        })
      );
    }
    return result;
  }, [items, search, searchFields]);

  return {
    search,
    setSearch,
    filter,
    setFilter,
    currentPage,
    setCurrentPage,
    filtered,
  };
}

export function SearchBar({ value, onChange, onClear, placeholder = 'Rechercher...' }: {
  value: string;
  onChange: (v: string) => void;
  onClear?: () => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative group">
      {/* Glow effect on focus */}
      <div className={`absolute -inset-0.5 rounded-xl bg-linear-to-r from-primary/20 via-info/20 to-primary/20 opacity-0 blur-sm transition-all duration-500 ${focused && 'opacity-100'}`} />

      <div className={`relative flex items-center transition-all duration-300 rounded-xl border-2 ${
        focused
          ? 'border-primary/50 bg-base-100 shadow-lg shadow-primary/10'
          : 'border-base-300 bg-base-200/50 hover:border-base-300'
      }`}>
        {/* Search icon */}
        <div className="absolute left-3.5 flex items-center pointer-events-none">
          <motion.div
            animate={focused ? { rotate: [0, -10, 0], scale: 1.1 } : { rotate: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-colors duration-300 ${focused ? 'text-primary' : 'text-base-content/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </motion.div>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="input border-0 bg-transparent w-full pl-10 pr-10 focus:outline-none focus:ring-0 placeholder:text-base-content/40"
        />

        {/* Right side: clear + search shortcut */}
        <div className="absolute right-2 flex items-center gap-1">
          <AnimatePresence mode="wait">
            {value && onClear && (
              <motion.button
                key="clear"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  onClear();
                  inputRef.current?.focus();
                }}
                className="btn btn-ghost btn-xs btn-circle hover:bg-error/10 hover:text-error transition-colors"
                title="Effacer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>

          {!value && (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-base-300/50 text-base-content/30 border border-base-300">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
}

export function FilterSelect({ value, onChange, options, placeholder = 'Tous' }: {
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative group">
      <div className={`absolute -inset-0.5 rounded-xl bg-linear-to-r from-secondary/20 via-accent/20 to-secondary/20 opacity-0 blur-sm transition-all duration-500 ${focused && 'opacity-100'}`} />
      <div className={`relative flex items-center transition-all duration-300 rounded-xl border-2 ${
        focused
          ? 'border-secondary/50 bg-base-100 shadow-lg shadow-secondary/10'
          : 'border-base-300 bg-base-200/50 hover:border-base-300'
      }`}>
        {/* Filter icon */}
        <div className="absolute left-3.5 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-colors duration-300 ${value ? 'text-secondary' : 'text-base-content/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="select border-0 bg-transparent w-full pl-10 pr-4 focus:outline-none focus:ring-0"
        >
          <option value="">{placeholder}</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function Pagination({ currentPage, totalPages, onPageChange }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-6">
      <div className="flex items-center gap-1.5">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="btn btn-sm btn-ghost btn-square rounded-lg disabled:opacity-30 disabled:pointer-events-none hover:bg-base-300/50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>

        {getPages().map(page => (
          <motion.button
            key={page}
            whileTap={{ scale: 0.9 }}
            onClick={() => onPageChange(page)}
            className={`btn btn-sm min-w-[2.25rem] rounded-lg font-medium transition-all duration-200 ${
              currentPage === page
                ? 'btn-primary shadow-md shadow-primary/20'
                : 'btn-ghost hover:bg-base-300/50'
            }`}
          >
            {page}
          </motion.button>
        ))}

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="btn btn-sm btn-ghost btn-square rounded-lg disabled:opacity-30 disabled:pointer-events-none hover:bg-base-300/50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>

      <span className="text-xs text-base-content/40 font-medium">
        Page {currentPage} sur {totalPages}
      </span>
    </div>
  );
}