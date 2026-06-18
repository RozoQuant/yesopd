'use client'

interface Props {
  org_id: string
  onClose: () => void
  onSaved: () => void
}

export default function AddStaffForm({
  org_id,
  onClose,
  onSaved,
}: Props) {
  return (
    <div>
      Add Staff Form
    </div>
  )
}