import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { renderHighlight } from '../search'

/**
 * G5 搜索高亮片段拆分渲染测试：
 * 覆盖 <em> 拆分高亮、无标记纯文本、用户内容含 HTML 不注入。
 */
describe('renderHighlight', () => {
  it('将 <em> 片段渲染为高亮样式，其余为纯文本', () => {
    const { container } = render(<div>{renderHighlight('手冲<em>咖啡</em>教程分享')}</div>)

    const em = container.querySelector('em')
    expect(em).not.toBeNull()
    expect(em?.textContent).toBe('咖啡')
    expect(em?.className).toContain('text-coral')
    expect(container.textContent).toBe('手冲咖啡教程分享')
  })

  it('多个 <em> 片段全部高亮', () => {
    const { container } = render(<div>{renderHighlight('今天喝了<em>咖啡</em>，明天还喝<em>咖啡</em>')}</div>)

    expect(container.querySelectorAll('em')).toHaveLength(2)
  })

  it('无标记的纯文本原样渲染', () => {
    const { container } = render(<div>{renderHighlight('没有任何标记的普通文本')}</div>)

    expect(container.querySelector('em')).toBeNull()
    expect(container.textContent).toBe('没有任何标记的普通文本')
  })

  it('用户内容中的 HTML 标签按文本转义，不产生真实元素', () => {
    const { container } = render(<div>{renderHighlight('注入<em><script>alert(1)</script></em>测试')}</div>)

    // script 以文本形式存在，不会被执行或成为真实 DOM 元素
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toBe('注入<script>alert(1)</script>测试')
  })
})
