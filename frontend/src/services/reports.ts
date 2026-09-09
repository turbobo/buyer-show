import { request } from './http'

export function createContentReport(contentType: 'POST' | 'COMMENT', contentId: number, reason: string): Promise<{ reportId: number }> {
  return request<{ reportId: number }>('/reports', {
    method: 'POST',
    body: JSON.stringify({ contentType, contentId, reason }),
  })
}
