// The bootstrap smoke-test journey (`specs/001-hello-world.md`).
//
// One journey, and only one. `policy_testing.md` -> End-to-end scope keeps
// Playwright for what no other level can reach; here that is the part of the
// feature a mounted component cannot show:
//
//   - the route is actually served and the Server/Client boundary works:
//     `src/app/hello-world/page.tsx` is a Server Component that renders the
//     Client Component, which only hydration proves (criteria 1 and 2);
//   - reloading returns the heading to the first colour, because nothing was
//     persisted (criterion 5) - a component test has no reload;
//   - pressing the button reaches no server, so no Server Action is involved
//     (criterion 8).
//
// The colour sequence itself (criteria 3, 4, 6) is driven here through the
// same label contract as the component test, because those labels are how the
// reload assertion identifies "the first colour" at all.
//
// Two things are asserted here that no other level can reach:
//
//   - the COMPUTED colour of the heading. The component test cannot: jsdom
//     loads no stylesheet, and the class name is an implementation detail
//     `policy_testing.md` -> Forbidden rules out. A real browser resolves the
//     Tailwind class to a real colour, which is what criteria 2, 3 and 4
//     actually describe, so asserting it here is legal and closes the gap the
//     label contract alone leaves open.
//   - the security headers of `next.config.ts` (`specs/init.md` -> 11). The
//     defect class that makes them worth a test - a `source` matcher that
//     silently matches nothing - is invisible to a test that re-imports the
//     config and restates the array. Only a real response proves it.
//
// The journey visits `/hello-world` and nothing else. This feature reads and
// writes nothing, so there is no seeding step and no database route is
// requested.

import { expect, test, type Page } from "@playwright/test";

/** A colour as the browser painted it, 0-255 per channel. */
type Rgb = { readonly r: number; readonly g: number; readonly b: number };

/**
 * How far apart two channels may be before a colour stops counting as neutral.
 * The theme's `--foreground` token is a near-black with a chroma of 0.004, so
 * its channels sit within a few points of each other in either theme.
 */
const NEUTRAL_TOLERANCE = 16;

/**
 * How far a channel must lead the others before a colour counts as blue or as
 * amber. Deliberately generous: the assertion is about which hue is on screen,
 * not about the exact palette step the design chose.
 */
const CHANNEL_MARGIN = 40;

/**
 * The heading's rendered colour.
 *
 * Read through a canvas rather than compared as a string, because Chromium
 * serialises a colour authored in `oklch` as `lab(...)`, and the exact
 * serialisation is a browser detail that can change without the page changing.
 * Painting one pixel and reading it back gives the colour the user actually
 * sees, in a form that stays comparable.
 */
async function headingColour(page: Page): Promise<Rgb> {
  return page.locator("h1").evaluate((element) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("no 2d canvas context");
    }
    context.fillStyle = getComputedStyle(element).color;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
  });
}

/** The gap between a colour's strongest and weakest channel. */
function channelSpread({ r, g, b }: Rgb): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

test("serves its security headers, cycles the heading colour through the sequence and forgets it on reload", async ({
  page,
}) => {
  // Any POST to the page's own URL would be a Server Action round trip:
  // that is the address Next.js posts an action to. The page must make none.
  const serverActionPosts: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/hello-world"
    ) {
      serverActionPosts.push(request.url());
    }
  });

  const response = await page.goto("/hello-world");

  // The five security headers of `next.config.ts`, on the response the
  // browser actually received. A `source` matcher covering nothing would send
  // a 200 with none of them, which is exactly what this catches. Verified to
  // be identical on the standalone production server, so the dev server the
  // journey runs against is not a softer target here.
  expect(response).not.toBeNull();
  const headers = response?.headers() ?? {};
  expect(headers["strict-transport-security"]).toBe("max-age=31536000");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("same-origin");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["content-security-policy"]).toBe("frame-ancestors 'none'");

  // The route renders, and "Hello world" is its only level-1 heading.
  await expect(
    page.getByRole("heading", { level: 1, name: "Hello world" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

  // First render: the heading wears the first colour, so the button offers
  // the second one.
  //
  // Scoped to the page's `main`, because the Next.js dev overlay injects its
  // own "Open Next.js Dev Tools" button into the body once the page hydrates,
  // and an unscoped `getByRole("button")` then matches two elements. The
  // scope is a landmark role, not a test id.
  const colourButton = page.getByRole("main").getByRole("button");
  await expect(colourButton).toHaveAccessibleName("Switch to blue");

  // The first colour is the theme's foreground token, which is near-neutral.
  // Asserted as a property of the colour rather than as a literal, because
  // that token comes from `src/app/globals.css`, which the shadcn CLI
  // regenerates - a hardcoded value there would break on a palette change
  // that broke nothing.
  const defaultColour = await headingColour(page);
  expect(channelSpread(defaultColour)).toBeLessThanOrEqual(NEUTRAL_TOLERANCE);

  // One press advances the sequence by one position. The label changes, and so
  // does the colour on screen: blue leads the other two channels.
  await colourButton.click();
  await expect(colourButton).toHaveAccessibleName("Switch to amber");

  const blueColour = await headingColour(page);
  expect(blueColour.b).toBeGreaterThan(blueColour.r + CHANNEL_MARGIN);
  expect(blueColour.b).toBeGreaterThan(blueColour.g + CHANNEL_MARGIN);

  await colourButton.click();
  await expect(colourButton).toHaveAccessibleName("Switch to default");

  // Amber is the warm one: both warm channels lead blue.
  const amberColour = await headingColour(page);
  expect(amberColour.r).toBeGreaterThan(amberColour.b + CHANNEL_MARGIN);
  expect(amberColour.g).toBeGreaterThan(amberColour.b + CHANNEL_MARGIN);

  // Pressing from the last colour returns to the first - the rendered colour,
  // not only the label.
  await colourButton.click();
  await expect(colourButton).toHaveAccessibleName("Switch to blue");
  expect(await headingColour(page)).toEqual(defaultColour);

  // Nothing was persisted, so a reload starts the sequence over. Advance off
  // the first colour first, or the assertion after the reload would hold even
  // if the colour had been remembered.
  await colourButton.click();
  await expect(colourButton).toHaveAccessibleName("Switch to amber");

  await page.reload();

  await expect(
    page.getByRole("heading", { level: 1, name: "Hello world" }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByRole("button")).toHaveAccessibleName(
    "Switch to blue",
  );
  expect(await headingColour(page)).toEqual(defaultColour);

  // The whole journey ran without a Server Action.
  expect(serverActionPosts).toEqual([]);
});
