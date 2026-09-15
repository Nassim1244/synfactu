// Health check.
//
// The second of the four Route Handlers AD-003 permits, named there and in
// `policy_architecture.md` -> Server boundary. It exists because Docker needs
// an addressable endpoint: `docker/docker-compose.yml` polls it as the app
// service's HEALTHCHECK, and `docker/restart.sh` and `docker/update.sh` wait
// on the status it produces.
//
// It takes no input, so there is nothing for AD-005 to parse. It reads no
// business data, requires no session, and reports nothing about the contents
// of the database - only whether it answers.

import { isDatabaseReachable } from "@/lib/db";

// The version is read from `package.json` at build time and baked into the
// bundle. `package.json` is the single source of truth for it
// (`policy_commits.md` -> Versioning, `specs/init.md` -> 9), so it is imported
// rather than declared a second time here, in `next.config.ts` or in an
// environment variable: a value that exists twice is a value that drifts, and
// the release procedure bumps exactly one of the two.
//
// A plain import is what makes this build-time. `resolveJsonModule` is on in
// `tsconfig.json`, and the bundler inlines the imported value into the server
// bundle, so the runtime image reads no file and the standalone output carries
// no dependency on `package.json` being copied beside it.
import { version } from "../../../../package.json";

/**
 * Never prerendered. This handler uses no request data, which would otherwise
 * make Next evaluate it once at build time and serve a frozen answer - the
 * database would be probed on the build machine and reported "up" forever.
 */
export const dynamic = "force-dynamic";

/** The body returned in both directions. Same shape either way, so an operator reading it does not have to learn two. */
type HealthBody = {
  readonly status: "ok" | "error";
  readonly version: string;
  readonly database: "up" | "down";
};

/**
 * Reports application liveness.
 *
 * @returns 200 with `{ status: "ok", version, database: "up" }` when the
 * database answers, and 503 with `{ status: "error", version,
 * database: "down" }` when it does not.
 *
 * 503 rather than 200-with-a-flag is the whole point of the endpoint. The
 * compose HEALTHCHECK tests `response.ok`, so a 200 would mark a container
 * with an unreachable database healthy: `update.sh` would report a successful
 * update over a broken instance and stop watching, and an orchestrator would
 * keep routing traffic to it. 503 is also the honest code - the service exists
 * but cannot serve, and it is the one a reverse proxy already understands as
 * "retry elsewhere or later".
 *
 * The version is reported in both directions on purpose: the first question
 * asked about a failed deployment is which version is running, and that is
 * exactly when the endpoint would otherwise refuse to say.
 *
 * No detail about the failure reaches the response - no path, no driver
 * message, no stack. The cause is logged by `isDatabaseReachable`, server-side
 * and once (`policy_security.md` -> Error handling, AD-014).
 */
export async function GET(): Promise<Response> {
  const isReachable = await isDatabaseReachable();

  const body: HealthBody = isReachable
    ? { status: "ok", version, database: "up" }
    : { status: "error", version, database: "down" };

  return Response.json(body, {
    status: isReachable ? 200 : 503,
    // A cached health answer is a lie with a delay on it. Nothing between the
    // probe and this handler may keep one.
    headers: { "Cache-Control": "no-store" },
  });
}
