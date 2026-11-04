// Transport-security switches shared by the cookie and header code.
//
// Production defaults assume HTTPS (usually a reverse proxy in front of the
// frontend): auth cookies carry the Secure flag and responses send HSTS.
// Browsers drop Secure cookies on plain-HTTP pages, so a LAN-only install at
// http://<ip>:8084 gets stuck in a login loop (#622). ALLOW_PLAIN_HTTP=true is
// the explicit opt-out for that setup.

export function allowPlainHttp() {
  return process.env.ALLOW_PLAIN_HTTP === 'true';
}

export function useSecureCookies() {
  return process.env.NODE_ENV === 'production' && !allowPlainHttp();
}
