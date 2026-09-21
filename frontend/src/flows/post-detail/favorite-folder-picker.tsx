import { useCallback, useEffect, useState } from 'react'
import { FolderPlus, Loader2, Plus } from 'lucide-react'
import { AppDialog } from '@/components/ui/app-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createFolder, getMyFolders, type FavoriteFolder } from '@/services/users'

/* ─── 收藏夹选择器（G7）：收藏时选夹，支持新建 ─── */
export function FavoriteFolderPicker({ postTitle, isOpen, isSubmitting, onSelect, onClose }: {
  postTitle: string | null
  isOpen: boolean
  /** 收藏请求进行中（父组件 toggleFavorite） */
  isSubmitting: boolean
  /** 选择收藏夹（null=默认收藏夹） */
  onSelect: (folderId: number | null) => void
  onClose: () => void
}) {
  const [folders, setFolders] = useState<FavoriteFolder[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const loadFolders = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      setFolders(await getMyFolders())
    } catch (requestError) {
      setLoadError(requestError instanceof Error ? requestError.message : '加载失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      void loadFolders()
      setNewName('')
    }
  }, [isOpen, loadFolders])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || isCreating) return
    setIsCreating(true)
    try {
      const created = await createFolder(name)
      setFolders((current) => [...current, created])
      setNewName('')
      onSelect(created.id)
    } catch (requestError) {
      setLoadError(requestError instanceof Error ? requestError.message : '创建失败')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <AppDialog
      open={isOpen}
      onOpenChange={(next) => { if (!next) onClose() }}
      title="收藏到收藏夹"
      description={postTitle ? `「${postTitle}」` : undefined}
      footer={(
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          取消
        </Button>
      )}
    >
      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> 加载中...
          </div>
        )}
        {loadError && !isLoading && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {loadError}
            <Button variant="link" className="ml-1 h-auto p-0" onClick={() => void loadFolders()}>
              重试
            </Button>
          </div>
        )}
        {!isLoading && !loadError && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onSelect(null)}
            className="flex items-center gap-3 rounded-lg border border-transparent p-3 text-left transition-colors hover:border-border hover:bg-muted disabled:opacity-50"
          >
            <FolderPlus className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">默认收藏夹</div>
              <div className="text-xs text-muted-foreground">未分类的收藏都在这里</div>
            </div>
          </button>
        )}
        {!isLoading && !loadError && folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            disabled={isSubmitting}
            onClick={() => onSelect(folder.id)}
            className="flex items-center gap-3 rounded-lg border border-transparent p-3 text-left transition-colors hover:border-border hover:bg-muted disabled:opacity-50"
          >
            <FolderPlus className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{folder.name}</div>
              <div className="text-xs text-muted-foreground">{folder.postCount} 篇收藏</div>
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newName}
          maxLength={30}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="新建收藏夹（最多 30 字）"
          aria-label="新建收藏夹名称"
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleCreate()
          }}
        />
        <Button
          variant="outline"
          disabled={!newName.trim() || isCreating || isSubmitting}
          onClick={() => void handleCreate()}
        >
          {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          新建
        </Button>
      </div>
    </AppDialog>
  )
}
