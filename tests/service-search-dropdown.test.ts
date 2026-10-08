import React from "react";
import { FlatList } from "react-native";
import { ServiceSearchDropdown } from "@/features/quickSale/components/ServiceSearchDropdown";
import { serviceService } from "@/services/service.service";

const { act, create } = require("react-test-renderer");

jest.mock("@/services/service.service", () => ({ serviceService: { getServices: jest.fn() } }));
jest.mock("@/services/api", () => ({ getApiErrorMessage: () => "Search failed" }));
jest.mock("@/theme/ThemeProvider", () => ({ useThemeColors: () => ({}) }));
jest.mock("@/components/ui/AppTypography", () => ({ Text: "Text" }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));

const search = jest.mocked(serviceService.getServices);
const service = { id: "haircut", name: "Haircut", price: 100, durationMinutes: 30 };
const response = (services: unknown[]) => ({ services, pagination: { hasMore: false, nextOffset: 20 } });

describe("Quick Sale service search dropdown", () => {
  let tree: ReturnType<typeof create>;
  const onSelect = jest.fn();
  const props = { query: "h", salonId: "salon", selectedServiceIds: new Set<string>(), onSelect, onDismiss: jest.fn() };

  beforeEach(() => {
    jest.useFakeTimers();
    search.mockReset();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });
  afterEach(async () => {
    await act(async () => tree?.unmount());
    jest.useRealTimers();
  });

  it("debounces a one-character query and selects a matching service", async () => {
    search.mockResolvedValue(response([service]) as never);
    await act(async () => { tree = create(React.createElement(ServiceSearchDropdown, props)); });
    expect(search).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ search: "h", offset: 0, isActive: true }), "salon");
    expect(tree.root.findByType(FlatList).props.data).toEqual([service]);
    const row = tree.root.findByType(FlatList).props.renderItem({ item: service });
    row.props.onPress();
    expect(onSelect).toHaveBeenCalledWith(service);
  });

  it("ignores an older response after the query changes", async () => {
    let resolveOld!: (value: never) => void;
    search.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    search.mockResolvedValueOnce(response([service]) as never);
    await act(async () => { tree = create(React.createElement(ServiceSearchDropdown, props)); });
    await act(async () => { jest.advanceTimersByTime(300); });
    await act(async () => { tree.update(React.createElement(ServiceSearchDropdown, { ...props, query: "hair" })); });
    await act(async () => { jest.advanceTimersByTime(300); });
    await act(async () => { resolveOld(response([{ ...service, id: "old" }]) as never); });
    expect(tree.root.findByType(FlatList).props.data).toEqual([service]);
  });

  it("disables services already added to the cart", async () => {
    search.mockResolvedValue(response([service]) as never);
    await act(async () => { tree = create(React.createElement(ServiceSearchDropdown, { ...props, selectedServiceIds: new Set([service.id]) })); });
    await act(async () => { jest.advanceTimersByTime(300); });
    const row = tree.root.findByType(FlatList).props.renderItem({ item: service });
    expect(row.props.disabled).toBe(true);
  });
});
