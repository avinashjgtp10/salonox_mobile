/**
 * KeyboardAwareScrollView
 *
 * A drop-in replacement for ScrollView, FlatList, and SectionList that
 * automatically scrolls the focused TextInput above the keyboard on iOS and
 * Android. It measures exact screen positions using measureInWindow and dynamically
 * adjusts content bottom padding so lower fields are never obscured.
 */

import { Ionicons } from "@expo/vector-icons";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type RefObject,
} from "react";
import {
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  TextInput,
  UIManager,
  View,
  findNodeHandle,
  type FlatListProps,
  type ScrollViewProps,
  type SectionListProps,
} from "react-native";

import { AppRadius } from "@/constants/layout";
import { useThemeColors } from "@/theme/ThemeProvider";

export type KeyboardNavigationField = {
  disabled?: boolean;
  ref: RefObject<TextInput | null>;
};

export type KeyboardNavigationOptions = {
  activeFieldRef?: RefObject<TextInput | null> | null;
  fields: KeyboardNavigationField[];
  hideOnLast?: boolean;
  keyboardVisible?: boolean;
  onDone?: () => void;
  showAccessory?: boolean;
};

export type KeyboardAwareOptions = {
  extraScrollPadding?: number;
  contentContainerStyle?: any;
  keyboardNavigation?: KeyboardNavigationOptions;
  onScroll?: ScrollViewProps["onScroll"];
};

type FocusedInputFrame = {
  height: number;
  keyboardTopY: number;
  pageX: number;
  pageY: number;
  width: number;
};

const FLOATING_BUTTON_SIZE = 44;
const FLOATING_BUTTON_MARGIN = 12;
const KEYBOARD_FOCUS_MEASURE_DELAYS_MS = [0, 80, 180];
const KEYBOARD_NAVIGATION_MEASURE_DELAYS_MS = [45, 150];

const getCurrentlyFocusedInput = () =>
  (
    TextInput.State as unknown as {
      currentlyFocusedInput?: () => unknown;
    }
  ).currentlyFocusedInput?.() ?? null;

const getInputNode = (input: unknown) =>
  typeof input === "number" ? input : findNodeHandle(input as any);

const getKeyboardMetricsHeight = () => {
  const metrics = (Keyboard as unknown as { metrics?: () => { height?: number } | undefined }).metrics?.();

  return metrics?.height ?? 0;
};

const getNextNavigationField = (
  fields: KeyboardNavigationField[],
  activeNode: number | null,
) => {
  if (!activeNode) {
    return null;
  }

  let foundActiveField = false;

  for (const field of fields) {
    const fieldNode = getInputNode(field.ref.current);

    if (!fieldNode) {
      continue;
    }

    if (foundActiveField) {
      return field;
    }

    if (fieldNode === activeNode) {
      foundActiveField = true;
    }
  }

  return null;
};

const hasNavigationField = (
  fields: KeyboardNavigationField[],
  activeNode: number | null,
) => Boolean(activeNode && fields.some((field) => getInputNode(field.ref.current) === activeNode));

const isRegisteredNavigationNode = (
  fields: KeyboardNavigationField[],
  node: number | null,
) => Boolean(node && fields.some((field) => getInputNode(field.ref.current) === node));

const getFocusedNavigationInput = (keyboardNavigation?: KeyboardNavigationOptions) => {
  const focusedInput = getCurrentlyFocusedInput();

  if (focusedInput) {
    return focusedInput;
  }

  return keyboardNavigation?.activeFieldRef?.current ?? null;
};

export function useKeyboardAwareScrollView<
  T extends ScrollView | FlatList<any> | SectionList<any, any> = ScrollView,
