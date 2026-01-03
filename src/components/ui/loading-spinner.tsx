'use client';

import { cn } from '@/lib/utils';

/**
 * LoadingSpinner Component
 * 
 * A reusable loading spinner for async operations.
 * 
 * Validates: Requirements 10.1
 */
export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Optional message to display */
  message?: string;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', message, className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <svg
        className={cn('animate-spin text-primary', sizeClasses[size])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
}

/**
 * FullPageLoader Component
 * 
 * A full-page loading overlay for major async operations.
 */
export function FullPageLoader({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <LoadingSpinner size="lg" message={message} />
    </div>
  );
}

/**
 * InlineLoader Component
 * 
 * A compact inline loading indicator.
 */
export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <LoadingSpinner size="sm" />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}

export default LoadingSpinner;
