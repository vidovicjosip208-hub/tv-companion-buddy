import { useEffect, useRef, useState } from "react";

/**
 * Global focus-zone registry.
 *
 * Only ONE zone is "active" at any time — the one on top of the stack
 * (highest priority, most recently mounted). Only that zone receives
 * keyboard events, so background screens/overlays never react to the
 * remote at the same time. This keeps remote navigation deterministic
 * (Escape = one step back, Enter = confirm/open next step) and removes
 * redundant work on low-powered TV hardware.
 */

type KeyHandler = (e: KeyboardEvent) => void;

interface Zone {
  id: string;
  seq: number;
  priority: number;
  handlerRef: { current: KeyHandler };
}

const zones: Zone[] = [];
const listeners = new Set<() => void>();
let seqCounter = 0;
let attached = false;

const topZone = (): Zone | undefined => {
  let best: Zone | undefined;
  for (const z of zones) {
    if (!best || z.priority > best.priority || (z.priority === best.priority && z.seq > best.seq)) {
      best = z;
    }
  }
  return best;
};

export const getActiveZoneId = (): string | null => topZone()?.id ?? null;

const notify = () => {
  for (const l of listeners) l();
};

const onWindowKeyDown = (e: KeyboardEvent) => {
  const zone = topZone();
  if (!zone) return;
  if (e.key === "Escape" || e.key === "Backspace") {
    if (e.repeat) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }
  zone.handlerRef.current(e);
};


const attach = () => {
  if (attached) return;
  attached = true;
  window.addEventListener("keydown", onWindowKeyDown);
};

const detach = () => {
  if (!attached || zones.length > 0) return;
  attached = false;
  window.removeEventListener("keydown", onWindowKeyDown);
};

/**
 * Register a keyboard zone. The handler only runs while this zone is on top
 * of the stack and `active` is true.
 */
export const useZoneKeys = (id: string, handler: KeyHandler, active = true, priority = 0) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return;
    const zone: Zone = { id, seq: ++seqCounter, priority, handlerRef };
    zones.push(zone);
    attach();
    notify();
    return () => {
      const i = zones.indexOf(zone);
      if (i >= 0) zones.splice(i, 1);
      detach();
      notify();
    };
  }, [id, active, priority]);
};

/** True when the given zone id is currently the active (top) zone. */
export const useIsZoneActive = (id: string): boolean => {
  const [isActive, setIsActive] = useState(() => getActiveZoneId() === id);

  useEffect(() => {
    const update = () => setIsActive(getActiveZoneId() === id);
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, [id]);

  return isActive;
};
