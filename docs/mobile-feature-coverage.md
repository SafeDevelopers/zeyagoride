# Mobile app feature coverage (`src/mobile`)

This report inventories the **current** implementation under `src/mobile` only. It does not describe backend services or files outside this tree.

## Legend

| Status | Meaning |
|--------|---------|
| **Implemented** | UI and client-side state wiring exist; user can complete the flow in the demo. |
| **Placeholder / mock** | Uses hard-coded data, `setTimeout`, `alert`, `console.log`, or “Simulate …” actions—no real service. |
| **Missing integration** | No API, auth server, payments, push, SMS, maps routing, persistence, or analytics backend. |

---

## 1. Screens and surfaces

### Auth (`screens/auth/`)

| Item | Location | Status |
|------|----------|--------|
| Welcome (role selection → phone) | `WelcomeScreen.tsx` | Implemented; **placeholder** (advances flow locally). |
| Phone entry | `PhoneScreen.tsx` | Implemented; **placeholder** (no real SMS). |
| OTP entry & resend | `OtpScreen.tsx` | Implemented; resend uses `riderService.logResendOtpSimulation` (**mock**). Verify uses `setTimeout` (**mock**). |
| Post-OTP → home | `utils/authFlow.ts` (`advanceAuthStep`) | Implemented (`otp` → `home`). **Missing integration** (no token/session store). |

### Rider (`screens/rider/`)

| Item | Location | Status |
|------|----------|--------|
| Home (pickup, stops, destination, saved places) | `RiderHomeScreen.tsx` | Implemented; **placeholder** addresses. |
| Request (vehicle list, preferences, schedule entry, business) | `RiderRequestScreen.tsx` | Implemented; opens modals from shell. |
| Trip (found / arrived / ongoing, pin, chat/share triggers) | `RiderTripScreen.tsx` | Implemented; **mock** trip completion. |
| Profile modal body | `RiderProfileScreen.tsx` | Implemented (edit name). |
| Wallet transaction list → trip details | `RiderHistoryScreen.tsx` | Implemented; **mock** `transactions` from context. |

### Driver (`screens/driver/`)

| Item | Location | Status |
|------|----------|--------|
| Verification wizard | `DriverVerificationScreen.tsx` | Implemented multi-step UI; **mock** uploads (“Tap to take photo”). |
| Dashboard (stats, quick actions, simulate request) | `DriverHomeScreen.tsx` | Implemented; uses `driverService.SIMULATED_INCOMING_REQUEST` (**mock**). |
| Active trip / nav controls | `DriverActiveTripScreen.tsx` | Implemented; **mock** nav completion. |
| Incoming request overlay | `DriverRequestsScreen.tsx` | Implemented; timer/expiry **local state** (**mock**). |
| Earnings history sheet | `DriverHistoryScreen.tsx` | Implemented; **mock** trip rows. |

### Shell / map (`MobileAppShell.tsx`, `components/`, `services/`)

| Item | Location | Status |
|------|----------|--------|
| Phone chrome + header + mode switcher | `MobileAppShell.tsx` | Implemented. |
| Leaflet map + OSM tiles + markers | `MobileAppShell.tsx`, `components/MapView.tsx`, `services/leafletMap.ts` | Implemented; **placeholder** markers; **missing integration** (live driver positions, routing). |
| Side menu | `MobileAppShell.tsx` | Implemented; several entries are **non-functional** (see § Major gaps). |
| All bottom sheets / full-screen modals | `MobileAppShell.tsx` | See § Modals. |

---

## 2. Modals and overlays (from `MobileAppShell.tsx`)

Each is toggled by `useGlobalAppState` unless noted.

