export const perfMark = (label: string) => {
  performance.mark(label);
};

export const perfMeasure = (name: string, startMark: string, endMark: string) => {
  try {
    performance.measure(name, startMark, endMark);
  } catch {
    // marks may not exist yet on fast dev reloads — ignore
  }
};
