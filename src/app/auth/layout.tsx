import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'YESOPD — Book Doctor Appointments',
  description: 'Find and book OPD appointments with top doctors near you.',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
      {children}
    </div>
  )
}