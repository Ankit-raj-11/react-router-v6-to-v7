// @ts-nocheck
import { BrowserRouter, HashRouter, MemoryRouter } from 'react-router';

// Pattern A - BrowserRouter with children
function AppA() {
  return <BrowserRouter basename="/app"><div>Hello</div></BrowserRouter>;
}

// Pattern B - BrowserRouter self-closing
function AppB() {
  return <HashRouter />;
}

// Pattern C - Merge: existing future prop
function AppC() {
  return <MemoryRouter future={{ v7_relativeSplatPath: true }}><div>Hello</div></MemoryRouter>;
}

// Pattern D - With extra props
function AppD() {
  return <BrowserRouter basename="/app" />;
}

// Edge case: string mentioning BrowserRouter must NOT be touched
const comment = "Use <BrowserRouter> to wrap your app";
