// The `cn` class-name helper, re-exported.
//
// Written by `shadcn init`. It exists because `components.json` points the
// `utils` alias at `@/lib/utils`, and that is the path the registry's
// components import when a primitive is added. The implementation lives in the
// `cn` package (shadcn's compiled replacement for clsx + tailwind-merge), so
// this file is a re-export and not a second implementation.
//
// Keep it even while `src/components/ui/button.tsx` imports `cn` directly: the
// next primitive copied in may not, and the alias has to resolve.

export { cn } from "cn";
