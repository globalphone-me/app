# GlobalPhone

**Get paid to pick up the phone.** GlobalPhone lets anyone monetize their attention by setting a price for incoming calls. Callers pay in USDC on Base, and if the call isn't answered, they get a refund (minus a small anti-spam fee).

🌐 **Live at [globalphone.me](https://globalphone.me)**

## How It Works

1. **Create a Profile** - Connect your wallet, set your price (minimum $5 USDC), and add your phone number
2. **Share Your Link** - Your profile is available at `globalphone.me/yourhandle` or `globalphone.me/0x...`
3. **Get Paid to Answer** - When someone calls, they pay upfront. You earn 90% if you answer; they get a refund if you don't

### Payment Flow (x402 Protocol)

- Caller pays USDC on Base before the call connects
- Payment is held in escrow during the call
- **Call answered**: 90% forwarded to callee, 10% platform fee
- **Call missed**: Refund to caller minus $0.10 anti-spam fee

## Features

- 📞 **USDC Payments on Base** - Cheap and fast transactions
- 🔗 **Clean Profile URLs** - `globalphone.me/handle`
- ⏰ **Availability Hours** - Set when you're available (weekdays/weekends)
- 🌍 **Timezone Support** - Auto-detect IANA timezones
- 📱 **Twilio Voice** - Real phone calls to any number
- 🎨 **Custom Avatars** - Upload and crop your profile picture
- 🗑️ **Account Deletion** - Reset your profile anytime

## Tech Stack

- **Frontend**: Next.js 15, React, TailwindCSS, shadcn/ui
- **Wallet**: RainbowKit, wagmi, viem
- **Payments**: x402 protocol on Base (USDC)
- **Voice**: Twilio Voice SDK
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: Cloudflare R2 (avatars)
- **Monitoring**: Sentry