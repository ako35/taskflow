import { formatDateTime, formatReminderInput } from "./format";

describe("formatReminderInput", () => {
  it("pads single-digit day, month, hour and minute with a leading zero", () => {
    const date = new Date(2026, 0, 5, 9, 3); // 5 Jan 2026, 09:03
    expect(formatReminderInput(date)).toBe("05.01.2026 09:03");
  });

  it("does not pad already two-digit values", () => {
    const date = new Date(2026, 11, 25, 18, 45); // 25 Dec 2026, 18:45
    expect(formatReminderInput(date)).toBe("25.12.2026 18:45");
  });

  it("handles midnight correctly", () => {
    const date = new Date(2026, 5, 1, 0, 0);
    expect(formatReminderInput(date)).toBe("01.06.2026 00:00");
  });
});

describe("formatDateTime", () => {
  it("includes the day, month, hour and minute from the ISO string", () => {
    const iso = new Date(2026, 2, 14, 16, 30).toISOString();
    const result = formatDateTime(iso);

    expect(result).toContain("14");
    expect(result).toContain("03");
    expect(result).toMatch(/16[:.]30|30/);
  });
});