| Modal / overlay | Trigger examples | Status |
|-----------------|------------------|--------|
| Chat (full-screen) | Rider/driver trip, driver active trip | **Implemented** UI; messages **in-memory only** (**mock**). |
| Profile | Menu | **Implemented** (`RiderProfileScreen`). |
| Post-trip rating | Trip completion / effects | **Implemented**; no server submit. |
| Driver earnings history | Driver home, menu-adjacent | **Implemented** (`DriverHistoryScreen`); **mock** data. |
| SOS full-screen | Floating SOS button | **Implemented** countdown; **missing integration** (no emergency dispatch). |
| Wallet | Menu | **Implemented**; balance/transactions **mock**. |
| Trip details | Wallet history ride tap | **Implemented** when `selectedTrip` set; **mock** trip object. |
| Payment methods / add payment | Menu, wallet | **Implemented** UI; **mock** cards. |
| Schedule ride | Rider request / menu | **Implemented**; **mock** scheduling. |
| Help & About | Menu “About Zeyago” | **Implemented**; **mock** support actions. |
| Earnings analytics | Driver home | **Implemented** charts/stats UI; **mock** numbers. |
| Vehicle management | Driver home | **Implemented** list UI; **mock** vehicles. |
| Heatmap | Driver home | **Implemented** placeholder visual; **mock**. |
| Document vault | Menu (driver-oriented) | **Implemented** list; **mock** docs. |
| Support (multi-step) | Menu | **Implemented** flow; **mock** submission. |
| Scheduled rides list | Menu | **Implemented**; **mock** rows. |
| Training academy | Menu | **Implemented** modules list; **mock** progress. |
| Nav settings (driver) | Menu | **Implemented** preference UI; **mock**. |
| Favorites | Menu | **Implemented**; **mock** places. |
| Payout | Wallet | **Implemented** form; **mock** payout. |
| Promos | Menu | **Implemented** code entry; **mock** validation. |
| Performance | Driver home | **Implemented**; **mock** metrics. |
| Notifications | Menu | **Implemented** list; **mock** items. |
| Destination filter (driver) | Driver home | **Implemented**; **mock** filter logic. |
| Maintenance tracker | Driver home | **Implemented**; **mock** logs. |
| Tiers | Driver home | **Implemented**; **mock** tier. |
| Ride preferences | Rider request | **Implemented** toggles; local state only. |
| Zeyago Pass | Menu / Rider request | **Implemented** upsell UI; **mock** purchase. |
| Corporate dashboard | Menu | **Implemented**; **mock** company data. |
| PIN verification | Shell (rider flows) | **Implemented** UI; **mock** verification. |
| Business setup | Rider request | **Implemented** email field; **mock**. |
| Rewards | Menu | **Implemented**; **mock** points/redeem. |
| Share trip | Rider trip | **Implemented**; **mock** (`alert` share). |
| Referral | Menu | **Implemented**; **mock** code share. |

### State flags with **no** dedicated modal in `MobileAppShell`

| Flag | Status |
|------|--------|
| `showFAQ` | **Missing integration** — exposed on context; **no UI** wired in shell. |
| `showVerification` | **Missing integration** — exposed on context; driver verification uses `verificationStep` in `DriverVerificationScreen`, not this flag. |
| `showSafetyToolkit` | **Partial** — `RiderTripScreen` calls `setShowSafetyToolkit(true)` but there is **no** `{showSafetyToolkit && …}` block in `MobileAppShell.tsx` (button toggles state only). |

---

## 3. Major user actions (by flow)

### Auth

| Action | Status |
|--------|--------|
| Choose rider/driver on welcome | Implemented → **placeholder** phone step. |
| Enter phone, send OTP | **Placeholder** (no SMS provider). |
| Enter OTP, resend with cooldown | **Placeholder** (`logResendOtpSimulation`); cooldown **local**. |
| Complete verify → `home` | Implemented; **missing integration** (no JWT/session). |
| Logout (menu) | Implemented (`setStep('welcome')`); **missing integration** (no token revoke). |

### Rider booking flow

| Action | Status |
|--------|--------|
| Set pickup / destination / stops | Implemented. |
| Saved places shortcuts | Implemented (**mock** addresses). |
| Open vehicle sheet when destination set | Implemented. |
| Choose vehicle, personal/business, schedule, Zeyago Pass, preferences | Implemented; modals **mock**. |
| Request ride / search / cancel / simulate driver found | Implemented; **mock** transitions. |

### Rider trip flow

