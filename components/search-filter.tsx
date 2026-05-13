'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';
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

export function useSearchFilter<T>(items: T[], searchFields: (keyof T)[]) {
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
          const v = item[f];
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
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input input-bordered w-full pl-10 pr-8 bg-base-100"
      />
      {value && onClear && (
        <button onClick={onClear} className="absolute inset-y-0 right-3 flex items-center hover:text-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function FilterSelect({ value, onChange, options, placeholder = 'Tous' }: {
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="select select-bordered bg-base-100"
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
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
    <div className="flex justify-center items-center gap-1 pt-4">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="btn btn-sm btn-ghost btn-circle"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      {getPages().map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-ghost'}`}
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="btn btn-sm btn-ghost btn-circle"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}