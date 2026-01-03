/**
 * x402 Payment Protocol Client Utilities
 * 
 * Client-side utilities for handling x402 micropayments.
 * Uses the x402 protocol for HTTP 402 Payment Required flows.
 * 
 * Requirements: 5.2, 5.3, 5.4
 */

import type { WalletClient } from 'viem';

// x402 Configuration
export const X402_CONFIG = {
  facilitatorUrl: 'https://x402.org/facilitator',
  network: 'eip155:80002', // Polygon Amoy
  usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // USDC on Polygon Amoy
  chainId: 80002,
} as const;

/**
 * x402 PaymentRequirements structure
 */
export interface PaymentRequirements {
  x402Version: number;
  accepts: PaymentOption[];
  error?: string;
}

export interface PaymentOption {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  asset: string;
  payTo: string;
  resource: string;
  extra?: Record<string, unknown>;
}

/**
 * x402 PaymentPayload structure
 */
export interface PaymentPayload {
  x402Version: number;
  resource: {
    url: string;
    method: string;
  };
  accepted: PaymentOption;
  payload: {
    signature: string;
    authorization: EIP3009Authorization;
  };
}

/**
 * EIP-3009 TransferWithAuthorization parameters
 */
export interface EIP3009Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

/**
 * Payment result from the API
 */
export interface PaymentResult {
  success: boolean;
  key?: string;
  contentCID?: string;
  txHash?: string;
  error?: string;
  hasExistingAccess?: boolean;
}

/**
 * Parse x402 PaymentRequirements from a 402 response
 */
export function parsePaymentRequirements(response: Response): PaymentRequirements | null {
  // Try to get from header first
  const headerValue = response.headers.get('payment-required');
  if (headerValue) {
    try {
      return JSON.parse(Buffer.from(headerValue, 'base64').toString());
    } catch {
      // Fall through to body parsing
    }
  }
  return null;
}

/**
 * Parse payment requirements from response body
 */
export async function parsePaymentRequirementsFromBody(response: Response): Promise<PaymentRequirements | null> {
  try {
    const body = await response.json();
    if (body.x402Version && body.accepts) {
      return body as PaymentRequirements;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a random nonce for EIP-3009
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * EIP-712 domain for USDC on Polygon Amoy
 */
export const USDC_EIP712_DOMAIN = {
  name: 'USD Coin',
  version: '2',
  chainId: X402_CONFIG.chainId,
  verifyingContract: X402_CONFIG.usdcAddress as `0x${string}`,
} as const;

/**
 * EIP-712 types for TransferWithAuthorization
 */
export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

/**
 * Sign an EIP-3009 TransferWithAuthorization
 */
export async function signTransferAuthorization(
  walletClient: WalletClient,
  authorization: EIP3009Authorization
): Promise<string> {
  if (!walletClient.account) {
    throw new Error('Wallet not connected');
  }

  const signature = await walletClient.signTypedData({
    account: walletClient.account,
    domain: USDC_EIP712_DOMAIN,
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: 'TransferWithAuthorization',
    message: {
      from: authorization.from as `0x${string}`,
      to: authorization.to as `0x${string}`,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce as `0x${string}`,
    },
  });

  return signature;
}

/**
 * Create a payment payload for x402
 */
export async function createPaymentPayload(
  walletClient: WalletClient,
  paymentOption: PaymentOption,
  resource: string
): Promise<PaymentPayload> {
  if (!walletClient.account) {
    throw new Error('Wallet not connected');
  }

  const now = Math.floor(Date.now() / 1000);
  const validAfter = '0'; // Valid immediately
  const validBefore = (now + 3600).toString(); // Valid for 1 hour
  const nonce = generateNonce();

  const authorization: EIP3009Authorization = {
    from: walletClient.account.address,
    to: paymentOption.payTo,
    value: paymentOption.maxAmountRequired,
    validAfter,
    validBefore,
    nonce,
  };

  const signature = await signTransferAuthorization(walletClient, authorization);

  return {
    x402Version: 2,
    resource: {
      url: resource,
      method: 'GET',
    },
    accepted: paymentOption,
    payload: {
      signature,
      authorization,
    },
  };
}

/**
 * Encode payment payload for X-PAYMENT header
 */
export function encodePaymentHeader(payload: PaymentPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Make a paid request using x402 protocol
 */
export async function makePaidRequest(
  url: string,
  walletClient: WalletClient,
  consumerAddress: string
): Promise<PaymentResult> {
  // First request - check access or get payment requirements
  const initialResponse = await fetch(url, {
    headers: {
      'x-consumer-address': consumerAddress,
    },
  });

  // If we have access, return the key
  if (initialResponse.ok) {
    return await initialResponse.json();
  }

  // If not 402, it's an error
  if (initialResponse.status !== 402) {
    const error = await initialResponse.json().catch(() => ({ error: 'Unknown error' }));
    return { success: false, error: error.error || `HTTP ${initialResponse.status}` };
  }

  // Parse payment requirements
  let paymentRequirements = parsePaymentRequirements(initialResponse);
  if (!paymentRequirements) {
    paymentRequirements = await parsePaymentRequirementsFromBody(
      initialResponse.clone()
    );
  }

  if (!paymentRequirements || !paymentRequirements.accepts?.length) {
    return { success: false, error: 'Invalid payment requirements' };
  }

  // Select the first payment option (could add selection logic later)
  const paymentOption = paymentRequirements.accepts[0];

  // Create and sign payment payload
  const paymentPayload = await createPaymentPayload(
    walletClient,
    paymentOption,
    url
  );

  // Make paid request with payment header
  const paidResponse = await fetch(url, {
    headers: {
      'x-consumer-address': consumerAddress,
      'payment-signature': encodePaymentHeader(paymentPayload),
    },
  });

  if (!paidResponse.ok) {
    const error = await paidResponse.json().catch(() => ({ error: 'Payment failed' }));
    return { success: false, error: error.error || 'Payment failed' };
  }

  return await paidResponse.json();
}

/**
 * Check if user has existing access to content
 */
export async function checkAccess(
  contentId: string,
  consumerAddress: string
): Promise<{ hasAccess: boolean; key?: string; contentCID?: string }> {
  try {
    const response = await fetch(`/api/key/${contentId}`, {
      headers: {
        'x-consumer-address': consumerAddress,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        hasAccess: true,
        key: data.key,
        contentCID: data.contentCID,
      };
    }

    return { hasAccess: false };
  } catch {
    return { hasAccess: false };
  }
}

/**
 * Get payment requirements for content without making payment
 */
export async function getPaymentRequirements(
  contentId: string
): Promise<PaymentRequirements | null> {
  try {
    const response = await fetch(`/api/key/${contentId}`);
    
    if (response.status === 402) {
      let requirements = parsePaymentRequirements(response);
      if (!requirements) {
        requirements = await parsePaymentRequirementsFromBody(response.clone());
      }
      return requirements;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Format USDC amount for display (6 decimals)
 */
export function formatUSDCAmount(amount: string): string {
  const value = Number(amount) / 1e6;
  return `$${value.toFixed(2)}`;
}
