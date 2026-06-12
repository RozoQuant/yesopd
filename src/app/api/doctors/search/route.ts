import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const q = searchParams.get('q')?.trim() ?? ''
  const city = searchParams.get('city')?.trim()
  const specialization_id = searchParams.get('specialization_id')

  const supabase = await createClient()

  let query = supabase
    .from('doctor_organizations')
    .select(`
      id,
      consultation_fee,
      doctors!inner (
        id,
        full_name,
        qualification,
        experience_yrs,
        photo_url,
        status,
        is_approved,
        doctor_specializations (
          specializations ( id, name )
        )
      ),
      organizations!inner (
        id,
        name,
        city,
        address_line1,
        status
      )
    `)
    .eq('is_active', true)
    .eq('doctors.status', 'ACTIVE')
    .eq('doctors.is_approved', true)
    .eq('organizations.status', 'ACTIVE')

  if (city) {
    query = query.ilike('organizations.city', `%${city}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  const ql = q.toLowerCase()

  const filtered = (data ?? []).filter((row: any) => {
    const d = Array.isArray(row.doctors)
      ? row.doctors[0]
      : row.doctors

    const o = Array.isArray(row.organizations)
      ? row.organizations[0]
      : row.organizations

    if (!d || !o) return false

    if (!ql) return true

    const matchDoctor =
      d.full_name?.toLowerCase().includes(ql)

    const matchOrg =
      o.name?.toLowerCase().includes(ql) ||
      o.city?.toLowerCase().includes(ql)

    const matchSpec = (d.doctor_specializations ?? []).some(
      (ds: any) =>
        ds.specializations?.name
          ?.toLowerCase()
          .includes(ql)
    )

    return matchDoctor || matchOrg || matchSpec
  })

  const finalFiltered = specialization_id
    ? filtered.filter((row: any) => {
        const d = Array.isArray(row.doctors)
          ? row.doctors[0]
          : row.doctors

        if (!d) return false

        return (d.doctor_specializations ?? []).some(
          (ds: any) =>
            String(ds.specializations?.id) === specialization_id
        )
      })
    : filtered

  const shaped = finalFiltered.map((row: any) => {
    const d = Array.isArray(row.doctors)
      ? row.doctors[0]
      : row.doctors

    const o = Array.isArray(row.organizations)
      ? row.organizations[0]
      : row.organizations

    return {
      doctor_org_id: row.id,
      doctor_id: d?.id,
      doctor_name: d?.full_name,
      qualification: d?.qualification,
      experience_yrs: d?.experience_yrs,
      photo_url: d?.photo_url,
      specializations: (d?.doctor_specializations ?? [])
        .map((ds: any) => ds.specializations?.name)
        .filter(Boolean),
      org_id: o?.id,
      org_name: o?.name,
      org_city: o?.city,
      org_address: o?.address_line1,
      consultation_fee: row.consultation_fee,
    }
  })

  return NextResponse.json({ data: shaped })
}