>({
  extraScrollPadding = 40,
  contentContainerStyle,
  keyboardNavigation,
  onScroll: userOnScroll,
}: KeyboardAwareOptions = {}) {
  const scrollRef = useRef<T>(null);
  const containerRef = useRef<View>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const [keyboardHeightState, setKeyboardHeightState] = useState(0);
  const [activeInputNode, setActiveInputNode] = useState<number | null>(null);
  const [focusedInputFrame, setFocusedInputFrame] = useState<FocusedInputFrame | null>(null);
  const activeInputNodeRef = useRef<number | null>(null);
  const focusedInputFrameRef = useRef<FocusedInputFrame | null>(null);
  const activeInputRef = useRef<unknown>(null);
  const isMeasuringRef = useRef(false);
  const visibleNavigationFields = useMemo(
    () => keyboardNavigation?.fields.filter((field) => !field.disabled) ?? [],
    [keyboardNavigation?.fields],
  );

  const scrollToFocusedInput = useCallback(
    (customKbHeight?: number) => {
      const kbHeight = customKbHeight ?? keyboardHeightRef.current;
      if (!scrollRef.current || kbHeight <= 0) return;

      const focusedInput = getFocusedNavigationInput(keyboardNavigation);

      if (!focusedInput) return;

      activeInputRef.current = focusedInput;

      const scrollResponder =
        (scrollRef.current as any)?.getScrollResponder?.() ?? scrollRef.current;

      if (!scrollResponder) return;

      const scrollNode = findNodeHandle(scrollResponder as any);
      if (!scrollNode) return;

      const inputNode = getInputNode(focusedInput);

      if (!inputNode) return;
      activeInputNodeRef.current = inputNode;
      setActiveInputNode(inputNode);

      if (isMeasuringRef.current) return;
      isMeasuringRef.current = true;

      const windowHeight = Dimensions.get("window").height;

      // Promise for ScrollView position in window
      const measureScrollView = new Promise<{
        sy: number;
        sh: number;
      }>((resolve) => {
        if (typeof (scrollResponder as any).measureInWindow === "function") {
          (scrollResponder as any).measureInWindow(
            (_sx: number, sy: number, _sw: number, sh: number) => {
              resolve({ sy, sh });
            },
          );
        } else {
          UIManager.measureInWindow(
            scrollNode,
            (_sx: number, sy: number, _sw: number, sh: number) => {
              resolve({ sy, sh });
            },
          );
        }
      });

      // Promise for focused TextInput position in window
      const measureInput = new Promise<{
        ix: number;
        iy: number;
        ih: number;
        iw: number;
      }>((resolve) => {
        const inputObj = focusedInput as any;
        if (typeof inputObj?.measureInWindow === "function") {
          inputObj.measureInWindow(
            (_ix: number, iy: number, _iw: number, ih: number) => {
              resolve({ ix: _ix, iy, iw: _iw, ih });
            },
          );
        } else {
          UIManager.measureInWindow(
            inputNode,
            (_ix: number, iy: number, _iw: number, ih: number) => {
              resolve({ ix: _ix, iy, iw: _iw, ih });
            },
          );
        }
      });

      const measureContainer = new Promise<{
        cx: number;
        cy: number;
      }>((resolve) => {
        const containerNode = findNodeHandle(containerRef.current);

        if (!containerNode) {
          resolve({ cx: 0, cy: 0 });
          return;
        }

        if (typeof (containerRef.current as any)?.measureInWindow === "function") {
          (containerRef.current as any).measureInWindow(
            (cx: number, cy: number) => {
              resolve({ cx, cy });
            },
          );
        } else {
          UIManager.measureInWindow(
            containerNode,
            (cx: number, cy: number) => {
              resolve({ cx, cy });
            },
          );
        }
      });

      Promise.all([measureScrollView, measureInput, measureContainer])
        .then(([{ sy, sh }, { ix, iy, iw, ih }, { cx, cy }]) => {
          isMeasuringRef.current = false;
          if (
            iy === undefined ||
            sy === undefined ||
            sh === 0 ||
            ih === 0 ||
            isNaN(iy) ||
            isNaN(sy)
          ) {
            return;
          }

          const keyboardTopInWindow = windowHeight - kbHeight;
          const nextFocusedInputFrame = {
            height: ih,
            keyboardTopY: keyboardTopInWindow - cy,
            pageX: ix - cx,
            pageY: iy - cy,
            width: iw,
          };
          focusedInputFrameRef.current = nextFocusedInputFrame;
          setFocusedInputFrame(nextFocusedInputFrame);
          const visibleBottom =
            Math.min(sy + sh, keyboardTopInWindow) - extraScrollPadding;
          const visibleTop = sy + extraScrollPadding;
          const inputBottom = iy + ih;
          const inputTop = iy;

          let delta = 0;
          if (inputBottom > visibleBottom) {
            delta = inputBottom - visibleBottom;
          } else if (inputTop < visibleTop) {
            delta = visibleTop - inputTop;
          }

          if (Math.abs(delta) > 2) {
            const targetScrollY = Math.max(0, scrollOffsetRef.current + delta);

            if (typeof (scrollResponder as any).scrollTo === "function") {
              (scrollResponder as any).scrollTo({
                y: targetScrollY,
                animated: true,
              });
            } else if (
              typeof (scrollResponder as any).scrollToOffset === "function"
            ) {
              (scrollResponder as any).scrollToOffset({
                offset: targetScrollY,
                animated: true,
              });
            }
          }
        })
        .catch(() => {
          isMeasuringRef.current = false;
        });
    },
    [extraScrollPadding, keyboardNavigation],
  );

  // Keyboard Event Listeners
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const changeFrameEvent = "keyboardWillChangeFrame";

    const onShow = (event: { endCoordinates: { height: number } }) => {
      const height = event.endCoordinates.height;
      keyboardHeightRef.current = height;
      setKeyboardHeightState(height);

      KEYBOARD_FOCUS_MEASURE_DELAYS_MS.forEach((delay) => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            scrollToFocusedInput(height);
          });
        }, delay);
      });
    };

    const onHide = () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeightState(0);
      activeInputRef.current = null;
      activeInputNodeRef.current = null;
      focusedInputFrameRef.current = null;
      setActiveInputNode(null);
      setFocusedInputFrame(null);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    const changeFrameSub =
      Platform.OS === "ios"
        ? Keyboard.addListener(changeFrameEvent, onShow)
        : null;

    return () => {
      showSub.remove();
      hideSub.remove();
      changeFrameSub?.remove();
    };
  }, [scrollToFocusedInput]);

  // Active focus polling. This deliberately keeps running even when the
  // keyboard state is temporarily stale after screen remount/back navigation.
  useEffect(() => {
    const interval = setInterval(() => {
      const metricsHeight = getKeyboardMetricsHeight();

      if (metricsHeight > 0 && keyboardHeightRef.current <= 0) {
        keyboardHeightRef.current = metricsHeight;
        setKeyboardHeightState(metricsHeight);
      }

      const focusedInput = getFocusedNavigationInput(keyboardNavigation);
      const focusedNode = focusedInput ? getInputNode(focusedInput) : null;
      const isRegisteredFocusedNode = isRegisteredNavigationNode(visibleNavigationFields, focusedNode);

      if (focusedInput && focusedNode && isRegisteredFocusedNode) {
        activeInputRef.current = focusedInput;
        const didFocusChange = activeInputNodeRef.current !== focusedNode;
        activeInputNodeRef.current = focusedNode;
        setActiveInputNode(focusedNode);

        if (didFocusChange || !focusedInputFrameRef.current) {
          scrollToFocusedInput();
        }
        return;
      }

      if (!focusedInput && keyboardHeightRef.current <= 0) {
        activeInputRef.current = null;
        activeInputNodeRef.current = null;
        focusedInputFrameRef.current = null;
        setActiveInputNode(null);
        setFocusedInputFrame(null);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [keyboardNavigation, scrollToFocusedInput, visibleNavigationFields]);

  useEffect(() => {
    if (!keyboardNavigation?.keyboardVisible) {
      return;
    }

    const focusedInput = getFocusedNavigationInput(keyboardNavigation);
    const focusedNode = focusedInput ? getInputNode(focusedInput) : null;

    if (!focusedInput || !focusedNode || !isRegisteredNavigationNode(visibleNavigationFields, focusedNode)) {
      return;
    }

    activeInputRef.current = focusedInput;
    activeInputNodeRef.current = focusedNode;
    setActiveInputNode(focusedNode);
    requestAnimationFrame(() => {
      scrollToFocusedInput();
    });
  }, [keyboardNavigation, keyboardNavigation?.keyboardVisible, scrollToFocusedInput, visibleNavigationFields]);

  // Dynamic ContentContainerStyle Padding
  const combinedContentContainerStyle = useMemo(() => {
    const baseStyle = StyleSheet.flatten(contentContainerStyle) || {};
    if (keyboardHeightState > 0) {
      const currentPaddingBottom =
        typeof baseStyle.paddingBottom === "number"
          ? baseStyle.paddingBottom
          : 0;
      return {
        ...baseStyle,
        paddingBottom:
          currentPaddingBottom + keyboardHeightState + extraScrollPadding,
      };
    }
    return baseStyle;
  }, [contentContainerStyle, keyboardHeightState, extraScrollPadding]);

  const handleScroll = useCallback(
    (e: any) => {
      scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
      userOnScroll?.(e);
    },
    [userOnScroll],
  );

  const nextNavigationField = getNextNavigationField(visibleNavigationFields, activeInputNode);
  const hasNextField = Boolean(nextNavigationField);
  const showDoneAction =
    Boolean(keyboardNavigation?.onDone) &&
    hasNavigationField(visibleNavigationFields, activeInputNode) &&
    !hasNextField &&
    !keyboardNavigation?.hideOnLast;
  const shouldShowKeyboardNavigation =
    keyboardNavigation?.showAccessory !== false &&
    (keyboardHeightState > 0 || Boolean(keyboardNavigation?.keyboardVisible)) &&
    Boolean(activeInputNode) &&
    (hasNextField || showDoneAction);

  const handleKeyboardNavigationPress = useCallback(() => {
    if (nextNavigationField) {
      nextNavigationField.ref.current?.focus();

      KEYBOARD_NAVIGATION_MEASURE_DELAYS_MS.forEach((delay) => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            scrollToFocusedInput();
          });
        }, delay);
      });
      return;
    }

    keyboardNavigation?.onDone?.();
  }, [
    keyboardNavigation,
    nextNavigationField,
    scrollToFocusedInput,
  ]);

  return {
    containerRef,
    scrollRef,
    keyboardHeightState,
    combinedContentContainerStyle,
    activeInputNode,
    focusedInputFrame,
    handleKeyboardNavigationPress,
    hasNextField,
    onScroll: handleScroll,
    shouldShowKeyboardNavigation,
    scrollToFocusedInput,
  };
}

