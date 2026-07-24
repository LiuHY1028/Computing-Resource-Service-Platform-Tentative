import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { APP_PATHS, resourceDetailPath, storageDetailPath } from '../app/routes';
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuItem,
  Input,
  Modal,
  PageState,
  Progress,
  SearchInput,
  Select,
  StatusBadge,
  TextButton,
} from '../components/ui';
import {
  clearCompletedTasks,
  copyNodes,
  createFolder,
  deleteNodes,
  directorySummary,
  downloadNode,
  getFileNode,
  getNodePath,
  getPathNodes,
  getRootFolder,
  listDirectory,
  listFileNodes,
  listFileTasks,
  moveNodes,
  renameNode,
  retryFileTask,
  uploadFiles,
  type FileNode,
  type FileSort,
} from '../features/files';
import {
  canManageStorageFiles,
  getStorageSpace,
  storageUsagePercent,
} from '../features/storage';
import '../styles/file-manager.css';

type ActionDialog =
  | { type: 'folder' }
  | { type: 'rename'; node: FileNode }
  | { type: 'copy' | 'move'; nodeIds: string[] }
  | { type: 'delete'; nodeIds: string[] }
  | { type: 'preview'; node: FileNode }
  | { type: 'tasks' };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function fileIcon(node: FileNode) {
  if (node.type === 'folder') return '📁';
  if (node.mimeType.startsWith('image/')) return '🖼';
  if (node.mimeType.startsWith('audio/')) return '🎵';
  if (node.mimeType.startsWith('video/')) return '🎞';
  if (node.mimeType === 'application/pdf') return 'PDF';
  if (['json', 'md', 'txt'].includes(node.extension)) return 'TXT';
  return 'DOC';
}

function canPreview(node: FileNode) {
  return node.type === 'file' && (
    node.mimeType.startsWith('image/')
    || node.mimeType.startsWith('text/')
    || node.mimeType.startsWith('audio/')
    || node.mimeType.startsWith('video/')
    || node.mimeType === 'application/json'
    || node.mimeType === 'application/pdf'
    || ['md', 'json', 'txt'].includes(node.extension)
  );
}

