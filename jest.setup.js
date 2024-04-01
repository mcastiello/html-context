Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: jest.fn(() => Math.round(Math.random() * 100000000000).toString()),
  },
});