export type KeyboardAwareScrollViewProps = ScrollViewProps & {
  extraScrollPadding?: number;
  keyboardNavigation?: KeyboardNavigationOptions;
};

export type KeyboardAwareScrollViewHandle = ScrollView;

export const KeyboardAwareScrollView = forwardRef<
  ScrollView,
  PropsWithChildren<KeyboardAwareScrollViewProps>
>(function KeyboardAwareScrollView(
  { children, extraScrollPadding = 40, contentContainerStyle, keyboardNavigation, ...scrollViewProps },
  forwardedRef,
) {
  const Colors = useThemeColors();
  const navigationStyles = useMemo(() => createKeyboardNavigationStyles(Colors), [Colors]);
  const {
    containerRef,
    scrollRef,
    combinedContentContainerStyle,
    activeInputNode,
    focusedInputFrame,
    handleKeyboardNavigationPress,
    hasNextField,
    keyboardHeightState,
    onScroll,
    shouldShowKeyboardNavigation,
  } = useKeyboardAwareScrollView<ScrollView>({
    extraScrollPadding,
    contentContainerStyle,
    keyboardNavigation,
    onScroll: scrollViewProps.onScroll,
  });

  useImperativeHandle(forwardedRef, () => scrollRef.current as ScrollView);

  const windowWidth = Dimensions.get("window").width;
  const floatingButtonTop = focusedInputFrame
    ? (() => {
        const besideInput =
          focusedInputFrame.pageY + focusedInputFrame.height / 2 - FLOATING_BUTTON_SIZE / 2;
        const maxAboveKeyboard =
          focusedInputFrame.keyboardTopY - FLOATING_BUTTON_SIZE - FLOATING_BUTTON_MARGIN;

        return Math.max(FLOATING_BUTTON_MARGIN, Math.min(besideInput, maxAboveKeyboard));
      })()
    : activeInputNode
      ? Math.max(
          FLOATING_BUTTON_MARGIN,
          Dimensions.get("window").height -
            keyboardHeightState -
            FLOATING_BUTTON_SIZE -
            FLOATING_BUTTON_MARGIN * 2,
        )
      : FLOATING_BUTTON_MARGIN;
  const floatingButtonLeft = focusedInputFrame
    ? (() => {
        const rightOfInput = focusedInputFrame.pageX + focusedInputFrame.width + 8;
        const maxLeft = windowWidth - FLOATING_BUTTON_SIZE - FLOATING_BUTTON_MARGIN;

        if (rightOfInput <= maxLeft) {
          return Math.max(FLOATING_BUTTON_MARGIN, rightOfInput);
        }

        return maxLeft;
      })()
    : windowWidth - FLOATING_BUTTON_SIZE - 18;

  return (
    <View ref={containerRef} style={[styles.container, scrollViewProps.style]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={combinedContentContainerStyle}
        keyboardShouldPersistTaps={
          scrollViewProps.keyboardShouldPersistTaps ?? "handled"
        }
        showsVerticalScrollIndicator={
          scrollViewProps.showsVerticalScrollIndicator ?? false
        }
        onScroll={onScroll}
        scrollEventThrottle={scrollViewProps.scrollEventThrottle ?? 16}
        {...scrollViewProps}
        style={styles.container}
      >
        {children}
      </ScrollView>
      {shouldShowKeyboardNavigation ? (
        <Pressable
          accessibilityLabel={hasNextField ? "Focus next field" : "Done"}
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleKeyboardNavigationPress}
          style={[navigationStyles.floatingButton, { left: floatingButtonLeft, top: floatingButtonTop }]}
        >
          <Ionicons
            color="#FFFFFF"
            name={hasNextField ? "arrow-down" : "checkmark"}
            size={20}
          />
        </Pressable>
      ) : null}
    </View>
  );
});

