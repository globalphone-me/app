# x402 Phone - ETHGlobal Buenos Aires 2025

This project combines an x402 endpoint and a world mini app to allow anyone to call your phone at the price you choose. You can choose to restrict calls to humans, in which case only users of the World miniapp who verify their humanity will be able to call. In all other cases, anyone using the x402 endpoint can start the call, this includes AI Agent! You can make calls independent of location, to anyone, anywere, on their phone number. Users are self-sovereign of their attention; they choose how much their attention is worth by setting how much people should pay to call them. People will call only if it's worth it: low noise, high signal.

## Try it

The code is deployed and live at https://globalpay.me

Currently, x402 endpoints resolve on Base Sepolia to the fixed price of 0,1 USDC / call, while World payments and proof-of-humanity is done entirely on World mainnet and is live with custom pricing.

## Usage

To try the project locally and run the code yourself. Clone the repo and run the following commands:

```
npm i
npm run dev
```

Note that you need a properly setup Twlio account with a TwiML app and a World mini app setup in the World developer portal.

