'use client';

import { cn } from '@/lib/utils';
import { Button } from './button';

/**
 * Error types for categorized error handling
 * 
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */
export type ErrorType = 
  | 'wallet'      // Wallet connection/signature errors
  | 'network'     // Network/RPC errors
  | 'payment'     // Payment/transaction failures
  | 'decryption'  // Content decryption failures
  | 'ipfs'        // IPFS fetch/upload errors
  | 'contract'    // Smart contract errors
  | 'generic';    // Generic errors

/**
 * Error icons for each error type
 */
const ERROR_ICONS: Record<ErrorType, string> = {
  wallet: '👛',
  network: '🌐',
  payment: '💳',
  decryption: '🔐',
  ipfs: '📦',
  contract: '📜',
  generic: '⚠️',
};

/**
 * User-friendly error titles for each error type
 */
const ERROR_TITLES: Record<ErrorType, string> = {
  wallet: 'Wallet Error',
  network: 'Network Error',
  payment: 'Payment Failed',
  decryption: 'Decryption Failed',
  ipfs: 'Storage Error',
  contract: 'Transaction Error',
  generic: 'Something Went Wrong',
};

/**
 * Helpful suggestions for each error type
 */
const ERROR_SUGGESTIONS: Record<ErrorType, string> = {
  wallet: 'Please check your wallet connection and try again.',
  network: 'Check your internet connection and ensure you\'re on Polygon Amoy network. If the error persists, you may need testnet POL for gas fees.',
  payment: 'The payment could not be processed. Make sure you have testnet POL for gas fees. Get free POL at: https://faucet.polygon.technology/',
  decryption: 'Unable to decrypt the content. Try refreshing the page or re-fetching the key.',
  ipfs: 'Unable to access the storage network. Please try again in a moment.',
  contract: 'The blockchain transaction failed. Make sure you have enough POL for gas fees. Get free testnet POL at: https://faucet.polygon.technology/',
  generic: 'An unexpected error occurred. Please try again.',
};

/**
 * Props for ErrorMessage component
 */
export interface ErrorMessageProps {
  /** The error type for categorized display */
  type?: ErrorType;
  /** The error message to display */
  message: string;
  /** Optional callback for retry action */
  onRetry?: () => void;
  /** Optional callback for dismiss action */
  onDismiss?: () => void;
  /** Whether to show the suggestion text */
  showSuggestion?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Variant style */
  variant?: 'inline' | 'card' | 'banner';
}

/**
 * ErrorMessage Component
 * 
 * Displays user-friendly error messages with categorized icons,
 * helpful suggestions, and optional retry/dismiss actions.
 * 
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */
export function ErrorMessage({
  type = 'generic',
  message,
  onRetry,
  onDismiss,
  showSuggestion = true,
  className,
  variant = 'inline',
}: ErrorMessageProps) {
  const icon = ERROR_ICONS[type];
  const title = ERROR_TITLES[type];
  const suggestion = ERROR_SUGGESTIONS[type];

  if (variant === 'banner') {
    return (
      <div className={cn(
        'w-full p-4 bg-destructive/10 border border-destructive/20 rounded-lg',
        className
      )}>
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-destructive">{title}</h4>
            <p className="text-sm text-destructive/90 mt-1">{message}</p>
            {showSuggestion && (
              <p className="text-xs text-muted-foreground mt-2">{suggestion}</p>
            )}
            {(onRetry || onDismiss) && (
              <div className="flex gap-2 mt-3">
                {onRetry && (
                  <Button size="sm" variant="outline" onClick={onRetry}>
                    Try Again
                  </Button>
                )}
                {onDismiss && (
                  <Button size="sm" variant="ghost" onClick={onDismiss}>
                    Dismiss
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn(
        'p-6 bg-card border rounded-lg text-center',
        className
      )}>
        <span className="text-4xl block mb-3">{icon}</span>
        <h4 className="font-semibold text-destructive mb-2">{title}</h4>
        <p className="text-sm text-muted-foreground mb-2">{message}</p>
        {showSuggestion && (
          <p className="text-xs text-muted-foreground/70 mb-4">{suggestion}</p>
        )}
        {(onRetry || onDismiss) && (
          <div className="flex justify-center gap-2">
            {onRetry && (
              <Button size="sm" onClick={onRetry}>
                Try Again
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="outline" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default inline variant
  return (
    <div className={cn(
      'flex items-start gap-2 p-3 bg-destructive/10 rounded-md',
      className
    )}>
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-destructive font-medium">{message}</p>
        {showSuggestion && (
          <p className="text-xs text-muted-foreground mt-1">{suggestion}</p>
        )}
        {onRetry && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onRetry}
            className="mt-2"
          >
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Utility function to determine error type from error message
 */
export function getErrorType(error: Error | string): ErrorType {
  const message = typeof error === 'string' ? error.toLowerCase() : error.message.toLowerCase();
  
  // Wallet errors
  if (
    message.includes('wallet') ||
    message.includes('connect') ||
    message.includes('rejected') ||
    message.includes('user denied') ||
    message.includes('signature')
  ) {
    return 'wallet';
  }
  
  // Network errors
  if (
    message.includes('network') ||
    message.includes('chain') ||
    message.includes('rpc') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('fetch failed')
  ) {
    return 'network';
  }
  
  // Payment errors
  if (
    message.includes('payment') ||
    message.includes('insufficient') ||
    message.includes('balance') ||
    message.includes('usdc') ||
    message.includes('402')
  ) {
    return 'payment';
  }
  
  // Decryption errors
  if (
    message.includes('decrypt') ||
    message.includes('key') ||
    message.includes('aes') ||
    message.includes('cipher')
  ) {
    return 'decryption';
  }
  
  // IPFS errors
  if (
    message.includes('ipfs') ||
    message.includes('pinata') ||
    message.includes('cid') ||
    message.includes('upload')
  ) {
    return 'ipfs';
  }
  
  // Contract errors
  if (
    message.includes('transaction') ||
    message.includes('gas') ||
    message.includes('revert') ||
    message.includes('contract') ||
    message.includes('execution')
  ) {
    return 'contract';
  }
  
  return 'generic';
}

/**
 * Utility function to get a user-friendly error message
 */
export function getUserFriendlyMessage(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message;
  
  // Clean up common technical error messages
  if (message.includes('User rejected')) {
    return 'You cancelled the transaction in your wallet.';
  }
  if (message.includes('Internal JSON-RPC error')) {
    return 'Wallet RPC error. You may need testnet POL for gas fees. Get free POL at: https://faucet.polygon.technology/';
  }
  if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
    return 'Insufficient POL balance. Get free testnet POL at: https://faucet.polygon.technology/';
  }
  if (message.includes('nonce')) {
    return 'Transaction conflict. Try resetting your wallet account in MetaMask settings.';
  }
  if (message.includes('gas')) {
    return 'Gas estimation failed. Make sure you have enough POL for gas fees.';
  }
  if (message.includes('timeout')) {
    return 'The request timed out. Please check your connection and try again.';
  }
  if (message.includes('network')) {
    return 'Network error. Please check your connection and ensure you\'re on Polygon Amoy.';
  }
  
  // Return original message if no match (truncate if too long)
  return message.length > 150 ? message.substring(0, 147) + '...' : message;
}

export default ErrorMessage;
