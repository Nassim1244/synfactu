// The `/hello-world` route.
//
// A Server Component by default and not by annotation: no `"use client"`, not
// `async`, and it awaits nothing. It reads no database and calls no Server
// Action, which is acceptance criterion 8 of `specs/001-hello-world.md`, and it
// passes no props, so nothing crosses the server/client boundary at all.
//
// It holds the centred single-column wrapper of `design/001/README.md` ->
// Layout and renders `<ColourCycler />` inside it, and nothing else. The root
// layout sets `h-full` on `<html>` and `flex min-h-full flex-col` on `<body>`,
// so this wrapper is a flex child and claims the remaining height with
// `flex-1` rather than assuming a block context.
//
// No `layout.tsx`, `loading.tsx` or `error.tsx` sits beside it: the root layout
// already wraps the route, nothing is awaited and nothing on this page can fail
// at runtime (`specs/001-hello-world.md` -> Out of scope (technical)).

import type { JSX } from "react";

import { ColourCycler } from "@/features/hello-world/components/ColourCycler";

/**
 * Renders the bootstrap smoke-test page.
 *
 * Default-exported because Next requires it of a route file; it is the one
 * exception `policy_coding_guidelines.md` -> Style allows.
 *
 * @returns the centred column holding the colour cycler.
 */
export default function HelloWorldPage(): JSX.Element {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <ColourCycler />
    </main>
  );
}
