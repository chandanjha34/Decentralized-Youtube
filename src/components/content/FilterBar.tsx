'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CATEGORIES, type Category } from '@/types/content';

/**
 * Props for FilterBar component
 * Validates: Requirements 4.3
 */
export interface FilterBarProps {
  /** Currently selected category filter */
  selectedCategory: Category | 'all';
  /** Callback when category filter changes */
  onCategoryChange: (category: Category | 'all') => void;
  /** Current search query */
  searchQuery: string;
  /** Callback when search query changes */
  onSearchChange: (query: string) => void;
}

/**
 * FilterBar Component
 * 
 * Sticky filter bar with search and category filtering:
 * - Search input with rounded-full styling
 * - Category filter pills with rounded-full shape
 * - Sticky positioning below navigation
 * - Backdrop blur effect
 * 
 * Validates: Requirements 4.3
 */
export function FilterBar({
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="sticky top-[72px] z-40 -mx-8 px-8 py-4 bg-[#F7F5F3]/80 backdrop-blur-md border-b border-[rgba(55,50,47,0.12)]">
      <div className="max-w-[1060px] mx-auto space-y-4">
        {/* Search input */}
        <div className="relative max-w-md">
          <Input
            type="search"
            placeholder="Search by title or tags..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 rounded-full border-[#E0DEDB] bg-white focus:border-[#37322F] transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605A57] text-sm">
            🔍
          </span>
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange('all')}
            className="rounded-full"
          >
            All
          </Button>
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCategoryChange(category)}
              className="capitalize rounded-full"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FilterBar;
