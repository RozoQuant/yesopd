'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'


export interface AddStaffInput {
  org_id: string
  full_name: string
  phone: string
  email: string
  designation:
    | 'RECEPTIONIST'
    | 'CABIN_ATTENDANT'
    | 'NURSE'
    | 'OTHER'
}


export async function addStaffAction(input: AddStaffInput) {
  const admin = createAdminClient()

  try {
    const email = input.email.trim().toLowerCase()

    const { data: invitedUser, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo:
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000/auth/confirm'
            : 'https://www.yesopd.com/auth/confirm',

        data: {
          full_name: input.full_name,
          role: 'STAFF',
        },
      })

    if (inviteError) {
      return {
        success: false,
        message: inviteError.message,
      }
    }

    const userId = invitedUser.user?.id

    if (!userId) {
      return {
        success: false,
        message: 'Failed to create staff account',
      }
    }

    const supabase = await createClient()

    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        phone: input.phone,
      })
      .eq('id', userId)

    if (userUpdateError) {
      return {
        success: false,
        message: userUpdateError.message,
      }
    }

    const { error: staffError } = await supabase
      .from('staff')
      .insert({
        user_id: userId,
        org_id: input.org_id,
        designation: input.designation,
        is_active: true,
        status: 'INVITED',
      })

    if (staffError) {
      return {
        success: false,
        message: staffError.message,
      }
    }

    revalidatePath('/dashboard/clinic')

    return {
      success: true,
      message: 'Staff invited successfully',
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to create staff',
    }
  }
}

export async function getStaffForOrgAction(org_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('staff')
    .select(`
      id,
      user_id,
      designation,
      status,
      is_active,
      users (
        id,
        full_name,
        phone,
        email,
        is_active
      )
    `)
    .eq('org_id', org_id)
    .order('created_at')

  if (error) {
    return { error: error.message }
  }

  const normalized = (data ?? []).map((row: any) => ({
    ...row,
    users: Array.isArray(row.users)
      ? row.users[0] ?? null
      : row.users,
  }))

  return { data: normalized }
}

export async function toggleStaffStatusAction(
  staffId: string,
  userId: string,
  isActive: boolean
) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const newStatus = isActive ? 'ACTIVE' : 'SUSPENDED'

  const { error: staffError } = await supabase
    .from('staff')
    .update({
      is_active: isActive,
      status: newStatus,
    })
    .eq('id', staffId)

  if (staffError) {
    return {
      success: false,
      message: staffError.message,
    }
  }

  const { error: userError } = await admin
    .from('users')
    .update({
      is_active: isActive,
    })
    .eq('id', userId)

  if (userError) {
    return {
      success: false,
      message: userError.message,
    }
  }

  revalidatePath('/dashboard/clinic')

  return {
    success: true,
  }
}