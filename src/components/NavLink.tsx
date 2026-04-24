import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface NavLinkProps extends LinkProps {
  children: ReactNode;
}

const NavLink = ({ children, ...props }: NavLinkProps) => {
  return <Link {...props}>{children}</Link>;
};

export default NavLink;
