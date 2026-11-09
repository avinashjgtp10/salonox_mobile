import React from "react";
import { TouchableOpacity } from "react-native";
import { CommissionRuleFormScreen } from "@/features/staff/screens/CommissionRuleFormScreen";
import { commissionRulesService } from "@/services/commissionRules.service";
import { CommissionSettlementSheet } from "@/features/staff/components/CommissionSettlementSheet";

// Exercise the actual form's selections and save handlers without native layout or network calls.
const renderer = jest.requireActual("react-test-renderer");
jest.mock("expo-router", () => ({
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 24 }),
}));
jest.mock("@/components/auth/pearl/PearlBackground", () => ({
  PearlBackground: "PearlBackground",
}));
jest.mock("@/components/ui/AppStatusBar", () => ({ AppStatusBar: () => null }));
jest.mock("@/components/ui/StateViews", () => ({
  ErrorState: "ErrorState",
  InlineLoader: "InlineLoader",
}));
jest.mock("@/components/ui/AppTypography", () => ({
  Text: "Text",
  TextInput: "TextInput",
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("@/components/ui/KeyboardAwareScrollView", () => ({
  KeyboardAwareScrollView: "FormScroll",
}));
jest.mock("@/components/ui/KeyboardInsetView", () => ({
  KeyboardInsetView: "KeyboardInsetView",
}));
jest.mock("@/components/ui/BottomSheet", () => ({
  BottomSheet: ({
    visible,
    children,
    footer,
  }: {
    visible: boolean;
    children: React.ReactNode;
    footer: React.ReactNode;
  }) =>
    visible
      ? jest.requireActual<typeof React>("react").createElement("BottomSheet", null, children, footer)
      : null,
}));
jest.mock("@/features/staff/components/StaffPearl", () => ({
  StaffHeader: "StaffHeader",
}));
jest.mock("@/features/staff/components/CommissionPearl", () => ({
  CommissionButton: "CommissionButton",
  CommissionChip: "CommissionChip",
  CommissionNote: "CommissionNote",
  commissionUi: {},
}));
jest.mock("@/features/staff/screens/CommissionRulesScreen", () => ({
  useStaffNames: () => ({
    loading: false,
    staff: [
      { id: "a", name: "Aditya" },
      { id: "b", name: "Nishant" },
    ],
  }),
}));
jest.mock("@/store/hooks", () => ({
  useAppSelector: () => ({ role: "owner" }),
}));
jest.mock("@/store/user/user.slice", () => ({ selectCurrentUser: jest.fn() }));
jest.mock("@/utils/permissions", () => ({
  canUseCommissionRules: () => true,
  COMMISSION_RULE_PERMISSIONS: {},
}));
jest.mock("@/hooks/useAppToast", () => ({
  useAppToast: () => ({ showSuccess: jest.fn() }),
}));
jest.mock("@/services/api", () => ({ getApiErrorMessage: () => "Failed" }));
jest.mock("@/services/appAlert", () => ({ appAlert: { alert: jest.fn() } }));
jest.mock("@/services/commissionRules.service", () => ({
  commissionRulesService: {
    list: jest.fn(),
    create: jest.fn(),
    replace: jest.fn(),
    deleteRules: jest.fn(),
  },
}));

let tree: any;
const act = renderer.act;
const input = (label: string, value: string) =>
  act(() =>
    tree.root
      .findAll(
        (node: any) =>
          node.props.accessibilityLabel === label &&
          typeof node.props.onChangeText === "function",
      )[0]
      .props.onChangeText(value),
  );
const pressLabel = (label: string) =>
  act(() =>
    tree.root
      .findAll(
        (node: any) =>
          node.props.label === label &&
          typeof node.props.onPress === "function",
      )[0]
      .props.onPress(),
  );
const selectAll = () =>
  act(() =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(
        (node: any) =>
          node.findAll((child: any) => child.props.children === "Select all")
            .length > 0,
      )
      .props.onPress(),
  );
const chooseType = (index: number) =>
  act(() =>
    tree.root
      .findAllByType(TouchableOpacity)
      .filter((node: any) => node.props.accessibilityRole === "radio")
      [index].props.onPress(),
  );
const save = async () => {
  await act(async () => {
    await pressLabel("Save rule");
  });
};

beforeEach(async () => {
  jest.mocked(commissionRulesService.list).mockResolvedValue([]);
  jest.mocked(commissionRulesService.create).mockResolvedValue("Rule saved");
  await act(async () => {
    tree = renderer.create(React.createElement(CommissionRuleFormScreen));
  });
});
afterEach(() => act(() => tree.unmount()));

it("saves percentage conditions and selected daily frequency using the existing web payload", async () => {
  input("Rule name", "Retail commission");
  selectAll();
  pressLabel("Daily");
  input("Condition (optional)", "5000");
  input("Commission", "10");
  await save();
  expect(commissionRulesService.create).toHaveBeenCalledWith({
    name: "Retail commission",
    type: "percentage",
    source: "services",
    frequency: "daily",
    scope_type: "staff",
    scope_ids: ["a", "b"],
    rate: 10,
    status: "active",
    condition_target: 5000,
    condition_metric: "revenue",
  });
});

it("retains fixed amounts per sale without adding an empty revenue condition", async () => {
  chooseType(1);
  input("Rule name", "Fixed commission");
  selectAll();
  input("Amount", "150");
  await save();
  expect(commissionRulesService.create).toHaveBeenCalledWith(
    expect.objectContaining({ type: "fixed", rate: 150 }),
  );
  expect(
    jest.mocked(commissionRulesService.create).mock.calls[0][0],
  ).not.toHaveProperty("condition_target");
});

it("saves both rates and the revenue target for target rules", async () => {
  chooseType(2);
  input("Rule name", "Target rule");
  selectAll();
  input("Monthly sales target", "100000");
  input("Commission below target", "5");
  input("Commission at/above target", "15");
  await save();
  expect(commissionRulesService.create).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "tiered_target",
      rate: 5,
      rate_after_target: 15,
      condition_target: 100000,
      condition_metric: "revenue",
    }),
  );
});