export type KeyboardAwareFlatListProps<ItemT> = FlatListProps<ItemT> & {
  extraScrollPadding?: number;
};

export const KeyboardAwareFlatList = forwardRef(function KeyboardAwareFlatList<
  ItemT,
>(
  { extraScrollPadding = 40, contentContainerStyle, ...flatListProps }: KeyboardAwareFlatListProps<ItemT>,
  forwardedRef: React.ForwardedRef<FlatList<ItemT>>,
) {
  const {
    scrollRef,
    combinedContentContainerStyle,
    onScroll,
  } = useKeyboardAwareScrollView<FlatList<ItemT>>({
    extraScrollPadding,
    contentContainerStyle,
    onScroll: flatListProps.onScroll,
  });

  useImperativeHandle(forwardedRef, () => scrollRef.current as FlatList<ItemT>);

  return (
    <FlatList
      ref={scrollRef}
      contentContainerStyle={combinedContentContainerStyle}
      keyboardShouldPersistTaps={
        flatListProps.keyboardShouldPersistTaps ?? "handled"
      }
      showsVerticalScrollIndicator={
        flatListProps.showsVerticalScrollIndicator ?? false
      }
      onScroll={onScroll}
      scrollEventThrottle={flatListProps.scrollEventThrottle ?? 16}
      {...flatListProps}
    />
  );
}) as <ItemT>(
  props: KeyboardAwareFlatListProps<ItemT> & { ref?: React.Ref<FlatList<ItemT>> },
) => React.ReactElement;

