import React from "react";
import { PaymentMethodsScreen } from "@/features/settings/PaymentMethodsScreen";
import { paymentMethodsService } from "@/services/paymentMethods.service";
import { appAlert } from "@/services/appAlert";

const renderer = jest.requireActual("react-test-renderer");
let mockUser = { id: "owner", role: "salon_owner", effective_permissions: {} };
const mockConfig = {
  builtIns: [{ key: "cash", name: "Cash", is_active: true }, { key: "card", name: "Card", is_active: true }],
  custom: [{ id: "cheque", name: "Cheque", is_active: true, salon_id: "salon", created_at: "", updated_at: "2026-11-10" }],
};
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("@/hooks/usePaymentMethods", () => ({ usePaymentMethods: () => {
  const [config, apply] = jest.requireActual("react").useState(mockConfig);
  return { config, scope: "owner:salon", ready: true, offersUpi: true, error: "", refreshing: false, loading: false, apply, refresh: jest.fn().mockResolvedValue(config) };
} }));
jest.mock("@/components/ui/AppTypography", () => ({ Text: "Text", TextInput: "TextInput" }));
jest.mock("@/components/auth/pearl/usePearlPalette", () => ({ usePearlPalette: () => jest.requireActual("@/components/auth/pearl/tokens").pearl }));
jest.mock("@/components/pearl/Page", () => ({ Page: ({ children, header }: { children: React.ReactNode; header: React.ReactNode }) => jest.requireActual("react").createElement("Page", {}, header, children) }));
jest.mock("@/components/pearl/ui", () => ({ EmptyState: "EmptyState", SmallButton: "Button", Skeleton: "Skeleton" }));
jest.mock("@/features/settings/SettingsUI", () => ({ SettingsHeader: "Header", useSettingsStyles: () => ({}) }));
jest.mock("@/components/ui/BottomSheet", () => ({ BottomSheet: ({ visible, children, footer }: { visible: boolean; children: React.ReactNode; footer: React.ReactNode }) => visible ? jest.requireActual("react").createElement("Sheet", {}, children, footer) : null }));
jest.mock("@/services/api", () => ({ getApiErrorMessage: (error: Error) => error.message }));
jest.mock("@/services/appAlert", () => ({ appAlert: { alert: jest.fn() } }));
jest.mock("@/services/paymentMethods.service", () => ({ ...jest.requireActual("@/services/paymentMethods.service"), paymentMethodsService: { create: jest.fn(), update: jest.fn(), remove: jest.fn() } }));

const button = (screen: ReturnType<typeof renderer.create>, title: string) => screen.root.findAllByType("Button").find((node: { props: { title: string } }) => node.props.title === title);
beforeEach(() => { jest.clearAllMocks(); mockUser = { id: "owner", role: "salon_owner", effective_permissions: {} }; });

it("rejects duplicate names and immediately displays a successfully added method", async () => {
  let screen: ReturnType<typeof renderer.create>;
  await renderer.act(async () => { screen = renderer.create(React.createElement(PaymentMethodsScreen)); });
  await renderer.act(async () => button(screen, "Add payment method").props.onPress());
  await renderer.act(async () => screen.root.findByType("TextInput").props.onChangeText(" cheque "));
  await renderer.act(async () => button(screen, "Save").props.onPress());
  expect(paymentMethodsService.create).not.toHaveBeenCalled();
  jest.mocked(paymentMethodsService.create).mockResolvedValue({ ...mockConfig.custom[0], id: "new", name: "Bank transfer" });
  await renderer.act(async () => screen.root.findByType("TextInput").props.onChangeText("Bank transfer"));
  await renderer.act(async () => button(screen, "Save").props.onPress());
  expect(screen.root.findAllByType("Text").some((node: { props: { children: unknown } }) => node.props.children === "Bank transfer")).toBe(true);
  expect(screen.root.findAllByType("Sheet")).toHaveLength(0);
  await renderer.act(async () => screen.unmount());
});

it("waits for confirmation before deleting a custom method", async () => {
  let screen: ReturnType<typeof renderer.create>;
  await renderer.act(async () => { screen = renderer.create(React.createElement(PaymentMethodsScreen)); });
  await renderer.act(async () => button(screen, "Delete").props.onPress());
  expect(paymentMethodsService.remove).not.toHaveBeenCalled();
  const choices = jest.mocked(appAlert.alert).mock.calls[0][2]!;
  await renderer.act(async () => choices.find(choice => choice.text === "Delete")!.onPress?.());
  expect(paymentMethodsService.remove).toHaveBeenCalledWith("cheque");
  expect(button(screen, "Delete")).toBeUndefined();
  await renderer.act(async () => screen.unmount());
});

it("allows view-only staff to read methods without management actions", async () => {
  mockUser = { id: "staff", role: "staff", effective_permissions: { view_settings_payment_methods: true } };
  let screen: ReturnType<typeof renderer.create>;
  await renderer.act(async () => { screen = renderer.create(React.createElement(PaymentMethodsScreen)); });
  expect(button(screen, "Add payment method")).toBeUndefined();
  expect(button(screen, "Edit")).toBeUndefined();
  expect(button(screen, "Delete")).toBeUndefined();
  await renderer.act(async () => screen.unmount());
});