export function FileManagerPage() {
  const { storageId = '' } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const storage = getStorageSpace(storageId);
  const root = storage ? getRootFolder(storageId) : undefined;
  const [revision, setRevision] = useState(0);
  const [history, setHistory] = useState<string[]>(() => root ? [root.nodeId] : []);
  const [historyIndex, setHistoryIndex] = useState(() => root ? 0 : -1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<FileSort>('name-asc');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [treeOpen, setTreeOpen] = useState(true);
  const [dialog, setDialog] = useState<ActionDialog>();
  const [feedback, setFeedback] = useState('');
  const [dragging, setDragging] = useState(false);

  if (!storage || !root) {
    return <main className="file-manager-page"><PageState tone="error" title="未找到文件系统" description="存储或根目录不可用。" actionLabel="返回存储管理" onAction={() => navigate(APP_PATHS.storage)} /></main>;
  }
  if (!canManageStorageFiles(storage)) {
    return <main className="file-manager-page"><PageState title="暂不能管理文件" description={storage.type === 'cloud-disk' ? '请先挂载云硬盘并初始化文件系统。' : '当前存储状态不可用。'} actionLabel="查看存储详情" onAction={() => navigate(storageDetailPath(storage.id))} /></main>;
  }

  void revision;
  const currentFolderId = history[historyIndex] ?? root.nodeId;
  const currentFolder = getFileNode(currentFolderId) ?? root;
  const rows = listDirectory(storageId, currentFolderId, search, sort);
  const allNodes = listFileNodes(storageId);
  const selected = selectedIds.map(getFileNode).filter((item): item is FileNode => Boolean(item));
  const detailNode = selected.length === 1 ? selected[0] : undefined;

  function refresh(message?: string) {
    setRevision((value) => value + 1);
    setSelectedIds([]);
    if (message) setFeedback(message);
  }

  function openFolder(nodeId: string) {
    if (nodeId === currentFolderId) return;
    const next = [...history.slice(0, historyIndex + 1), nodeId];
    setHistory(next);
    setHistoryIndex(next.length - 1);
    setSelectedIds([]);
    setSearch('');
  }

  function goHistory(index: number) {
    if (index < 0 || index >= history.length) return;
    setHistoryIndex(index);
    setSelectedIds([]);
    setSearch('');
  }

  function toggleSelection(nodeId: string, additive = false) {
    setSelectedIds((current) => additive
      ? current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId]
      : [nodeId]);
  }

  async function handleFiles(files: FileList | readonly File[]) {
    try {
      await uploadFiles(storageId, currentFolderId, Array.from(files));
      refresh(`已将 ${files.length} 个文件加入当前目录。`);
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : '上传失败。');
      setRevision((value) => value + 1);
    }
  }

  function downloadSelection() {
    const files = selected.filter((item) => item.type === 'file');
    if (!files.length) {
      setFeedback('请选择至少一个文件下载。');
      return;
    }
    files.forEach((item) => downloadNode(item.nodeId));
    refresh(`已在浏览器中发起 ${files.length} 个下载。`);
  }

  return (
    <main
      className="file-manager-page"
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFiles(event.dataTransfer.files); }}
    >
      <header className="file-manager-header">
        <div>
          <TextButton onClick={() => navigate(storageDetailPath(storage.id))}>返回存储详情</TextButton>
          <h2>{storage.name} · 文件管理</h2>
          <p>{storage.site} · {storage.capacityGb} GB · 已用 {storage.usedGb} GB</p>
        </div>
        <div className="file-manager-capacity"><Progress value={storageUsagePercent(storage)} label="存储容量使用率" /><span>{storageUsagePercent(storage)}% 已使用</span></div>
      </header>

      {feedback && <div className="file-manager-feedback" role="status">{feedback}</div>}
      <section className="file-manager-shell" data-details={detailsOpen ? 'open' : 'closed'} data-tree={treeOpen ? 'open' : 'closed'}>
        <div className="file-manager-toolbar">
          <div className="file-manager-nav-buttons">
            <Button aria-label="后退" disabled={historyIndex <= 0} onClick={() => goHistory(historyIndex - 1)}>←</Button>
            <Button aria-label="前进" disabled={historyIndex >= history.length - 1} onClick={() => goHistory(historyIndex + 1)}>→</Button>
            <Button aria-label="返回上级" disabled={!currentFolder.parentId} onClick={() => currentFolder.parentId && openFolder(currentFolder.parentId)}>↑</Button>
            <Button aria-label="刷新当前目录" onClick={() => refresh('当前目录已刷新。')}>刷新</Button>
          </div>
          <nav className="file-manager-breadcrumbs" aria-label="当前路径">
            {getPathNodes(currentFolderId).map((item, index, items) => (
              <span key={item.nodeId}><button type="button" onClick={() => openFolder(item.nodeId)}>{item.parentId === null ? storage.name : item.name}</button>{index < items.length - 1 && <b>/</b>}</span>
            ))}
          </nav>
          <SearchInput value={search} placeholder="搜索当前存储" onChange={(event) => setSearch(event.target.value)} />
          <div className="file-manager-toolbar-actions">
            <input ref={inputRef} className="file-manager-file-input" type="file" multiple onChange={(event) => event.target.files && void handleFiles(event.target.files)} />
            <Button variant="primary" onClick={() => inputRef.current?.click()}>上传文件</Button>
            <Button onClick={() => setDialog({ type: 'folder' })}>新建文件夹</Button>
            <Button aria-pressed={view === 'grid'} onClick={() => setView(view === 'list' ? 'grid' : 'list')}>{view === 'list' ? '网格视图' : '列表视图'}</Button>
            <Select aria-label="排序" value={sort} onValueChange={(value) => setSort(value as FileSort)} options={[{ value: 'name-asc', label: '名称升序' }, { value: 'name-desc', label: '名称降序' }, { value: 'updated-desc', label: '最近修改' }, { value: 'size-desc', label: '大小降序' }]} />
            <Button onClick={() => setDialog({ type: 'tasks' })}>任务中心 ({listFileTasks(storageId).length})</Button>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="file-manager-selection-bar">
            <strong>已选择 {selected.length} 项</strong>
            <Button onClick={downloadSelection}>下载</Button>
            <Button onClick={() => setDialog({ type: 'copy', nodeIds: selectedIds })}>复制到</Button>
            <Button onClick={() => setDialog({ type: 'move', nodeIds: selectedIds })}>移动到</Button>
            {selected.length === 1 && <Button onClick={() => setDialog({ type: 'rename', node: selected[0] })}>重命名</Button>}
            <Button variant="danger" onClick={() => setDialog({ type: 'delete', nodeIds: selectedIds })}>删除</Button>
            <Button onClick={() => setSelectedIds([])}>取消选择</Button>
          </div>
        )}

        <aside className="file-manager-tree">
          <div className="file-manager-pane-heading"><strong>目录</strong><button type="button" onClick={() => setTreeOpen(false)} aria-label="收起目录树">‹</button></div>
          <DirectoryTree nodes={allNodes} parentId={null} currentId={currentFolderId} onOpen={openFolder} />
          <div className="file-manager-tree-capacity"><strong>{storage.name}</strong><Progress value={storageUsagePercent(storage)} label="存储容量使用率" /><span>{storage.usedGb} / {storage.capacityGb} GB</span></div>
        </aside>
        {!treeOpen && <button className="file-manager-pane-opener file-manager-pane-opener--tree" type="button" onClick={() => setTreeOpen(true)} aria-label="展开目录树">›</button>}

        <section className="file-manager-content">
          {dragging && <div className="file-manager-drop-zone">将文件拖放到“{currentFolder.name}”</div>}
          {!rows.length ? (
            <PageState title={search ? '没有找到文件' : '当前目录为空'} description={search ? '调整搜索词或返回当前目录。' : '上传文件或新建文件夹开始使用。'} actionLabel={search ? '清除搜索' : '上传文件'} onAction={() => search ? setSearch('') : inputRef.current?.click()} />
          ) : view === 'list' ? (
            <div className="file-list" role="grid" aria-label="文件列表">
              <div className="file-list-row file-list-head" role="row"><span></span><span>名称</span><span>修改时间</span><span>类型</span><span>大小</span><span>操作</span></div>
              {rows.map((node) => (
                <div
                  className="file-list-row"
                  data-selected={selectedIds.includes(node.nodeId) || undefined}
                  key={node.nodeId}
                  role="row"
                  tabIndex={0}
                  onClick={(event) => toggleSelection(node.nodeId, event.metaKey || event.ctrlKey)}
                  onDoubleClick={() => node.type === 'folder' ? openFolder(node.nodeId) : setDialog({ type: 'preview', node })}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    if (node.type === 'folder') openFolder(node.nodeId);
                    else setDialog({ type: 'preview', node });
                  }}
                >
                  <Checkbox checked={selectedIds.includes(node.nodeId)} onCheckedChange={() => toggleSelection(node.nodeId, true)} aria-label={`选择${node.name}`}> </Checkbox>
                  <span className="file-name-cell"><i>{fileIcon(node)}</i><strong>{node.name}</strong></span>
                  <span>{new Date(node.updatedAt).toLocaleString('zh-CN', { hour12: false })}</span>
                  <span>{node.type === 'folder' ? '文件夹' : node.extension.toUpperCase() || node.mimeType}</span>
                  <span>{node.type === 'folder' ? '—' : formatBytes(node.sizeBytes)}</span>
                  <NodeMenu node={node} onOpen={() => node.type === 'folder' ? openFolder(node.nodeId) : setDialog({ type: 'preview', node })} onAction={setDialog} onDownload={() => { downloadNode(node.nodeId); refresh('下载已发起。'); }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="file-grid">
              {rows.map((node) => (
                <article className="file-card" data-selected={selectedIds.includes(node.nodeId) || undefined} key={node.nodeId} onClick={(event) => toggleSelection(node.nodeId, event.metaKey || event.ctrlKey)} onDoubleClick={() => node.type === 'folder' ? openFolder(node.nodeId) : setDialog({ type: 'preview', node })}>
                  <Checkbox checked={selectedIds.includes(node.nodeId)} onCheckedChange={() => toggleSelection(node.nodeId, true)} aria-label={`选择${node.name}`}> </Checkbox>
                  <span className="file-card-icon">{fileIcon(node)}</span>
                  <strong>{node.name}</strong>
                  <small>{node.type === 'folder' ? `${directorySummary(node.nodeId).files} 个文件` : formatBytes(node.sizeBytes)}</small>
                  <NodeMenu node={node} onOpen={() => node.type === 'folder' ? openFolder(node.nodeId) : setDialog({ type: 'preview', node })} onAction={setDialog} onDownload={() => { downloadNode(node.nodeId); refresh('下载已发起。'); }} />
                </article>
              ))}
            </div>
          )}
        </section>

        {detailsOpen ? (
          <aside className="file-manager-details">
            <div className="file-manager-pane-heading"><strong>详细信息</strong><button type="button" onClick={() => setDetailsOpen(false)} aria-label="收起详细信息">›</button></div>
            {detailNode ? <FileDetails node={detailNode} storage={storage} onPreview={() => setDialog({ type: 'preview', node: detailNode })} /> : selected.length > 1 ? <div className="file-details-empty"><strong>{selected.length} 个对象</strong><p>选择单个文件或文件夹可查看完整信息。</p></div> : <div className="file-details-empty"><span>ⓘ</span><strong>选择一个对象</strong><p>这里会显示类型、路径、大小、权限与预览信息。</p></div>}
          </aside>
        ) : <button className="file-manager-pane-opener file-manager-pane-opener--details" type="button" onClick={() => setDetailsOpen(true)} aria-label="展开详细信息">‹</button>}
      </section>

      <FileActionDialog
        key={dialog ? `${dialog.type}-${'node' in dialog ? dialog.node.nodeId : 'nodeIds' in dialog ? dialog.nodeIds.join('-') : currentFolderId}` : 'closed'}
        storageId={storageId}
        currentFolderId={currentFolderId}
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        onDone={(message) => { setDialog(undefined); refresh(message); }}
      />
    </main>
  );
}

