/**
 * 智能返回：如果来源是外部链接（history 长度为 0），则返回首页而非退出站点。
 * 防止用户从外部链接进入后点返回直接退出。
 */
export function smartBack(fallback = '/'): void {
  if (window.history.length > 1) {
    window.history.back()
  } else {
    window.location.href = fallback
  }
}
