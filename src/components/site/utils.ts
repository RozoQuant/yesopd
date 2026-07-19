// src/app/search/_components/utils.ts

import type { JSX } from 'react'
import {
  HeartIcon, BabyIcon, SparkleIcon, BoneIcon, FemaleIcon,
  StethoscopeIcon, ToothIcon, BrainIcon, type IconProps,
} from './icons'

/**
 * Maps a specialization name to a representative icon. Falls back to a
 * generic stethoscope for anything not explicitly listed, so this never
 * breaks when new specializations are added in the `specializations` table.
 */
export function specializationIcon(name: string): (props: IconProps) => JSX.Element {
  const key = name.toLowerCase()
  if (key.includes('cardio')) return HeartIcon
  if (key.includes('pediatric') || key.includes('paediatric') || key.includes('child')) return BabyIcon
  if (key.includes('derma') || key.includes('skin')) return SparkleIcon
  if (key.includes('ortho') || key.includes('bone')) return BoneIcon
  if (key.includes('gynae') || key.includes('gyne') || key.includes('obstet')) return FemaleIcon
  if (key.includes('dent')) return ToothIcon
  if (key.includes('psych') || key.includes('neuro')) return BrainIcon
  return StethoscopeIcon
}

/** "10500" -> "10,000+", "62" -> "60+" — rounds down so real counts always read as a floor, never an overstatement. */
export function formatStat(n: number): string {
  if (!n || n <= 0) return '0'
  if (n < 20) return `${n}`
  const step = n < 200 ? 10 : n < 2000 ? 100 : 1000
  const floored = Math.floor(n / step) * step
  return `${floored.toLocaleString('en-IN')}+`
}

export function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}