function DirectoryTree({ nodes, parentId, currentId, onOpen }: Readonly<{ nodes: readonly FileNode[]; parentId: string | null; currentId: string; onOpen: (nodeId: string) => void }>) {
  const folders = nodes.filter((item) => item.type === 'folder' && item.parentId === parentId);
  if (!folders.length) return null;
  return <ul>{folders.map((folder) => <li key={folder.nodeId}><button type="button" data-current={folder.nodeId === currentId || undefined} onClick={() => onOpen(folder.nodeId)}><span>▾</span> 📁 {folder.parentId === null ? '根目录' : folder.name}</button><DirectoryTree nodes={nodes} parentId={folder.nodeId} currentId={currentId} onOpen={onOpen} /></li>)}</ul>;
}

function NodeMenu({ node, onOpen, onAction, onDownload }: Readonly<{ node: FileNode; onOpen: () => void; onAction: (dialog: ActionDialog) => void; onDownload: () => void }>) {
  return (
    <DropdownMenu trigger={<span>•••</span>} aria-label={`${node.name}更多操作`}>
      <DropdownMenuItem onSelect={onOpen}>{node.type === 'folder' ? '打开文件夹' : '预览文件'}</DropdownMenuItem>
      {node.type === 'file' && <DropdownMenuItem onSelect={onDownload}>下载文件</DropdownMenuItem>}
      <DropdownMenuItem onSelect={() => onAction({ type: 'rename', node })}>重命名</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction({ type: 'copy', nodeIds: [node.nodeId] })}>复制到</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction({ type: 'move', nodeIds: [node.nodeId] })}>移动到</DropdownMenuItem>
      <DropdownMenuItem danger onSelect={() => onAction({ type: 'delete', nodeIds: [node.nodeId] })}>删除</DropdownMenuItem>
    </DropdownMenu>
  );
}

