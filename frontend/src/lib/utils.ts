import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 类名合并：clsx 拼接条件类 + tailwind-merge 消解冲突（后者优先），
 * 用于 Button 等组件的 className 覆盖 variant 默认类（U39：替代第三方 `cn` 包）。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
