import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getTokenRole } from '@/services/http'
import {
  getPendingComments,
  getPendingPosts,
  getPendingReports,
  handleReport,
  moderateComment,
  moderatePost,
  type ContentReport,
  type PendingComment,
  type PendingPost,
} from '@/services/admin'

type Tab = 'posts' | 'comments' | 'reports'

export default function AdminModerationScreen() {
  const [tab, setTab] = useState<Tab>('posts')
  const [posts, setPosts] = useState<PendingPost[]>([])
  const [comments, setComments] = useState<PendingComment[]>([])
  const [reports, setReports] = useState<ContentReport[]>([])
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isAdmin = getTokenRole() === 'ADMIN'

  const load = useCallback(async () => {
    if (!isAdmin) return
    setIsLoading(true)
    setError(null)
    try {
      if (tab === 'posts') setPosts((await getPendingPosts()).records)
      else if (tab === 'comments') setComments((await getPendingComments()).records)
      else setReports((await getPendingReports()).records)
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '加载审核队列失败') } finally { setIsLoading(false) }
  }, [isAdmin, tab])

  useEffect(() => { void load() }, [load])
  if (!isAdmin) return <Navigate to="/login" replace />

  const moderate = async (type: 'post' | 'comment', id: number, action: 'APPROVE' | 'REJECT') => {
    try {
      if (type === 'post') await moderatePost(id, action, reason || undefined)
      else await moderateComment(id, action, reason || undefined)
      setReason('')
      await load()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '审核失败') }
  }

  const processReport = async (id: number, action: 'ACCEPT' | 'DISMISS') => {
    try { await handleReport(id, action); await load() } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '处理举报失败') }
  }

  return <main className="min-h-screen bg-warm-bg p-4 md:p-8"><section className="mx-auto max-w-5xl"><header className="mb-6"><p className="text-sm font-semibold text-coral">管理员</p><h1 className="text-2xl font-bold">内容审核工作台</h1><p className="mt-1 text-sm text-muted-foreground">通过、驳回待审内容，或处置用户举报。</p></header><div className="mb-4 flex flex-wrap gap-2">{([{ key: 'posts', label: `待审帖子 ${posts.length}` }, { key: 'comments', label: `待审评论 ${comments.length}` }, { key: 'reports', label: `待处理举报 ${reports.length}` }] as const).map((item) => <Button key={item.key} variant={tab === item.key ? 'default' : 'outline'} className={tab === item.key ? 'bg-coral text-white hover:bg-coral-dark' : ''} onClick={() => setTab(item.key)}>{item.label}</Button>)}</div><Textarea value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="驳回或审核说明（可选，最多500字）" className="mb-4 bg-white" />{error && <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}{isLoading ? <p className="rounded-xl bg-white p-8 text-center text-muted-foreground">加载中...</p> : <div className="space-y-3">{tab === 'posts' && posts.map((post) => <article key={post.id} className="rounded-xl border border-border/60 bg-white p-4"><div className="mb-2 flex items-center justify-between gap-3"><h2 className="font-semibold">{post.title}</h2><span className="text-xs text-muted-foreground">#{post.id}</span></div><p className="whitespace-pre-wrap text-sm text-foreground/80">{post.content}</p><p className="mt-2 text-xs text-muted-foreground">命中原因：{post.moderationReason ?? '人工待审'} · {post.createdAt}</p><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => void moderate('post', post.id, 'APPROVE')}>通过</Button><Button size="sm" variant="destructive" onClick={() => void moderate('post', post.id, 'REJECT')}>驳回</Button></div></article>)}{tab === 'comments' && comments.map((comment) => <article key={comment.id} className="rounded-xl border border-border/60 bg-white p-4"><div className="mb-2 flex justify-between"><span className="font-semibold">评论 #{comment.id}</span><span className="text-xs text-muted-foreground">帖子 #{comment.postId}</span></div><p className="text-sm text-foreground/80">{comment.content}</p><p className="mt-2 text-xs text-muted-foreground">命中原因：{comment.moderationReason ?? '人工待审'} · {comment.createdAt}</p><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => void moderate('comment', comment.id, 'APPROVE')}>通过</Button><Button size="sm" variant="destructive" onClick={() => void moderate('comment', comment.id, 'REJECT')}>驳回</Button></div></article>)}{tab === 'reports' && reports.map((report) => <article key={report.id} className="rounded-xl border border-border/60 bg-white p-4"><div className="mb-2 flex justify-between"><span className="font-semibold">举报 #{report.id}</span><span className="text-xs text-muted-foreground">{report.contentType === 1 ? '帖子' : '评论'} #{report.contentId}</span></div><p className="text-sm">原因：{report.reason}</p>{report.description && <p className="mt-1 text-sm text-muted-foreground">补充：{report.description}</p>}<p className="mt-2 text-xs text-muted-foreground">{report.createdAt}</p><div className="mt-3 flex gap-2"><Button size="sm" variant="destructive" onClick={() => void processReport(report.id, 'ACCEPT')}>采纳并下架</Button><Button size="sm" variant="outline" onClick={() => void processReport(report.id, 'DISMISS')}>驳回举报</Button></div></article>)}{((tab === 'posts' && posts.length === 0) || (tab === 'comments' && comments.length === 0) || (tab === 'reports' && reports.length === 0)) && <p className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">当前没有待处理内容</p>}</div>}</section></main>
}
