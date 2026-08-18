import { NextResponse, type NextRequest } from "next/server";

/**
 * The kitchen board lists customer names and phone numbers, so it needs a gate.
 *
 * HTTP Basic rather than an auth library: there is no User model, no session
 * and no signup, and inventing all three to put a password on one staff page
 * would be a large amount of machinery for one bakery. The browser already
 * knows how to prompt for this, so it costs no login page and no dependency.
 *
 * The obvious ceiling: one shared credential, no per-person identity and no
 * audit trail of who advanced which docket. When staff need to be told apart,
 * this is the seam to replace — everything else stays as it is.
 */

const REALM = 'Basic realm="Makemycake kitchen", charset="UTF-8"';

/**
 * The edge runtime has no `crypto.timingSafeEqual`, so compare every character
 * regardless of where the first difference falls. Length still leaks, which is
 * a fair trade for four lines; the secret is a password, not a key.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default function proxy(req: NextRequest) {
  const user = process.env.KITCHEN_USER;
  const password = process.env.KITCHEN_PASSWORD;

  /*
   * Fail closed. An unconfigured gate must never degrade into an open door onto
   * a page of customer phone numbers — which is exactly what "if no password is
   * set, skip the check" would do on the first deployment where someone forgot
   * to set the variable.
   */
  if (!user || !password) {
    return new NextResponse(
      "The kitchen board is not configured on this deployment.\n" +
      "Set KITCHEN_USER and KITCHEN_PASSWORD.\n",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const header = req.headers.get("authorization") ?? "";

  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {
      decoded = "";
    }
    // Split on the FIRST colon only: a colon is legal inside a password.
    const split = decoded.indexOf(":");
    if (split !== -1) {
      const okUser = safeEqual(decoded.slice(0, split), user);
      const okPass = safeEqual(decoded.slice(split + 1), password);
      // Both are evaluated before the branch, so a wrong username and a wrong
      // password cost the same.
      if (okUser && okPass) return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.\n", {
    status: 401,
    headers: {
      "WWW-Authenticate": REALM,
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

/**
 * `:path*` matches zero or more segments, so this covers /kitchen itself as
 * well as everything under it — including the POST a server action makes back
 * to the page it lives on.
 */
export const config = {
  matcher: ["/kitchen/:path*"],
};
