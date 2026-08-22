import '@testing-library/jest-dom/vitest'

// jsdom's `window.matchMedia` is present as a key but resolves to `undefined`
// rather than a function unless jsdom runs with `pretendToBeVisual` — anything
// relying on it, directly or via a default detector like `InstallAppButton`'s
// `isStandalone`, throws `TypeError: window.matchMedia is not a function` on
// every render otherwise. Always install a deterministic stub.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
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
})
