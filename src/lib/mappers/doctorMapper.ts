export function mapDoctor(row: any) {
  return {
    id: row.id,
    full_name: row.full_name,
    qualification: row.qualification,
    experience_yrs: row.experience_yrs,
    photo_url: row.photo_url,
    status: row.status,
    is_approved: row.is_approved,
    specializations:
      row.doctor_specializations?.flatMap((ds: any) =>
        ds.specializations ? [ds.specializations] : []
      ) ?? [],
  }
}