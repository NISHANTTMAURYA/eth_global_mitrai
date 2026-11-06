export const MESSAGE_BATCH_WINDOW = 8000;
/** Trailing-edge queue. In-flight calls are serialized; new bursts keep their own deadline. */
export function messageBatch<T>(options: {
  deliver: (items: T[]) => Promise<void>;
  changed: (count: number) => void;
  delay?: number;
}) {
  let items: T[] = [],
    timer: ReturnType<typeof setTimeout> | undefined,
    running = false,
    disposed = false,
    deadline = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(flush, Math.max(0, deadline - Date.now()));
  };
  const flush = async () => {
    if (disposed || running || !items.length) return;
    const batch = items;
    items = [];
    running = true;
    options.changed(0);
    try {
      await options.deliver(batch);
    } finally {
      running = false;
      if (!disposed && items.length) schedule();
    }
  };
  return {
    add(item: T) {
      if (disposed) return;
      items.push(item);
      deadline = Date.now() + (options.delay ?? MESSAGE_BATCH_WINDOW);
      options.changed(items.length);
      schedule();
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      items = [];
    },
    get size() {
      return items.length;
    },
  };
}
