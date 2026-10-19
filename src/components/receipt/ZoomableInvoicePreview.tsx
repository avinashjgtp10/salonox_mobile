import { useMemo, useRef, useState } from "react";
import { PanResponder, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/AppTypography";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ReceiptData } from "@/utils/receiptGenerator";
import { InvoicePreview } from "./InvoicePreview";

const PAGE_WIDTH = 794;
const GUTTER = 12;
const MAX_ZOOM = 4;

export function ZoomableInvoicePreview({ data }: { data: ReceiptData }) {
  const colors = useThemeColors();
  const [width, setWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(1122);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const pinch = useRef({ distance: 0, zoom: 1 });
  const horizontal = useRef<ScrollView>(null);
  const vertical = useRef<ScrollView>(null);
  const changeZoom = (value: number) => {
    zoomRef.current = Math.max(1, Math.min(MAX_ZOOM, value));
    setZoom(zoomRef.current);
  };
  const fit = () => {
    changeZoom(1);
    horizontal.current?.scrollTo({ x: 0, animated: false });
    vertical.current?.scrollTo({ y: 0, animated: false });
  };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: event => event.nativeEvent.touches.length === 2,
    onMoveShouldSetPanResponderCapture: event => event.nativeEvent.touches.length === 2,
    onPanResponderGrant: event => {
      const [first, second] = event.nativeEvent.touches;
      if (first && second) pinch.current = {
        distance: Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY),
        zoom: zoomRef.current,
      };
    },
    onPanResponderMove: event => {
      const [first, second] = event.nativeEvent.touches;
      if (!first || !second || pinch.current.distance <= 0) return;
      changeZoom(pinch.current.zoom * Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY) / pinch.current.distance);
    },
    onPanResponderTerminationRequest: () => false,
  }), []);
  const scale = Math.min(1, Math.max(1, width - GUTTER * 2) / PAGE_WIDTH) * zoom;

  return <View style={styles.root} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Zoom out invoice" disabled={zoom <= 1} onPress={() => changeZoom(zoom - 0.25)} style={[styles.control, zoom <= 1 && styles.disabled]}>
        <Ionicons name="remove" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={{ color: colors.text }}>{Math.round(zoom * 100)}%</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Zoom in invoice" disabled={zoom >= MAX_ZOOM} onPress={() => changeZoom(zoom + 0.25)} style={[styles.control, zoom >= MAX_ZOOM && styles.disabled]}>
        <Ionicons name="add" size={22} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fit invoice to screen" onPress={fit} style={styles.control}>
        <Text style={{ color: colors.primaryText }}>Fit</Text>
      </TouchableOpacity>
      <Text style={[styles.hint, { color: colors.text2 }]}>Pinch to zoom</Text>
    </View>
    <View style={styles.root} {...responder.panHandlers}>
      <ScrollView ref={vertical} style={styles.root} nestedScrollEnabled contentContainerStyle={styles.scroll}>
        <ScrollView ref={horizontal} horizontal nestedScrollEnabled style={{ width, height: pageHeight * scale + GUTTER * 2, flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ minWidth: width, justifyContent: "center", padding: GUTTER }}>
          <View style={{ width: PAGE_WIDTH * scale, height: pageHeight * scale }}>
            <View onLayout={event => setPageHeight(event.nativeEvent.layout.height)} style={[styles.page, { transform: [{ scale }], opacity: width > 0 ? 1 : 0 }]}>
              <InvoicePreview data={data} />
            </View>
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  toolbar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, borderBottomWidth: 1, flexWrap: "wrap" },
  control: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  disabled: { opacity: 0.35 },
  hint: { fontSize: 12, marginLeft: "auto", paddingRight: 8 },
  scroll: { flexGrow: 1 },
  page: { position: "absolute", top: 0, left: 0, width: PAGE_WIDTH, transformOrigin: "top left" },
});
