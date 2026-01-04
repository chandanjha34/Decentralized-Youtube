'use client';

/**
 * RPC Error Help Component
 * 
 * Displays helpful troubleshooting steps for "Internal JSON-RPC error"
 */

import { Button } from './button';

export interface RpcErrorHelpProps {
  onDismiss?: () => void;
}

export function RpcErrorHelp({ onDismiss }: RpcErrorHelpProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900 font-['Inter']">
            Internal JSON-RPC Error
          </h4>
          <p className="text-sm text-amber-800 mt-1 font-['Inter']">
            This error comes from your wallet&apos;s RPC endpoint, not our app.
          </p>
        </div>
      </div>

      <div className="space-y-2 text-sm text-amber-900 font-['Inter']">
        <p className="font-medium">Common causes & solutions:</p>
        
        <div className="space-y-2 pl-4">
          <div>
            <p className="font-medium">1. Insufficient POL for gas fees</p>
            <p className="text-amber-800 text-xs">
              You need testnet POL to pay for transaction gas on Polygon Amoy.
            </p>
            <a
              href="https://faucet.polygon.technology/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-full"
            >
              Get Free Testnet POL →
            </a>
          </div>

          <div>
            <p className="font-medium">2. Network congestion</p>
            <p className="text-amber-800 text-xs">
              The Polygon Amoy testnet can be slow. Wait 10-30 seconds and try again.
            </p>
          </div>

          <div>
            <p className="font-medium">3. Stuck transactions (nonce issues)</p>
            <p className="text-amber-800 text-xs">
              Reset your MetaMask: Settings → Advanced → Clear activity tab data
            </p>
          </div>

          <div>
            <p className="font-medium">4. Wallet RPC issues</p>
            <p className="text-amber-800 text-xs">
              Try switching RPC in MetaMask: Settings → Networks → Polygon Amoy → Edit
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open('https://faucet.polygon.technology/', '_blank')}
          className="text-xs"
        >
          Get Testnet POL
        </Button>
        {onDismiss && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="text-xs"
          >
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}

export default RpcErrorHelp;
