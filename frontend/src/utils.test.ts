import { tableColumns } from "./constants";
import { fitColumnWidthsToContainer } from "./utils";

const widths = {
  index: 44,
  status: 150,
  title: 260,
  priority: 160,
};

function getTotalWidth(values: Record<string, number>) {
  return tableColumns.reduce(
    (total, column) => total + values[column.field],
    0,
  );
}

describe("fitColumnWidthsToContainer", () => {
  it("expands the task column to fill a wider container", () => {
    const result = fitColumnWidthsToContainer(widths, 1000);

    expect(getTotalWidth(result)).toBe(1000);
    expect(result.title).toBeGreaterThan(widths.title);
    expect(result.status).toBe(widths.status);
  });

  it("shrinks columns to match a narrower container", () => {
    const result = fitColumnWidthsToContainer(widths, 590);

    expect(getTotalWidth(result)).toBe(590);
    expect(result.title).toBe(240);
    expect(result.priority).toBe(156);
  });

  it("keeps column minimums when the viewport is too narrow", () => {
    const result = fitColumnWidthsToContainer(widths, 320);

    expect(getTotalWidth(result)).toBe(578);
    for (const column of tableColumns) {
      expect(result[column.field]).toBeGreaterThanOrEqual(column.minWidth);
    }
  });
});