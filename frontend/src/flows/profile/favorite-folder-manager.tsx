import { useCallback, useEffect, useState } from 'react'
import { Check, FolderPlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { AppDialog } from '@/components/ui/app-dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { createFolder, deleteFolder, getMyFolders, renameFolder, type FavoriteFolder } from '@/services/users'

/* ─── 收藏夹管理（G7）：新建 / 重命名 / 删除（删除后夹内收藏回默认夹） ─── */
export function FavoriteFolderManager({ isOpen, onChanged, onClose }: {
  isOpen: boolean
  /** 夹列表变化（新建/重命名/删除）后通知父组件刷新 */
  onChanged: () => void
  onClose: () => void
}) {
  const [folders, setFolders] = useState<FavoriteFolder[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<FavoriteFolder | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadFolders = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setFolders(await getMyFolders())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      void loadFolders()
      setNewName('')
      setEditingId(null)
      setPendingDelete(null)
    }
  }, [isOpen, loadFolders])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || isCreating) return
    setIsCreating(true)
    setError(null)
    try {
      await createFolder(name)
      setNewName('')
      await loadFolders()
      onChanged()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '创建失败')
    } finally {
      setIsCreating(false)
    }
  }

  const handleStartEdit = (folder: FavoriteFolder) => {
    setEditingId(folder.id)
    setEditingName(folder.name)
  }

  const handleSaveEdit = async (folderId: number) => {
    const name = editingName.trim()
    if (!name || isSavingEdit) return
    setIsSavingEdit(true)
    setError(null)
    try {
      await renameFolder(folderId, name)
      setEditingId(null)
      await loadFolders()
      onChanged()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '重命名失败')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete || isDeleting) return
    setIsDeleting(true)
    setError(null)
    try {
      await deleteFolder(pendingDelete.id)
      setPendingDelete(null)
      await loadFolders()
      onChanged()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '删除失败')
      setPendingDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <AppDialog
        open={isOpen}
        onOpenChange={(next) => { if (!next) onClose() }}
        title="管理收藏夹"
        description="删除收藏夹后，夹内的收藏会移回默认收藏夹"
        footer={(
          <Button variant="outline" onClick={onClose}>
            完成
          </Button>
        )}
      >
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
            disabled={!newName.trim() || isCreating}
            onClick={() => void handleCreate()}
          >
            {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            新建
          </Button>
        </div>
        <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> 加载中...
            </div>
          )}
          {error && !isLoading && (
            <div className="py-3 text-center text-sm text-muted-foreground">{error}</div>
          )}
          {!isLoading && !error && folders.length === 0 && (
            <div className="py-4 text-center text-sm text-muted-foreground">还没有自建收藏夹</div>
          )}
          {!isLoading && folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center gap-2 rounded-lg border border-border/60 p-2"
            >
              <FolderPlus className="size-4 shrink-0 text-muted-foreground" />
              {editingId === folder.id ? (
                <>
                  <Input
                    value={editingName}
                    maxLength={30}
                    autoFocus
                    onChange={(event) => setEditingName(event.target.value)}
                    className="h-8 flex-1"
                    aria-label={`重命名 ${folder.name}`}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void handleSaveEdit(folder.id)
                    }}
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={isSavingEdit || !editingName.trim()}
                    onClick={() => void handleSaveEdit(folder.id)}
                    aria-label="保存重命名"
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={isSavingEdit}
                    onClick={() => setEditingId(null)}
                    aria-label="取消重命名"
                  >
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{folder.name}</div>
                    <div className="text-xs text-muted-foreground">{folder.postCount} 篇收藏</div>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleStartEdit(folder)}
                    aria-label={`重命名 ${folder.name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setPendingDelete(folder)}
                    aria-label={`删除 ${folder.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </AppDialog>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除收藏夹"
        description={pendingDelete
          ? `确定删除「${pendingDelete.name}」吗？夹内 ${pendingDelete.postCount} 篇收藏将移回默认收藏夹。`
          : undefined}
        confirmText="删除"
        destructive
        isSubmitting={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
