'use client';

import { useState, useMemo } from 'react';
import { ContentCard } from './ContentCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage, getErrorType } from '@/components/ui/error-message';
import { CATEGORIES, type Category, type ContentCardData } from '@/types/content';

/**
 * Props for ContentGrid component
 */
export interface ContentGridProps {
  /** Array of content items to display */
  content: ContentCardData[];
  /** Whether content is loading */
  isLoading?: boolean;
  /** Error message if loading failed */
  error?: Error | null;
  /** Callback to retry loading */
  onRetry?: () => void;
}

/**
 * ContentGrid Component
 * 
 * Displays a filterable grid of content cards with:
 * - Category filter buttons
 * - Search input for title/tags filtering
 * - Responsive grid layout
 * 
 * Validates: Requirements 4.1, 4.3, 4.4
 */
export function ContentGrid({ content, isLoading, error, onRetry }: ContentGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter content by category and search query
  const filteredContent = useMemo(() => {
    return content.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Search filter (case-insensitive) - searches title and tags
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(query);
        const tagsMatch = item.tags.some(tag => tag.toLowerCase().includes(query));
        return titleMatch || tagsMatch;
      }

      return true;
    });
  }, [content, selectedCategory, searchQuery]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <ContentGridFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="lg" message="Loading content..." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <ContentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-12">
        <ErrorMessage
          type={getErrorType(error)}
          message={error.message}
          onRetry={onRetry}
          showSuggestion={true}
          variant="card"
          className="max-w-md mx-auto"
        />
      </div>
    );
  }

  // Empty state
  if (content.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-6xl mb-4 block">📭</span>
        <h3 className="text-xl font-semibold mb-2">No content yet</h3>
        <p className="text-muted-foreground">
          Be the first to upload content to the platform!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ContentGridFilters
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredContent.length} of {content.length} items
        {selectedCategory !== 'all' && ` in ${selectedCategory}`}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Grid */}
      {filteredContent.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredContent.map((item) => (
            <ContentCard
              key={item.contentId}
              contentId={item.contentId}
              title={item.title}
              thumbnailCID={item.thumbnailCID}
              creatorAddress={item.creatorAddress}
              priceUSDC={item.priceUSDC}
              category={item.category}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">🔍</span>
          <h3 className="text-lg font-semibold mb-2">No results found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters or search query
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Filter controls for the content grid
 */
interface ContentGridFiltersProps {
  selectedCategory: Category | 'all';
  onCategoryChange: (category: Category | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function ContentGridFilters({
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: ContentGridFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative max-w-md">
        <Input
          type="search"
          placeholder="Search by title or tags..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          🔍
        </span>
      </div>

      {/* Category filter buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange('all')}
        >
          All
        </Button>
        {CATEGORIES.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category)}
            className="capitalize"
          >
            {category}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for content cards
 */
function ContentCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden animate-pulse">
      <div className="aspect-video bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
      <div className="px-4 pb-4">
        <div className="h-6 bg-muted rounded w-1/4" />
      </div>
    </div>
  );
}

export default ContentGrid;
