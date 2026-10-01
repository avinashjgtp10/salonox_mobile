import AsyncStorage from "@react-native-async-storage/async-storage";
import { guideStorage, screenTourStorage } from "@/features/userGuide/guideStorage";
import { getGuideSteps, getGuideTabs } from "@/features/userGuide/guideSteps";
import { screenTours } from "@/features/userGuide/screenTours";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

beforeEach(() => {
  jest.mocked(AsyncStorage.getItem).mockReset().mockResolvedValue(null);
  jest.mocked(AsyncStorage.setItem).mockReset().mockResolvedValue();
});

test("a new account sees the guide", async () => {
  expect(await guideStorage.shouldShow("new-user")).toBe(true);
});

test("completed accounts do not see the guide after a new launch", async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValue("done");
  expect(await guideStorage.shouldShow("returning-user")).toBe(false);
});

test("skip or finish persists per account without suppressing another account", async () => {
  await guideStorage.dismiss("first-user");
  expect(AsyncStorage.setItem).toHaveBeenCalledWith("salonox.userGuide.v1.first-user", "done");
  expect(await guideStorage.shouldShow("first-user")).toBe(false);
  expect(await guideStorage.shouldShow("second-user")).toBe(true);
});

test("missing identity never reads or writes a shared guide flag", async () => {
  expect(await guideStorage.shouldShow("")).toBe(false);
  await guideStorage.dismiss("");
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test("storage read failures do not block entry to the app", async () => {
  jest.mocked(AsyncStorage.getItem).mockRejectedValue(new Error("storage unavailable"));
  expect(await guideStorage.shouldShow("read-failure")).toBe(false);
});

test("a failed write does not repeatedly show the guide in the same session", async () => {
  jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error("storage unavailable"));
  await expect(guideStorage.dismiss("write-failure")).resolves.toBeUndefined();
  expect(await guideStorage.shouldShow("write-failure")).toBe(false);
});

test("an in-flight read cannot undo dismissal", async () => {
  let resolveRead: (value: string | null) => void = () => {};
  jest.mocked(AsyncStorage.getItem).mockImplementationOnce(() => new Promise((resolve) => { resolveRead = resolve; }));
  const pending = guideStorage.shouldShow("race-user");
  await guideStorage.dismiss("race-user");
  resolveRead(null);
  expect(await pending).toBe(false);
});

test.each([true, false])("guide locations match the actual navigation for staff=%s", (staff) => {
  const steps = getGuideSteps(staff);
  expect(steps.length).toBeGreaterThan(3);
  steps.forEach((step) => expect(getGuideTabs(staff)).toContain(step.tab));
  expect(steps[steps.length - 1].location).toBe("Settings → User guide");
});

test("staff tour does not advertise owner-only sales and team management", () => {
  expect(getGuideSteps(true).some((step) => step.tab === "Staff")).toBe(false);
  expect(getGuideSteps(true).some((step) => step.description.includes("Quick Sale"))).toBe(false);
  expect(getGuideSteps(false).some((step) => step.description.includes("Quick Sale"))).toBe(true);
});

describe("screen tour 'Show me around' bar", () => {
  test("is offered until that screen's tour is finished or skipped", async () => {
    expect(await screenTourStorage.hasSeen("tour-user", "Clients")).toBe(false);
    await screenTourStorage.markSeen("tour-user", "Clients");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("salonox.screenTour.v1.tour-user.Clients", "done");
    expect(await screenTourStorage.hasSeen("tour-user", "Clients")).toBe(true);
    expect(screenTourStorage.hasSeenThisSession("tour-user", "Clients")).toBe(true);
  });

  test("seeing one screen's tour keeps the others and other accounts on offer", async () => {
    await screenTourStorage.markSeen("tour-user-2", "Sales");
    expect(await screenTourStorage.hasSeen("tour-user-2", "Services")).toBe(false);
    expect(await screenTourStorage.hasSeen("another-user", "Sales")).toBe(false);
  });

  test("stays hidden after relaunch once completed", async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue("done");
    expect(await screenTourStorage.hasSeen("relaunch-user", "Calendar")).toBe(true);
  });

  test("a failed write still hides the bar for the rest of the session", async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error("storage unavailable"));
    await expect(screenTourStorage.markSeen("write-fail-user", "Reports")).resolves.toBeUndefined();
    jest.mocked(AsyncStorage.getItem).mockRejectedValue(new Error("storage unavailable"));
    expect(await screenTourStorage.hasSeen("write-fail-user", "Reports")).toBe(true);
  });

  test("tour titles are unique because they identify the saved state", () => {
    const titles = Object.values(screenTours).map((tour) => tour.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
