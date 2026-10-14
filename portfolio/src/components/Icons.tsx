type IconProps = { size?: number }

export function ArrowUpRight({ size = 18 }: IconProps) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M8 7h9v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

export function MessageIcon({ size = 22 }: IconProps) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.48 8.7 8.7 0 0 1-3-.62L4 20l1.67-4.45A7.5 7.5 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

export function SunIcon({ size = 19 }: IconProps) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
}

export function MoonIcon({ size = 19 }: IconProps) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M20.4 14.3A8.5 8.5 0 0 1 9.7 3.6a8.5 8.5 0 1 0 10.7 10.7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>
}