function FileDetails({ node, storage, onPreview }: Readonly<{ node: FileNode; storage: NonNullable<ReturnType<typeof getStorageSpace>>; onPreview: () => void }>) {
  const summary = node.type === 'folder' ? directorySummary(node.nodeId) : undefined;
  return (
    <div className="file-details-card">
      <span className="file-details-icon">{fileIcon(node)}</span>
      <h2>{node.name}</h2>
      {canPreview(node) && <Button onClick={onPreview}>预览文件</Button>}
      <dl>
        <div><dt>类型</dt><dd>{node.type === 'folder' ? '文件夹' : node.mimeType || node.extension}</dd></div>
        <div><dt>大小</dt><dd>{node.type === 'folder' ? formatBytes(summary?.sizeBytes ?? 0) : formatBytes(node.sizeBytes)}</dd></div>
        <div><dt>路径</dt><dd>{getNodePath(node.nodeId)}</dd></div>
        <div><dt>创建时间</dt><dd>{new Date(node.createdAt).toLocaleString('zh-CN', { hour12: false })}</dd></div>
        <div><dt>修改时间</dt><dd>{new Date(node.updatedAt).toLocaleString('zh-CN', { hour12: false })}</dd></div>
        <div><dt>所有者</dt><dd>{node.owner}</dd></div>
        <div><dt>权限</dt><dd>{node.permissions}</dd></div>
        {summary && <><div><dt>文件数量</dt><dd>{summary.files}</dd></div><div><dt>文件夹数量</dt><dd>{summary.folders}</dd></div></>}
        <div><dt>关联资源</dt><dd>{storage.mounts.length ? storage.mounts.map((mount) => <Link key={mount.id} to={resourceDetailPath(mount.resourceType, mount.resourceId)}>{mount.resourceName}</Link>) : '暂未挂载'}</dd></div>
      </dl>
    </div>
  );
}

