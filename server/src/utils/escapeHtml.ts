// Puppeteer renders these templates with JavaScript enabled, so unescaped
// user/vendor-controlled strings interpolated into the HTML are a real
// injection vector (e.g. an <img onerror=...> in a PO line-item description
// executing inside the headless browser). Escape everything interpolated
// into generatePO/exportMonthlyPdf's templates.
export const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return char;
    }
  });
