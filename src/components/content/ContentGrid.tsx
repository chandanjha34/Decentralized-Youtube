'use client';

import { ContentCard, type ContentCardProps } from './ContentCard';

/**
 * Props for ContentGrid component
 * Validates: Requirements 4.1
 */
export interface ContentGridProps {
  /** Array of content items to display */
  content: ContentCardProps[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Retry callback */
  onRetry?: () => void;
}

/**
 * ContentGrid Component
 * 
 * Displays content cards in a responsive grid layout:
 * - 3 columns on desktop (lg breakpoint)
 * - 2 columns on tablet (md breakpoint)
 * - 1 column on mobile
 * 
 * Handles empty state when no content is provided.
 * 
 * Validates: Requirements 4.1
 */
export function ContentGrid({ content, isLoading, error, onRetry }: ContentGridProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#37322F] border-r-transparent mb-4"></div>
        <p className="text-[#605A57]">Loading content...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-16">
        <span className="text-6xl mb-4 block">⚠️</span>
        <h3 className="text-2xl font-semibold text-[#37322F] mb-2">
          Error loading content
        </h3>
        <p className="text-[#605A57] mb-4">
          {error.message || 'Something went wrong'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-[#37322F] text-white rounded-full hover:bg-[#49423D] transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  // Empty state - no content provided
  if (!content || content.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-6xl mb-4 block">📭</span>
        <h3 className="text-2xl font-semibold text-[#37322F] mb-2">
          No content yet
        </h3>
        <p className="text-[#605A57]">
          Be the first to upload content to the platform!
        </p>
      </div>
    );
  }

  // Responsive grid layout: 1 column mobile, 2 columns tablet, 3 columns desktop
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {content.map((item) => (
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
  );
}

export default ContentGrid;
