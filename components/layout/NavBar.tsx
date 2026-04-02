'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';

type NavBarProps = {
  currentPath: string;
};

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/research', label: 'Research' },
  { href: '/insights', label: 'Insights' },
  { href: '/contact', label: 'Contact' }
];

function isActivePath(currentPath: string, href: string): boolean {
  if (href === '/') {
    return currentPath === '/';
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function NavBar({ currentPath }: NavBarProps) {
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [focusedHref, setFocusedHref] = useState<string | null>(null);
  const [resolvedPath, setResolvedPath] = useState(currentPath);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, visible: false });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const windowPath = window.location.pathname || '/';
    if (currentPath === '/' && windowPath !== '/') {
      setResolvedPath(windowPath);
      return;
    }

    setResolvedPath(currentPath || windowPath || '/');
  }, [currentPath]);

  const activeHref = useMemo(() => {
    const activeItem = NAV_ITEMS.find((item) => isActivePath(resolvedPath, item.href));
    return activeItem?.href ?? null;
  }, [resolvedPath]);

  const indicatorTargetHref = hoveredHref ?? focusedHref ?? activeHref;

  useEffect(() => {
    if (!indicatorTargetHref) {
      setIndicatorStyle((previous) => ({ ...previous, visible: false }));
      return;
    }

    const updateIndicator = () => {
      const target = linkRefs.current[indicatorTargetHref];

      if (!target) {
        setIndicatorStyle((previous) => ({ ...previous, visible: false }));
        return;
      }

      const { offsetLeft, offsetWidth } = target;

      if (offsetWidth <= 0) {
        setIndicatorStyle((previous) => ({ ...previous, visible: false }));
        return;
      }

      setIndicatorStyle({
        left: offsetLeft,
        width: offsetWidth,
        visible: true
      });
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);

    return () => {
      window.removeEventListener('resize', updateIndicator);
    };
  }, [indicatorTargetHref]);

  return (
    <nav
      aria-label="Main navigation"
      className="hidden h-[62px] items-center justify-between border-b border-border-default bg-bg-surface/90 px-6 backdrop-blur lg:flex"
    >
      <Link
        href="/"
        className="inline-flex shrink-0 items-center gap-2.5 text-base font-semibold text-text-primary no-underline"
      >
        <BrandMark className="h-7 w-7" />
        <span>Thomas Hadden</span>
      </Link>

      <div className="relative flex h-full items-center gap-6" onMouseLeave={() => setHoveredHref(null)}>
        {NAV_ITEMS.map((item) => {
          const isActive = isActivePath(resolvedPath, item.href);
          const isHovered = hoveredHref === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              ref={(element) => {
                linkRefs.current[item.href] = element;
              }}
              data-nav-href={item.href}
              data-active={isActive ? 'true' : 'false'}
              data-hovered={isHovered ? 'true' : 'false'}
              onMouseEnter={() => {
                setHoveredHref(item.href);
              }}
              onFocus={() => {
                setFocusedHref(item.href);
              }}
              onBlur={() => {
                setFocusedHref(null);
              }}
              className={`desktop-nav-link text-[15px] font-semibold no-underline ${
                isActive ? 'desktop-nav-link--active' : ''
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        <span
          aria-hidden="true"
          data-testid="desktop-nav-indicator"
          data-target-href={indicatorTargetHref ?? ''}
          data-visible={indicatorStyle.visible ? 'true' : 'false'}
          className="desktop-nav-indicator pointer-events-none absolute"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
            opacity: indicatorStyle.visible ? 1 : 0
          }}
        />
      </div>

      <button
        type="button"
        aria-label="Ask Thomas AI"
        className="rounded-pill bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-normal hover:bg-accent-hover"
      >
        Ask Thomas AI
      </button>
    </nav>
  );
}
