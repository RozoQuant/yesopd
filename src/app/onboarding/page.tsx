'use client'

import { useActionState } from 'react'
import { createOrgAction } from '@/app/actions/onboarding'
import LogoutButton from '@/components/LogoutButton'

const initialState = { error: undefined as string | undefined }

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
]

export default function OnboardingPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await createOrgAction(formData)
      return result ?? initialState
    },
    initialState
  )

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-[#006EFF]">YES</span>
            <span className="text-xl font-bold text-[#1A1A2E]">OPD</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-full bg-[#006EFF] text-white text-xs flex items-center justify-center font-bold">1</div>
          <div className="flex-1 h-0.5 bg-gray-200" />
          <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-400 text-xs flex items-center justify-center font-bold">2</div>
        </div>

        <h1 className="text-xl font-bold text-[#1A1A2E] mb-1">Set up your clinic</h1>
        <p className="text-sm text-gray-500 mb-6">
          This information will be shown to patients when they search for doctors.
          Your listing will go live after a quick review by our team.
        </p>

        <form action={formAction} className="space-y-5">
          {state?.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {(['CLINIC', 'HOSPITAL'] as const).map(type => (
                <label key={type} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="org_type"
                    value={type}
                    defaultChecked={type === 'CLINIC'}
                    className="peer sr-only"
                  />
                  <div className="rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 text-center transition peer-checked:border-[#006EFF] peer-checked:text-[#006EFF] peer-checked:bg-[#006EFF]/5">
                    {type === 'CLINIC' ? '🏥 Clinic' : '🏨 Hospital'}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinic / Hospital name *
            </label>
            <input
              name="name"
              required
              placeholder="City Care Clinic"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#006EFF] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/20"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <input
              name="address_line1"
              required
              placeholder="Shop 4, Gandhi Road"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#006EFF] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                name="city"
                required
                placeholder="Bareilly"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#006EFF] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input
                name="pincode"
                placeholder="243001"
                maxLength={6}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#006EFF] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
            <select
              name="state"
              required
              defaultValue=""
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#006EFF] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/20"
            >
              <option value="" disabled>Select state</option>
              {INDIAN_STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                name="phone"
                type="tel"
                placeholder="9876543210"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#006EFF] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                name="email"
                type="email"
                placeholder="clinic@example.com"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#006EFF] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Maps link
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              name="google_maps_url"
              type="url"
              placeholder="https://maps.google.com/..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#006EFF] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/20"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#006EFF] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#0058CC] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isPending ? 'Submitting…' : 'Submit for review →'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              Your listing will be reviewed and activated within 24 hours.
            </p>
          </div>
        </form>
      </div>
    </main>
  )
}