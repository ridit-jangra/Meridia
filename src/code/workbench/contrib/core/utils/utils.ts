let debounceTimer: number | null = null;
export const debounce = (fn: () => void, delay: number = 35) => {
  if (debounceTimer) window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(fn, delay);
};
