import { ReactNode } from "react";

/**
 * Pass-through wrapper. Aplikacija se renderira na punu veličinu ekrana
 * (responsive), bez letterbox skaliranja.
 */
const ScaleToFit = ({ children }: { children: ReactNode }) => <>{children}</>;

export default ScaleToFit;
