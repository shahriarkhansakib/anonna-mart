'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  imageClassName?: string;
  href?: string | null;
  variant?: 'wordmark' | 'contained' | 'raw';
}

const logoAlt = 'অনন্যা MART - আপনার পছন্দ, আমাদের যত্ন';

export function Logo({
  width = 110,
  height = 36,
  className,
  imageClassName,
  href = '/',
  variant = 'wordmark',
}: LogoProps) {
  const content = (
    <div
      className={cn(
        variant === 'raw'
          ? 'relative inline-flex items-center'
          : 'relative inline-flex items-center justify-center rounded-lg bg-[#FCFBF6] px-2.5 py-1 border border-black/10 shadow-xs transition-all duration-200 hover:shadow-sm dark:bg-white dark:border-white/10',
        className
      )}
    >
      <Image
        src="/anonna-mart-logo.png"
        alt={logoAlt}
        width={width}
        height={height}
        className={cn("h-7 sm:h-8 w-auto object-contain", imageClassName)}
        priority
      />
    </div>
  );

  if (href === null) {
    return content;
  }

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
      aria-label="Anonna Mart Home"
    >
      {content}
    </Link>
  );
}
