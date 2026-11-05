/**
 * jsdom shims. Recharts needs ResizeObserver; the app scrolls; we never want a
 * test to hit the network or the microphone.
 */

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

window.scrollTo = (() => {}) as typeof window.scrollTo;
Element.prototype.scrollIntoView = (() => {}) as typeof Element.prototype.scrollIntoView;

if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async () => {} },
    writable: true,
    configurable: true,
  });
}
