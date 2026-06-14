'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getSchedulesAction,
  upsertScheduleAction,
  deleteScheduleAction,
  getBookingRulesAction,
  upsertBookingRulesAction,
  upsertExceptionAction,
} from '@/app/actions/schedule'
import type { DayOfWeek } from '@/types'

const ALL_DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

interface Schedule {
  id: string
  day_of_week: DayOfWeek
  session_type: 'MORNING' | 'EVENING'
  start_time: string
  end_time: string
  slot_duration: number
  max_per_slot: number
  daily_limit: number | null
  is_active: boolean
}

interface BookingRules {
  same_day_booking: boolean
  online_booking_enabled: boolean
  advance_booking_days: number
}

export default function ScheduleManager({ doctor_org_id }: { doctor_org_id: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [rules, setRules] = useState<BookingRules | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'schedule' | 'rules' | 'leave'>('schedule')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Leave form state
  const [leaveDate, setLeaveDate] = useState('')
  const [leaveReason, setLeaveReason] = useState('')

  async function load() {
    setLoading(true)
    const [s, r] = await Promise.all([
      getSchedulesAction(doctor_org_id),
      getBookingRulesAction(doctor_org_id),
    ])
    if (s.data) setSchedules(s.data as Schedule[])
    if (r.data) setRules(r.data as BookingRules)
    else setRules({ same_day_booking: true, online_booking_enabled: true, advance_booking_days: 7 })
    setLoading(false)
  }

  useEffect(() => { load() }, [doctor_org_id])

  function getSchedule(
    day: DayOfWeek,
    session: 'MORNING' | 'EVENING'
  ): Schedule | undefined {
    return schedules.find(
      s =>
        s.day_of_week === day &&
        s.session_type === session
    )
  }

  function getDaySchedules(day: DayOfWeek) {
    return {
      morning: getSchedule(day, 'MORNING'),
      evening: getSchedule(day, 'EVENING'),
    }
  }

  function flash(msg: string, isError = false) {
    if (isError) { setError(msg); setTimeout(() => setError(null), 4000) }
    else { setSuccess(msg); setTimeout(() => setSuccess(null), 3000) }
  }

  function handleDayToggle(day: DayOfWeek, checked: boolean) {
    if (!checked) {
      startTransition(async () => {
        await deleteScheduleAction(doctor_org_id, day, 'MORNING')
        await deleteScheduleAction(doctor_org_id, day, 'EVENING')

        flash('Day removed')
        await load()
      })
    } else {
      startTransition(async () => {
        await upsertScheduleAction({
          doctor_org_id,
          day_of_week: day,
          session_type: 'MORNING',
          start_time: '09:00',
          end_time: '13:00',
          slot_duration: 30,
          max_per_slot: 1,
        })

        flash('Day added')
        await load()
      })
    }
  }

  async function createSession(
    day: DayOfWeek,
    session: 'MORNING' | 'EVENING'
  ) {
    const r = await upsertScheduleAction({
      doctor_org_id,
      day_of_week: day,
      session_type: session,
      start_time: session === 'MORNING' ? '09:00' : '17:00',
      end_time: session === 'MORNING' ? '13:00' : '20:00',
      slot_duration: 30,
      max_per_slot: 1,
    })

    if (r?.error) {
      flash(r.error, true)
      return
    }

    await load()
  }

  async function removeSession(
    day: DayOfWeek,
    session: 'MORNING' | 'EVENING'
  ) {
    const r = await deleteScheduleAction(
      doctor_org_id,
      day,
      session
    )

    if (r?.error) {
      flash(r.error, true)
      return
    }

    await load()
  }

  function handleScheduleChange(
    day: DayOfWeek,
    session: 'MORNING' | 'EVENING',
    field: string,
    value: string | number
  ) {
    setSchedules(prev =>
      prev.map(s =>
        s.day_of_week === day &&
        s.session_type === session
          ? { ...s, [field]: value }
          : s
      )
    )
  }

  function handleSaveDay(
    day: DayOfWeek,
    session: 'MORNING' | 'EVENING'
  ) {
    const s = getSchedule(day, session)

    if (!s) return

    startTransition(async () => {
      const r = await upsertScheduleAction({
        doctor_org_id,
        day_of_week: day,
        session_type: session,
        start_time: s.start_time,
        end_time: s.end_time,
        slot_duration: s.slot_duration,
        max_per_slot: s.max_per_slot,
        daily_limit: s.daily_limit,
      })

      if (r?.error) flash(r.error, true)
      else flash('Saved')
    })
  }

  function handleSaveRules() {
    if (!rules) return
    startTransition(async () => {
      const r = await upsertBookingRulesAction({ doctor_org_id, ...rules })
      if (r?.error) flash(r.error, true)
      else flash('Booking rules saved')
    })
  }

  function handleAddLeave() {
    if (!leaveDate) return
    startTransition(async () => {
      const r = await upsertExceptionAction({
        doctor_org_id,
        exception_date: leaveDate,
        is_day_off: true,
        reason: leaveReason || null,
      })
      if (r?.error) flash(r.error, true)
      else { flash('Leave added'); setLeaveDate(''); setLeaveReason('') }
    })
  }

  if (loading) return <p className="text-xs text-gray-400 py-4 text-center">Loading schedule…</p>

  return (
    <div className="space-y-4">
      {/* Feedback */}
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">{success}</p>}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-200/60 rounded-lg p-0.5">
        {(['schedule', 'rules', 'leave'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition capitalize ${
              activeTab === t ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-gray-500'
            }`}
          >
            {t === 'leave' ? 'Block Date' : t === 'rules' ? 'Booking Rules' : 'OPD Schedule'}
          </button>
        ))}
      </div>

      {/* OPD Schedule */}
      {activeTab === 'schedule' && (
        <div className="space-y-3">
          {ALL_DAYS.map(day => {
            const { morning, evening } = getDaySchedules(day)

            const active = !!morning || !!evening

            return (
              <div
                key={day}
                className="bg-white rounded-lg border border-gray-100 px-4 py-3"
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDayToggle(day, !active)}
                      disabled={isPending}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                        active ? 'bg-[#006EFF]' : 'bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                          active ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>

                    <span className="text-sm font-medium text-gray-700 w-10">
                      {day}
                    </span>
                  </div>
                </div>

                {active && (
                  <div className="mt-4 space-y-4">
                    {/* MORNING SESSION */}
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">
                          Morning Session
                        </span>

                        <button
                          onClick={() =>
                            morning
                              ? removeSession(day, 'MORNING')
                              : createSession(day, 'MORNING')
                          }
                          disabled={isPending}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                            morning ? 'bg-[#006EFF]' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                              morning ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {morning && (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">
                                Start Time
                              </label>
                              <input
                                type="time"
                                value={morning.start_time}
                                onChange={e =>
                                  handleScheduleChange(
                                    day,
                                    'MORNING',
                                    'start_time',
                                    e.target.value
                                  )
                                }
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                              />
                            </div>

                            <div>
                              <label className="text-xs text-gray-400 block mb-1">
                                End Time
                              </label>
                              <input
                                type="time"
                                value={morning.end_time}
                                onChange={e =>
                                  handleScheduleChange(
                                    day,
                                    'MORNING',
                                    'end_time',
                                    e.target.value
                                  )
                                }
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                              />
                            </div>

                            <div>
                              <label className="text-xs text-gray-400 block mb-1">
                                Slot Duration
                              </label>
                              <select
                                value={morning.slot_duration}
                                onChange={e =>
                                  handleScheduleChange(
                                    day,
                                    'MORNING',
                                    'slot_duration',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                              >
                                <option value={15}>15</option>
                                <option value={30}>30</option>
                                <option value={45}>45</option>
                                <option value={60}>60</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs text-gray-400 block mb-1">
                                Max Patients Per Slot
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={morning.max_per_slot}
                                onChange={e =>
                                  handleScheduleChange(
                                    day,
                                    'MORNING',
                                    'max_per_slot',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                              />
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              handleSaveDay(day, 'MORNING')
                            }
                            disabled={isPending}
                            className="mt-3 text-xs text-[#006EFF] hover:underline"
                          >
                            Save Morning
                          </button>
                        </>
                      )}
                    </div>

                    {/* EVENING SESSION */}
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">
                          Evening Session
                        </span>

                        <button
                          onClick={() =>
                            evening
                              ? removeSession(day, 'EVENING')
                              : createSession(day, 'EVENING')
                          }
                          disabled={isPending}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                            evening ? 'bg-[#006EFF]' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                              evening ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {evening && (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">
                                Start Time
                              </label>
                              <input
                                type="time"
                                value={evening.start_time}
                                onChange={e =>
                                  handleScheduleChange(
                                    day,
                                    'EVENING',
                                    'start_time',
                                    e.target.value
                                  )
                                }
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                              />
                            </div>

                            <div>
                              <label className="text-xs text-gray-400 block mb-1">
                                End Time
                              </label>
                              <input
                                type="time"
                                value={evening.end_time}
                                onChange={e =>
                                  handleScheduleChange(
                                    day,
                                    'EVENING',
                                    'end_time',
                                    e.target.value
                                  )
                                }
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                              />
                            </div>

                            <div>
                              <label className="text-xs text-gray-400 block mb-1">
                                Slot Duration
                              </label>
                              <select
                                value={evening.slot_duration}
                                onChange={e =>
                                  handleScheduleChange(
                                    day,
                                    'EVENING',
                                    'slot_duration',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                              >
                                <option value={15}>15</option>
                                <option value={30}>30</option>
                                <option value={45}>45</option>
                                <option value={60}>60</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs text-gray-400 block mb-1">
                                Max Patients Per Slot
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={evening.max_per_slot}
                                onChange={e =>
                                  handleScheduleChange(
                                    day,
                                    'EVENING',
                                    'max_per_slot',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                              />
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              handleSaveDay(day, 'EVENING')
                            }
                            disabled={isPending}
                            className="mt-3 text-xs text-[#006EFF] hover:underline"
                          >
                            Save Evening
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Booking Rules */}
      {activeTab === 'rules' && rules && (
        <div className="bg-white rounded-lg border border-gray-100 px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Online booking</p>
              <p className="text-xs text-gray-400">Allow patients to book online</p>
            </div>
            <button
              onClick={() => setRules(r => r ? { ...r, online_booking_enabled: !r.online_booking_enabled } : r)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                rules.online_booking_enabled ? 'bg-[#006EFF]' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                rules.online_booking_enabled ? 'translate-x-4' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Same day booking</p>
              <p className="text-xs text-gray-400">Patients can book for today</p>
            </div>
            <button
              onClick={() => setRules(r => r ? { ...r, same_day_booking: !r.same_day_booking } : r)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                rules.same_day_booking ? 'bg-[#006EFF]' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                rules.same_day_booking ? 'translate-x-4' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Advance booking (days)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={rules.advance_booking_days}
              onChange={e => setRules(r => r ? { ...r, advance_booking_days: Number(e.target.value) } : r)}
              className="w-32 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-[#006EFF] focus:outline-none"
            />
          </div>

          <button
            onClick={handleSaveRules}
            disabled={isPending}
            className="w-full bg-[#006EFF] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#0058CC] disabled:opacity-60 transition"
          >
            {isPending ? 'Saving…' : 'Save Rules'}
          </button>
        </div>
      )}

      {/* Block Date / Leave */}
      {activeTab === 'leave' && (
        <div className="bg-white rounded-lg border border-gray-100 px-4 py-4 space-y-3">
          <p className="text-xs text-gray-500">Block a date (doctor on leave, holiday, etc.)</p>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Date *</label>
            <input
              type="date"
              value={leaveDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setLeaveDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-[#006EFF] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Reason (optional)</label>
            <input
              type="text"
              value={leaveReason}
              onChange={e => setLeaveReason(e.target.value)}
              placeholder="Conference, personal leave…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-[#006EFF] focus:outline-none"
            />
          </div>
          <button
            onClick={handleAddLeave}
            disabled={isPending || !leaveDate}
            className="w-full bg-red-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-600 disabled:opacity-60 transition"
          >
            {isPending ? 'Blocking…' : 'Block Date'}
          </button>
        </div>
      )}
    </div>
  )
}