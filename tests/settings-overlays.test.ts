import React from "react";
import { Switch, TouchableOpacity } from "react-native";
import { ChangePasswordSheet } from "@/features/settings/ChangePasswordSheet";
import { AppearanceSheet } from "@/features/settings/AppearanceSheet";
import { useAppTheme } from "@/theme/ThemeProvider";
import { NotificationSettingsSheet } from "@/features/settings/NotificationSettingsSheet";
import { authService } from "@/services/authService";
import { salonNotificationPreferences } from "@/services/salonNotificationPreferences";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/services/notificationPreferencesStorage";
import { mapSalonFormFieldsToUpdateRequest } from "@/services/salon.service";

const renderer = jest.requireActual("react-test-renderer");
jest.mock("@/theme/ThemeProvider", () => ({
  useAppTheme: jest.fn(() => ({ mode: "light", scheme: "light", setMode: jest.fn() })),
}));
jest.mock("@/store/hooks", () => ({
 useAppSelector: (selector: { name: string }) => selector.name === "selectCurrentUser" ? { role: "salon_owner", salonId: "salon-1" } : { id: "salon-1", language: "en", currency: "INR" },
 useAppDispatch: () => jest.fn(),
}));
jest.mock("@/store/salon/salon.slice", () => ({ selectSalonById: jest.fn() }));
jest.mock("@/middleware/salon/salon.thunk", () => ({ updateSalonThunk: jest.fn() }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("expo-router", () => ({ Redirect: "Redirect" }));
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { role: "salon_owner" } }),
}));
jest.mock("@/services/appAlert", () => ({ appAlert: { alert: jest.fn() } }));
jest.mock("@/services/api", () => ({
  api: {},
  ApiError: class extends Error {},
}));
jest.mock("@/services/authService", () => ({
  authService: { changePassword: jest.fn() },
}));
jest.mock("@/services/salonNotificationPreferences", () => ({
  salonNotificationPreferences: { get: jest.fn(), save: jest.fn() },
}));
jest.mock("@/services/notificationPreferencesStorage", () => ({
  DEFAULT_NOTIFICATION_PREFERENCES: {
    allNotifications: true,
    newAppointment: true,
    appointmentReminder: true,
    appointmentCancelled: true,
    appointmentCompleted: true,
    newPayment: true,
    paymentFailed: true,
    newClient: true,
    clientReview: true,
    newMessage: true,
    lowInventory: true,
    staffLogin: true,
    marketingCampaign: true,
  },
  notificationPreferencesStorage: {
    setPreferences: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("@/components/ui/AppTypography", () => ({
  Text: "Text",
  TextInput: "TextInput",
}));
jest.mock("@/components/ui/AppActivityIndicator", () => ({
  ActivityIndicator: "Spinner",
}));
jest.mock("@/components/ui/PasswordField", () => ({
  PasswordField: jest
    .requireActual<typeof React>("react")
    .forwardRef((props: object, ref) =>
      jest
        .requireActual<typeof React>("react")
        .createElement("PasswordField", { ...props, ref }),
    ),
}));
jest.mock("@/features/settings/SettingsUI", () => ({
  SettingsButton: "SettingsButton",
  useSettingsStyles: () => ({}),
}));
jest.mock("@/components/ui/BottomSheet", () => ({
  BottomSheet: ({
    children,
    footer,
    visible,
  }: {
    children: React.ReactNode;
    footer?: React.ReactNode;
    visible?: boolean;
  }) =>
    visible === false ? null : jest
      .requireActual<typeof React>("react")
      .createElement("BottomSheet", null, children, footer),
}));

describe("Settings overlays preserve saving behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("switches Appearance through the existing theme handler and closes with Done", () => {
    const setMode = jest.fn(), close = jest.fn();
    jest.mocked(useAppTheme).mockReturnValue({ mode: "dark", scheme: "dark", setMode } as unknown as ReturnType<typeof useAppTheme>);
    let tree: ReturnType<typeof renderer.create>;
    renderer.act(() => { tree = renderer.create(React.createElement(AppearanceSheet, { onClose: close })); });
    const radios = tree!.root.findAllByType(TouchableOpacity).filter((node: { props: { accessibilityRole?: string } }) => node.props.accessibilityRole === "radio");
    expect(radios.map((node: { props: { accessibilityState: { checked: boolean } } }) => node.props.accessibilityState.checked)).toEqual([false, true, false]);
    renderer.act(() => radios[0].props.onPress());
    expect(setMode).toHaveBeenLastCalledWith("light");
    renderer.act(() => radios[2].props.onPress());
    expect(setMode).toHaveBeenLastCalledWith("system");
    renderer.act(() => radios[1].props.onPress());
    expect(setMode).toHaveBeenLastCalledWith("dark");
    renderer.act(() => tree!.root.findByType("SettingsButton").props.onPress());
    expect(close).toHaveBeenCalledTimes(1);
    renderer.act(() => tree!.unmount());
  });
  it("validates passwords before using the existing change-password API", async () => {
    let tree: ReturnType<typeof renderer.create>;
    renderer.act(() => {
      tree = renderer.create(
        React.createElement(ChangePasswordSheet, { onClose: jest.fn() }),
        { createNodeMock: () => ({ focus: jest.fn() }) },
      );
    });
    await renderer.act(async () => {
      tree!.root.findByType("SettingsButton").props.onPress();
    });
    expect(authService.changePassword).not.toHaveBeenCalled();
    const fields = tree!.root.findAllByType("PasswordField");
    renderer.act(() => {
      fields[0].props.onChangeText("CurrentPassword1");
      fields[1].props.onChangeText("CurrentPassword1");
      fields[2].props.onChangeText("CurrentPassword1");
    });
    await renderer.act(async () => {
      tree!.root.findByType("SettingsButton").props.onPress();
    });
    expect(authService.changePassword).not.toHaveBeenCalled();
    expect(tree!.root.findAllByType("PasswordField")[1].props.error).toMatch(
      /different/,
    );
    renderer.act(() => tree!.unmount());
  });
  it("submits the same three password values once and closes after success", async () => {
    jest.useFakeTimers();
    jest
      .mocked(authService.changePassword)
      .mockResolvedValue({ data: null, message: "Password updated" });
    const close = jest.fn();
    let tree: ReturnType<typeof renderer.create>;
    renderer.act(() => {
      tree = renderer.create(
        React.createElement(ChangePasswordSheet, { onClose: close }),
        { createNodeMock: () => ({ focus: jest.fn() }) },
      );
    });
    const fields = tree!.root.findAllByType("PasswordField");
    renderer.act(() => {
      fields[0].props.onChangeText("CurrentPassword1");
      fields[1].props.onChangeText("UpdatedPassword2");
      fields[2].props.onChangeText("UpdatedPassword2");
    });
    await renderer.act(async () => {
      const submit = tree!.root.findByType("SettingsButton").props.onPress;
      submit();
      submit();
    });
    expect(authService.changePassword).toHaveBeenCalledTimes(1);
    expect(authService.changePassword).toHaveBeenCalledWith({
      currentPassword: "CurrentPassword1",
      newPassword: "UpdatedPassword2",
      confirmPassword: "UpdatedPassword2",
    });
    renderer.act(() => jest.advanceTimersByTime(900));
    expect(close).toHaveBeenCalledTimes(1);
    renderer.act(() => tree!.unmount());
    jest.useRealTimers();
  });
  it("saves notification toggles using their existing webapp keys", async () => {
    jest
      .mocked(salonNotificationPreferences.get)
      .mockResolvedValue(DEFAULT_NOTIFICATION_PREFERENCES);
    jest.mocked(salonNotificationPreferences.save).mockResolvedValue(undefined);
    let tree: ReturnType<typeof renderer.create>;
    await renderer.act(async () => {
      tree = renderer.create(
        React.createElement(NotificationSettingsSheet, { onClose: jest.fn() }),
      );
    });
    expect(tree!.root.findAllByType(Switch)).toHaveLength(13);
    await renderer.act(async () => {
      tree!.root
        .findAllByType(Switch)
        .find(
          (row: { props: { accessibilityLabel: string } }) =>
            row.props.accessibilityLabel === "New Payment",
        )!
        .props.onValueChange(false);
    });
    expect(salonNotificationPreferences.save).toHaveBeenCalledWith({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      newPayment: false,
    });
    renderer.act(() => tree!.unmount());
  });
  it("preserves the whole-salon master notification switch", async () => {
    jest
      .mocked(salonNotificationPreferences.get)
      .mockResolvedValue(DEFAULT_NOTIFICATION_PREFERENCES);
    jest.mocked(salonNotificationPreferences.save).mockResolvedValue(undefined);
    let tree: ReturnType<typeof renderer.create>;
    await renderer.act(async () => {
      tree = renderer.create(
        React.createElement(NotificationSettingsSheet, { onClose: jest.fn() }),
      );
    });
    await renderer.act(async () => {
      tree!.root.findAllByType(Switch)[0].props.onValueChange(false);
    });
    expect(salonNotificationPreferences.save).toHaveBeenCalledWith(
      Object.fromEntries(
        Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).map((key) => [
          key,
          false,
        ]),
      ),
    );
    expect(
      tree!.root
        .findAllByType(Switch)
        .slice(1)
        .every((row: { props: { disabled: boolean } }) => row.props.disabled),
    ).toBe(true);
    renderer.act(() => tree!.unmount());
  });
  it("maps optional GSTIN to the existing salon update field without changing other values", () => {
    expect(
      mapSalonFormFieldsToUpdateRequest({
        businessName: "Glow",
        postalCode: "400053",
        gstin: "27ABCDE1234F1Z5",
      }),
    ).toEqual({
      business_name: "Glow",
      postal_code: "400053",
      gst_number: "27ABCDE1234F1Z5",
    });
    expect(mapSalonFormFieldsToUpdateRequest({ businessName: "Glow" })).toEqual(
      { business_name: "Glow" },
    );
  });
});
