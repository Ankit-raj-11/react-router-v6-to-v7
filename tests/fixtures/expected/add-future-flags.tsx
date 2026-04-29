// @ts-nocheck
import { BrowserRouter, HashRouter, MemoryRouter } from 'react-router';

// Pattern A - BrowserRouter with children
function AppA() {
  return <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true, v7_fetcherPersist: true, v7_normalizeFormMethod: true, v7_partialHydration: true, v7_skipActionErrorRevalidation: true }} basename="/app"><div>Hello</div></BrowserRouter>;
}

// Pattern B - BrowserRouter self-closing
function AppB() {
  return <HashRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true, v7_fetcherPersist: true, v7_normalizeFormMethod: true, v7_partialHydration: true, v7_skipActionErrorRevalidation: true }} />;
}

// Pattern C - Merge: existing future prop
function AppC() {
  return <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true, v7_fetcherPersist: true, v7_normalizeFormMethod: true, v7_partialHydration: true, v7_skipActionErrorRevalidation: true }}><div>Hello</div></MemoryRouter>;
}

// Pattern D - With extra props
function AppD() {
  return <BrowserRouter basename="/app" future={{ v7_relativeSplatPath: true, v7_startTransition: true, v7_fetcherPersist: true, v7_normalizeFormMethod: true, v7_partialHydration: true, v7_skipActionErrorRevalidation: true }} />;
}

// Edge case: string mentioning BrowserRouter must NOT be touched
const comment = "Use <BrowserRouter> to wrap your app";
