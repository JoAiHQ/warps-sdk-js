// Jest stub for `mppx/client` — the real package is pure ESM (.js) and
// cannot be parsed by ts-jest. resolver-github never reaches any mppx
// code path at runtime, so a minimal no-op surface is enough.
export const Mppx = {
  create: () => ({
    fetch: async () => {
      throw new Error('mppx is stubbed in resolver-github tests')
    },
  }),
}

export const tempo = () => null
