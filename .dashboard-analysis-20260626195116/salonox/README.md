# SalonOX Dashboard — React Native + Expo Router

## File structure

```
salonox/
├── app/
│   ├── _layout.tsx                  ← Root Expo Router layout
│   └── (tabs)/
│       ├── _layout.tsx              ← Bottom tab navigation
│       └── index.tsx                ← Dashboard home screen
├── components/
│   └── dashboard/
│       ├── DashboardHero.tsx        ← Top header + stats strip
│       ├── QuickActions.tsx         ← Book / Client / Quick Sale / Stock buttons
│       ├── RevenueGoal.tsx          ← Daily revenue progress bar
│       ├── AppointmentsList.tsx     ← Upcoming appointment cards
│       ├── QuickSaleSection.tsx     ← Interactive quick billing grid
│       ├── StaffWorkload.tsx        ← Live floor stylist cards
│       ├── TopClientCard.tsx        ← Loyalty nudge card
│       └── InventoryAlerts.tsx      ← Low stock / out of stock alerts
├── constants/
│   └── theme.ts                     ← Sage & Gold design tokens
└── data/
    └── dashboardData.ts             ← Mock data (replace with API calls)
```

## Setup

### 1. Install dependencies

```bash
npx create-expo-app salonox --template blank-typescript
cd salonox

npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

### 2. Copy files

Copy all files from this zip into your project root, matching the folder structure above.

### 3. Update package.json main entry

```json
{
  "main": "expo-router/entry"
}
```

### 4. Update app.json

```json
{
  "expo": {
    "scheme": "salonox",
    "web": { "bundler": "metro" }
  }
}
```

### 5. Run

```bash
npx expo start
```

## Connecting real data

All mock data lives in `data/dashboardData.ts`. Replace the exported arrays with your API calls. For example, in `AppointmentsList.tsx`:

```tsx
// Replace static import:
import { APPOINTMENTS } from "../../data/dashboardData";

// With a fetch/hook:
const [appointments, setAppointments] = useState([]);
useEffect(() => {
  fetch("/api/appointments/today")
    .then(r => r.json())
    .then(setAppointments);
}, []);
```

## Design tokens

All colors are in `constants/theme.ts`. To change the brand color globally, update `Colors.primary` and `Colors.primaryDark`.

## Placeholder screens

The tab nav references `bookings`, `quick-sale`, `team`, and `more` screens.
Create these files to avoid Expo Router warnings:

```
app/(tabs)/bookings.tsx
app/(tabs)/quick-sale.tsx
app/(tabs)/team.tsx
app/(tabs)/more.tsx
```
