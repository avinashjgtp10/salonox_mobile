import React from "react";
import { ConnectedBranchesSheet } from "@/features/settings/ConnectedBranchesSheet";
import { connectedBranchesService } from "@/services/connectedBranches.service";
import { isBranchManagementRestricted } from "@/utils/branchManagement";

const renderer = jest.requireActual("react-test-renderer");
const mockSwitchSalon = jest.fn().mockResolvedValue(undefined);
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { salonId: "branch" }, switchSalon: mockSwitchSalon }) }));
jest.mock("@/components/ui/AppTypography", () => ({ Text: "Text", TextInput: "TextInput" }));
jest.mock("@/components/ui/PasswordField", () => ({ PasswordField: "PasswordField" }));
jest.mock("@/components/ui/BottomSheet", () => ({ BottomSheet: ({ children }: { children: React.ReactNode }) => jest.requireActual("react").createElement("Sheet", {}, children) }));
jest.mock("@/features/settings/SettingsUI", () => ({ useSettingsStyles: () => ({}), SettingsButton: "Button", SettingsRow: "Row" }));
jest.mock("@/hooks/useAppToast", () => ({ useAppToast: () => ({}) }));
jest.mock("@/store/hooks", () => ({ useAppDispatch: () => jest.fn() }));
jest.mock("@/middleware/branch/branch.thunk", () => ({ fetchBranchesThunk: jest.fn() }));
jest.mock("@/services/api", () => ({ getApiErrorMessage: (error: Error) => error.message }));
jest.mock("@/services/connectedBranches.service", () => ({ connectedBranchesService: { main: jest.fn(), list: jest.fn(), mainSalonName: jest.fn() } }));

const restricted = () => Object.assign(new Error("A branch account can't manage branches."), { status: 403 });
beforeEach(() => { jest.clearAllMocks(); jest.mocked(connectedBranchesService.mainSalonName).mockResolvedValue("Main salon"); });

it("distinguishes a branch-account restriction from retryable errors", () => {
  expect(isBranchManagementRestricted(restricted())).toBe(true);
  expect(isBranchManagementRestricted(new Error("Network timeout"))).toBe(false);
  expect(isBranchManagementRestricted(Object.assign(new Error("Forbidden"), { status: 403 }))).toBe(false);
});

it("replaces the futile retry with a main-account action when the original session is available", async () => {
  jest.mocked(connectedBranchesService.main).mockResolvedValue({ user: { salonId: "main" } } as Awaited<ReturnType<typeof connectedBranchesService.main>>);
  jest.mocked(connectedBranchesService.list).mockRejectedValue(restricted());
  let screen: ReturnType<typeof renderer.create>;
  await renderer.act(async () => { screen = renderer.create(React.createElement(ConnectedBranchesSheet, { onClose: jest.fn(), onOpenPortal: jest.fn() })); });
  const labels = screen.root.findAllByType("Button").map((node: { props: { label: string } }) => node.props.label);
  expect(labels).toContain("Back to main account"); expect(labels).not.toContain("Retry");
  expect(labels).not.toContain("Connect branch");
  await renderer.act(async () => screen.unmount());
});

it("keeps usable branch management even when the optional business-name lookup fails", async () => {
  jest.mocked(connectedBranchesService.main).mockResolvedValue({ user: { salonId: "main" } } as Awaited<ReturnType<typeof connectedBranchesService.main>>);
  jest.mocked(connectedBranchesService.list).mockResolvedValue({ login: null, branches: [] });
  jest.mocked(connectedBranchesService.mainSalonName).mockRejectedValue(new Error("Unable to fetch name"));
  let screen: ReturnType<typeof renderer.create>;
  await renderer.act(async () => { screen = renderer.create(React.createElement(ConnectedBranchesSheet, { onClose: jest.fn(), onOpenPortal: jest.fn() })); });
  expect(screen.root.findAllByType("Button").some((node: { props: { label: string } }) => node.props.label === "Connect branch")).toBe(true);
  await renderer.act(async () => screen.unmount());
});
