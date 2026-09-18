// The ephemeral, in-memory visited-history trail behind the breadcrumb and
// the back/forward controls (AD-024, `ai-rules/decisions.md`). No URL
// encoding, no `localStorage`/`sessionStorage`, no new dependency: plain
// React Context backed by `useReducer`, mounted once near the root layout
// (`src/app/layout.tsx`) so it resets on every full page load - the
// functional spec's "not remembered across a reload or between sessions".
//
// "use client": Context, `useReducer` and event handlers are unavailable to
// a Server Component (`ai-rules/policy_coding_guidelines.md` -> React and
// Next idioms).

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type JSX,
  type ReactNode,
} from "react";

/** One entry of the visited-history trail: a route and the label it showed when visited. */
export type HistoryEntry = {
  readonly href: string;
  readonly label: string;
};

type HistoryState = {
  readonly trail: readonly HistoryEntry[];
  readonly index: number;
};

/**
 * The trail's bounded length - oldest entry dropped first past this cap
 * (`design/v01-002/prototype/README.md`: "capped at 10 screens").
 */
const MAX_TRAIL_LENGTH = 10;

type HistoryAction =
  | { type: "VISIT"; href: string; label: string }
  | { type: "GO_BACK" }
  | { type: "GO_FORWARD" }
  | { type: "GO_TO_INDEX"; index: number };

const INITIAL_STATE: HistoryState = { trail: [], index: -1 };

function reducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "VISIT": {
      const current = state.index >= 0 ? state.trail[state.index] : undefined;

      // A consecutive repeat of the same `href` does not add a duplicate
      // crumb (functional spec: "Navigating to the screen already at the
      // top of the trail does not add a duplicate crumb"). Its label is
      // still refreshed in place, so a screen revisited after its own data
      // changed (e.g. a rename) shows the current name.
      if (current !== undefined && current.href === action.href) {
        if (current.label === action.label) {
          return state;
        }
        const trail = state.trail.slice();
        trail[state.index] = { href: action.href, label: action.label };
        return { trail, index: state.index };
      }

      // Visiting a new screen while not at the end of the trail truncates
      // everything after the current index first, mirroring a browser
      // history stack (functional spec's unhappy path).
      const truncated = state.trail.slice(0, state.index + 1);
      let trail = truncated.concat([
        { href: action.href, label: action.label },
      ]);
      let index = trail.length - 1;
      if (trail.length > MAX_TRAIL_LENGTH) {
        const overflow = trail.length - MAX_TRAIL_LENGTH;
        trail = trail.slice(overflow);
        index = trail.length - 1;
      }
      return { trail, index };
    }
    case "GO_BACK":
      return state.index > 0 ? { ...state, index: state.index - 1 } : state;
    case "GO_FORWARD":
      return state.index < state.trail.length - 1
        ? { ...state, index: state.index + 1 }
        : state;
    case "GO_TO_INDEX":
      return action.index >= 0 && action.index < state.trail.length
        ? { ...state, index: action.index }
        : state;
    default:
      return state;
  }
}

export type NavigationHistoryContextValue = {
  /** The full trail recorded so far, oldest first. */
  readonly trail: readonly HistoryEntry[];
  /** The position of the currently shown screen within `trail`. */
  readonly index: number;
  /** The currently shown screen's entry, or `null` before anything has registered. */
  readonly current: HistoryEntry | null;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  /** Registers the screen at `href` as visited, deduping a consecutive repeat. */
  readonly registerVisit: (href: string, label: string) => void;
  /** Moves one step back in the trail. A no-op when `canGoBack` is `false`. */
  readonly goBack: () => void;
  /** Moves one step forward in the trail. A no-op when `canGoForward` is `false`. */
  readonly goForward: () => void;
  /** Jumps directly to an arbitrary position in the trail - a breadcrumb crumb click. */
  readonly goToIndex: (index: number) => void;
};

const NavigationHistoryContext =
  createContext<NavigationHistoryContextValue | null>(null);

/**
 * Provides the visited-history trail to the whole app. Mounted once in
 * `src/app/layout.tsx`, wrapping both `NavShell` and the routed content, so
 * every route's visit-registration and the rail/breadcrumb read the same
 * trail instance.
 *
 * @param props.children the app's routed content, wrapped alongside the nav shell.
 */
export function NavigationHistoryProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const registerVisit = useCallback((href: string, label: string) => {
    dispatch({ type: "VISIT", href, label });
  }, []);
  const goBack = useCallback(() => dispatch({ type: "GO_BACK" }), []);
  const goForward = useCallback(() => dispatch({ type: "GO_FORWARD" }), []);
  const goToIndex = useCallback(
    (index: number) => dispatch({ type: "GO_TO_INDEX", index }),
    [],
  );

  const value = useMemo<NavigationHistoryContextValue>(
    () => ({
      trail: state.trail,
      index: state.index,
      current: state.index >= 0 ? (state.trail[state.index] ?? null) : null,
      canGoBack: state.index > 0,
      canGoForward: state.index < state.trail.length - 1,
      registerVisit,
      goBack,
      goForward,
      goToIndex,
    }),
    [state, registerVisit, goBack, goForward, goToIndex],
  );

  return (
    <NavigationHistoryContext.Provider value={value}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

/**
 * Reads the visited-history trail and its navigation controls.
 *
 * @throws Error when called outside a `NavigationHistoryProvider`.
 */
export function useNavigationHistory(): NavigationHistoryContextValue {
  const value = useContext(NavigationHistoryContext);
  if (value === null) {
    throw new Error(
      "useNavigationHistory must be used within a NavigationHistoryProvider",
    );
  }
  return value;
}
