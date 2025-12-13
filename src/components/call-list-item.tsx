'use client';

import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import Image from 'next/image';

interface CallListItemProps {
  address: string;
  displayName?: string;
  price: string;
  onCall: () => void;
  onlyHumans?: boolean;
  disabled?: boolean;
}

import Link from 'next/link';

export function CallListItem({ address, displayName, price, onCall, onlyHumans, disabled }: CallListItemProps) {
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const finalDisplayName = ensName || displayName || formatAddress(address);

  return (
    <div className="flex items-center justify-between py-3">
      <Link href={`/u/${address}`} className="flex-1 hover:opacity-70 transition-opacity">
        <div className="flex items-center gap-2">
          <p className="font-medium underline decoration-dotted">{finalDisplayName}</p>
          {onlyHumans && (
            <Image
              src="/worldcoin.png"
              alt="Only verified humans can call"
              width={16}
              height={16}
              title="Only verified humans can call"
            />
          )}
        </div>
      </Link>
      <div className="flex items-center gap-3">
        <span className={`font-semibold ${disabled ? 'text-gray-400' : ''}`}>{price} $</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCall}
          className="rounded-full"
          disabled={disabled}
          title={disabled ? 'This user only accepts calls from verified humans' : undefined}
        >
          <Phone className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
