import Link from 'next/link';
import type { ReactNode } from 'react';

/** Centered message page (404, access denied…) in the light ivory & gold style. */
export function StatusPage({
  code,
  title,
  text,
  icon,
  primary,
  secondary,
}: {
  code?: string;
  title: string;
  text: string;
  icon?: ReactNode;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto flex min-h-[62vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      {icon && (
        <div className="mb-6 grid size-16 place-items-center rounded-full border border-[#ecd9ad] bg-[#f6ead0] text-[#8a5a00] [&_svg]:size-7" aria-hidden="true">
          {icon}
        </div>
      )}
      {code && <p className="font-serif text-6xl font-semibold tracking-tight text-[#e0a527]">{code}</p>}
      <h1 className="mt-2 font-serif text-[clamp(1.6rem,4vw,2.2rem)] leading-tight text-[#17140f]">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#5f584d] sm:text-base">{text}</p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link
          href={primary.href}
          className="inline-flex h-12 items-center justify-center rounded-full bg-[#e0a527] px-7 text-sm font-semibold text-[#17140f] shadow-[0_8px_20px_rgba(176,125,18,0.22)] transition-colors hover:bg-[#f0b93a]"
        >
          {primary.label}
        </Link>
        {secondary && (
          <Link
            href={secondary.href}
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#17140f]/12 bg-white px-7 text-sm font-semibold text-[#17140f] transition-colors hover:bg-[#17140f]/[0.04]"
          >
            {secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}
