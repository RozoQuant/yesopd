'use client'

interface Props {
  org_id: string
  initialStaff: unknown[]
}

export default function StaffList({ org_id, initialStaff }: Props) {
    return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1A1A2E]">
            Staff Management
        </h2>

        <button
            className="bg-[#006EFF] text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
            Add Staff
        </button>
        </div>

        <div className="text-sm text-gray-500">
        Staff Count: {initialStaff.length}
        </div>
    </div>
    )
}