'use client';

import { useEffect, useState, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { ContentGrid } from './ContentGrid';
import { useAllContent } from '@/hooks/useContentRegistry';
import { ACCESS_REGISTRY_ADDRESS, accessRegistryAbi } from '@/lib/contracts';

/**
 * BrowseContent Component
 * 
 * Fetches content IDs directly from contract state (fast!) and displays them in a grid.
 * Uses getAllContentIds() instead of slow event queries.
 * 
 * Validates: Requirements 4.1, 10.1
 */
export function BrowseContent() {
  const [retryCount, setRetryCount] = useState(0);

  // Fetch all content IDs directly from contract state - FAST!
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
  const { content, isLoading: isLoadingContent, error: contentError, refetch: refetchContent } = useAllContent(
    reversedContentIds && reversedContentIds.length > 0 ? reversedContentIds : undefined
  );

  const isLoading = isLoadingIds || isLoadingContent;
  const error = idsError || contentError;

  // Retry handler
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    refetchIds();
    refetchContent();
  }, [refetchIds, refetchContent]);

  return (
    <ContentGrid
      content={content}
      isLoading={isLoading}
      error={error}
      onRetry={handleRetry}
    />
  );
}

export default BrowseContent;
