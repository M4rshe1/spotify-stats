export function createRunExclusive() {
  let jobChain: Promise<unknown> = Promise.resolve();

  return function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = jobChain.then(fn);
    jobChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}

export type RunExclusive = ReturnType<typeof createRunExclusive>;
