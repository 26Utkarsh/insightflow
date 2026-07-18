import { Check, ChevronDown, Filter, RefreshCcw, Search, X } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { SalesRecord } from '../../types';

export interface FilterState {
  category: string;
  region: string;
  product: string;
  customer: string;
}

interface FilterBarProps {
  data: SalesRecord[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  filteredCount: number;
  totalCount: number;
}

/* ── Combobox Component ──────────────────────────────────────── */

interface ComboboxProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const Combobox = React.memo(function Combobox({ label, options, value, onChange, placeholder = 'All' }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(lower));
  }, [options, search]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setSearch('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  }, []);

  const displayValue = value || `${placeholder} ${label}`;

  return (
    <div className="relative">
      <button
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        className={`flex items-center gap-2 min-w-[160px] max-w-[220px] px-3 py-2 text-sm rounded-lg border transition-all duration-200 bg-bg-primary
          ${value
            ? 'border-accent-secondary/40 bg-accent-secondary/5 text-text-primary font-medium'
            : isOpen
              ? 'border-accent-secondary/40 text-text-primary'
              : 'border-border-primary text-text-secondary hover:border-border-secondary hover:text-text-primary'
          }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Filter by ${label}`}
      >
        <span className="truncate flex-1 text-left">{displayValue}</span>
        {value ? (
          <button
            onClick={handleClear}
            className="w-5 h-5 rounded-full bg-accent-secondary/15 flex items-center justify-center hover:bg-accent-secondary/25 transition-colors shrink-0"
            aria-label={`Clear ${label} filter`}
          >
            <X size={11} className="text-accent-secondary" />
          </button>
        ) : (
          <ChevronDown size={14} className="text-text-muted shrink-0" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute left-0 top-full mt-1.5 w-64 bg-bg-surface border border-border-primary rounded-xl shadow-premium-xl z-50 overflow-hidden"
            role="listbox"
            aria-label={`${label} options`}
          >
            {/* Search */}
            <div className="p-2 border-b border-border-primary">
              <div className="flex items-center gap-2 px-3 py-2 bg-bg-primary border border-border-primary rounded-lg focus-within:border-accent-secondary/40 transition-colors">
                <Search size={14} className="text-text-muted shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder:text-text-muted"
                  aria-label={`Search ${label} options`}
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-56 overflow-y-auto custom-scrollbar p-1.5">
              {/* All option */}
              <button
                onClick={() => handleSelect('')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                  ${!value ? 'bg-accent-secondary/10 text-accent-secondary font-medium' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'}`}
                role="option"
                aria-selected={!value}
              >
                {!value && <Check size={14} className="shrink-0" />}
                <span className={!value ? '' : 'pl-[22px]'}>{placeholder} {label}</span>
              </button>

              {filtered.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-text-muted">No matches found</div>
              )}

              {filtered.map(option => (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                    ${value === option ? 'bg-accent-secondary/10 text-accent-secondary font-medium' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'}`}
                  role="option"
                  aria-selected={value === option}
                >
                  {value === option && <Check size={14} className="shrink-0" />}
                  <span className={`truncate ${value === option ? '' : 'pl-[22px]'}`}>{option}</span>
                </button>
              ))}
            </div>

            {/* Footer */}
            {filtered.length > 0 && (
              <div className="px-3 py-2 border-t border-border-primary text-[10px] text-text-muted font-medium">
                {filtered.length} {filtered.length === 1 ? 'option' : 'options'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

/* ── FilterBar Component ─────────────────────────────────────── */

const FilterBar = React.memo(function FilterBar({ data, filters, setFilters, filteredCount, totalCount }: FilterBarProps) {
  const options = useMemo(() => {
    const categories = new Set<string>();
    const regions = new Set<string>();
    const products = new Set<string>();
    const customers = new Set<string>();

    data.forEach(d => {
      if (d.category && d.category !== 'Unknown') categories.add(d.category);
      if (d.region && d.region !== 'Unknown') regions.add(d.region);
      if (d.product_name && d.product_name !== 'Unknown') products.add(d.product_name);
      if (d.customer_name && d.customer_name !== 'Unknown') customers.add(d.customer_name);
    });

    return {
      categories: Array.from(categories).sort(),
      regions: Array.from(regions).sort(),
      products: Array.from(products).sort(),
      customers: Array.from(customers).sort(),
    };
  }, [data]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ category: '', region: '', product: '', customer: '' });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="bg-bg-surface border-y border-border-primary py-2.5 px-5 lg:px-10 sticky top-0 z-30 print:hidden">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row flex-wrap items-center gap-2.5">
        {/* Label */}
        <div className="flex items-center gap-2 text-text-muted">
          <Filter size={14} className="text-accent-secondary" />
          <span className="text-xs font-semibold">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-accent-secondary text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              {activeFilterCount}
            </span>
          )}
        </div>

        {/* Comboboxes */}
        <div className="flex-1 flex flex-wrap items-center gap-2">
          <Combobox label="Category" options={options.categories} value={filters.category} onChange={v => updateFilter('category', v)} placeholder="All" />
          <Combobox label="Region" options={options.regions} value={filters.region} onChange={v => updateFilter('region', v)} placeholder="All" />
          <Combobox label="Product" options={options.products} value={filters.product} onChange={v => updateFilter('product', v)} placeholder="All" />
          <Combobox label="Customer" options={options.customers} value={filters.customer} onChange={v => updateFilter('customer', v)} placeholder="All" />
        </div>

        {/* Count + Reset */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-[10px] text-text-muted bg-bg-primary px-2.5 py-1 rounded border border-border-primary font-mono">
            <span className="font-semibold text-text-primary">{filteredCount.toLocaleString()}</span>
            <span className="mx-1">of</span>
            <span className="font-semibold text-text-primary">{totalCount.toLocaleString()}</span>
          </span>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-[10px] font-medium text-text-muted hover:text-text-primary transition-colors px-2.5 py-1 bg-bg-primary rounded border border-border-primary"
              aria-label="Reset all filters"
            >
              <RefreshCcw size={12} />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default FilterBar;
