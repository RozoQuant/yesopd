// src/app/search/_components/icons.tsx
// Small outline-style icon set, kept in one place so the homepage doesn't
// pull in an icon package. Style matches the stroke icons already used
// throughout the app (LogoutButton, ChangePasswordLink, etc.)

export type IconProps = { className?: string }

const base = 'w-5 h-5'

export function CalendarIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 6h15a.75.75 0 01.75.75v12.75a.75.75 0 01-.75.75h-15a.75.75 0 01-.75-.75V6.75A.75.75 0 014.5 6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 13h2m4 0h2M8 16.5h2m4 0h2" />
    </svg>
  )
}

export function VideoIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-2.36a.75.75 0 011.03.67v6.38a.75.75 0 01-1.03.67L15.75 13.5M4.5 6.75h9a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5h-9a1.5 1.5 0 01-1.5-1.5v-7.5a1.5 1.5 0 011.5-1.5z" />
    </svg>
  )
}

export function BuildingIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 21V5a1 1 0 011-1h8a1 1 0 011 1v16M14 21h6V9a1 1 0 00-1-1h-5M8 7h.01M8 10h.01M8 13h.01M8 16h.01M11 7h.01M11 10h.01M11 13h.01M11 16h.01" />
    </svg>
  )
}

export function PillIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 17.5l11-11a4.243 4.243 0 10-6-6l-11 11a4.243 4.243 0 106 6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.5l8.5 8.5" />
    </svg>
  )
}

export function HeartIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25s-7.5-4.6-9.6-9.15C.9 7.5 3 4.5 6.3 4.5c2.02 0 3.5 1.13 4.2 2.36.7-1.23 2.18-2.36 4.2-2.36 3.3 0 5.4 3 3.9 6.6-2.1 4.55-9.6 9.15-9.6 9.15z" />
    </svg>
  )
}

export function BabyIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8" r="4.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 8.5c0 1 .8 1.5 1.5 1s.5-1.5 1.5-1 1 1.5 1.5 1M6 19c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5" />
    </svg>
  )
}

export function SparkleIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3M12 18v3M4.2 6.2l2.1 2.1M17.7 15.7l2.1 2.1M3 12h3M18 12h3M4.2 17.8l2.1-2.1M17.7 8.3l2.1-2.1" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function BoneIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 16.5a2 2 0 10-2.83 2.83 2 2 0 002.83 0l9.34-9.34a2 2 0 000-2.83 2 2 0 00-2.83 0M19 7.5a2 2 0 102.83-2.83 2 2 0 00-2.83 0 2 2 0 000 2.83l-9.34 9.34a2 2 0 000 2.83 2 2 0 002.83 0" />
    </svg>
  )
}

export function FemaleIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8.5" r="4.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 13v8M8.5 18h7" />
    </svg>
  )
}

export function StethoscopeIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v6a4 4 0 008 0V3M9 13v2a5 5 0 0010 0v-2.5" />
      <circle cx="19" cy="10.5" r="1.75" />
      <circle cx="5" cy="3" r="1" />
      <circle cx="13" cy="3" r="1" />
    </svg>
  )
}

export function ToothIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-2.5 0-3.5 1.5-5 1.5S4 3.5 3 5c-1.2 1.8-.7 5 .5 8 .9 2.3 1.3 6 3 6 1.3 0 1.2-3.5 2.5-3.5S10.7 19 12 19s1.2-3.5 2.5-3.5S15.2 19 16.5 19c1.7 0 2.1-3.7 3-6 1.2-3 1.7-6.2.5-8-1-1.5-2.5-1.5-4-1.5S14.5 3 12 3z" />
    </svg>
  )
}

export function BrainIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 4a3 3 0 00-3 3 3 3 0 00-1.5 5.5A3 3 0 007 17a3 3 0 003 2.7V4zM14.5 4a3 3 0 013 3 3 3 0 011.5 5.5A3 3 0 0117 17a3 3 0 01-3 2.7V4z" />
    </svg>
  )
}

export function ShieldCheckIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6l7-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4.5" />
    </svg>
  )
}

export function LockIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

export function FileTextIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

export function TruckIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17.5" cy="18" r="1.5" />
    </svg>
  )
}

export function SearchIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
    </svg>
  )
}

export function MapPinIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6.5-5.7-6.5-10.5a6.5 6.5 0 1113 0C18.5 15.3 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.25" />
    </svg>
  )
}

export function ChevronDownIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

export function ArrowRightIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function MenuIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
    </svg>
  )
}

export function CloseIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export function PhoneIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.5C3 4.67 3.67 4 4.5 4H7l2 5-2.5 1.5a11 11 0 005 5L13 13l5 2v2.5c0 .83-.67 1.5-1.5 1.5C9.6 19 5 14.4 5 8.5v-1z" />
    </svg>
  )
}

export function MailIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5v10.5H3.75zM3.75 7l8.25 6L20.25 7" />
    </svg>
  )
}

export function ClockIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="8.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function CheckIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function UsersIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="9" cy="8" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM15 13.2c2.3.3 4 2 4 4.3" />
    </svg>
  )
}

// Facebook / Instagram / LinkedIn / YouTube — generic monochrome glyphs
export function FacebookIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M13.5 21v-7.6h2.6l.4-3H13.5V8.4c0-.9.2-1.5 1.6-1.5h1.7V4.2C16.5 4.1 15.5 4 14.3 4c-2.5 0-4.2 1.5-4.2 4.3v2.1H7.5v3h2.6V21h3.4z" />
    </svg>
  )
}
export function InstagramIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.7" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
export function LinkedinIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6.94 8.5H4.06V20h2.88V8.5zM5.5 4c-1 0-1.75.75-1.75 1.7 0 .93.73 1.7 1.7 1.7h.02c1 0 1.75-.77 1.75-1.7C7.22 4.75 6.48 4 5.5 4zM20 20h-2.88v-6.1c0-1.45-.52-2.44-1.82-2.44-1 0-1.58.67-1.85 1.31-.1.23-.12.55-.12.87V20H10.4s.04-10.5 0-11.5h2.88v1.63c.38-.6 1.07-1.44 2.6-1.44 1.9 0 3.34 1.24 3.34 3.9V20z" />
    </svg>
  )
}
export function YoutubeIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="6" width="18" height="12" rx="3.5" />
      <path d="M10.5 9.7v4.6l4-2.3-4-2.3z" fill="currentColor" stroke="none" />
    </svg>
  )
}