import { useState } from "react";

export function useContentState() {
  const [selected, setSelected] = useState<string | null>(null);
  return { selected, setSelected };
}
