'use client';

/**
 * Exploria360 design system — core primitives.
 * One Button, one Input/Field, one PasswordInput: every screen composes these.
 * Tokens: 44px controls (touch-safe), 12px radius, ink primary, gold reserved for brand moments.
 */
import Link from 'next/link';
import { forwardRef, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ───────────── Button ───────────── */
type Variant = 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[#17140f] text-white hover:bg-[#2a251c] shadow-[0_1px_0_rgba(255,255,255,.08)_inset,0_1px_2px_rgba(23,20,15,.2)]',
  gold: 'bg-[#e0a527] text-[#17140f] hover:bg-[#eab33a] shadow-[0_1px_2px_rgba(23,20,15,.15)]',
  secondary: 'bg-white text-[#17140f] border border-[#e4ddd0] hover:border-[#cfc5b3] hover:bg-[#fdfbf7]',
  ghost: 'bg-transparent text-[#17140f] hover:bg-[#17140f]/[0.05]',
  danger: 'bg-[#b42318] text-white hover:bg-[#9b1c13]',
};
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, block, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'ds-btn inline-flex select-none items-center justify-center font-semibold tracking-[-0.01em] transition-[background-color,border-color,transform,box-shadow] duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a527] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export function ButtonLink({ href, variant = 'primary', size = 'md', className, children }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={cn('ds-btn inline-flex items-center justify-center font-semibold tracking-[-0.01em] transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a527] focus-visible:ring-offset-2', VARIANTS[variant], SIZES[size], className)}>
      {children}
    </Link>
  );
}

/* ───────────── Field / Input ───────────── */
export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, hint, error, icon, trailing, id, className, ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errId = `${inputId}-err`;
  return (
    <div className={cn('ds-field', className)}>
      <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-[#3b362e]">{label}</label>
      <div className={cn(
        'ds-input group flex h-11 items-center gap-2.5 rounded-xl border bg-white px-3.5 transition-[border-color,box-shadow] duration-150',
        error ? 'border-[#d92d20] shadow-[0_0_0_3px_rgba(217,45,32,.12)]' : 'border-[#e4ddd0] hover:border-[#cfc5b3] focus-within:border-[#c08a1c] focus-within:shadow-[0_0_0_3px_rgba(224,165,39,.18)]'
      )}>
        {icon && <span className="shrink-0 text-[#8c8475] [&>svg]:size-[18px]" aria-hidden="true">{icon}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={[error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[#17140f] outline-none placeholder:text-[#a39a8a]"
          {...rest}
        />
        {trailing}
      </div>
      {error ? (
        <p id={errId} role="alert" className="mt-1.5 text-[13px] text-[#b42318]">{error}</p>
      ) : hint ? (
        <div id={hintId} className="mt-1.5 text-[13px] text-[#6f6758]">{hint}</div>
      ) : null}
    </div>
  );
});

/* ───────────── PasswordInput (show/hide + live requirements) ───────────── */
export const PASSWORD_RULES = [
  { key: 'len', label: '8 caractères minimum', test: (p: string) => p.length >= 8 },
  { key: 'up', label: 'Une majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'low', label: 'Une minuscule', test: (p: string) => /[a-z]/.test(p) },
  { key: 'num', label: 'Un chiffre', test: (p: string) => /\d/.test(p) },
  { key: 'sym', label: 'Un caractère spécial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];
export const passwordIsStrong = (p: string) => PASSWORD_RULES.every((r) => r.test(p));

export const PasswordInput = forwardRef<HTMLInputElement, Omit<FieldProps, 'type' | 'trailing'> & { showRules?: boolean; value: string }>(function PasswordInput(
  { showRules, value, ...rest },
  ref
) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Field
        ref={ref}
        type={visible ? 'text' : 'password'}
        value={value}
        trailing={
          <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={visible}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-[#8c8475] transition-colors hover:bg-[#17140f]/[0.05] hover:text-[#17140f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a527]">
            {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        }
        {...rest}
      />
      {showRules && value.length > 0 && (
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1" aria-label="Exigences du mot de passe">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(value);
            return (
              <li key={r.key} className={cn('flex items-center gap-1.5 text-[12.5px] transition-colors', ok ? 'text-[#067647]' : 'text-[#8c8475]')}>
                {ok ? <Check className="size-3.5" aria-hidden="true" /> : <span className="mx-[3px] size-1.5 rounded-full bg-current" aria-hidden="true" />}
                {r.label}
                <span className="sr-only">{ok ? ' — validé' : ' — manquant'}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});

/* ───────────── Alert ───────────── */
export function Alert({ tone = 'error', children, onClose }: { tone?: 'error' | 'success' | 'info'; children: ReactNode; onClose?: () => void }) {
  const styles = {
    error: 'border-[#fecdca] bg-[#fef3f2] text-[#b42318]',
    success: 'border-[#abefc6] bg-[#ecfdf3] text-[#067647]',
    info: 'border-[#f2e3bd] bg-[#fdf8ec] text-[#7a5300]',
  }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('ex-pop flex items-start gap-3 rounded-xl border px-3.5 py-3 text-[14px] leading-snug', styles)}>
      <div className="flex-1">{children}</div>
      {onClose && <button type="button" onClick={onClose} aria-label="Fermer" className="opacity-70 hover:opacity-100"><X className="size-4" /></button>}
    </div>
  );
}
