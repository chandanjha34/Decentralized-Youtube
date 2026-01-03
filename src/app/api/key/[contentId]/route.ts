/**
 * x402 Payment-Protected Key Release API Route
 * 
 * This endpoint handles the x402 payment flow for content access:
 * 1. Returns HTTP 402 with PaymentRequirements if no access
 * 2. Verifies payment via x402 facilitator
 * 3. Grants access on-chain via AccessRegistry contract
 * 4. Returns decryption key after successful payment
 * 
 * Requirements: 5.1, 5.5, 5.6, 5.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// x402 Configuration
const X402_FACILITATOR_URL = 'https://x402.org/facilitator';
const USDC_POLYGON_AMOY = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'; // USDC on Polygon Amoy

// Contract configuration
const ACCESS_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_ACCESS_REGISTRY_ADDRESS || '0x41530D874f3DA5e7C998201BaA18aE0eC4A4fF2C') as `0x${string}`;

// Minimal ABI for the functions we need
const accessRegistryAbi = parseAbi([
  'function getContent(bytes32 contentId) view returns ((address creator, string metadataCID, string contentCID, uint256 priceUSDC, uint256 createdAt, bool active))',
  'function hasAccess(bytes32 contentId, address consumer) view returns (bool)',
  'function grantAccess(bytes32 contentId, address consumer, bytes32 paymentTxHash, uint256 expiryTimestamp)',
]);

// Create public client for reading contract state
const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology'),
});

// Create wallet client for writing to contract (using facilitator/platform key)
function getWalletClient() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('DEPLOYER_PRIVATE_KEY not configured');
  }
  
  const account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}`);
  
  return createWalletClient({
    account,
    chain: polygonAmoy,
    transport: http(process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology'),
  });
}

/**
 * x402 PaymentRequirements response format
 */
interface PaymentRequirements {
  x402Version: number;
  accepts: Array<{
    scheme: string;
    network: string;
    maxAmountRequired: string;
    asset: string;
    payTo: string;
    resource: string;
    extra?: Record<string, unknown>;
  }>;
  error?: string;
}

/**
 * Build x402 PaymentRequirements for a content item
 */
function buildPaymentRequirements(
  contentId: string,
  priceUSDC: bigint,
  creatorAddress: string,
  resource: string
): PaymentRequirements {
  return {
    x402Version: 2,
    accepts: [
      {
        scheme: 'exact',
        network: 'eip155:80002', // Polygon Amoy chain ID
        maxAmountRequired: priceUSDC.toString(),
        asset: USDC_POLYGON_AMOY,
        payTo: creatorAddress,
        resource: resource,
        extra: {
          contentId,
          description: 'Content access payment',
        },
      },
    ],
  };
}

/**
 * Decode base64 payment payload
 */