| Action | Status |
|--------|--------|
| Found: driver card, PIN, stops, chat, share, cancel | Implemented; **mock** driver. |
| Arrived / ongoing (UI states exist) | Implemented; rider **arrived** may be unreachable unless driver flow sets `rideStatus` (**mock** coupling). |
| Safety toolkit button | Sets `showSafetyToolkit` — **no modal** (see above). |
| Share trip / simulate completion / rating | **Placeholder** (`alert`, local rating). |
| SOS from map | Implemented countdown UI; **missing integration** (no dispatch). |

### Rider wallet / history / support

| Action | Status |
|--------|--------|
| Wallet balance, top-up, withdraw entry | UI **implemented**; **mock** balance. |
| Transaction list → trip details | **Implemented** with **mock** `transactions`. |
| Payment methods, add payment, payout | **Mock** UI. |
| Promos, rewards, corporate, favorites, scheduled rides | **Mock** data. |
| Support (list → trip → reason → success) | **Implemented**; **mock** backend. |
| Help / About | **Implemented**; chat/call buttons **non-functional** (no handlers). |
| Notifications | **Mock** list; no push. |

### Driver verification

| Action | Status |
|--------|--------|
| Start → step-by-step uploads + vehicle form | **Implemented**; **mock** camera/photos. |
| Pending → simulate approval | **Implemented** (`setIsVerified(true)`). |
| Switch to rider | **Implemented**. |

### Driver online / request / active trip

| Action | Status |
|--------|--------|
| Go online/offline | **Implemented** local toggle. |
| Simulate incoming request | **Mock** (`SIMULATED_INCOMING_REQUEST`). |
| Accept / decline (timer) | **Implemented**; timer **local** (**mock**). |
| Navigation overlay + bottom trip controls | **Implemented**; **mock** nav steps (`navStep` includes `at_pickup` / `null` in code). |
| Chat / complete trip / rating | **Mock**; couples to shared `rideStatus` / `setShowRating`. |

### Driver earnings / history / profile

| Action | Status |
|--------|--------|
| Earnings / trips / rating / tier quick stats | **Mock** numbers. |
| Open analytics, vehicles, heatmap, maintenance, tiers, destination filter, performance | **Mock** modals. |
| Earnings history modal | **Mock** list. |
| Profile | Menu opens **rider**-labeled profile (`RiderProfileScreen`); **placeholder** for driver-specific profile. |

---

## 4. Shared infrastructure (`src/mobile`)

| Piece | Role | Status |
|-------|------|--------|
| `context/MobileAppContext.tsx` | Composes `useGlobalAppState` + `useRiderState` + `useDriverState` | **Implemented** |
| `context/useGlobalAppState.ts` | Auth shell, modals, profile, notifications, OTP | **Implemented**; **mock** |
| `rider/useRiderState.ts` | Trip, wallet, chat, scheduled, corporate, etc. | **Implemented**; **mock** defaults |
| `driver/useDriverState.ts` | Driver domain state | **Implemented**; **mock** defaults |
| `constants/*` | Initial arrays / vehicle types | **Mock** seed data |
| `rider/riderService.ts` | OTP log helper | **mock** |
| `driver/driverService.ts` | Simulated request payload | **mock** |
| `types/mobile.ts` | Shared types | **Implemented** |
| `context/LanguageContext.tsx` | i18n | **Implemented** (no remote strings). |

---

## 5. Major gaps (menu / UX)

| Item | Notes |
|------|--------|
| **History** (menu row) | Renders with `t('history')` but **no `onClick`** — does not open history modal. |
| **Settings** (menu row) | **No `onClick`** — non-functional. |
| **Driver profile** | No dedicated driver profile screen; same profile modal as rider. |

---

## 6. Summary

- **Implemented (UI + local state):** Auth steps, rider and driver screen splits, map shell, **30+** modals/sheets in `MobileAppShell`, chat, wallet, verification wizard, driver dashboard, incoming request, active trip controls.
- **Placeholder / mock:** Nearly all data, OTP, payments, scheduling, support submission, share/referral alerts, “Simulate …” actions, and map content.
- **Missing integration:** Backend API, real auth, payments (Telebirr/Visa), push notifications, SMS, live location/routing, document upload, emergency SOS dispatch, and persistence. **Unused or unwired:** `showFAQ`, `showVerification` (as modal), `showSafetyToolkit` (no modal).

Use this document as a checklist for what to wire to real services next without refactoring the existing screen structure.
