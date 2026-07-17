// Uploaded PDFs (invoices/contracts/vendor documents) are now served by an
// authenticated route, not a public static file server. Plain <a href>/
// <iframe src> can't attach an Authorization header, so the server also
// accepts the session token as a ?token= query param - append it here
// wherever one of these URLs is rendered for direct viewing/download.
export const withAuthToken = (url: string): string => {
  const token = localStorage.getItem('token');
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
};
