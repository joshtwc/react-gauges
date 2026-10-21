import { createContext, useContext, useEffect, useId, useState, type ReactNode } from 'react';

/** Increments whenever "Shuffle readings" is pressed; cards listen and pick new values. */
export const PulseContext = createContext(0);

export function usePulse(fn: () => void) {
  const pulse = useContext(PulseContext);
  useEffect(() => {
    if (pulse > 0) fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse]);
}

export const rand = (min: number, max: number, step = 1) => Math.round((min + Math.random() * (max - min)) / step) * step;

export function Card(props: {
  id: string;
  title: string;
  component: string;
  blurb: ReactNode;
  children: ReactNode;
  controls?: ReactNode;
  code: string;
  wide?: boolean;
}) {
  return (
    <section
      id={props.id}
      className={`flex min-w-0 flex-col overflow-hidden rounded-[var(--twc-radius)] border border-line bg-surface ${props.wide ? 'lg:col-span-2' : ''}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pt-5">
        <h2 className="m-0 text-xl font-semibold">{props.title}</h2>
        <code className="font-mono text-[13px] text-soft">{`<${props.component}>`}</code>
      </header>
      <p className="m-0 px-5 pt-1 text-[15px] text-soft">{props.blurb}</p>
      <div className="well mx-5 mt-4 flex min-h-[220px] flex-wrap items-center justify-center gap-6 rounded-[var(--twc-radius)] bg-well p-5 text-ink">
        {props.children}
      </div>
      {props.controls && <div className="grid gap-x-5 gap-y-3 px-5 pt-4 sm:grid-cols-2">{props.controls}</div>}
      <CodeBlock code={props.code} />
    </section>
  );
}

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };
  return (
    <details className="group mx-5 mt-4 mb-5 rounded-[var(--twc-radius)] border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-heading select-none">
        <span>
          <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden="true">
            ›
          </span>
          Code
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            copy();
          }}
          className="rounded border border-camel px-2 py-0.5 text-xs font-medium text-heading hover:bg-well"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </summary>
      <pre className="m-0 overflow-x-auto rounded-b-[var(--twc-radius)] bg-code p-4 font-mono text-[12.5px] leading-relaxed text-code-fg">
        <code>{code}</code>
      </pre>
    </details>
  );
}

export function Range(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display?: (v: number) => string;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="flex justify-between text-sm font-medium text-heading">
        <span>{props.label}</span>
        <span className="font-mono text-[13px] text-soft tabular-nums">{props.display ? props.display(props.value) : props.value}</span>
      </label>
      <input
        id={id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Choice<T extends string | number>(props: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
      <legend className="mb-1 p-0 text-sm font-medium text-heading">{props.label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {props.options.map(([v, text]) => {
          const active = v === props.value;
          return (
            <label
              key={String(v)}
              className={`cursor-pointer rounded border px-2.5 py-1 text-[13px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-heading ${
                active ? 'border-btn bg-btn text-btn-fg' : 'border-line-strong text-ink hover:border-camel'
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                name={name}
                id={`${name}-${String(v)}`}
                checked={active}
                onChange={() => props.onChange(v)}
              />
              {text}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Toggle(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 self-end text-sm font-medium text-heading">
      <input id={id} type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} className="size-4 accent-[var(--heading)]" />
      {props.label}
    </label>
  );
}

/** True when the page is currently rendering in dark mode (data-theme or OS). */
export function useIsDark(): boolean {
  const get = () => {
    if (typeof window === 'undefined') return false;
    const t = document.documentElement.dataset.theme;
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };
  const [dark, setDark] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setDark(get());
    mq.addEventListener('change', update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mq.removeEventListener('change', update);
      mo.disconnect();
    };
  }, []);
  return dark;
}
