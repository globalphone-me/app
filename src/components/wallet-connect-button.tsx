'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MiniKit } from '@worldcoin/minikit-js';
import { useState, useEffect } from 'react';

export function WalletConnectButton() {
  const [state, setState] = useState<{ mounted: boolean; isWorldApp: boolean }>({
    mounted: false,
    isWorldApp: false,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({
      mounted: true,
      isWorldApp: MiniKit.isInstalled(),
    });
  }, []);

  if (!state.mounted) {
    return null;
  }

  if (state.isWorldApp) {
    return <MiniKitWalletButton />;
  }

  return <ConnectButton />;
}

function MiniKitWalletButton() {
  const [address, setAddress] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const walletAddress = (window as unknown as { MiniKit?: { walletAddress?: string } }).MiniKit?.walletAddress || null;
    setAddress(walletAddress);

    // Fetch user info if address exists
    if (walletAddress) {
      fetchUserInfo(walletAddress);
    }
  }, []);

  const fetchUserInfo = async (walletAddress: string) => {
    try {
      const user = await MiniKit.getUserByAddress(walletAddress);
      if (user.username) {
        setUsername(user.username);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const handleConnect = async () => {
    if (!MiniKit.isInstalled()) return;

    setIsConnecting(true);

    try {
      // Get nonce from backend
      const res = await fetch('/api/nonce');
      const { nonce } = await res.json();

      // Request wallet auth from MiniKit
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce,
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        statement: 'Sign in to x402 Phone',
      });

      if (finalPayload.status === 'success') {
        setAddress(finalPayload.address);

        // Fetch user info to get username
        await fetchUserInfo(finalPayload.address);

        // Verify signature on backend
        await fetch('/api/complete-siwe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: finalPayload, nonce }),
        });

        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('minikit-address-changed', {
          detail: { address: finalPayload.address }
        }));
      }
    } catch (error) {
      console.error('MiniKit wallet auth error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  if (address) {
    const displayText = username || `${address.slice(0, 6)}...${address.slice(-4)}`;

    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        <span className="font-medium">
          {displayText}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isConnecting ? 'Connecting...' : 'Connect World Wallet'}
    </button>
  );
}
