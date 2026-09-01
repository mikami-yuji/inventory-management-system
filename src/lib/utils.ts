import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isWithinDays(dateStrOrObj: string | Date | null | undefined, days: number = 7): boolean {
  if (!dateStrOrObj) return false;
  const target = new Date(dateStrOrObj).getTime();
  if (isNaN(target)) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = (target - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= -1 && diffDays <= days;
}
