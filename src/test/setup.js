import "@testing-library/jest-dom/vitest";

// jsdom implements none of these.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

if (typeof window !== "undefined") {
  // jsdom defines scrollTo as a throwing stub, so overwrite it outright.
  window.scrollTo = () => {};
  window.scroll = () => {};

  const NoopObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
  if (!window.IntersectionObserver) window.IntersectionObserver = NoopObserver;
  if (!window.ResizeObserver) window.ResizeObserver = NoopObserver;

  // jsdom has no matchMedia. Tests run as if the user prefers reduced motion so
  // animation paths are skipped and state changes are synchronous.
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: /prefers-reduced-motion/.test(query),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });
  }
}
