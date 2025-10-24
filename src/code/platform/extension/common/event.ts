export type EventCallback<T = any, R = any> = (data: T) => R;

const events = new Map<string, EventCallback[]>();

export function on<T = any>(
  event: string,
  callback: EventCallback<T>
): () => void {
  if (!events.has(event)) {
    events.set(event, []);
  }

  events.get(event)!.push(callback);

  return () => {
    const callbacks = events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  };
}

export function send<T = any, R = any>(event: string, data?: T): R | undefined {
  const callbacks = events.get(event);
  if (!callbacks || callbacks.length === 0) {
    return undefined;
  }

  const result = callbacks[0]!(data);
  return result;
}
