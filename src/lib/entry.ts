const KEY = "app:entered";

/** Označava da je korisnik prošao login (pravi ili privremeni ulaz). */
export const markEntered = () => {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // ignore
  }
};

export const hasEntered = () => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export const clearEntered = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};