function decodePaymentPayload(encodedPayload: string): unknown {
  try {
    const decoded = Buffer.from(encodedPayload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    // If not base64, try parsing as JSON directly
    try {
      return JSON.parse(encodedPayload);
    } catch {
      return null;
    }
  }
}

/**
 * Verify payment with x402 facilitator
 */
async function verifyPaymentWithFacilitator(
  paymentPayload: string,
  paymentRequirements: PaymentRequirements
): Promise<{ valid: boolean; txHash?: string; consumer?: string; error?: string }> {
  try {
    // Decode the base64 payment payload
    const decodedPayload = decodePaymentPayload(paymentPayload);
    
    if (!decodedPayload) {
      return { valid: false, error: 'Invalid payment payload format' };
    }

    const response = await fetch(`${X402_FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentPayload: decodedPayload,
        paymentRequirements,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { valid: false, error: `Facilitator error: ${errorText}` };
    }

    const result = await response.json();
    return {
      valid: result.valid || result.isValid,
      txHash: result.transaction || result.txHash,
      consumer: result.consumer || result.from,
    };
  } catch (error) {
    console.error('Facilitator verification error:', error);
    return { valid: false, error: 'Failed to verify payment with facilitator' };
  }
}

/**
 * Settle payment with x402 facilitator
 */
async function settlePaymentWithFacilitator(
  paymentPayload: string,
  paymentRequirements: PaymentRequirements
): Promise<{ success: boolean; txHash?: string; consumer?: string; error?: string }> {
  try {
    // Decode the base64 payment payload
    const decodedPayload = decodePaymentPayload(paymentPayload);
    
    if (!decodedPayload) {
      return { success: false, error: 'Invalid payment payload format' };
    }

    const response = await fetch(`${X402_FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentPayload: decodedPayload,
        paymentRequirements,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Settlement error: ${errorText}` };
    }

    const result = await response.json();
    return {
      success: true,
      txHash: result.transaction || result.txHash,
      consumer: result.consumer || result.from,
    };
  } catch (error) {
    console.error('Facilitator settlement error:', error);
    return { success: false, error: 'Failed to settle payment with facilitator' };
  }
}

/**
 * Grant access on-chain via AccessRegistry contract
 */
async function grantAccessOnChain(
  contentId: `0x${string}`,
  consumer: `0x${string}`,
  paymentTxHash: `0x${string}`,
  expiryTimestamp: bigint = BigInt(0) // 0 = no expiry
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const walletClient = getWalletClient();
    
    const hash = await walletClient.writeContract({
      address: ACCESS_REGISTRY_ADDRESS,
      abi: accessRegistryAbi,
      functionName: 'grantAccess',
      args: [contentId, consumer, paymentTxHash, expiryTimestamp],
    });

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    return {
      success: receipt.status === 'success',
      txHash: hash,
    };
  } catch (error) {
    console.error('Grant access error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to grant access on-chain' 
    };
  }
}

/**
 * Universal IPFS gateway URL for fetching metadata
 * Using dweb.link which can fetch from any IPFS provider (Pinata, Lighthouse, etc.)
 */
const IPFS_GATEWAY_URL = 'https://dweb.link/ipfs';

/**
 * Content metadata structure from IPFS
 */
interface ContentMetadata {
  version: string;
  title: string;
  description: string;
  contentType: string;
  category: string;
  tags: string[];
  thumbnailCID: string | null;
  contentCID: string;
  encryptedKeyBlob: string;
  creatorAddress: string;
  priceUSDC: string;
  duration?: number;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
  };
}

/**
 * Fetch metadata from IPFS
 */
async function fetchMetadataFromIPFS(metadataCID: string): Promise<ContentMetadata | null> {
  try {
    const response = await fetch(`${IPFS_GATEWAY_URL}/${metadataCID}`);
    if (!response.ok) {
      console.error(`Failed to fetch metadata: ${response.statusText}`);
      return null;
    }
    return await response.json() as ContentMetadata;
  } catch (error) {
    console.error('Error fetching metadata from IPFS:', error);
    return null;
  }
}

/**
 * Get decryption key for content from metadata
 * 
 * The encryptedKeyBlob in metadata contains the AES key that was used
 * to encrypt the content. For this demo, we return it directly.
 * 
 * In a production system with asymmetric key encryption:
 * 1. The key would be encrypted with the creator's public key
 * 2. The platform would need to decrypt it or use a key escrow system
 * 3. Or use a different key management approach
 * 
 * Requirements: 5.7 - Return decryption key to consumer
 */
async function getDecryptionKey(metadataCID: string): Promise<string | null> {
  const metadata = await fetchMetadataFromIPFS(metadataCID);
  
  if (!metadata) {
    return null;
  }
  
  // Return the encrypted key blob from metadata
  // In this demo implementation, the key is stored as base64 in the metadata
  return metadata.encryptedKeyBlob;
}

/**
 * GET handler - Check access or return 402 with payment requirements
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { contentId: string } }
) {
  const contentId = params.contentId as `0x${string}`;
  
  // Validate contentId format
  if (!contentId || !contentId.startsWith('0x') || contentId.length !== 66) {
    return NextResponse.json(
      { error: 'Invalid content ID format' },
      { status: 400 }
    );
  }

  try {
    // Get content info from contract
    const contentInfo = await publicClient.readContract({
      address: ACCESS_REGISTRY_ADDRESS,
      abi: accessRegistryAbi,
      functionName: 'getContent',
      args: [contentId],
    });

    // Check if content exists and is active
    if (!contentInfo || !contentInfo.active) {
      return NextResponse.json(
        { error: 'Content not found or inactive' },
        { status: 404 }
      );
    }

    // Get consumer address from header (set by client)
    const consumerAddress = request.headers.get('x-consumer-address') as `0x${string}` | null;
    
    // Check for x402 payment header
    const paymentHeader = request.headers.get('payment-signature') || request.headers.get('x-payment');
    
    if (paymentHeader) {
      // Process payment
      const paymentRequirements = buildPaymentRequirements(
        contentId,
        contentInfo.priceUSDC,
        contentInfo.creator,
        `/api/key/${contentId}`
      );

      // Verify and settle payment with facilitator
      const verifyResult = await verifyPaymentWithFacilitator(paymentHeader, paymentRequirements);
      
      if (!verifyResult.valid) {
        return NextResponse.json(
          { error: verifyResult.error || 'Payment verification failed' },
          { status: 402 }
        );
      }

      // Settle the payment
      const settleResult = await settlePaymentWithFacilitator(paymentHeader, paymentRequirements);
      
      if (!settleResult.success) {
        return NextResponse.json(
          { error: settleResult.error || 'Payment settlement failed' },
          { status: 402 }
        );
      }

      // Grant access on-chain
      const consumer = (settleResult.consumer || consumerAddress) as `0x${string}`;
      const txHash = (settleResult.txHash || '0x' + '0'.repeat(64)) as `0x${string}`;
      
      if (consumer) {
        const grantResult = await grantAccessOnChain(contentId, consumer, txHash);
        
        if (!grantResult.success) {
          console.error('Failed to grant access on-chain:', grantResult.error);
          // Continue anyway - payment was successful
        }
      }

      // Return decryption key
      const key = await getDecryptionKey(contentInfo.metadataCID);
      
      if (!key) {
        return NextResponse.json(
          { error: 'Failed to retrieve decryption key' },
          { status: 500 }
        );
      }
      
      const response = NextResponse.json({
        success: true,
        key,
        contentCID: contentInfo.contentCID,
        txHash: settleResult.txHash,
      });

      // Add settlement response header
      if (settleResult.txHash) {
        response.headers.set('payment-response', Buffer.from(JSON.stringify({
          transaction: settleResult.txHash,
          settled: true,
        })).toString('base64'));
      }

      return response;
    }

    // Check if consumer already has access
    if (consumerAddress) {
      const hasAccess = await publicClient.readContract({
        address: ACCESS_REGISTRY_ADDRESS,
        abi: accessRegistryAbi,
        functionName: 'hasAccess',
        args: [contentId, consumerAddress],
      });

      if (hasAccess) {
        // Return decryption key for existing access
        const key = await getDecryptionKey(contentInfo.metadataCID);
        
        if (!key) {
          return NextResponse.json(
            { error: 'Failed to retrieve decryption key' },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          success: true,
          key,
          contentCID: contentInfo.contentCID,
          hasExistingAccess: true,
        });
      }
    }

    // No access and no payment - return 402 with payment requirements
    const paymentRequirements = buildPaymentRequirements(
      contentId,
      contentInfo.priceUSDC,
      contentInfo.creator,
      `/api/key/${contentId}`
    );

    const response = NextResponse.json(paymentRequirements, { status: 402 });
    
    // Add payment required header (base64 encoded)
    response.headers.set(
      'payment-required',
      Buffer.from(JSON.stringify(paymentRequirements)).toString('base64')
    );
    
    return response;

  } catch (error) {
    console.error('Key release error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Alternative endpoint for payment processing
 * Accepts payment payload in request body
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { contentId: string } }
) {
  const contentId = params.contentId as `0x${string}`;
  
  // Validate contentId format
  if (!contentId || !contentId.startsWith('0x') || contentId.length !== 66) {
    return NextResponse.json(
      { error: 'Invalid content ID format' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { paymentPayload, consumerAddress } = body;

    if (!paymentPayload) {
      return NextResponse.json(
        { error: 'Payment payload required' },
        { status: 400 }
      );
    }

    // Get content info from contract
    const contentInfo = await publicClient.readContract({
      address: ACCESS_REGISTRY_ADDRESS,
      abi: accessRegistryAbi,
      functionName: 'getContent',
      args: [contentId],
    });

    if (!contentInfo || !contentInfo.active) {
      return NextResponse.json(
        { error: 'Content not found or inactive' },
        { status: 404 }
      );
    }

    // Build payment requirements
    const paymentRequirements = buildPaymentRequirements(
      contentId,
      contentInfo.priceUSDC,
      contentInfo.creator,
      `/api/key/${contentId}`
    );

    // Verify payment
    const verifyResult = await verifyPaymentWithFacilitator(paymentPayload, paymentRequirements);
    
    if (!verifyResult.valid) {
      return NextResponse.json(
        { error: verifyResult.error || 'Payment verification failed' },
        { status: 402 }
      );
    }

    // Settle payment
    const settleResult = await settlePaymentWithFacilitator(paymentPayload, paymentRequirements);
    
    if (!settleResult.success) {
      return NextResponse.json(
        { error: settleResult.error || 'Payment settlement failed' },
        { status: 402 }
      );
    }

    // Grant access on-chain
    const consumer = (settleResult.consumer || consumerAddress) as `0x${string}`;
    const txHash = (settleResult.txHash || '0x' + '0'.repeat(64)) as `0x${string}`;
    
    if (consumer) {
      await grantAccessOnChain(contentId, consumer, txHash);
    }

    // Return decryption key
    const key = await getDecryptionKey(contentInfo.metadataCID);
    
    if (!key) {
      return NextResponse.json(
        { error: 'Failed to retrieve decryption key' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      key,
      contentCID: contentInfo.contentCID,
      txHash: settleResult.txHash,
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
