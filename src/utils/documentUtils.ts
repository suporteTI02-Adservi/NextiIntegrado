export const cleanHtml = (html: string): string => {
  if (!html) return "N/A";

  return html
    .replace(/<html.*?>/gi, "")
    .replace(/<\/html>/gi, "")
    .replace(/<body.*?>/gi, "")
    .replace(/<\/body>/gi, "")
    .replace(/<img[^>]*>/gi, "");
};
