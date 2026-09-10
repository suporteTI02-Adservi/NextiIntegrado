/** Rebuild visual rows: PDF content order can list every label before its values. */
export function extractPageText(items: readonly unknown[]): string {
  const textItems = items.filter((item): item is { str: string; transform?: number[] } =>
    typeof item === 'object' && item !== null && 'str' in item && typeof item.str === 'string');
  if (textItems.some(item => !item.transform || !Number.isFinite(item.transform[4]) || !Number.isFinite(item.transform[5]))) {
    return textItems.map(item => item.str).join(' ');
  }
  const sorted = [...textItems].sort((a, b) => b.transform![5] - a.transform![5] || a.transform![4] - b.transform![4]);
  const rows: { y: number; items: typeof textItems }[] = [];
  for (const item of sorted) {
    const y = item.transform![5];
    const row = rows[rows.length - 1];
    if (row && Math.abs(row.y - y) <= 2) row.items.push(item);
    else rows.push({ y, items: [item] });
  }
  return rows.map(row => row.items.sort((a, b) => a.transform![4] - b.transform![4]).map(item => item.str.trim()).filter(Boolean).join(' ')).join('\n');
}
