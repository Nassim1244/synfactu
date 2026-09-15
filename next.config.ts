import type { NextConfig } from "next";

/**
 * The security headers required by `policy_security.md` -> Container and
 * dependency hardening, set once here rather than per route or in Caddy
 * (`specs/init.md` -> 11).
 *
 * Here rather than in `src/middleware.ts`: middleware is a second runtime that
 * has to run on every request to add four constants, and AD-017 skipped
 * authentication, so the only middleware this project has a documented purpose
 * for - the AD-009 redirect layer - does not exist yet. A `headers()` entry
 * costs nothing at request time and survives that file arriving later.
 *
 * Here rather than in the shared Caddy instance: Caddy belongs to the operator
 * and serves other applications. Headers set there are not in this repository,
 * are not reviewed with it, and are lost the day the app is put behind anything
 * else. The application states its own requirements.
 */
const securityHeaders = [
  {
    // Ignored by browsers when received over plain HTTP (RFC 6797 section
    // 8.1), so this is inert on an instance Caddy serves without TLS and takes
    // effect on one it serves with it - no environment switch needed.
    //
    // One year, refreshed on every visit. Shorter values buy little: the
    // window this closes is the *return* visit, and a max-age measured in
    // hours reopens it between working days.
    //
    // No `includeSubDomains`. Caddy is shared with the operator's other
    // services and this application does not know the hostname it is served
    // on. Deployed at an apex, `includeSubDomains` would force HTTPS on every
    // sibling service under that domain - including ones that have no
    // certificate - from a header this application had no business sending.
    //
    // No `preload`. Preloading requires `includeSubDomains`, is baked into
    // browser binaries, and takes months to undo. `context/vision.md` ->
    // Deployment context says this instance must not be exposed on a public
    // URL; submitting its hostname to a public list is the opposite of that.
    key: "Strict-Transport-Security",
    value: "max-age=31536000",
  },
  {
    // Stops content-type sniffing, so a stored value echoed back with the
    // wrong `Content-Type` cannot be re-interpreted as script. Matters most on
    // the static assets this also covers.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // `same-origin`, not the browser default `strict-origin-when-cross-origin`.
    // That default still sends the origin to any third party the user
    // navigates to, and the origin here is the private hostname of an instance
    // that must not be public. `same-origin` sends a referrer only to this
    // application and nothing at all off-host, which is what CLAUDE.md ->
    // Project means by no data leaving the host. Same-origin navigation is
    // unaffected, so nothing internal loses a referrer.
    key: "Referrer-Policy",
    value: "same-origin",
  },
  {
    // Refuses framing everywhere. The application has no embedding use case,
    // and clickjacking is the one attack the network boundary does not stop -
    // it needs only the operator's own browser and a page they visit.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // The modern equivalent, which supersedes `X-Frame-Options`; both are sent
    // because neither covers every browser alone.
    //
    // Deliberately a CSP carrying `frame-ancestors` and nothing else. Step 11
    // asks for a frame policy, not a content policy, and `frame-ancestors` is
    // the one directive that governs embedding only - it cannot block a script
    // or a style. A `default-src` added here would break Next's inline runtime
    // silently, at runtime, on a page nobody thought to reopen. A real CSP is
    // its own decision, with its own nonce plumbing and its own AD-XXX.
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'",
  },
];

const nextConfig: NextConfig = {
  // Emits `.next/standalone`, a self-contained server the runtime image can
  // run without dev dependencies. `docker/Dockerfile` copies it in the runtime
  // stage and its last COPY fails without this (`specs/init.md` -> 10).
  output: "standalone",

  /**
   * Applies the security headers above to every response the application
   * serves.
   *
   * `/:path*` and no exceptions, on purpose. `/api/health` is included: it is
   * reachable over the same hostname, so it must not be the one response that
   * omits HSTS, and `nosniff` is worth having on a JSON body regardless. An
   * exclusion list is a second thing to maintain and the first place a new
   * route quietly falls out of coverage.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
