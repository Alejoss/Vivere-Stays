// Shared helpers for analytics UI

export const getOuterColor = (delta: number) => {
  if (delta > 0) return "#16a34a"; // green-600
  if (delta >= -10) return "#f59e0b"; // amber-500
  return "#dc2626"; // red-600
};

export const getDeltaClass = (delta?: number | null) => {
  const d = delta ?? 0;
  if (d > 0) return "text-green-600";
  if (d >= -10) return "text-amber-500";
  return "text-red-600";
};

// Static comparison widths: higher = 100%, lower = 85% (15% less)
export const getStaticWidths = (a: number, b: number) => {
  const aHigh = a >= b;
  return { aWidth: aHigh ? 100 : 85, bWidth: aHigh ? 85 : 100 };
};
