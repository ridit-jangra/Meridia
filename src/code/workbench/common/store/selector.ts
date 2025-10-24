import { RootState, store } from "./store.js";

export const select = <T>(fn: (s: RootState) => T): T => fn(store.getState());

type Eq<T> = (a: T, b: T) => boolean;

export const watch = <T>(
  selector: (s: RootState) => T,
  cb: (next: T, prev: T) => void,
  eq: Eq<T> = Object.is
) => {
  let prev = selector(store.getState());
  return store.subscribe(() => {
    const next = selector(store.getState());
    if (!eq(next, prev)) {
      const p = prev;
      prev = next;
      cb(next, p);
    }
  });
};
