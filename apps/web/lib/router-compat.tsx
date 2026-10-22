"use client";

import React, { forwardRef, type AnchorHTMLAttributes, type ReactNode, useEffect, useState, useCallback } from "react";
import NextLink from "next/link";
import { useRouter, usePathname, useParams as useNextParams } from "next/navigation";

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string | { pathname?: string; search?: string; hash?: string };
  replace?: boolean;
  className?: string;
  children?: ReactNode;
  [key: string]: any;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, replace, className, children, ...rest }, ref) => {
    const href = typeof to === "string" ? to : `${to.pathname || ""}${to.search || ""}${to.hash || ""}`;
    return (
      <NextLink ref={ref} href={href} replace={replace} className={className} {...rest}>
        {children}
      </NextLink>
    );
  },
);

Link.displayName = "Link";

export function useNavigate() {
  const router = useRouter();
  return (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === "number") {
      window.history.go(to);
      return;
    }
    if (options?.replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  };
}

export function useLocation() {
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSearch(window.location.search || "");
    }
  }, [pathname]);

  return {
    pathname: pathname || "/",
    search,
    hash: typeof window !== "undefined" ? window.location.hash : "",
  };
}

export function useSearchParams(): readonly [URLSearchParams, (params: Record<string, string> | URLSearchParams) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const [params, setParams] = useState<URLSearchParams>(
    () => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""),
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setParams(new URLSearchParams(window.location.search));
    }
  }, [pathname]);

  const setSearchParams = useCallback(
    (newParams: Record<string, string> | URLSearchParams) => {
      const sp = new URLSearchParams(newParams as any);
      setParams(sp);
      router.replace(`${pathname}?${sp.toString()}`);
    },
    [pathname, router],
  );

  return [params, setSearchParams] as const;
}

export function useParams<T = Record<string, string>>() {
  const p = useNextParams();
  return (p || {}) as T;
}
