/**
 * KeyboardAwareScrollView
 *
 * A drop-in replacement for ScrollView, FlatList, and SectionList that
 * automatically scrolls the focused TextInput above the keyboard on iOS and
 * Android. It measures exact screen positions using measureInWindow and dynamically
 * adjusts content bottom padding so lower fields are never obscured.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  ScrollView,
  SectionList,
  StyleSheet,
  TextInput,
  UIManager,
  findNodeHandle,
  type FlatListProps,
  type ScrollViewProps,
  type SectionListProps,
} from "react-native";

export type KeyboardAwareOptions = {
  extraScrollPadding?: number;
  contentContainerStyle?: any;
  onScroll?: ScrollViewProps["onScroll"];
};

export function useKeyboardAwareScrollView<
  T extends ScrollView | FlatList<any> | SectionList<any, any> = ScrollView,
>({
  extraScrollPadding = 40,
  contentContainerStyle,
  onScroll: userOnScroll,
}: KeyboardAwareOptions = {}) {
  const scrollRef = useRef<T>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const [keyboardHeightState, setKeyboardHeightState] = useState(0);
  const activeInputRef = useRef<unknown>(null);
  const isMeasuringRef = useRef(false);

  const scrollToFocusedInput = useCallback(
    (customKbHeight?: number) => {
      const kbHeight = customKbHeight ?? keyboardHeightRef.current;
      if (!scrollRef.current || kbHeight <= 0) return;

      const focusedInput =
        (
          TextInput.State as unknown as {
            currentlyFocusedInput?: () => unknown;
          }
        ).currentlyFocusedInput?.();

      if (!focusedInput) return;

      activeInputRef.current = focusedInput;

      const scrollResponder =
        (scrollRef.current as any)?.getScrollResponder?.() ?? scrollRef.current;

      if (!scrollResponder) return;

      const scrollNode = findNodeHandle(scrollResponder as any);
      if (!scrollNode) return;

      const inputNode =
        typeof focusedInput === "number"
          ? focusedInput
          : findNodeHandle(focusedInput as any);

      if (!inputNode) return;

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
        iy: number;
        ih: number;
      }>((resolve) => {
        const inputObj = focusedInput as any;
        if (typeof inputObj?.measureInWindow === "function") {
          inputObj.measureInWindow(
            (_ix: number, iy: number, _iw: number, ih: number) => {
              resolve({ iy, ih });
            },
          );
        } else {
          UIManager.measureInWindow(
            inputNode,
            (_ix: number, iy: number, _iw: number, ih: number) => {
              resolve({ iy, ih });
            },
          );
        }
      });

      Promise.all([measureScrollView, measureInput])
        .then(([{ sy, sh }, { iy, ih }]) => {
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
    [extraScrollPadding],
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
      requestAnimationFrame(() => {
        scrollToFocusedInput(height);
      });
    };

    const onHide = () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeightState(0);
      activeInputRef.current = null;
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

  // Active Focus Polling while keyboard is open
  useEffect(() => {
    if (keyboardHeightState <= 0) return;

    const interval = setInterval(() => {
      const focusedInput =
        (
          TextInput.State as unknown as {
            currentlyFocusedInput?: () => unknown;
          }
        ).currentlyFocusedInput?.();

      if (focusedInput && focusedInput !== activeInputRef.current) {
        scrollToFocusedInput();
      }
    }, 120);

    return () => clearInterval(interval);
  }, [keyboardHeightState, scrollToFocusedInput]);

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

  return {
    scrollRef,
    keyboardHeightState,
    combinedContentContainerStyle,
    onScroll: handleScroll,
    scrollToFocusedInput,
  };
}

export type KeyboardAwareScrollViewProps = ScrollViewProps & {
  extraScrollPadding?: number;
};

export type KeyboardAwareScrollViewHandle = ScrollView;

export const KeyboardAwareScrollView = forwardRef<
  ScrollView,
  PropsWithChildren<KeyboardAwareScrollViewProps>
>(function KeyboardAwareScrollView(
  { children, extraScrollPadding = 40, contentContainerStyle, ...scrollViewProps },
  forwardedRef,
) {
  const {
    scrollRef,
    combinedContentContainerStyle,
    onScroll,
  } = useKeyboardAwareScrollView<ScrollView>({
    extraScrollPadding,
    contentContainerStyle,
    onScroll: scrollViewProps.onScroll,
  });

  useImperativeHandle(forwardedRef, () => scrollRef.current as ScrollView);

  return (
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
    >
      {children}
    </ScrollView>
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
