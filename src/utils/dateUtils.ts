export function formatDateToApiStart(dateStr: string): string {
  // Input: DD/MM/YYYY -> DDMMYYYY000000 (full year)
  const parts = dateStr.split('/');
  if (parts.length !== 3) throw new Error('Invalid date format. Use DD/MM/YYYY');
 
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2].padStart(4, '20'); // Assume 20YY

  return `${day}${month}${year}000000`;
}

export function formatDateToApiEnd(dateStr: string): string {
  // Input: DD/MM/YYYY -> DDMMYYYY235959 (full year)
  const parts = dateStr.split('/');
  if (parts.length !== 3) throw new Error('Invalid date format. Use DD/MM/YYYY');
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2].padStart(4, '20'); // Assume 20YY
  return `${day}${month}${year}235959`;
}

export function formatApiToDisplay(apiStr: string): string {
  // DDMMYYYY000000 -> DD/MM/YYYY
  if (apiStr.length < 12) return apiStr;
  const day = apiStr.slice(0,2);
  const month = apiStr.slice(2,4);
  const year = apiStr.slice(4,8);
  return `${day}/${month}/${year}`;
}
