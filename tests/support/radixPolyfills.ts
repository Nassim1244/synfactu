// jsdom does not implement every browser API Radix UI's primitives use
// internally: `Select` needs pointer-capture and scroll methods that do not
// exist on `Element` in jsdom, and `Switch` measures itself with a
// `ResizeObserver`, which jsdom does not provide at all. Without these stubs
// a component test throws before the primitive ever finishes mounting - a
// jsdom gap, not application behaviour, so it is patched here once rather
// than worked around in every test that renders one of these primitives
// (`ai-rules/policy_testing.md` -> Forbidden does not cover environment shims
// for a missing browser API).

/** Installs the DOM API stubs Radix UI's `Select` and `Switch` need under jsdom. */
export function installRadixPolyfills(): void {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {
      // no-op: jsdom has no real pointer-capture model to update.
    };
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {
      // no-op, same reason.
    };
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {
      // no-op: jsdom has no layout engine to scroll.
    };
  }
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserverStub {
      observe(): void {
        // no-op: jsdom lays out nothing to observe.
      }
      unobserve(): void {
        // no-op, same reason.
      }
      disconnect(): void {
        // no-op, same reason.
      }
    };
  }
}
