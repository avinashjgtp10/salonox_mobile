import { clipTourRect } from "@/features/userGuide/dashboardTourSteps";

test("spotlight adds a small gap around an on-screen control", () => {
  expect(clipTourRect({ x: 20, y: 100, width: 44, height: 44 }, 360, 800))
    .toEqual({ x: 15, y: 95, width: 54, height: 54 });
});

test("spotlight never creates negative shade dimensions at screen edges", () => {
  expect(clipTourRect({ x: -10, y: -10, width: 400, height: 840 }, 360, 800))
    .toEqual({ x: 0, y: 0, width: 360, height: 800 });
});

test("off-screen features are not highlighted at an unrelated position", () => {
  expect(clipTourRect({ x: 20, y: 900, width: 44, height: 44 }, 360, 800)).toBeNull();
  expect(clipTourRect({ x: -100, y: 20, width: 44, height: 44 }, 360, 800)).toBeNull();
});
