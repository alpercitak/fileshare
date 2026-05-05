const DEFAULT_PORT = 4001 as const;

export const getPort = (): number => {
  const env = (globalThis as any).process?.env;
  if (env?.PORT) {
    return Number(env.PORT);
  }

  const vitePort = import.meta.env?.VITE_PORT;
  if (vitePort) {
    return Number(vitePort);
  }

  return DEFAULT_PORT;
};
