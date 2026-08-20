# Mobile Buyer Runbook — UC-UX-02

## App

- Path: `apps/mobile-buyer/`
- Stack: Expo ~57 · React Native · React Navigation
- API: `EXPO_PUBLIC_API_URL` (default `http://localhost:3000/api/v1`)

## Screens

| Screen | API |
|--------|-----|
| Deals list | `GET /portal/buyer/deals` |
| Deal detail | `GET /portal/buyer/deals/:bookingId` |
| Payment status | Deal detail timeline |
| BNPL apply | `POST /payment/bnpl/apply` |
| E-sign | WebView deep link to buyer web contract |

## Local dev

```bash
cd apps/mobile-buyer
npm install
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1 npm start
```

## EAS preview

```bash
cd apps/mobile-buyer
npm run build:preview:android
```

## Parity vs web

See `BuyerShell` web routes: deals, payment, BNPL entry points.
