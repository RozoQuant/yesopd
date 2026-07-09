import { getTeleconsultUsageAction } from '@/app/actions/teleconsult'

// Bump this the day you upgrade off the LiveKit Cloud free tier.
const FREE_TIER_MINUTES_CAP = 5000

export default async function TeleconsultUsageCard() {
  const { minutesUsed, monthLabel } = await getTeleconsultUsageAction()
  const pct = Math.min(100, Math.round((minutesUsed / FREE_TIER_MINUTES_CAP) * 100))
  const danger = pct >= 90
  const warn = pct >= 70

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">LiveKit minutes — {monthLabel}</p>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            danger ? 'bg-red-50 text-red-600' : warn ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
          }`}
        >
          {minutesUsed.toLocaleString('en-IN')} / {FREE_TIER_MINUTES_CAP.toLocaleString('en-IN')}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            danger ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-[#006EFF]'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {danger && (
        <p className="text-xs text-red-600 mt-2">
          Approaching the free-tier cap — consider upgrading your LiveKit Cloud plan.
        </p>
      )}
    </div>
  )
}