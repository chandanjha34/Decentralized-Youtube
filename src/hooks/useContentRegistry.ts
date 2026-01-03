'use client';

import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { ACCESS_REGISTRY_ADDRESS, CONTRACT_DEPLOYMENT_BLOCK, accessRegistryAbi, type ContentInfo } from '@/lib/contracts';
import { fetchJSONFromIPFS } from '@/lib/ipfs';
import { useState, useEffect, useCallback } from 'react';
import type { ContentMetadata, Category, ContentCardData, DashboardContent, Transaction } from '@/types/content';
import { parseAbiItem } from 'viem';

/**
 * Content item with full metadata for display
 */
export interface ContentWithMetadata {
  contentId: string;
  contentInfo: ContentInfo;
  metadata: ContentMetadata | null;
}

/**
 * Hook to fetch a single content item by ID
 */
export function useContent(contentId: string | undefined) {
  const { data: contentInfo, isLoading, error } = useReadContract({
    address: ACCESS_REGISTRY_ADDRESS,
    abi: accessRegistryAbi,
    functionName: 'getContent',
    args: contentId ? [contentId as `0x${string}`] : undefined,
    query: {
      enabled: !!contentId,
    },
  });

  return {
    contentInfo: contentInfo as ContentInfo | undefined,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch all content IDs for a creator
 */
export function useCreatorContents(creatorAddress: string | undefined) {
  const { data: contentIds, isLoading, error, refetch } = useReadContract({
    address: ACCESS_REGISTRY_ADDRESS,
    abi: accessRegistryAbi,
    functionName: 'getCreatorContents',
    args: creatorAddress ? [creatorAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!creatorAddress,
    },
  });

  return {
    contentIds: contentIds as `0x${string}`[] | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to check if a user has access to content
 */
export function useHasAccess(contentId: string | undefined, userAddress: string | undefined) {
  const { data: hasAccess, isLoading, error } = useReadContract({
    address: ACCESS_REGISTRY_ADDRESS,
    abi: accessRegistryAbi,
    functionName: 'hasAccess',
    args: contentId && userAddress 
      ? [contentId as `0x${string}`, userAddress as `0x${string}`] 
      : undefined,
    query: {
      enabled: !!contentId && !!userAddress,
    },
  });

  return {
    hasAccess: hasAccess as boolean | undefined,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch multiple content items with their metadata
 * Used for the browse grid
 * 
 * Validates: Requirements 4.1
 */
export function useAllContent(contentIds: `0x${string}`[] | undefined) {
  const [contentWithMetadata, setContentWithMetadata] = useState<ContentCardData[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<Error | null>(null);

  // Fetch all content info from contract
  const contracts = contentIds?.map((id) => ({
    address: ACCESS_REGISTRY_ADDRESS,
    abi: accessRegistryAbi,
    functionName: 'getContent' as const,
    args: [id] as const,
  })) ?? [];

  const { data: contentInfos, isLoading: isLoadingContract, error: contractError } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
    },
  });

  // Fetch metadata from IPFS for each content
  const fetchMetadata = useCallback(async () => {
    if (!contentIds || !contentInfos || contentInfos.length === 0) {
      setContentWithMetadata([]);
      return;
    }

    setIsLoadingMetadata(true);
    setMetadataError(null);

    try {
      const results: ContentCardData[] = [];

      for (let i = 0; i < contentIds.length; i++) {
        const contentId = contentIds[i];
        const result = contentInfos[i];

        if (result.status !== 'success' || !result.result) continue;

        const info = result.result as ContentInfo;
        
        // Skip inactive content
        if (!info.active) continue;

        try {
          // Fetch metadata from IPFS
          const metadata = await fetchJSONFromIPFS<ContentMetadata>(info.metadataCID);
          
          results.push({
            contentId,
            title: metadata.title,
            thumbnailCID: metadata.thumbnailCID,
            creatorAddress: info.creator,
            priceUSDC: info.priceUSDC,
            category: metadata.category as Category,
            tags: metadata.tags || [],
          });
        } catch (err) {
          // If metadata fetch fails, use fallback data
          console.warn(`Failed to fetch metadata for ${contentId}:`, err);
          results.push({
            contentId,
            title: 'Untitled Content',
            thumbnailCID: null,
            creatorAddress: info.creator,
            priceUSDC: info.priceUSDC,
            category: 'other' as Category,
            tags: [],
          });
        }
      }

      setContentWithMetadata(results);
    } catch (err) {
      setMetadataError(err instanceof Error ? err : new Error('Failed to fetch metadata'));
    } finally {
      setIsLoadingMetadata(false);
    }
  }, [contentIds, contentInfos]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  return {
    content: contentWithMetadata,
    isLoading: isLoadingContract || isLoadingMetadata,
    error: contractError || metadataError,
    refetch: fetchMetadata,
  };
}


/**
 * Hook to fetch creator's content with dashboard-specific data
 * Includes createdAt timestamp from contract
 * 
 * Validates: Requirements 8.1, 8.2
 */
export function useCreatorDashboardContent(creatorAddress: string | undefined) {
  const [dashboardContent, setDashboardContent] = useState<DashboardContent[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<Error | null>(null);

  // First, fetch creator's content IDs
  const { contentIds, isLoading: isLoadingIds, error: idsError } = useCreatorContents(creatorAddress);

  // Fetch all content info from contract
  const contracts = contentIds?.map((id) => ({
    address: ACCESS_REGISTRY_ADDRESS,
    abi: accessRegistryAbi,
    functionName: 'getContent' as const,
    args: [id] as const,
  })) ?? [];

  const { data: contentInfos, isLoading: isLoadingContract, error: contractError } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
    },
  });

  // Fetch metadata from IPFS for each content
  const fetchMetadata = useCallback(async () => {
    if (!contentIds || !contentInfos || contentInfos.length === 0) {
      setDashboardContent([]);
      return;
    }

    setIsLoadingMetadata(true);
    setMetadataError(null);

    try {
      const results: DashboardContent[] = [];

      for (let i = 0; i < contentIds.length; i++) {
        const contentId = contentIds[i];
        const result = contentInfos[i];

        if (result.status !== 'success' || !result.result) continue;

        const info = result.result as ContentInfo;

        try {
          // Fetch metadata from IPFS
          const metadata = await fetchJSONFromIPFS<ContentMetadata>(info.metadataCID);
          
          results.push({
            contentId,
            title: metadata.title,
            category: metadata.category as Category,
            priceUSDC: info.priceUSDC,
            uploadDate: new Date(Number(info.createdAt) * 1000),
            viewCount: 0, // Will be populated from AccessGranted events in Task 15
            totalEarnings: BigInt(0), // Will be populated from AccessGranted events in Task 15
            status: info.active ? 'active' : 'inactive',
          });
        } catch (err) {
          // If metadata fetch fails, use fallback data
          console.warn(`Failed to fetch metadata for ${contentId}:`, err);
          results.push({
            contentId,
            title: 'Untitled Content',
            category: 'other' as Category,
            priceUSDC: info.priceUSDC,
            uploadDate: new Date(Number(info.createdAt) * 1000),
            viewCount: 0,
            totalEarnings: BigInt(0),
            status: info.active ? 'active' : 'inactive',
          });
        }
      }

      setDashboardContent(results);
    } catch (err) {
      setMetadataError(err instanceof Error ? err : new Error('Failed to fetch metadata'));
    } finally {
      setIsLoadingMetadata(false);
    }
  }, [contentIds, contentInfos]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  return {
    content: dashboardContent,
    isLoading: isLoadingIds || isLoadingContract || isLoadingMetadata,
    error: idsError || contractError || metadataError,
    refetch: fetchMetadata,
  };
}


/**
 * Hook to update content price on the AccessRegistry contract
 * Only the content creator can update the price
 * 
 * Validates: Requirements 8.4
 */
export function useUpdatePrice() {
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({
    hash,
  });

  const updatePrice = useCallback(
    async (contentId: string, newPriceUSDC: bigint) => {
      writeContract({
        address: ACCESS_REGISTRY_ADDRESS,
        abi: accessRegistryAbi,
        functionName: 'updatePrice',
        args: [contentId as `0x${string}`, newPriceUSDC],
      });
    },
    [writeContract]
  );

  return {
    updatePrice,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError || confirmError,
    txHash: hash,
    reset,
  };
}


/**
 * Earnings data for creator dashboard
 */
export interface EarningsData {
  totalEarningsUSDC: bigint;
  transactionCount: number;
  recentTransactions: Transaction[];
}

/**
 * Hook to fetch creator's earnings from AccessGranted events
 * Queries events for all content owned by the creator and aggregates earnings
 * 
 * Validates: Requirements 8.5, 8.6
 */
export function useCreatorEarnings(creatorAddress: string | undefined) {
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalEarningsUSDC: BigInt(0),
    transactionCount: 0,
    recentTransactions: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const publicClient = usePublicClient();

  // First, fetch creator's content IDs
  const { contentIds, isLoading: isLoadingIds, error: idsError } = useCreatorContents(creatorAddress);

  // Fetch content info for each content ID to get prices
  const contracts = contentIds?.map((id) => ({
    address: ACCESS_REGISTRY_ADDRESS,
    abi: accessRegistryAbi,
    functionName: 'getContent' as const,
    args: [id] as const,
  })) ?? [];

  const { data: contentInfos, isLoading: isLoadingContract, error: contractError } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
    },
  });

  // Fetch AccessGranted events and calculate earnings
  const fetchEarnings = useCallback(async () => {
    if (!creatorAddress || !contentIds || contentIds.length === 0 || !publicClient || !contentInfos) {
      setEarningsData({
        totalEarningsUSDC: BigInt(0),
        transactionCount: 0,
        recentTransactions: [],
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current block number for range calculation
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > CONTRACT_DEPLOYMENT_BLOCK 
        ? CONTRACT_DEPLOYMENT_BLOCK 
        : currentBlock - BigInt(100000);

      // Build a map of contentId -> price and contentId -> metadata
      const contentPriceMap = new Map<string, bigint>();
      const contentTitleMap = new Map<string, string>();

      for (let i = 0; i < contentIds.length; i++) {
        const contentId = contentIds[i];
        const result = contentInfos[i];

        if (result.status !== 'success' || !result.result) continue;

        const info = result.result as ContentInfo;
        contentPriceMap.set(contentId.toLowerCase(), info.priceUSDC);

        // Try to fetch title from metadata
        try {
          const metadata = await fetchJSONFromIPFS<ContentMetadata>(info.metadataCID);
          contentTitleMap.set(contentId.toLowerCase(), metadata.title);
        } catch {
          contentTitleMap.set(contentId.toLowerCase(), 'Untitled Content');
        }
      }

      // Fetch AccessGranted events for all creator's content
      const allTransactions: Transaction[] = [];
      let totalEarnings = BigInt(0);

      // Query events for each content ID
      for (const contentId of contentIds) {
        try {
          const logs = await publicClient.getLogs({
            address: ACCESS_REGISTRY_ADDRESS,
            event: parseAbiItem('event AccessGranted(bytes32 indexed contentId, address indexed consumer, bytes32 paymentTxHash, uint256 expiryTimestamp)'),
            args: {
              contentId: contentId,
            },
            fromBlock: fromBlock > BigInt(0) ? fromBlock : BigInt(0),
            toBlock: 'latest',
          });

          // Process each log
          for (const log of logs) {
            const price = contentPriceMap.get(contentId.toLowerCase()) || BigInt(0);
            totalEarnings += price;

            // Get block timestamp for the transaction
            let timestamp = new Date();
            try {
              const block = await publicClient.getBlock({ blockHash: log.blockHash! });
              timestamp = new Date(Number(block.timestamp) * 1000);
            } catch {
              // Use current time if block fetch fails
            }

            allTransactions.push({
              contentId: contentId,
              contentTitle: contentTitleMap.get(contentId.toLowerCase()) || 'Untitled Content',
              consumerAddress: log.args.consumer as string,
              amountUSDC: price,
              timestamp,
              txHash: log.transactionHash!,
            });
          }
        } catch (err) {
          console.warn(`Failed to fetch events for content ${contentId}:`, err);
        }
      }

      // Sort transactions by timestamp (most recent first)
      allTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Take only the most recent 20 transactions
      const recentTransactions = allTransactions.slice(0, 20);

      setEarningsData({
        totalEarningsUSDC: totalEarnings,
        transactionCount: allTransactions.length,
        recentTransactions,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch earnings'));
    } finally {
      setIsLoading(false);
    }
  }, [creatorAddress, contentIds, publicClient, contentInfos]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  return {
    earnings: earningsData,
    isLoading: isLoadingIds || isLoadingContract || isLoading,
    error: idsError || contractError || error,
    refetch: fetchEarnings,
  };
}
