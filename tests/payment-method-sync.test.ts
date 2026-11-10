import React from "react";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { paymentMethodsService, notifyPaymentMethodsChanged, type PaymentMethodConfiguration } from "@/services/paymentMethods.service";

const renderer = jest.requireActual("react-test-renderer");
let mockUser = { id: "owner", salonId: "salon-a" };
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("@/localization/preferences", () => ({ useRegionalPreferences: () => ({ currency: "INR" }) }));
jest.mock("expo-router", () => ({ useFocusEffect: (callback: () => void) => jest.requireActual("react").useEffect(callback, [callback]) }));
jest.mock("@/services/api", () => ({ getApiErrorMessage: (error: Error) => error.message }));
jest.mock("@/services/networkStatus", () => ({ isNetworkOnline: () => true, subscribeNetworkSnapshot: () => () => {} }));
jest.mock("@/services/paymentMethods.service", () => ({ ...jest.requireActual("@/services/paymentMethods.service"), paymentMethodsService: { configuration: jest.fn() } }));

const config = (name: string): PaymentMethodConfiguration => ({ builtIns: [{ key: "cash", name: "Cash", is_active: true }], custom: [{ id: name, name, salon_id: mockUser.salonId, is_active: true, created_at: "", updated_at: "" }] });
let latest: ReturnType<typeof usePaymentMethods>;
function Probe() { latest = usePaymentMethods(); return null; }
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); mockUser = { id: "owner", salonId: "salon-a" }; });
afterEach(() => jest.useRealTimers());

it("automatically picks up remote changes and same-salon local invalidations", async () => {
  const read = jest.mocked(paymentMethodsService.configuration);
  read.mockResolvedValueOnce(config("First")).mockResolvedValueOnce(config("Renamed")).mockResolvedValueOnce(config("Added"));
  let screen: ReturnType<typeof renderer.create>;
  await renderer.act(async () => { screen = renderer.create(React.createElement(Probe)); });
  expect(latest.options.map(method => method.label)).toContain("First");
  await renderer.act(async () => { jest.advanceTimersByTime(15000); });
  expect(latest.options.map(method => method.label)).toContain("Renamed");
  await renderer.act(async () => notifyPaymentMethodsChanged("owner:salon-a"));
  expect(latest.options.map(method => method.label)).toContain("Added");
  await renderer.act(async () => screen.unmount());
});

it("never shows a previous salon's methods or lets a late response overwrite the new salon", async () => {
  const read = jest.mocked(paymentMethodsService.configuration);
  let resolveOld: (value: PaymentMethodConfiguration) => void = () => {};
  read.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
  let screen: ReturnType<typeof renderer.create>;
  await renderer.act(async () => { screen = renderer.create(React.createElement(Probe)); });
  mockUser = { id: "owner", salonId: "salon-b" };
  read.mockResolvedValueOnce(config("Salon B"));
  await renderer.act(async () => screen.update(React.createElement(Probe)));
  await renderer.act(async () => resolveOld(config("Old salon")));
  expect(latest.options.map(method => method.label)).toEqual(["Cash", "Salon B"]);
  await renderer.act(async () => screen.unmount());
});

it("retains the last list on a slow/failed refresh and exposes an error for checkout to block submission", async () => {
  const read = jest.mocked(paymentMethodsService.configuration);
  read.mockResolvedValueOnce(config("Cheque")).mockRejectedValueOnce(new Error("Network unavailable"));
  let screen: ReturnType<typeof renderer.create>;
  await renderer.act(async () => { screen = renderer.create(React.createElement(Probe)); });
  await renderer.act(async () => { jest.advanceTimersByTime(15000); });
  expect(latest.options.map(method => method.label)).toContain("Cheque");
  expect(latest.error).toBe("Network unavailable");
  await renderer.act(async () => screen.unmount());
});
