import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActionBar } from '../action-bar'
import type { ApiComment } from '@/services/comments'

function makeProps(overrides: Partial<Parameters<typeof ActionBar>[0]> = {}) {
  return {
    commentText: '',
    replyTarget: null,
    isCommentSubmitting: false,
    isLikeSubmitting: false,
    isFavoriteSubmitting: false,
    isLiked: false,
    isFavorited: false,
    onCommentTextChange: vi.fn(),
    onSubmitComment: vi.fn(),
    onClearReply: vi.fn(),
    onLike: vi.fn(),
    onFavorite: vi.fn(),
    onShare: vi.fn(),
    ...overrides,
  }
}

function makeReplyTarget(nickname: string): ApiComment {
  return { id: 9, userNickname: nickname } as ApiComment
}

describe('ActionBar', () => {
  it('should disable send button when comment text is empty', () => {
    render(<ActionBar {...makeProps()} />)

    expect(screen.getByRole('button', { name: '发送评论' })).toBeDisabled()
    expect(screen.getByPlaceholderText('说点什么...')).toBeInTheDocument()
  })

  it('should enable send button and forward input changes', () => {
    const onCommentTextChange = vi.fn()
    render(<ActionBar {...makeProps({ commentText: 'hi', onCommentTextChange })} />)

    const input = screen.getByRole('textbox', { name: '评论内容' })
    expect(screen.getByRole('button', { name: '发送评论' })).toBeEnabled()

    fireEvent.change(input, { target: { value: 'hello' } })
    expect(onCommentTextChange).toHaveBeenCalledWith('hello')
  })

  it('should submit on Enter but not Shift+Enter', () => {
    const onSubmitComment = vi.fn()
    render(<ActionBar {...makeProps({ commentText: 'hi', onSubmitComment })} />)
    const input = screen.getByRole('textbox', { name: '评论内容' })

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(onSubmitComment).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmitComment).toHaveBeenCalledTimes(1)
  })

  it('should disable send button while submitting', () => {
    render(<ActionBar {...makeProps({ commentText: 'hi', isCommentSubmitting: true })} />)

    expect(screen.getByRole('button', { name: '发送评论' })).toBeDisabled()
  })

  it('should show reply placeholder and clear button when replying', () => {
    const onClearReply = vi.fn()
    render(
      <ActionBar {...makeProps({ replyTarget: makeReplyTarget('Alice'), onClearReply })} />,
    )

    expect(screen.getByPlaceholderText('回复 Alice...')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /回复 Alice/ }))
    expect(onClearReply).toHaveBeenCalledTimes(1)
  })

  it('should not show reply clear button when not replying', () => {
    render(<ActionBar {...makeProps()} />)

    expect(screen.queryByRole('button', { name: /回复/ })).toBeNull()
  })

  it('should toggle like / favorite labels and forward clicks', () => {
    const onLike = vi.fn()
    const onFavorite = vi.fn()
    render(
      <ActionBar {...makeProps({ isLiked: true, isFavorited: true, onLike, onFavorite })} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '取消点赞' }))
    expect(onLike).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '取消收藏' }))
    expect(onFavorite).toHaveBeenCalledTimes(1)
  })

  it('should disable like / favorite buttons while submitting', () => {
    render(<ActionBar {...makeProps({ isLikeSubmitting: true, isFavoriteSubmitting: true })} />)

    expect(screen.getByRole('button', { name: '点赞' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '收藏' })).toBeDisabled()
  })

  it('should forward share click', () => {
    const onShare = vi.fn()
    render(<ActionBar {...makeProps({ onShare })} />)

    fireEvent.click(screen.getByRole('button', { name: '分享' }))
    expect(onShare).toHaveBeenCalledTimes(1)
  })
})
