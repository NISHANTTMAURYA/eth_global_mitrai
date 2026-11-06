/** Limit expensive first-time model setup without discarding visited scenes. */
export function createModelLoadQueue(limit = 1) {
  let active = 0;
  const pending: { start: (release: () => void) => void; cancelled: boolean }[] = [];
  function pump() {
    while (active < limit && pending.length) {
      const task = pending.shift()!;
      if (task.cancelled) continue;
      active++;
      let done = false;
      task.start(() => {
        if (done) return;
        done = true;
        active--;
        pump();
      });
    }
  }
  return {
    request(start: (release: () => void) => void) {
      const task = { start, cancelled: false };
      pending.push(task);
      pump();
      return () => {
        task.cancelled = true;
      };
    },
  };
}
export const galleryModelQueue = createModelLoadQueue(1);
