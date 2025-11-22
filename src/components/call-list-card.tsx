'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CallListItem } from '@/components/call-list-item';

// Placeholder data - this will be replaced with real data later
const MOCK_USERS = [
  { address: '0x1234567890abcdef1234567890abcdef12345678', displayName: 'kartik.eth', price: 100 },
  { address: '0x2234567890abcdef1234567890abcdef12345678', displayName: 'mnilien.eth', price: 5 },
  { address: '0x3234567890abcdef1234567890abcdef12345678', displayName: 'youss.eth', price: 100 },
  { address: '0x4234567890abcdef1234567890abcdef12345678', displayName: 'vrn.eth', price: 5 },
  { address: '0x5234567890abcdef1234567890abcdef12345678', displayName: 'jesse.base.eth', price: 100 },
  { address: '0x6234567890abcdef1234567890abcdef12345678', displayName: 'maggi.ethglobal.eth', price: 5 },
];

export function CallListCard() {
  const handleCall = (address: string) => {
    console.log('Calling:', address);
    // Call functionality will be implemented later
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Make a Call - No Phone Nº Required</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {MOCK_USERS.map((user, index) => (
            <div key={user.address}>
              <CallListItem
                address={user.address}
                displayName={user.displayName}
                price={user.price}
                onCall={() => handleCall(user.address)}
              />
              {index < MOCK_USERS.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
