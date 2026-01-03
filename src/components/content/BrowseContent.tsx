'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { ContentGrid } from './ContentGrid';
import { useAllContent } from '@/hooks/useContentRegistry';
import { ACCESS_REGISTRY_ADDRESS, CONTRACT_DEPLOYMENT_BLOCK } from '@/lib/contracts';

/**
 * BrowseContent Component
 * 
 * Fetches content IDs from ContentRegistered events and displays them in a grid.
 * This component handles the data fetching logic for the browse page.
 * 
 * Validates: Requirements 4.1, 10.1
 */
export function BrowseContent() {
  const [contentIds, setContentIds] = useState<`0x${string}`[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const publicClient = usePublicClient();

  // Fetch content IDs from ContentRegistered events
  useEffect(() => {
    async function fetchContentIds() {
      if (!publicClient) {
        setIsLoadingEvents(false);
        return;
      }

      setIsLoadingEvents(true);
      setEventsError(null);

      try {
        // Get current block number
        const currentBlock = await publicClient.getBlockNumber();
        
        // Query from deployment block or last 100k blocks, whichever is more recent
        const fromBlock = currentBlock > CONTRACT_DEPLOYMENT_BLOCK 
          ? CONTRACT_DEPLOYMENT_BLOCK 
          : currentBlock - BigInt(100000);

        // Get ContentRegistered events from the contract
        const logs = await publicClient.getLogs({
          address: ACCESS_REGISTRY_ADDRESS,
          event: {
            type: 'event',
            name: 'ContentRegistered',
            inputs: [
              { indexed: true, name: 'contentId', type: 'bytes32' },
              { indexed: true, name: 'creator', type: 'address' },
              { indexed: false, name: 'metadataCID', type: 'string' },
              { indexed: false, name: 'priceUSDC', type: 'uint256' },
            ],
          },
          fromBlock: fromBlock > BigInt(0) ? fromBlock : BigInt(0),
          toBlock: 'latest',
        });

        // Extract content IDs from logs (most recent first)
        const ids = logs
          .map((log) => log.args?.contentId as `0x${string}`)
          .filter((id): id is `0x${string}` => !!id)
          .reverse();

        setContentIds(ids);
      } catch (err) {
        console.error('Failed to fetch content events:', err);
        setEventsError(err instanceof Error ? err : new Error('Failed to fetch content'));
      } finally {
        setIsLoadingEvents(false);
      }
    }

    fetchContentIds();
  }, [publicClient, retryCount]);

  // Fetch content details and metadata
  const { content, isLoading: isLoadingContent, error: contentError, refetch } = useAllContent(
    contentIds.length > 0 ? contentIds : undefined
  );

  const isLoading = isLoadingEvents || isLoadingContent;
  const error = eventsError || contentError;

  // Retry handler
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    refetch();
  }, [refetch]);

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