it("keeps milestone rewards cumulative and sorts the existing tiers payload", async () => {
  chooseType(3);
  input("Rule name", "Milestone rule");
  selectAll();
  input("Monthly revenue", "100000");
  input("Bonus", "2000");
  pressLabel("Add milestone");
  act(() => {
    const targets = tree.root.findAll(
      (node: any) =>
        node.props.accessibilityLabel === "Monthly revenue" &&
        typeof node.props.onChangeText === "function",
    );
    targets[targets.length - 1].props.onChangeText("50000");
    const rewards = tree.root.findAll(
      (node: any) =>
        node.props.accessibilityLabel === "Bonus" &&
        typeof node.props.onChangeText === "function",
    );
    rewards[rewards.length - 1].props.onChangeText("1000");
  });
  await save();
  expect(commissionRulesService.create).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "milestone_ladder",
      rate: 3000,
      tiers: [
        { target: 50000, reward: 1000 },
        { target: 100000, reward: 2000 },
      ],
    }),
  );
});

it("does not save when required fields are missing", async () => {
  await save();
  expect(commissionRulesService.create).not.toHaveBeenCalled();
});

it("retains draft saving without activating the rule", async () => {
  input("Rule name", "Draft rule");
  selectAll();
  input("Commission", "8");
  await act(async () => {
    tree.root
      .findAllByType(TouchableOpacity)
      .find(
        (node: any) =>
          node.findAll((child: any) => child.props.children === "Save Draft")
            .length > 0,
      )
      .props.onPress();
  });
  expect(commissionRulesService.create).toHaveBeenCalledWith(
    expect.objectContaining({ status: "draft", rate: 8 }),
  );
});

it("pays the full authoritative balance through the existing amount-only callback", () => {
  const onSettle = jest.fn();
  act(() =>
    tree.update(
      React.createElement(CommissionSettlementSheet, {
        visible: true,
        staffName: "Aditya",
        totalUnpaidCommission: 8400.5,
        onClose: jest.fn(),
        onSettle,
      }),
    ),
  );
  const full = tree.root.findAll(
    (node: any) =>
      typeof node.props.label === "string" &&
      node.props.label.startsWith("Pay full") &&
      node.props.onPress,
  )[0];
  act(() => full.props.onPress());
  pressLabel("Settle");
  expect(onSettle).toHaveBeenCalledWith(8400.5);
});

it("rejects empty, zero, and over-balance settlement amounts", () => {
  const onSettle = jest.fn();
  act(() =>
    tree.update(
      React.createElement(CommissionSettlementSheet, {
        visible: true,
        staffName: "Aditya",
        totalUnpaidCommission: 100,
        onClose: jest.fn(),
        onSettle,
      }),
    ),
  );
  pressLabel("Settle");
  input("Amount to pay", "0");
  pressLabel("Settle");
  input("Amount to pay", "101");
  pressLabel("Settle");
  expect(onSettle).not.toHaveBeenCalled();
  input("Amount to pay", "50.25");
  pressLabel("Settle");
  expect(onSettle).toHaveBeenCalledWith(50.25);
});

it("blocks another settlement and closing while payment is saving", () => {
  const onSettle = jest.fn(),
    onClose = jest.fn();
  act(() =>
    tree.update(
      React.createElement(CommissionSettlementSheet, {
        visible: true,
        staffName: "Aditya",
        totalUnpaidCommission: 100,
        isLoading: true,
        onClose,
        onSettle,
      }),
    ),
  );
  input("Amount to pay", "50");
  pressLabel("Settling…");
  pressLabel("Cancel");
  expect(onSettle).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});
