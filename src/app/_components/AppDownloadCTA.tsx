'use client'

import { useState } from 'react'

export default function AppDownloadCTA() {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return
    // No SMS provider is wired up yet (Resend in this stack sends email, not
    // SMS). Wire this to a real API route + SMS provider before shipping —
    // for now it's an honest "coming soon" rather than a silent no-op.
    setMessage("SMS app links aren't set up yet — for now, open yesopd.com on your phone and use \"Add to Home Screen.\"")
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
      <div className="bg-[#F0F7FF] rounded-3xl p-8 sm:p-12 grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E]">Healthcare at your fingertips</h2>
          <p className="text-gray-500 mt-2 max-w-md">
            YesOPD works as an installable app right from your browser — no store download needed.
            Add it to your home screen and take care of your health, anytime, anywhere.
          </p>

          <form onSubmit={handleSend} className="mt-5 flex flex-col sm:flex-row gap-2 max-w-sm">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Enter your mobile number"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#006EFF] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/20"
            />
            <button
              type="submit"
              className="bg-[#006EFF] text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-[#0058CC] transition shrink-0"
            >
              Send Link
            </button>
          </form>
          {message && <p className="text-xs text-gray-500 mt-2 max-w-sm">{message}</p>}

          <p className="text-xs text-gray-400 mt-4">
            Native App Store / Google Play listings aren&apos;t published yet — this installs as a Progressive
            Web App using the manifest already configured in this project.
          </p>
        </div>

        <div className="hidden lg:flex justify-center">
          <div className="w-48 aspect-[9/19] rounded-[2rem] border-8 border-[#1A1A2E] bg-white shadow-xl overflow-hidden relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-[#1A1A2E] rounded-b-xl" />
            <div className="p-3 pt-6 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-[#006EFF] flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6l7-3z" />
                  </svg>
                </span>
                <span className="text-[9px] font-bold text-[#1A1A2E]">YesOPD</span>
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 rounded-lg bg-[#F7F8FA] border border-gray-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}