export type KeyboardAwareSectionListProps<ItemT, SectionT = any> =
  SectionListProps<ItemT, SectionT> & {
    extraScrollPadding?: number;
  };

export const KeyboardAwareSectionList = forwardRef(
  function KeyboardAwareSectionList<ItemT, SectionT = any>(
    {
      extraScrollPadding = 40,
      contentContainerStyle,
      ...sectionListProps
    }: KeyboardAwareSectionListProps<ItemT, SectionT>,
    forwardedRef: React.ForwardedRef<SectionList<ItemT, SectionT>>,
  ) {
    const {
      scrollRef,
      combinedContentContainerStyle,
      onScroll,
    } = useKeyboardAwareScrollView<SectionList<any, any>>({
      extraScrollPadding,
      contentContainerStyle,
      onScroll: sectionListProps.onScroll,
    });

    useImperativeHandle(
      forwardedRef,
      () => scrollRef.current as SectionList<ItemT, SectionT>,
    );

    return (
      <SectionList
        ref={scrollRef}
        contentContainerStyle={combinedContentContainerStyle}
        keyboardShouldPersistTaps={
          sectionListProps.keyboardShouldPersistTaps ?? "handled"
        }
        showsVerticalScrollIndicator={
          sectionListProps.showsVerticalScrollIndicator ?? false
        }
        onScroll={onScroll}
        scrollEventThrottle={sectionListProps.scrollEventThrottle ?? 16}
        {...sectionListProps}
      />
    );
  },
) as <ItemT, SectionT = any>(
  props: KeyboardAwareSectionListProps<ItemT, SectionT> & {
    ref?: React.Ref<SectionList<ItemT, SectionT>>;
  },
) => React.ReactElement;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const createKeyboardNavigationStyles = (Colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    floatingButton: {
      alignItems: "center",
      backgroundColor: Colors.primary,
      borderColor: "rgba(255, 255, 255, 0.28)",
      borderRadius: AppRadius.pill,
      borderWidth: 1,
      elevation: 8,
      height: FLOATING_BUTTON_SIZE,
      justifyContent: "center",
      position: "absolute",
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
      width: FLOATING_BUTTON_SIZE,
      zIndex: 20,
    },
  });
