'use client';

import { useState, useMemo, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { FilterBar } from '@/components/content/FilterBar';
import { ContentGrid } from '@/components/content/ContentGrid';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage, getErrorType } from '@/components/ui/error-message';
import { useAllContent } from '@/hooks/useContentRegistry';
import { ACCESS_REGISTRY_ADDRESS, accessRegistryAbi } from '@/lib/contracts';
import { type Category } from '@/types/content';

/**
 * Explore Page
 * 
 * Browse and discover available content with:
 * - Sticky filter bar with search and category filtering
 * - Responsive grid layout
 * - Loading and error states
 * 
 * Validates: Requirements 4.1, 4.2, 4.3, 4.5
 */
export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all content IDs directly from contract state
  const { 
    data: contentIds, 
    isLoading: isLoadingIds, 
    error: idsError,
    refetch: refetchIds
  } = useReadContract({
    address: ACCESS_REGISTRY_ADDRESS,
    abi: accessRegistryAbi,
    functionName: 'getAllContentIds',
    query: {
      staleTime: 30000, // Cache for 30 seconds
    },
  });

  // Reverse the array to show most recent first
  const reversedContentIds = contentIds 
    ? [...contentIds].reverse() as `0x${string}`[]
    : undefined;

  // Fetch content details and metadata
  const { 
    content, 
    isLoading: isLoadingContent, 
    error: contentError, 
    refetch: refetchContent 
  } = useAllContent(
    reversedContentIds && reversedContentIds.length > 0 ? reversedContentIds : undefined
  );

  const isLoading = isLoadingIds || isLoadingContent;
  const error = idsError || contentError;

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

  // Retry handler
  const handleRetry = useCallback(() => {
    refetchIds();
    refetchContent();
  }, [refetchIds, refetchContent]);

  return (
    <div className="min-h-screen bg-[#F7F5F3]">
      {/* Page header */}
      <div className="border-b border-[rgba(55,50,47,0.12)] bg-white">
        <div className="max-w-[1060px] mx-auto px-8 py-12">
          <h1 className="font-serif text-5xl text-[#37322F] mb-4">
            Explore Content
          </h1>
          <p className="text-lg text-[#605A57] max-w-2xl">
            Discover encrypted content from creators around the world. Purchase access with USDC and unlock premium content instantly.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Content area */}
      <div className="max-w-[1060px] mx-auto px-8 py-8">
        {/* Loading state */}
        {isLoading && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" message="Loading content..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <ContentCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="py-12">
            <ErrorMessage
              type={getErrorType(error)}
              message={error.message}
              onRetry={handleRetry}
              showSuggestion={true}
              variant="card"
              className="max-w-md mx-auto"
            />
          </div>
        )}

        {/* Content loaded successfully */}
        {!isLoading && !error && (
          <>
            {/* Results count */}
            {content.length > 0 && (
              <div className="text-sm text-[#605A57] mb-6">
                Showing {filteredContent.length} of {content.length} items
                {selectedCategory !== 'all' && ` in ${selectedCategory}`}
                {searchQuery && ` matching "${searchQuery}"`}
              </div>
            )}

            {/* Grid with filtered results or empty state */}
            {filteredContent.length > 0 ? (
              <ContentGrid content={filteredContent} />
            ) : content.length > 0 ? (
              /* No results after filtering */
              <div className="text-center py-16">
                <span className="text-6xl mb-4 block">🔍</span>
                <h3 className="text-2xl font-semibold text-[#37322F] mb-2">
                  No results found
                </h3>
                <p className="text-[#605A57] mb-6">
                  Try adjusting your filters or search query
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="px-6 py-2 bg-[#37322F] text-white rounded-full hover:bg-[#49423D] transition-colors"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              /* No content at all - handled by ContentGrid empty state */
              <ContentGrid content={[]} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for content cards
 */
function ContentCardSkeleton() {
  return (
    <div className="rounded-lg border border-[#E0DEDB] bg-white overflow-hidden animate-pulse">
      <div className="aspect-video bg-[rgba(55,50,47,0.06)]" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-[rgba(55,50,47,0.06)] rounded w-3/4" />
        <div className="h-4 bg-[rgba(55,50,47,0.06)] rounded w-1/2" />
      </div>
      <div className="px-4 pb-4">
        <div className="h-6 bg-[rgba(55,50,47,0.06)] rounded w-1/4" />
      </div>
    </div>
  );
}
