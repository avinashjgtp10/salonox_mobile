import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import {
  DashboardRadius as Radius,
  DashboardTypography as Typography,
  type ThemeColors,
} from "@/constants/theme";
import { fetchSpotlightFeaturesThunk } from "@/middleware/spotlight/spotlight.thunk";
import {
  SPOTLIGHT_VISIBLE_MS,
  spotlightSeenCache,
  type SpotlightSeenMap,
} from "@/services/spotlightSeenCache";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectNewSpotlightFeatures,
  selectSpotlightFetched,
} from "@/store/spotlight/spotlight.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { SpotlightFeature } from "@/types/spotlight";

// Matches the dashboard's own horizontal gutter so a card's edges line up
// with the stat tiles below it.
const HORIZONTAL_PADDING = 14;
const CARD_GAP = 10;

export default function SpotlightAnnouncementCard() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const publishedFeatures = useAppSelector(selectNewSpotlightFeatures);
  const fetched = useAppSelector(selectSpotlightFetched);
  const [activeIndex, setActiveIndex] = useState(0);
  const [seenMap, setSeenMap] = useState<SpotlightSeenMap | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<FlatList<SpotlightFeature>>(null);

  const cardWidth = width - HORIZONTAL_PADDING * 2;
  // Each page is one card plus the gap that follows it, so paging lands the
  // next card flush against the left gutter.
  const pageWidth = cardWidth + CARD_GAP;

  useEffect(() => {
    if (!fetched) {
      void dispatch(fetchSpotlightFeaturesThunk());
    }
  }, [dispatch, fetched]);

  useEffect(() => {
    let cancelled = false;

    void spotlightSeenCache.get().then((stored) => {
      if (!cancelled) {
        setSeenMap(stored);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Stamps the moment each announcement was first shown on this device. The
  // one-hour lifetime runs from here rather than from the release date, so an
  // owner who opens the app days after a release still gets a full hour to
  // notice it.
  useEffect(() => {
    if (!seenMap || publishedFeatures.length === 0) {
      return;
    }

    const unstamped = publishedFeatures.filter((feature) => seenMap[feature.id] === undefined);

    if (unstamped.length === 0) {
      return;
    }

    const stampedAt = Date.now();
    const nextMap = { ...seenMap };

    for (const feature of unstamped) {
      nextMap[feature.id] = stampedAt;
    }

    setSeenMap(nextMap);
    void spotlightSeenCache.set(nextMap);
  }, [publishedFeatures, seenMap]);

  const features = useMemo(() => {
    if (!seenMap) {
      return [];
    }

    return publishedFeatures.filter((feature) => {
      const firstSeen = seenMap[feature.id];

      // Not stamped yet (the effect above runs right after) — treat as fresh
      // rather than hiding it for a frame.
      return firstSeen === undefined || now - firstSeen < SPOTLIGHT_VISIBLE_MS;
    });
  }, [now, publishedFeatures, seenMap]);

  // Expire the card while the dashboard is still open, instead of only on the
  // next mount. One timer, set for whichever visible card lapses first.
  useEffect(() => {
    if (!seenMap || features.length === 0) {
      return;
    }

    const nextExpiryAt = features.reduce((earliest, feature) => {
      const firstSeen = seenMap[feature.id];

      if (firstSeen === undefined) {
        return earliest;
      }

      return Math.min(earliest, firstSeen + SPOTLIGHT_VISIBLE_MS);
    }, Infinity);

    if (!Number.isFinite(nextExpiryAt)) {
      return;
    }

    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, nextExpiryAt - Date.now()) + 250);

    return () => clearTimeout(timer);
  }, [features, seenMap]);

  // Features drop out as they expire; without this the dots could point past
  // the end after the last card goes.
  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, features.length - 1)));
  }, [features.length]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;

      setActiveIndex(Math.round(offsetX / pageWidth));
    },
    [pageWidth],
  );

  if (!fetched || features.length === 0) {
    return null;
  }

  const isSingle = features.length === 1;

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={listRef}
        contentContainerStyle={styles.listContent}
        data={features}
        decelerationRate="fast"
        getItemLayout={(_data, index) => ({
          index,
          length: pageWidth,
          offset: pageWidth * index,
        })}
        horizontal
        keyExtractor={(feature) => feature.id}
        onMomentumScrollEnd={handleScroll}
        // A single card has nothing to page through, so let it sit static
        // rather than rubber-banding under the finger.
        scrollEnabled={!isSingle}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={pageWidth}
        renderItem={({ item }) => (
          // Read-only announcement: no press handling at all, so a stray tap
          // on the dashboard can never navigate or dismiss anything.
          <View style={[styles.card, { width: cardWidth }]}>
            <View style={styles.topRow}>
              <View style={styles.badge}>
                <Ionicons color={Colors.dashboardRevenueAccent} name="sparkles" size={11} />
                <Text style={styles.badgeText}>NEW</Text>
              </View>
              <Text numberOfLines={1} style={styles.eyebrow}>
                What&apos;s New in SalonOX
              </Text>
            </View>

            <Text numberOfLines={1} style={styles.title}>
              {item.featureName}
            </Text>
            <Text numberOfLines={2} style={styles.description}>
              {item.shortDescription}
            </Text>

            <View style={styles.footerRow}>
              <Ionicons color={Colors.text2} name="globe-outline" size={12} />
              <Text numberOfLines={1} style={styles.footerHint}>
                Explore this on the SalonOX web app
              </Text>
            </View>
          </View>
        )}
      />

      {isSingle ? null : (
        <View style={styles.dots}>
          {features.map((feature, index) => (
            <View
              key={feature.id}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  listContent: {
    gap: CARD_GAP,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  card: {
    backgroundColor: Colors.dashboardCard,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    alignItems: "center",
    backgroundColor: Colors.dashboardRevenueBg,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    color: Colors.dashboardRevenueAccent,
    fontSize: 9,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 0.6,
  },
  eyebrow: {
    color: Colors.text2,
    flex: 1,
    fontSize: 11,
    fontWeight: Typography.fontWeights.semibold,
  },
  title: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: Typography.fontWeights.bold,
    marginTop: 9,
  },
  description: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: Typography.fontWeights.medium,
    lineHeight: 17,
    marginTop: 4,
  },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    marginTop: 10,
  },
  footerHint: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: Typography.fontWeights.bold,
  },
  dots: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 9,
  },
  dot: {
    backgroundColor: Colors.border,
    borderRadius: 3,
    height: 5,
    width: 5,
  },
  dotActive: {
    backgroundColor: Colors.dashboardRevenueAccent,
    width: 15,
  },
});
