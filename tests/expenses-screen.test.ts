import React from "react";
import { ExpensesScreen } from "@/features/expenses/ExpensesScreen";
import { expensesService } from "@/services/expenses.service";

const renderer = jest.requireActual("react-test-renderer");
jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { role: "salon_owner" } }) }));
jest.mock("@/components/auth/pearl/usePearlPalette", () => ({ usePearlPalette: () => jest.requireActual("@/components/auth/pearl/tokens").pearl }));
jest.mock("@/components/ui/AppTypography", () => ({ Text: "Text", TextInput: "TextInput" }));
jest.mock("@/components/pearl/Icon", () => ({ Icon: "Icon" }));
jest.mock("@/components/pearl/Page", () => ({
  Page: ({ header, children }: { header: React.ReactNode; children: React.ReactNode }) => jest.requireActual("react").createElement("Page", {}, header, children),
  PageHeader: ({ right }: { right: React.ReactNode }) => jest.requireActual("react").createElement("PageHeader", {}, right),
}));
jest.mock("@/components/pearl/ui", () => ({
  EmptyState: "EmptyState", SmallButton: "SmallButton", Skeleton: "Skeleton", StatusPill: "StatusPill",
}));
jest.mock("@/components/ui/BottomSheet", () => ({
  BottomSheet: ({ visible, children, footer }: { visible: boolean; children: React.ReactNode; footer: React.ReactNode }) => visible ? jest.requireActual("react").createElement("BottomSheet", {}, children, footer) : null,
}));
jest.mock("@/components/ui/DateRangePickerSheet", () => ({ DateRangePickerSheet: () => null }));
jest.mock("@/services/appAlert", () => ({ appAlert: { alert: jest.fn() } }));
jest.mock("@/services/api", () => ({ ApiError: class extends Error {}, getApiErrorMessage: (error: Error) => error.message }));
jest.mock("@/services/expenses.service", () => ({ expensesService: {
  list: jest.fn(), openCounterId: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(),
} }));
jest.mock("@/utils/currency", () => ({ formatCurrency: (value: number) => `INR ${value.toFixed(2)}` }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(expensesService.list).mockResolvedValue([]);
  jest.mocked(expensesService.openCounterId).mockResolvedValue("open-counter");
});

const button = (screen: ReturnType<typeof renderer.create>, title: string) => screen.root.findAllByType("SmallButton").find((node: { props: { title: string } }) => node.props.title === title);
const input = (screen: ReturnType<typeof renderer.create>, label: string) => screen.root.findAllByType("TextInput").find((node: { props: { accessibilityLabel: string } }) => node.props.accessibilityLabel === label);

it("validates and saves an expense against the existing counter", async () => {
  let screen: ReturnType<typeof renderer.create>;
  await renderer.act(async () => { screen = renderer.create(React.createElement(ExpensesScreen, { openNew: true })); });
  await renderer.act(async () => { await button(screen, "Save expense").props.onPress(); });
  expect(expensesService.create).not.toHaveBeenCalled();
  await renderer.act(async () => { input(screen, "Expense category").props.onChangeText("Supplies"); input(screen, "Expense amount").props.onChangeText("250.50"); });
  await renderer.act(async () => { await button(screen, "Save expense").props.onPress(); });
  expect(expensesService.create).toHaveBeenCalledWith("open-counter", expect.objectContaining({ expense_type: "Supplies", amount: 250.5 }));
  expect(screen.root.findAllByType("BottomSheet")).toHaveLength(0);
  await renderer.act(async () => screen.unmount());
});

it("blocks saving without an open counter", async () => {
  jest.mocked(expensesService.openCounterId).mockResolvedValue(null);
  let screen: ReturnType<typeof renderer.create>;
  await renderer.act(async () => { screen = renderer.create(React.createElement(ExpensesScreen, { openNew: true })); });
  expect(button(screen, "Save expense").props.disabled).toBe(true);
  expect(expensesService.create).not.toHaveBeenCalled();
  expect(screen.root.findAllByType("SmallButton").some((node: { props: { title: string } }) => node.props.title === "Open counter")).toBe(false);
  await renderer.act(async () => screen.unmount());
});

it("shows closed-counter expenses without edit or delete actions", async () => {
  jest.mocked(expensesService.list).mockResolvedValue([{ id: "expense", counterId: "closed-counter", type: "Rent", description: "Monthly rent", amount: 5000, date: new Date().toISOString(), counterStatus: "closed" }]);
  let screen: ReturnType<typeof renderer.create>;
  await renderer.act(async () => { screen = renderer.create(React.createElement(ExpensesScreen)); });
  expect(button(screen, "Edit")).toBeUndefined();
  expect(button(screen, "Delete")).toBeUndefined();
  expect(screen.root.findByType("StatusPill").props.label).toBe("Closed counter");
  await renderer.act(async () => screen.unmount());
});
