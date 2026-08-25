import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "@/context/AuthContext";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { useAppDispatch } from "@/store/hooks";
import { createSalonThunk } from "@/middleware/salon/salon.thunk";
import type { CreateSalonRequest } from "@/types/salon";
import { CategorySelectionList } from "@/components/auth/CategorySelectionList";
import { BUSINESS_CATEGORIES } from "@/constants/businessCategories";
import type { ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";
import { SUBSCRIPTION_ROUTE } from "@/utils/routeResolver";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── Google Maps Config ───
// Read the API key from the environment. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
// in your root .env file (never commit that file). Restart Metro after changes.
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

if (!GOOGLE_MAPS_API_KEY && __DEV__) {
  console.warn(
    "[SalonOX] Google Maps API key is missing.\n" +
    "Create a .env file at the project root and add:\n" +
    "  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<your-key>\n" +
    "Then restart Metro with: npx expo start --clear"
  );
}

const createOnboardingColors = (theme: ThemeColors, scheme: "light" | "dark") => ({
  bgGradientStart: theme.bg,
  bgGradientEnd: theme.bg2,
  primary: theme.primary,
  primaryDark: theme.primaryDark,
  secondary: theme.secondary,
  accent: theme.gold,
  accentDark: theme.goldDark,
  shadow: theme.shadow,
  text: theme.heading,
  textPrimary: theme.text,
  textSecondary: theme.text2,
  placeholder: theme.placeholder,
  cardBg: theme.card,
  cardBorder: theme.border,
  inputBg: scheme === "dark" ? theme.bg2 : theme.card,
  inputBorder: theme.border,
  inputBorderFocus: theme.focusBorder,
  error: theme.error,
  errorBg: theme.errorBg,
  errorBorder: theme.errorBorder,
  success: theme.success,
  successBorder: theme.successBorder,
  warning: theme.warning,
  statusBarStyle: scheme === "dark" ? ("light-content" as const) : ("dark-content" as const),
});

type OnboardingColors = ReturnType<typeof createOnboardingColors>;

const useOnboardingColors = () => {
  const { colors, scheme } = useAppTheme();

  return useMemo(() => createOnboardingColors(colors, scheme), [colors, scheme]);
};

const STEPS = [
  { id: 1, title: "Business" },
  { id: 2, title: "Category" },
  { id: 3, title: "Staff" },
  { id: 4, title: "Location" },
  { id: 5, title: "Finishing" },
] as const;

type StepId = 1 | 2 | 3 | 4 | 5;

type LocationDetails = {
  address: string;
  area: string;
  city: string;
  state: string;
  street: string;
  country: string;
  countryCode: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string;
};

type GoogleAddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

type GoogleAddressResult = {
  address_components?: GoogleAddressComponent[];
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  place_id?: string;
};

const ONBOARDING_PERSIST_KEY = "salonox.onboarding_state";
const LOCAL_CATEGORY_IDS = new Set(BUSINESS_CATEGORIES.map((category) => category.id));
const REQUIRED_RELATED_CATEGORY_COUNT = 2;
const REQUIRED_TOTAL_CATEGORY_COUNT = 1 + REQUIRED_RELATED_CATEGORY_COUNT;

const getGoogleAddressComponent = (
  components: GoogleAddressComponent[],
  types: string[],
  useShort = false,
) => {
  const component = components.find((item) =>
    item.types?.some((type) => types.includes(type)),
  );

  return component ? (useShort ? component.short_name : component.long_name) ?? "" : "";
};

const getAddressDetailsFromGoogleResult = (
  result: GoogleAddressResult,
  fallbackCoordinates?: Pick<LocationDetails, "latitude" | "longitude">,
): LocationDetails => {
  const components = result.address_components ?? [];
  const streetNumber = getGoogleAddressComponent(components, ["street_number"]);
  const route = getGoogleAddressComponent(components, ["route"]);
  const street = [streetNumber, route].filter(Boolean).join(" ").trim();
  const area =
    getGoogleAddressComponent(components, ["sublocality_level_1"]) ||
    getGoogleAddressComponent(components, ["sublocality"]) ||
    getGoogleAddressComponent(components, ["neighborhood"]) ||
    getGoogleAddressComponent(components, ["locality"]);
  const city =
    getGoogleAddressComponent(components, ["locality"]) ||
    getGoogleAddressComponent(components, ["postal_town"]) ||
    getGoogleAddressComponent(components, ["administrative_area_level_2"]);
  const state = getGoogleAddressComponent(components, ["administrative_area_level_1"]);
  const country = getGoogleAddressComponent(components, ["country"]);
  const countryCode = getGoogleAddressComponent(components, ["country"], true);
  const postalCode = getGoogleAddressComponent(components, ["postal_code"]);
  const latitude = result.geometry?.location?.lat ?? fallbackCoordinates?.latitude ?? null;
  const longitude = result.geometry?.location?.lng ?? fallbackCoordinates?.longitude ?? null;
  const address = result.formatted_address || [street, area, city, state, country, postalCode]
    .filter(Boolean)
    .join(", ");

  return {
    address,
    area,
    city,
    state,
    street,
    country,
    countryCode,
    postalCode,
    latitude,
    longitude,
    placeId: result.place_id || "",
  };
};

export default function OnboardingScreen() {
  const Colors = useOnboardingColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { signOut, user, updateUser } = useAuth();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();

  // Navigation / Loading States
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const isCategoryStep = currentStep === 2;
  const isTabletLayout = viewportWidth >= 768;
  const horizontalPagePadding = isTabletLayout ? 40 : 24;
  const contentMaxWidth = isCategoryStep ? 760 : 520;
  const footerMaxWidth = 560;
  const footerBottomPadding = Math.max(insets.bottom + 14, 18);
  const scrollTopPadding = Math.max(insets.top + 18, isTabletLayout ? 34 : 28);
  const scrollBottomPadding = isCategoryStep ? 24 : 22;
  const footerBackgroundColor = isCategoryStep ? Colors.cardBg : Colors.bgGradientEnd;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const shouldEnableOnboardingScroll = scrollContentHeight > scrollViewportHeight + 1;
  const businessNameInputRef = useRef<TextInput>(null);
  const websiteInputRef = useRef<TextInput>(null);
  const searchInputRef = useRef<TextInput>(null);
  const manualAddressInputRef = useRef<TextInput>(null);
  const manualStreetInputRef = useRef<TextInput>(null);
  const manualAreaInputRef = useRef<TextInput>(null);
  const manualCityInputRef = useRef<TextInput>(null);
  const manualStateInputRef = useRef<TextInput>(null);
  const manualCountryInputRef = useRef<TextInput>(null);
  const manualPostalCodeInputRef = useRef<TextInput>(null);
  const customReferralInputRef = useRef<TextInput>(null);

  // Animation values (matching login page)
  const [cardOpacity] = useState(() => new Animated.Value(0));
  const [cardScale] = useState(() => new Animated.Value(0.96));
  const [submitScale] = useState(() => new Animated.Value(1));

  // --- Step States ---
  // Step 1: Business Details
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2: Category
  const [primaryCategoryId, setPrimaryCategoryId] = useState("");
  const [relatedCategoryIds, setRelatedCategoryIds] = useState<string[]>([]);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // Step 3: Team
  const [teamType, setTeamType] = useState<"independent" | "team" | "">("");
  const [teamSize, setTeamSize] = useState<"2-5" | "6-10" | "11+" | "">("");
  const [step3Error, setStep3Error] = useState<string | null>(null);

  // Step 4: Location
  const [searchText, setSearchText] = useState("");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isManualAddress, setIsManualAddress] = useState(false);
  const [location, setLocation] = useState<LocationDetails | null>(null);
  
  // Manual address inputs
  const [manualAddress, setManualAddress] = useState("");
  const [manualArea, setManualArea] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualStreet, setManualStreet] = useState("");
  const [manualState, setManualState] = useState("");
  const [manualCountry, setManualCountry] = useState("");
  const [manualPostalCode, setManualPostalCode] = useState("");
  const [step4Error, setStep4Error] = useState<string | null>(null);

  // Step 5: Finishing Up
  const [referralSource, setReferralSource] = useState<string>("");
  const [customReferralSource, setCustomReferralSource] = useState("");
  const [step5Error, setStep5Error] = useState<string | null>(null);

  // --- Animation Effects ---
  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardScale]);

  // --- Persistence Handlers ---
  const saveOnboardingState = async (updates: Record<string, any> = {}) => {
    try {
      const currentState = {
        currentStep,
        businessName,
        website,
        primaryCategoryId,
        relatedCategoryIds,
        teamType,
        teamSize,
        searchText,
        isManualAddress,
        location,
        manualAddress,
        manualArea,
        manualCity,
        manualStreet,
        manualState,
        manualCountry,
        manualPostalCode,
        referralSource,
        customReferralSource,
        ...updates,
      };
      await AsyncStorage.setItem(ONBOARDING_PERSIST_KEY, JSON.stringify(currentState));
    } catch (e) {
      console.error("Failed to save onboarding state", e);
    }
  };

  const loadOnboardingState = async () => {
    try {
      const raw = await AsyncStorage.getItem(ONBOARDING_PERSIST_KEY);
      let hasLoadedBusinessName = false;

      if (raw) {
        const state = JSON.parse(raw);
        if (state.currentStep) setCurrentStep(state.currentStep);
        if (state.businessName) {
          setBusinessName(state.businessName);
          hasLoadedBusinessName = true;
        }
        if (state.website) setWebsite(state.website);
        if (state.primaryCategoryId && LOCAL_CATEGORY_IDS.has(state.primaryCategoryId)) {
          setPrimaryCategoryId(state.primaryCategoryId);
        }
        if (Array.isArray(state.relatedCategoryIds)) {
          setRelatedCategoryIds(
            state.relatedCategoryIds
              .filter((categoryId: unknown): categoryId is string =>
                typeof categoryId === "string" && LOCAL_CATEGORY_IDS.has(categoryId),
              )
              .slice(0, REQUIRED_RELATED_CATEGORY_COUNT),
          );
        }
        if (state.teamType) setTeamType(state.teamType);
        if (state.teamSize) setTeamSize(state.teamSize);
        if (state.searchText) setSearchText(state.searchText);
        if (state.isManualAddress !== undefined) setIsManualAddress(state.isManualAddress);
        if (state.location) setLocation(state.location);
        if (state.manualAddress) setManualAddress(state.manualAddress);
        if (state.manualArea) setManualArea(state.manualArea);
        if (state.manualCity) setManualCity(state.manualCity);
        if (state.manualStreet) setManualStreet(state.manualStreet);
        if (state.manualState) setManualState(state.manualState);
        if (state.manualCountry) setManualCountry(state.manualCountry);
        if (state.manualPostalCode) setManualPostalCode(state.manualPostalCode);
        if (state.referralSource) setReferralSource(state.referralSource);
        if (state.customReferralSource) setCustomReferralSource(state.customReferralSource);
      }

      // Fallback to registered business name from auth user if not loaded from persistence
      if (!hasLoadedBusinessName && user?.businessName) {
        setBusinessName(user.businessName);
      }
    } catch (e) {
      console.error("Failed to load onboarding state", e);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    loadOnboardingState();
  }, []);

  // Save state on any change to step or input values
  useEffect(() => {
    if (!isInitializing) {
      saveOnboardingState();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentStep,
    businessName,
    website,
    primaryCategoryId,
    relatedCategoryIds,
    teamType,
    teamSize,
    searchText,
    isManualAddress,
    location,
    manualAddress,
    manualArea,
    manualCity,
    manualStreet,
    manualState,
    manualCountry,
    manualPostalCode,
    referralSource,
    customReferralSource,
  ]);



  // --- Step 4: Google Autocomplete Fetching ---
  useEffect(() => {
    if (!searchText.trim() || isManualAddress) {
      setPredictions([]);
      return;
    }
    const delay = setTimeout(() => {
      fetchSuggestions(searchText);
    }, 500);

    return () => clearTimeout(delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, isManualAddress]);

  const applyLocationDetails = useCallback((details: LocationDetails) => {
    setLocation(details);
    setSearchText(details.address);
    setManualAddress(details.address);
    setManualArea(details.area);
    setManualCity(details.city);
    setManualStreet(details.street);
    setManualState(details.state);
    setManualCountry(details.country);
    setManualPostalCode(details.postalCode);
    setPredictions([]);
    setSearchError(null);
    setStep4Error(null);
  }, []);

  const reverseGeocodeCoordinates = async (
    latitude: number,
    longitude: number,
  ): Promise<LocationDetails> => {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const data = await response.json();

    if (data.status !== "OK" || !data.results?.[0]) {
      throw new Error(`Google Geocoding Error: ${data.status || "UNKNOWN_ERROR"}`);
    }

    return getAddressDetailsFromGoogleResult(data.results[0], {
      latitude,
      longitude,
    });
  };

  const handleUseCurrentLocation = async () => {
    setIsDetectingLocation(true);
    setSearchError(null);
    setStep4Error(null);
    setPredictions([]);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setSearchError("Location permission was denied. Search for your salon address or enter it manually.");
        setIsManualAddress(!GOOGLE_MAPS_API_KEY);
        return;
      }

      if (Platform.OS === "android") {
        await Location.enableNetworkProviderAsync().catch(() => undefined);
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const latitude = currentPosition.coords.latitude;
      const longitude = currentPosition.coords.longitude;

      if (!GOOGLE_MAPS_API_KEY) {
        setLocation({
          address: "",
          area: "",
          city: "",
          country: "",
          countryCode: "",
          latitude,
          longitude,
          placeId: "",
          postalCode: "",
          state: "",
          street: "",
        });
        setIsManualAddress(true);
        setSearchError("Current location was detected, but Google Maps is not configured. Enter the address manually.");
        return;
      }

      const detectedLocation = await reverseGeocodeCoordinates(latitude, longitude);
      applyLocationDetails(detectedLocation);
      setIsManualAddress(false);
    } catch {
      setSearchError("We could not detect your address. Search for it or enter it manually.");
      if (!GOOGLE_MAPS_API_KEY) {
        setIsManualAddress(true);
      }
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const fetchSuggestions = async (query: string) => {
    if (!GOOGLE_MAPS_API_KEY) {
      setPredictions([]);
      return;
    }
    const locationBias =
      location?.latitude && location.longitude
        ? `&location=${location.latitude},${location.longitude}&radius=50000`
        : "";

    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query,
        )}${locationBias}&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const data = await response.json();
      if (data.status === "OK") {
        setPredictions(data.predictions || []);
      } else {
        setPredictions([]);
        if (data.status !== "ZERO_RESULTS") {
          setSearchError(`Google Places Error: ${data.status}`);
        }
      }
    } catch {
      setSearchError("Network error. Please check your internet connection.");
      setPredictions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = async (placeId: string) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_components,formatted_address,geometry&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const data = await response.json();
      if (data.status === "OK" && data.result) {
        const newLocation = getAddressDetailsFromGoogleResult({
          ...data.result,
          place_id: data.result.place_id || placeId,
        });

        applyLocationDetails(newLocation);
        setIsManualAddress(false);
      } else {
        setSearchError(`Failed to fetch place details: ${data.status}`);
      }
    } catch {
      setSearchError("Failed to retrieve place details due to network issue.");
    } finally {
      setIsSearching(false);
    }
  };

  // --- Step Navigation & Validations ---
  const validateStep1 = () => {
    const trimmedName = businessName.trim();
    if (!trimmedName) {
      setStep1Error("Business name is required.");
      return false;
    }
    setStep1Error(null);
    return true;
  };

  const validateStep2 = () => {
    if (!primaryCategoryId) {
      setStep2Error("Please select a primary category.");
      return false;
    }
    if (relatedCategoryIds.length < REQUIRED_RELATED_CATEGORY_COUNT) {
      setStep2Error(`Please select ${REQUIRED_RELATED_CATEGORY_COUNT} related categories.`);
      return false;
    }
    setStep2Error(null);
    return true;
  };

  const validateStep3 = () => {
    if (!teamType) {
      setStep3Error("Please select a team type.");
      return false;
    }
    if (teamType === "team" && !teamSize) {
      setStep3Error("Please select your team size.");
      return false;
    }
    setStep3Error(null);
    return true;
  };

  const validateStep4 = () => {
    if (isManualAddress) {
      if (!manualAddress.trim()) {
        setStep4Error("Full business address is required.");
        return false;
      }
      if (!manualCity.trim()) {
        setStep4Error("City is required.");
        return false;
      }
      if (!manualCountry.trim()) {
        setStep4Error("Country is required.");
        return false;
      }
      setStep4Error(null);
      return true;
    } else {
      if (!location || !location.address) {
        setStep4Error("Please search and select a location from the suggestions.");
        return false;
      }
      if (!location.city) {
        setStep4Error("The selected location is missing a city. Please try another search result, or enter details manually.");
        return false;
      }
      setStep4Error(null);
      return true;
    }
  };

  const validateStep5 = () => {
    if (!referralSource) {
      setStep5Error("Please select how you heard about us.");
      return false;
    }
    if (referralSource === "Other" && !customReferralSource.trim()) {
      setStep5Error("Please specify where you heard about us.");
      return false;
    }
    setStep5Error(null);
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    if (currentStep === 4 && !validateStep4()) return;

    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as StepId);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as StepId);
    }
  };

  const handleCancelOnboarding = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await AsyncStorage.removeItem(ONBOARDING_PERSIST_KEY);
      await signOut();
      router.replace("/login" as Href);
    } catch {
      router.replace("/login" as Href);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePressIn = (scaleRef: Animated.Value) => {
    Animated.spring(scaleRef, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (scaleRef: Animated.Value) => {
    Animated.spring(scaleRef, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleToggleBusinessCategory = useCallback(
    (categoryId: string) => {
      setStep2Error(null);
      const selectedCategoryIds = [primaryCategoryId, ...relatedCategoryIds].filter(Boolean);
      const nextSelectedCategoryIds = selectedCategoryIds.includes(categoryId)
        ? selectedCategoryIds.filter((id) => id !== categoryId)
        : [...selectedCategoryIds, categoryId];

      if (!selectedCategoryIds.includes(categoryId) && selectedCategoryIds.length >= REQUIRED_TOTAL_CATEGORY_COUNT) {
        setStep2Error("You need exactly 3 categories. Remove one to choose another.");
        return;
      }

      const [nextPrimaryCategoryId = "", ...nextRelatedCategoryIds] = nextSelectedCategoryIds;
      setPrimaryCategoryId(nextPrimaryCategoryId);
      setRelatedCategoryIds(nextRelatedCategoryIds.slice(0, REQUIRED_RELATED_CATEGORY_COUNT));
    },
    [primaryCategoryId, relatedCategoryIds],
  );

  // --- Complete Onboarding & Call API ---
  const handleCompleteOnboarding = async () => {
    if (!validateStep5()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const activeAddress = isManualAddress ? manualAddress.trim() : (location?.address || "");
    const activeCity = isManualAddress ? manualCity.trim() : (location?.city || "");
    const activeState = isManualAddress ? manualState.trim() : (location?.state || "");
    const activeCountry = isManualAddress ? manualCountry.trim() : (location?.country || "");
    const activeCountryCode = isManualAddress ? (location?.countryCode || "") : (location?.countryCode || "");
    const activePostalCode = isManualAddress ? manualPostalCode.trim() : (location?.postalCode || "");

    const payload: CreateSalonRequest = {
      name: businessName.trim(),
      business_name: businessName.trim(),
      address: activeAddress,
      city: activeCity,
      state: activeState,
      country: activeCountry,
      country_code: activeCountryCode,
      postal_code: activePostalCode,
      website: website.trim() || undefined,
      primary_category_id: primaryCategoryId,
      related_category_ids: relatedCategoryIds,
      team_type: teamType,
      team_size: teamType === "team" ? teamSize : "1",
      referral_source: referralSource === "Other" ? customReferralSource.trim() : referralSource,
      latitude: location?.latitude || undefined,
      longitude: location?.longitude || undefined,
      place_id: location?.placeId || undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    if (user?.email) payload.email = user.email;
    if (user?.phone) {
      payload.phone = user.phone;
      payload.phone_number = user.phone;
    }

    try {
      const resultAction = await dispatch(createSalonThunk(payload));
      
      if (createSalonThunk.fulfilled.match(resultAction)) {
        const createdSalon = resultAction.payload.salon;
        
        // Update user auth state
        await updateUser({
          isOnboardingComplete: true,
          salonId: createdSalon.id,
          businessName: createdSalon.businessName,
          address: createdSalon.address,
        });

        // Clear local storage state
        await AsyncStorage.removeItem(ONBOARDING_PERSIST_KEY);

        // Onboarding is complete; subscription is required before app access.
        router.replace(SUBSCRIPTION_ROUTE);
      } else {
        setSubmitError(
          resultAction.payload?.message ?? 
          resultAction.error?.message ?? 
          "Failed to create salon business. Please try again."
        );
      }
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const keyboardNavigationFields = useMemo(() => {
    if (currentStep === 1) {
      return [{ ref: businessNameInputRef }, { ref: websiteInputRef }];
    }

    if (currentStep === 4) {
      if (!isManualAddress) {
        return [{ ref: searchInputRef }];
      }

      return [
        { ref: manualAddressInputRef },
        { ref: manualStreetInputRef },
        { ref: manualAreaInputRef },
        { ref: manualCityInputRef },
        { ref: manualStateInputRef },
        { ref: manualCountryInputRef },
        { ref: manualPostalCodeInputRef },
      ];
    }

    if (currentStep === 5 && referralSource === "Other") {
      return [{ ref: customReferralInputRef }];
    }

    return [];
  }, [currentStep, isManualAddress, referralSource]);

  if (isInitializing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={isCategoryStep ? [Colors.cardBg, Colors.cardBg] : [Colors.bgGradientStart, Colors.bgGradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.bgGradientStart} />

      {/* Background glow blobs */}
      {!isCategoryStep && (
        <View pointerEvents="none" style={styles.blurContainer}>
          <LinearGradient
            colors={["rgba(28, 25, 23, 0.08)", "transparent"]}
            style={[styles.glowBlob, styles.glowPista]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <LinearGradient
            colors={["rgba(175, 167, 157, 0.14)", "transparent"]}
            style={[styles.glowBlob, styles.glowCream]}
            start={{ x: 1, y: 1 }}
            end={{ x: 0, y: 0 }}
          />
        </View>
      )}

      <KeyboardAwareScrollView
        alwaysBounceVertical={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContainer,
          isCategoryStep && styles.categoryScrollContainer,
          {
            paddingBottom: scrollBottomPadding,
            paddingHorizontal: horizontalPagePadding,
            paddingTop: scrollTopPadding,
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={(_, height) => setScrollContentHeight(height)}
        onLayout={(event) => setScrollViewportHeight(event.nativeEvent.layout.height)}
        scrollEnabled={shouldEnableOnboardingScroll}
        showsVerticalScrollIndicator={shouldEnableOnboardingScroll}
        style={styles.formKeyboardView}
        keyboardNavigation={{
          fields: keyboardNavigationFields,
          hideOnLast: true,
          onDone: currentStep === 5 ? handleCompleteOnboarding : handleNext,
        }}
      >
          <Animated.View
            style={[
              styles.card,
              isCategoryStep && styles.categoryCard,
              { maxWidth: contentMaxWidth },
              {
                opacity: cardOpacity,
                transform: [{ scale: cardScale }],
              },
            ]}
          >
            {/* Branding Header */}
            <View style={styles.brandContainer}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>
                Setup Your Business
              </Text>
              <Text style={styles.tagline}>
                Complete these quick steps to launch your digital storefront.
              </Text>
            </View>

            {/* Steps Progress Header */}
            <View style={styles.stepHeader}>
              <View style={styles.progressSteps}>
                {STEPS.map((step, idx) => {
                  const isCompleted = currentStep > step.id;
                  const isActive = currentStep === step.id;
                  const isLineCompleted = currentStep > step.id;

                  return (
                    <View key={step.id} style={styles.progressStepGroup}>
                      <View style={styles.progressStepItem}>
                        <View
                          style={[
                            styles.progressCircle,
                            isCompleted && styles.progressCircleCompleted,
                            isActive && styles.progressCircleActive,
                          ]}
                        >
                          {isCompleted ? (
                            <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                          ) : (
                            <Text
                              style={[
                                styles.progressCircleText,
                                isActive && styles.progressCircleTextActive,
                              ]}
                            >
                              {step.id}
                            </Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.progressLabel,
                            (isActive || isCompleted) && styles.progressLabelActive,
                          ]}
                        >
                          {step.title}
                        </Text>
                      </View>
                      {idx < STEPS.length - 1 && (
                        <View
                          style={[
                            styles.progressLine,
                            isLineCompleted && styles.progressLineCompleted,
                          ]}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
              <Text style={[styles.stepTitle, isCategoryStep && styles.categoryStepTitle]}>
                {currentStep === 1 && "Business Information"}
                {currentStep === 2 && "Business Category"}
                {currentStep === 3 && "Staff Settings"}
                {currentStep === 4 && "Business Location"}
                {currentStep === 5 && "Finishing Up"}
              </Text>
            </View>

            {/* STEP 1: BUSINESS DETAILS */}
            {currentStep === 1 && (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Business Name *</Text>
                  <View style={[styles.inputContainer, step1Error && styles.inputContainerError]}>
                    <Ionicons name="business-outline" size={20} color={Colors.secondary} style={{ marginRight: 12 }} />
                    <TextInput
                      ref={businessNameInputRef}
                      style={styles.textInput}
                      placeholder="e.g. Bella Salon & Spa"
                      placeholderTextColor={Colors.placeholder}
                      value={businessName}
                      onChangeText={(val) => {
                        setBusinessName(val);
                        setStep1Error(null);
                      }}
                      returnKeyType="next"
                    />
                  </View>
                  {step1Error && <Text style={styles.fieldErrorText}>{step1Error}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Website URL (Optional)</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="globe-outline" size={20} color={Colors.secondary} style={{ marginRight: 12 }} />
                    <TextInput
                      ref={websiteInputRef}
                      style={styles.textInput}
                      placeholder="e.g. www.bellasalon.com"
                      placeholderTextColor={Colors.placeholder}
                      value={website}
                      onChangeText={setWebsite}
                      autoCapitalize="none"
                      keyboardType="url"
                      returnKeyType="done"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* STEP 2: CATEGORY SELECTION */}
            {currentStep === 2 && (
              <View style={styles.categoryStepContent}>
                <Text style={styles.categoryIntro}>
                  Select 3 categories from the list. Your first selection becomes the primary category.
                </Text>

                <CategorySelectionList
                  categories={BUSINESS_CATEGORIES}
                  primaryCategoryId={primaryCategoryId}
                  relatedCategoryIds={relatedCategoryIds}
                  onToggleCategory={handleToggleBusinessCategory}
                />
                {step2Error && <Text style={styles.fieldErrorText}>{step2Error}</Text>}
              </View>
            )}

            {/* STEP 3: TEAM SELECTION */}
            {currentStep === 3 && (
              <View>
                <Text style={styles.infoLabel}>Tell us about your team setup.</Text>

                <View style={styles.cardsRow}>
                  <Pressable
                    style={[
                      styles.optionCard,
                      teamType === "independent" && styles.optionCardSelected,
                    ]}
                    onPress={() => {
                      setTeamType("independent");
                      setTeamSize("");
                      setStep3Error(null);
                    }}
                  >
                    <Ionicons
                      name="person-outline"
                      size={28}
                      color={teamType === "independent" ? "#FFFFFF" : Colors.primary}
                    />
                    <Text
                      style={[
                        styles.optionCardTitle,
                        teamType === "independent" && styles.optionCardTitleSelected,
                      ]}
                    >
                      Independent
                    </Text>
                    <Text
                      style={[
                        styles.optionCardDesc,
                        teamType === "independent" && styles.optionCardDescSelected,
                      ]}
                    >
                      I work on my own.
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.optionCard,
                      teamType === "team" && styles.optionCardSelected,
                    ]}
                    onPress={() => {
                      setTeamType("team");
                      setStep3Error(null);
                    }}
                  >
                    <Ionicons
                      name="people-outline"
                      size={28}
                      color={teamType === "team" ? "#FFFFFF" : Colors.primary}
                    />
                    <Text
                      style={[
                        styles.optionCardTitle,
                        teamType === "team" && styles.optionCardTitleSelected,
                      ]}
                    >
                      I manage Staff
                    </Text>
                    <Text
                      style={[
                        styles.optionCardDesc,
                        teamType === "team" && styles.optionCardDescSelected,
                      ]}
                    >
                      We have staff members.
                    </Text>
                  </Pressable>
                </View>

                {teamType === "team" && (
                  <View style={styles.teamSizeSection}>
                    <Text style={styles.inputLabel}>Select Staff Size</Text>
                    <View style={styles.sizeButtonsRow}>
                      {(["2-5", "6-10", "11+"] as const).map((size) => {
                        const isSelected = teamSize === size;
                        return (
                          <Pressable
                            key={size}
                            style={[
                              styles.sizeButton,
                              isSelected && styles.sizeButtonSelected,
                            ]}
                            onPress={() => {
                              setTeamSize(size);
                              setStep3Error(null);
                            }}
                          >
                            <Text
                              style={[
                                styles.sizeButtonText,
                                isSelected && styles.sizeButtonTextSelected,
                              ]}
                            >
                              {size}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {step3Error && <Text style={styles.fieldErrorText}>{step3Error}</Text>}
              </View>
            )}

            {/* STEP 4: LOCATION */}
            {currentStep === 4 && (
              <View>
                <Pressable
                  accessibilityLabel="Use current location"
                  disabled={isDetectingLocation}
                  onPress={handleUseCurrentLocation}
                  style={({ pressed }) => [
                    styles.currentLocationButton,
                    pressed && styles.currentLocationButtonPressed,
                    isDetectingLocation && styles.currentLocationButtonDisabled,
                  ]}
                >
                  {isDetectingLocation ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="location-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.currentLocationButtonText}>Use Current Location</Text>
                    </>
                  )}
                </Pressable>

                {!isManualAddress ? (
                  /* Autocomplete View */
                  <View>
                    <Text style={styles.infoLabel}>
                      Search your salon address. Nearby matches are prioritized when your location is available.
                    </Text>

                    <View style={[styles.inputContainer, step4Error && styles.inputContainerError]}>
                      <Ionicons name="search-outline" size={20} color={Colors.secondary} style={{ marginRight: 12 }} />
                      <TextInput
                        ref={searchInputRef}
                        style={styles.textInput}
                        placeholder="Search street, area, or city"
                        placeholderTextColor={Colors.placeholder}
                        value={searchText}
                        onChangeText={(val) => {
                          setSearchText(val);
                          setStep4Error(null);
                        }}
                      />
                      {isSearching && <ActivityIndicator size="small" color={Colors.primary} />}
                    </View>

                    {searchError && (
                      <View style={styles.errorContainerMini}>
                        <Text style={styles.errorText}>{searchError}</Text>
                      </View>
                    )}

                    {predictions.length > 0 && (
                      <View style={styles.predictionsList}>
                        {predictions.map((p) => (
                          <Pressable
                            key={p.place_id}
                            style={styles.predictionRow}
                            onPress={() => handleSelectSuggestion(p.place_id)}
                          >
                            <Ionicons name="location-sharp" size={16} color={Colors.secondary} style={{ marginRight: 8 }} />
                            <Text style={styles.predictionText} numberOfLines={1}>
                              {p.description}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}

                    {location && (
                      <View style={styles.locationVerifiedContainer}>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={{ marginRight: 8 }} />
                        <Text style={styles.locationVerifiedText}>
                          Verified: {location.address}
                        </Text>
                      </View>
                    )}

                    {/* Preview Map Section */}
                    {location && (
                      <View style={styles.mapPreviewCard}>
                        {GOOGLE_MAPS_API_KEY && location.latitude && location.longitude ? (
                          <Image
                            source={{
                              uri: `https://maps.googleapis.com/maps/api/staticmap?center=${location.latitude},${location.longitude}&zoom=15&size=500x250&markers=color:red%7Clabel:S%7C${location.latitude},${location.longitude}&key=${GOOGLE_MAPS_API_KEY}`,
                            }}
                            style={styles.mapImage}
                          />
                        ) : (
                          <View style={styles.mockMapContainer}>
                            <Ionicons name="map-outline" size={32} color={Colors.secondary} style={{ marginBottom: 6 }} />
                            <Text style={styles.mockMapText}>Location coordinates captured</Text>
                            <Text style={styles.mockMapCoordinates}>
                              ({location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)})
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <Pressable
                      onPress={() => {
                        setIsManualAddress(true);
                        setStep4Error(null);
                      }}
                      style={styles.manualFallbackBtn}
                    >
                      <Text style={styles.manualFallbackText}>Enter Address Manually</Text>
                    </Pressable>
                  </View>
                ) : (
                  /* Manual entry fallback */
                  <View>
                    <View style={styles.manualHeaderRow}>
                      <Text style={styles.infoLabel}>Enter your salon address manually.</Text>
                      {GOOGLE_MAPS_API_KEY && (
                        <Pressable
                          onPress={() => {
                            setIsManualAddress(false);
                            setStep4Error(null);
                          }}
                        >
                          <Text style={styles.useSearchLink}>Use Google Search</Text>
                        </Pressable>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Full Business Address *</Text>
                      <View style={[styles.inputContainer, styles.addressInputContainer, step4Error && !manualAddress && styles.inputContainerError]}>
                        <Ionicons name="location-outline" size={20} color={Colors.secondary} style={{ marginRight: 12, marginTop: 16 }} />
                        <TextInput
                          ref={manualAddressInputRef}
                          style={[styles.textInput, styles.addressTextInput]}
                          placeholder="e.g. 123 Fashion Street, Suite A"
                          placeholderTextColor={Colors.placeholder}
                          value={manualAddress}
                          onChangeText={setManualAddress}
                          multiline
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Street</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="trail-sign-outline" size={20} color={Colors.secondary} style={{ marginRight: 12 }} />
                        <TextInput
                          ref={manualStreetInputRef}
                          style={styles.textInput}
                          placeholder="Street"
                          placeholderTextColor={Colors.placeholder}
                          value={manualStreet}
                          onChangeText={setManualStreet}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Area / Locality</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="navigate-outline" size={20} color={Colors.secondary} style={{ marginRight: 12 }} />
                        <TextInput
                          ref={manualAreaInputRef}
                          style={styles.textInput}
                          placeholder="Area or locality"
                          placeholderTextColor={Colors.placeholder}
                          value={manualArea}
                          onChangeText={setManualArea}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>City *</Text>
                      <View style={[styles.inputContainer, step4Error && !manualCity && styles.inputContainerError]}>
                        <Ionicons name="business-outline" size={20} color={Colors.secondary} style={{ marginRight: 12 }} />
                        <TextInput
                          ref={manualCityInputRef}
                          style={styles.textInput}
                          placeholder="City"
                          placeholderTextColor={Colors.placeholder}
                          value={manualCity}
                          onChangeText={setManualCity}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>State / Region</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="map-outline" size={20} color={Colors.secondary} style={{ marginRight: 12 }} />
                        <TextInput
                          ref={manualStateInputRef}
                          style={styles.textInput}
                          placeholder="State"
                          placeholderTextColor={Colors.placeholder}
                          value={manualState}
                          onChangeText={setManualState}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Country *</Text>
                      <View style={[styles.inputContainer, step4Error && !manualCountry && styles.inputContainerError]}>
                        <Ionicons name="flag-outline" size={20} color={Colors.secondary} style={{ marginRight: 12 }} />
                        <TextInput
                          ref={manualCountryInputRef}
                          style={styles.textInput}
                          placeholder="Country"
                          placeholderTextColor={Colors.placeholder}
                          value={manualCountry}
                          onChangeText={setManualCountry}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Postal / ZIP Code</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="mail-unread-outline" size={20} color={Colors.secondary} style={{ marginRight: 12 }} />
                        <TextInput
                          ref={manualPostalCodeInputRef}
                          style={styles.textInput}
                          placeholder="Postal code"
                          placeholderTextColor={Colors.placeholder}
                          value={manualPostalCode}
                          onChangeText={setManualPostalCode}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {step4Error && <Text style={styles.fieldErrorText}>{step4Error}</Text>}
              </View>
            )}

            {/* STEP 5: REFERRAL SOURCE */}
            {currentStep === 5 && (
              <View>
                <Text style={styles.infoLabel}>How did you hear about us?</Text>

                <View style={styles.referralList}>
                  {[
                    "Friend",
                    "Google Search",
                    "Social Media",
                    "Advertisement",
                    "Magazine",
                    "Ratings Website",
                    "AI Chatbot",
                    "Other",
                  ].map((source) => {
                    const isSelected = referralSource === source;
                    return (
                      <Pressable
                        key={source}
                        style={[
                          styles.referralItem,
                          isSelected && styles.referralItemActive,
                        ]}
                        onPress={() => {
                          setReferralSource(source);
                          setStep5Error(null);
                        }}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleActive,
                          ]}
                        >
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <Text style={styles.referralText}>{source}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {referralSource === "Other" && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Please Specify</Text>
                    <View style={[styles.inputContainer, step5Error && styles.inputContainerError]}>
                      <TextInput
                        ref={customReferralInputRef}
                        style={styles.textInput}
                        placeholder="Specify source"
                        placeholderTextColor={Colors.placeholder}
                        value={customReferralSource}
                        onChangeText={setCustomReferralSource}
                      />
                    </View>
                  </View>
                )}

                {step5Error && <Text style={styles.fieldErrorText}>{step5Error}</Text>}
              </View>
            )}

            {/* Submitting Error Container */}
            {submitError && (
              <View style={styles.errorContainer} accessibilityRole="alert">
                <Ionicons name="alert-circle-outline" size={18} color={Colors.error} style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{submitError}</Text>
              </View>
            )}

          </Animated.View>
      </KeyboardAwareScrollView>

      <View
        style={[
          styles.stickyFooter,
          {
            backgroundColor: footerBackgroundColor,
            paddingBottom: footerBottomPadding,
            paddingHorizontal: horizontalPagePadding,
          },
        ]}
      >
        <View style={[styles.footerContent, { maxWidth: footerMaxWidth }]}>
          <View style={styles.backButtonContainer}>
            <Pressable
              accessibilityLabel={
                currentStep > 1
                  ? "Go back to previous onboarding step"
                  : "Cancel onboarding and return to login"
              }
              onPress={currentStep > 1 ? handleBack : handleCancelOnboarding}
              disabled={isSubmitting}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={18} color={Colors.secondary} style={{ marginRight: 6 }} />
              <Text style={styles.backButtonText}>{currentStep > 1 ? "Back" : "Cancel"}</Text>
            </Pressable>
          </View>

          <Animated.View style={[styles.submitButtonContainer, { transform: [{ scale: submitScale }] }]}>
            <Pressable
              accessibilityLabel={currentStep === 5 ? "Complete onboarding" : "Continue to next onboarding step"}
              onPress={currentStep === 5 ? handleCompleteOnboarding : handleNext}
              disabled={
                isSubmitting ||
                (currentStep === 2 &&
                  (!primaryCategoryId || relatedCategoryIds.length !== REQUIRED_RELATED_CATEGORY_COUNT))
              }
              onPressIn={() => handlePressIn(submitScale)}
              onPressOut={() => handlePressOut(submitScale)}
              style={[
                styles.submitButtonWrapper,
                (isSubmitting ||
                  (currentStep === 2 &&
                    (!primaryCategoryId || relatedCategoryIds.length !== REQUIRED_RELATED_CATEGORY_COUNT))) &&
                  styles.submitButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={
                  isSubmitting ||
                  (currentStep === 2 &&
                    (!primaryCategoryId || relatedCategoryIds.length !== REQUIRED_RELATED_CATEGORY_COUNT))
                    ? ["#E7E2D9", "#E7E2D9"]
                    : [Colors.primaryDark, Colors.primary]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButton}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.submitButtonContent}>
                    <Text style={styles.submitButtonText}>
                      {currentStep === 5 ? "Complete" : "Continue"}
                    </Text>
                    <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </LinearGradient>
  );
}

const createStyles = (Colors: OnboardingColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  glowBlob: {
    position: "absolute",
    borderRadius: 999,
  },
  glowPista: {
    width: SCREEN_W * 1.2,
    height: SCREEN_W * 1.2,
    top: -SCREEN_H * 0.15,
    left: -SCREEN_W * 0.3,
  },
  glowCream: {
    width: SCREEN_W * 1.0,
    height: SCREEN_W * 1.0,
    bottom: -SCREEN_H * 0.15,
    right: -SCREEN_W * 0.2,
  },
  formKeyboardView: {
    flex: 1,
  },
  scrollContainer: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
  },
  categoryScrollContainer: {
    justifyContent: "flex-start",
  },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 32,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 8,
    width: "100%",
  },
  categoryCard: {
    backgroundColor: Colors.cardBg,
    borderWidth: 0,
    borderRadius: 0,
    elevation: 0,
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 0,
    shadowOpacity: 0,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoImage: {
    width: 52,
    height: 52,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: 0,
  },
  tagline: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  stepHeader: {
    alignItems: "center",
    marginBottom: 22,
    marginTop: -4,
    width: "100%",
  },
  progressSteps: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 14,
  },
  progressStepGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  progressStepItem: {
    alignItems: "center",
    width: 60,
  },
  progressCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.cardBg,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  progressCircleActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary,
    transform: [{ scale: 1.05 }],
  },
  progressCircleCompleted: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  progressCircleText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  progressCircleTextActive: {
    color: "#FFFFFF",
  },
  progressLabel: {
    color: Colors.textSecondary,
    fontSize: 8,
    fontWeight: "700",
    marginTop: 5,
    textAlign: "center",
    lineHeight: 10,
  },
  progressLabelActive: {
    color: Colors.secondary,
  },
  progressLine: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: Colors.inputBorder,
    marginTop: 13,
    marginHorizontal: 1,
  },
  progressLineCompleted: {
    backgroundColor: Colors.accent,
  },
  stepTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  categoryStepTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    marginTop: 8,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  currentLocationButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    height: 54,
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  currentLocationButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  currentLocationButtonDisabled: {
    opacity: 0.78,
  },
  currentLocationButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 16,
    height: 52,
  },
  inputContainerError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorBg,
  },
  addressInputContainer: {
    alignItems: "flex-start",
    minHeight: 80,
    paddingVertical: 0,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    height: "100%",
  },
  addressTextInput: {
    minHeight: 76,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  fieldErrorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 6,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderColor: Colors.errorBorder,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorContainerMini: {
    backgroundColor: Colors.errorBg,
    borderColor: "rgba(114, 106, 99, 0.15)",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: {
    flex: 1,
    color: Colors.error,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
  },
  categoryStepContent: {
    width: "100%",
  },
  categoryIntro: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 21,
    marginBottom: 4,
    textAlign: "center",
  },
  cardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  optionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBg,
    alignItems: "center",
  },
  optionCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 10,
    marginBottom: 4,
  },
  optionCardTitleSelected: {
    color: "#FFFFFF",
  },
  optionCardDesc: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 12,
  },
  optionCardDescSelected: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  teamSizeSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  sizeButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  sizeButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  sizeButtonSelected: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  sizeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  sizeButtonTextSelected: {
    color: "#FFFFFF",
  },
  predictionsList: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    marginTop: 4,
    maxHeight: 180,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  predictionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBorder,
  },
  predictionText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  locationVerifiedContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(28, 25, 23, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  locationVerifiedText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  mapPreviewCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    overflow: "hidden",
    marginTop: 12,
    height: 140,
    backgroundColor: Colors.bgGradientEnd,
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  mockMapContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  mockMapText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  mockMapCoordinates: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  manualFallbackBtn: {
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  manualFallbackText: {
    color: Colors.secondary,
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  manualHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  useSearchLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  referralList: {
    gap: 8,
    marginBottom: 16,
  },
  referralItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBg,
  },
  referralItemActive: {
    borderColor: Colors.secondary,
    backgroundColor: "rgba(28, 25, 23, 0.05)",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.placeholder,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioCircleActive: {
    borderColor: Colors.secondary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.secondary,
  },
  referralText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  stickyFooter: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  footerContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    width: "100%",
  },
  backButtonContainer: {
    flex: 1,
    height: 54,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: Colors.cardBg,
    borderColor: Colors.cardBorder,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  backButtonText: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: "700",
  },
  submitButtonContainer: {
    flex: 1,
    height: 54,
  },
  submitButtonWrapper: {
    borderRadius: 18,
    flex: 1,
    height: 54,
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitButton: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0,
  },
});
