# SalonOX — Expo App

This is the SalonOX React Native app built with [Expo](https://expo.dev) (SDK 54) and [expo-router](https://docs.expo.dev/router/introduction).

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

The app requires a Google Maps API key for address search, reverse geocoding, and map preview features.

**Create a `.env` file in the project root:**

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```

> ⚠️ **Never commit the `.env` file.** It is already listed in `.gitignore`.

**How to obtain a Google Maps API key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the following APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**
3. Create an API key and apply appropriate restrictions
4. Paste the key into your `.env` file

> **Important:** After adding or changing `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, you **must** restart Metro with the `--clear` flag for the new value to take effect:
> ```bash
> npx expo start --clear
> ```

### 3. Start the app

```bash
npx expo start --clear
```

Open in [Expo Go](https://expo.dev/go) on your device or an emulator.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Google Maps API key for Places, Geocoding, and Static Maps |

All `EXPO_PUBLIC_*` variables are inlined by Metro at build time. They are **not** secret and will be included in the app bundle — use server-side API key restrictions (HTTP referrer, app restrictions) to limit their usage.

---

## Project Structure

```
src/
  app/           # File-based routes (expo-router)
  components/    # Reusable UI components
    maps/        # Google Maps components (Autocomplete, Preview, Location Button)
    ui/          # Core UI components (PhoneInput, etc.)
  hooks/         # Custom React hooks
  services/      # API service clients
    maps/        # Google Maps REST service
  types/         # TypeScript type definitions
  utils/         # Shared utility functions
```

---

## Learn More

- [Expo documentation](https://docs.expo.dev/)
- [expo-router](https://docs.expo.dev/router/introduction/)
- [Google Maps Platform](https://developers.google.com/maps/documentation)
