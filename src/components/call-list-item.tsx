'use client';

import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';

interface CallListItemProps {
  address: string;
  displayName?: string;
  price: number;
  onCall: () => void;
}

export function CallListItem({ address, displayName, price, onCall }: CallListItemProps) {
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
      <div className="flex-1">
        <p className="font-medium">{finalDisplayName}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold">{price} $</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCall}
          className="rounded-full"
        >
          <Phone className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
