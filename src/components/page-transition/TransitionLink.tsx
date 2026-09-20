'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ComponentProps, MouseEvent } from 'react';
import { useTransition } from './TransitionProvider';

type TransitionLinkProps = Omit<ComponentProps<typeof Link>, 'onClick'> & {
  /** Side effect before navigating (e.g. close a mobile menu). */
  onBeforeNavigate?: () => void;
};

function hrefToString(href: TransitionLinkProps['href']): string {
  if (typeof href === 'string') return href;
  return href.pathname ?? '/';
}

export function TransitionLink({
  href,
  onBeforeNavigate,
  children,
  ...props
}: TransitionLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { startTransition } = useTransition();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let the browser handle modified clicks (open in new tab, etc.).
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }

    const url = hrefToString(href);

    // External / anchor / protocol links → native behavior, no fade.
    if (
      url.startsWith('http') ||
      url.startsWith('#') ||
      url.startsWith('mailto:') ||
      url.startsWith('tel:')
    ) {
      return;
    }

    e.preventDefault();
    onBeforeNavigate?.();

    // Same-route click (e.g. the nav item for the page you're already on):
    // starting a fade here would set opacity → 0 but router.push wouldn't change
    // the pathname, so endTransition never fires and the page stays stuck
    // invisible. Treat it as a no-op (onBeforeNavigate above still runs, so the
    // mobile menu closes).
    if (url.split(/[?#]/)[0] === pathname) {
      return;
    }

    // Accessibility: honor reduced-motion — navigate instantly, no fade.
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      router.push(url);
      return;
    }

    startTransition(() => router.push(url));
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