function FileActionDialog({ storageId, currentFolderId, dialog, onClose, onDone }: Readonly<{ storageId: string; currentFolderId: string; dialog?: ActionDialog; onClose: () => void; onDone: (message: string) => void }>) {
  const [value, setValue] = useState('');
  const [targetId, setTargetId] = useState(currentFolderId);
  const [error, setError] = useState('');
  const nodes = listFileNodes(storageId);
  const tasks = listFileTasks(storageId);

  if (!dialog) return null;
  if (dialog.type === 'preview') {
    return <PreviewModal node={dialog.node} onClose={onClose} onDownload={() => { downloadNode(dialog.node.nodeId); onDone('下载已发起。'); }} />;
  }
  if (dialog.type === 'tasks') {
    return (
      <Modal open title="文件任务中心" onClose={onClose} primaryAction={{ label: '关闭', onClick: onClose }} secondaryAction={{ label: '清除已完成', onClick: () => { clearCompletedTasks(storageId); onDone('已清除完成任务。'); } }}>
        {tasks.length ? <ul className="file-task-list">{tasks.map((task) => <li key={task.id}><div><strong>{task.operation} · {task.subject}</strong><span>{task.targetPath ?? '当前目录'}</span></div><Progress value={task.progress} label={`${task.operation}进度`} /><StatusBadge tone={task.status === 'failed' ? 'error' : task.status === 'completed' ? 'success' : 'info'}>{task.status === 'failed' ? '失败' : task.status === 'completed' ? '已完成' : '进行中'}</StatusBadge>{task.error && <p>{task.error}</p>}{task.status === 'failed' && <Button onClick={() => { retryFileTask(task.id); onDone('任务已重试。'); }}>重试</Button>}<time>{task.completedAt ? new Date(task.completedAt).toLocaleString('zh-CN', { hour12: false }) : '处理中'}</time></li>)}</ul> : <PageState title="暂无文件任务" description="上传、复制、移动、删除和下载操作会显示在这里。" />}
      </Modal>
    );
  }
  const activeDialog = dialog;

  async function submit() {
    setError('');
    try {
      if (activeDialog.type === 'folder') {
        createFolder(storageId, currentFolderId, value);
        onDone('文件夹已创建。');
      } else if (activeDialog.type === 'rename') {
        renameNode(activeDialog.node.nodeId, value);
        onDone('名称已更新。');
      } else if (activeDialog.type === 'copy') {
        copyNodes(activeDialog.nodeIds, targetId);
        onDone('复制任务已完成。');
      } else if (activeDialog.type === 'move') {
        moveNodes(activeDialog.nodeIds, targetId);
        onDone('移动任务已完成。');
      } else if (activeDialog.type === 'delete') {
        deleteNodes(activeDialog.nodeIds);
        onDone('所选对象已删除。');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作失败。');
    }
  }

  const title = dialog.type === 'folder' ? '新建文件夹' : dialog.type === 'rename' ? '重命名' : dialog.type === 'copy' ? '复制到' : dialog.type === 'move' ? '移动到' : '删除文件';
  return (
    <Modal open title={title} onClose={onClose} secondaryAction={{ label: '取消', onClick: onClose }} primaryAction={{ label: dialog.type === 'delete' ? '确认删除' : dialog.type === 'folder' ? '创建文件夹' : '确认', onClick: () => void submit(), variant: dialog.type === 'delete' ? 'danger' : 'primary' }}>
      <div className="file-dialog">
        {(dialog.type === 'folder' || dialog.type === 'rename') && <Input autoFocus value={value} placeholder={dialog.type === 'rename' ? dialog.node.name : '输入文件夹名称'} onChange={(event) => setValue(event.target.value)} />}
        {(dialog.type === 'copy' || dialog.type === 'move') && <>
          <p>选择目标目录；同名对象会被阻止，目录不能移动到自身子目录。</p>
          <DirectoryPicker nodes={nodes} parentId={null} targetId={targetId} onSelect={setTargetId} />
          <p>目标路径：{getNodePath(targetId)}</p>
        </>}
        {dialog.type === 'delete' && <p>将删除 {dialog.nodeIds.length} 个对象。非空文件夹的全部子项也会被删除，容量统计将同步更新。</p>}
        {error && <p className="storage-dialog-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

function DirectoryPicker({ nodes, parentId, targetId, onSelect }: Readonly<{ nodes: readonly FileNode[]; parentId: string | null; targetId: string; onSelect: (nodeId: string) => void }>) {
  const folders = nodes.filter((item) => item.type === 'folder' && item.parentId === parentId);
  return <ul className="file-directory-picker">{folders.map((folder) => <li key={folder.nodeId}><button type="button" data-selected={folder.nodeId === targetId || undefined} onClick={() => onSelect(folder.nodeId)}>📁 {folder.parentId === null ? '根目录' : folder.name}</button><DirectoryPicker nodes={nodes} parentId={folder.nodeId} targetId={targetId} onSelect={onSelect} /></li>)}</ul>;
}

function PreviewModal({ node, onClose, onDownload }: Readonly<{ node: FileNode; onClose: () => void; onDownload: () => void }>) {
  const source = node.objectUrl;
  const text = node.content;
  let content = <div className="file-preview-fallback"><span>{fileIcon(node)}</span><h3>{node.name}</h3><p>{node.mimeType || node.extension || '未知文件类型'} · {formatBytes(node.sizeBytes)}</p></div>;
  if (node.mimeType.startsWith('image/') && source) content = <img className="file-preview-media" src={source} alt={node.name} />;
  else if ((node.mimeType.startsWith('text/') || node.mimeType === 'application/json' || ['md', 'json', 'txt'].includes(node.extension)) && text !== undefined) content = <pre className="file-preview-text">{text}</pre>;
  else if (node.mimeType === 'application/pdf' && source) content = <iframe className="file-preview-frame" src={source} title={node.name} />;
  else if (node.mimeType.startsWith('audio/') && source) content = <audio controls src={source}>当前浏览器不支持音频播放。</audio>;
  else if (node.mimeType.startsWith('video/') && source) content = <video className="file-preview-media" controls src={source}>当前浏览器不支持视频播放。</video>;
  return <Modal open title={`预览 · ${node.name}`} onClose={onClose} secondaryAction={{ label: '下载文件', onClick: onDownload }} primaryAction={{ label: '关闭', onClick: onClose }}><div className="file-preview">{content}</div></Modal>;
}
