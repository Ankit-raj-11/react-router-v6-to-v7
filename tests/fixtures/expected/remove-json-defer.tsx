// Ambient declaration: tells TS this function exists at runtime without implementing it
declare function fetchSomething(): Promise<unknown>;

import { useLoaderData } from 'react-router-dom';
import { json as remixJson } from '@remix-run/node';

export const loader = async () => {
  const data = await fetch('/api/data');
  return { data, status: 200 };
};

export const deferredLoader = () => {
  return { promise: fetchSomething() };
};

export const remixLoader = () => {
  // This should NOT be transformed (different package)
  return remixJson({ message: 'hello' });
};

export const standardLoader = () => {
  // This has no json/defer, should stay unchanged
  return { hello: 'world' };
};
