import { api } from "@/services/api";
import { attendanceService } from "@/services/attendance.service";

jest.mock("@/services/api", () => ({ api: { get: jest.fn(), put: jest.fn() } }));

describe("attendance settings web compatibility", () => {
  it.each([true, false])("reads and saves checked-in visibility: %s", async enabled => {
    const response = { data: { data: { require_checkin_for_visibility: enabled } } };
    (api.get as jest.Mock).mockResolvedValue(response);
    (api.put as jest.Mock).mockResolvedValue(response);

    expect((await attendanceService.getSettings()).requireCheckinForVisibility).toBe(enabled);
    const saved = await attendanceService.updateSettings({ requireCheckinForVisibility: enabled });
    expect(api.put).toHaveBeenCalledWith("/attendance/settings", { require_checkin_for_visibility: enabled });
    expect(saved.settings.requireCheckinForVisibility).toBe(enabled);
  });

  it("does not overwrite visibility when saving unrelated rules", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { data: { threshold_hours: 2 } } });
    await attendanceService.updateSettings({ thresholdHours: 2 });
    expect(api.put).toHaveBeenCalledWith("/attendance/settings", { threshold_hours: 2 });
  });

  it("requests the monthly CSV without transforming its contents", async () => {
    const csv = 'Date,Staff Name,Break Time,Actual Working Hours\n2026-11-01,Example,0:30,7:30';
    (api.get as jest.Mock).mockResolvedValue({ data: csv });
    expect(await attendanceService.exportCSV(2026, 11)).toBe(csv);
    expect(api.get).toHaveBeenCalledWith("/attendance/export", {
      params: { year: 2026, month: 11 }, responseType: "text",
    });
  });
});
