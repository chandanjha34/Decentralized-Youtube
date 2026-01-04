/**
 * POL Payment Grant Access API Route
 * 
 * Verifies POL payment transaction and grants access to content.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseAbi, fallback } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const ACCESS_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_ACCESS_REGISTRY_ADDRESS || '') as `0x${string}`;

// Multiple IPFS gateways for reliability
const IPFS_GATEWAYS = [
  'https://gateway.lighthouse.storage/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
  'https://ipfs.io/ipfs',
  'https://dweb.link/ipfs',
];

const POL_USD_RATE = 0.40;

const accessRegistryAbi = parseAbi([
  'function getContent(bytes32 contentId) view returns ((address creator, string metadataCID, string contentCID, uint256 priceUSDC, uint256 createdAt, bool active))',
  'function hasAccess(bytes32 contentId, address consumer) view returns (bool)',
  'function grantAccess(bytes32 contentId, address consumer, bytes32 paymentTxHash, uint256 expiryTimestamp)',
]);

// Use multiple RPC endpoints with fallback
const transport = fallback([
  http('https://polygon-amoy.drpc.org'),
  http('https://polygon-amoy-bor-rpc.publicnode.com'),
  http('https://rpc-amoy.polygon.technology'),
]);

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport,
});

function getWalletClient() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error('DEPLOYER_PRIVATE_KEY not configured');

  const account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}`);
  return createWalletClient({
    account,
    chain: polygonAmoy,
    transport,
  });
}

interface ContentMetadata {
  encryptedKeyBlob: string;
  contentCID: string;
}

async function fetchMetadataFromIPFS(metadataCID: string): Promise<ContentMetadata | null> {
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await fetch(`${gateway}/${metadataCID}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) {
        return await response.json() as ContentMetadata;
      }
    } catch {
      continue; // Try next gateway
    }
  }
  return null;
}

function usdcToMinPolWei(priceUSDC: bigint): bigint {
  const usdAmount = Number(priceUSDC) / 1e6;
  const polAmount = usdAmount / POL_USD_RATE;
  // Allow 30% slippage for testnet price variations
  const minPol = polAmount * 0.7;
  return BigInt(Math.floor(minPol * 1e18));
}

export async function POST(
  request: NextRequest,
  { params }: { params: { contentId: string } }
) {
  const contentId = params.contentId as `0x${string}`;

  if (!contentId || !contentId.startsWith('0x') || contentId.length !== 66) {
    return NextResponse.json({ error: 'Invalid content ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { consumerAddress, txHash } = body;

    if (!consumerAddress || !txHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get content info with retry
    let contentInfo;
    for (let i = 0; i < 3; i++) {
      try {
        contentInfo = await publicClient.readContract({
          address: ACCESS_REGISTRY_ADDRESS,
          abi: accessRegistryAbi,
          functionName: 'getContent',
          args: [contentId],
        });
        break;
      } catch (err) {
        if (i === 2) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!contentInfo || !contentInfo.active) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Verify the transaction with retry
    let tx;
    for (let i = 0; i < 3; i++) {
      try {
        tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
        break;
      } catch (err) {
        if (i === 2) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 400 });
    }

    // Verify transaction details
    const isFromConsumer = tx.from.toLowerCase() === consumerAddress.toLowerCase();
    const isToCreator = tx.to?.toLowerCase() === contentInfo.creator.toLowerCase();
    const minPolRequired = usdcToMinPolWei(contentInfo.priceUSDC);
    const isPaidEnough = tx.value >= minPolRequired;

    if (!isFromConsumer) {
      return NextResponse.json({ error: 'Transaction sender mismatch' }, { status: 400 });
    }

    if (!isToCreator) {
      return NextResponse.json({ error: 'Payment not sent to creator' }, { status: 400 });
    }

    if (!isPaidEnough) {
      return NextResponse.json({
        error: `Insufficient payment`
      }, { status: 400 });
    }

    // Grant access on-chain - MANDATORY (not best effort)
    let grantTxHash: string | undefined;
    try {
      const walletClient = getWalletClient();

      // Submit transaction with retry logic
      let hash;
      let attempt = 0;
      const maxAttempts = 3;

      while (attempt < maxAttempts) {
        try {
          hash = await walletClient.writeContract({
            address: ACCESS_REGISTRY_ADDRESS,
            abi: accessRegistryAbi,
            functionName: 'grantAccess',
            args: [contentId, consumerAddress as `0x${string}`, txHash as `0x${string}`, BigInt(0)],
          });
          break; // Success
        } catch (err) {
          attempt++;
          if (attempt >= maxAttempts) {
            throw err;
          }
          // Exponential backoff
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        }
      }

      if (!hash) {
        throw new Error('Failed to submit grant access transaction');
      }

      grantTxHash = hash;
      console.log('Grant access transaction submitted:', hash);

      // Wait for confirmation with timeout
      const receipt = await Promise.race([
        publicClient.waitForTransactionReceipt({ hash }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Grant access confirmation timeout')), 60000)
        ),
      ]);

      if (receipt.status !== 'success') {
        throw new Error('Grant access transaction failed on-chain');
      }

      console.log('Grant access transaction confirmed:', receipt.transactionHash);
    } catch (grantError) {
      console.error('Failed to grant access on-chain:', grantError);
      return NextResponse.json({
        error: 'Payment verified but failed to grant on-chain access. Please contact support with your transaction hash.',
        txHash,
        details: grantError instanceof Error ? grantError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Get decryption key from metadata
    const metadata = await fetchMetadataFromIPFS(contentInfo.metadataCID);

    if (!metadata?.encryptedKeyBlob) {
      return NextResponse.json({ error: 'Failed to retrieve decryption key' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      key: metadata.encryptedKeyBlob,
      contentCID: contentInfo.contentCID,
      txHash,
      grantTxHash, // Include grant transaction hash for transparency
    });

  } catch (error) {
    console.error('Grant access error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
