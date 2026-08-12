const KEY = "app:entered";

// sessionStorage survives a page reload in the same TV-browser tab. That made
// a stale successful entry unlock the home route underneath the splash while
// the new app instance was still waiting to show the login screen.
// A login is therefore valid only after markEntered() runs in this document.
let enteredThisBoot = false;

try {
  sessionStorage.removeItem(KEY);
} catch {
  // ignore
}

/** Označava da je korisnik prošao login (pravi ili privremeni ulaz). */
export const markEntered = () => {
  enteredThisBoot = true;
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // ignore
  }
};

export const hasEntered = () => {
  try {
    return enteredThisBoot && sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export const clearEntered = () => {
  enteredThisBoot = false;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};
