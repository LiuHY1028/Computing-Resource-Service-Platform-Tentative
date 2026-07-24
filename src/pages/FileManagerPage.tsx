import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { APP_PATHS, resourceDetailPath, storageDetailPath } from '../app/routes';
import { NavigationIcon } from '../app/shell/icons/AppShellIcons';
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
  UsageMeter,
} from '../components/ui';
import {
  canUndoFileOperation,
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
  undoLastFileOperation,
  uploadFiles,
  type FileNode,
  type FileSort,
} from '../features/files';
import {
  canManageStorageFiles,
  getStorageSpace,
} from '../features/storage';
import '../styles/file-manager.css';

type ActionDialog =
  | { type: 'folder' }
  | { type: 'rename'; node: FileNode }
  | { type: 'copy' | 'move'; nodeIds: string[] }
  | { type: 'delete'; nodeIds: string[] }
  | { type: 'preview'; node: FileNode };

type ContextTarget =
  | { kind: 'node'; node: FileNode; x: number; y: number }
  | { kind: 'folder'; node: FileNode; x: number; y: number }
  | { kind: 'blank'; x: number; y: number };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function FileTypeIcon({ node }: Readonly<{ node: FileNode }>) {
  const name = node.type === 'folder'
    ? 'storage'
    : node.mimeType.startsWith('image/')
      ? 'images'
      : 'orders';
  return <NavigationIcon name={name} />;
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
  const workspaceRef = useRef<HTMLElement>(null);
  const lastSelectedId = useRef<string | undefined>(undefined);
  const storage = getStorageSpace(storageId);
  const root = storage ? getRootFolder(storageId) : undefined;
  const [revision, setRevision] = useState(0);
  const [history, setHistory] = useState<string[]>(() => root ? [root.nodeId] : []);
  const [historyIndex, setHistoryIndex] = useState(() => root ? 0 : -1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<FileSort>('name-asc');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(true);
  const [taskOpen, setTaskOpen] = useState(false);
  const [quickAccess, setQuickAccess] = useState<'folder' | 'recent' | 'images' | 'documents'>('folder');
  const [clipboard, setClipboard] = useState<{ mode: 'copy' | 'cut'; nodeIds: string[] }>();
  const [contextTarget, setContextTarget] = useState<ContextTarget>();
  const [dialog, setDialog] = useState<ActionDialog>();
  const [feedback, setFeedback] = useState('');
  const [dragging, setDragging] = useState(false);
  const [dragTargetId, setDragTargetId] = useState('');

  useEffect(() => {
    const close = () => setContextTarget(undefined);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  if (!storage || !root) {
    return <main className="file-manager-page"><PageState tone="error" title="未找到文件系统" description="存储或根目录不可用。" actionLabel="返回存储管理" onAction={() => navigate(APP_PATHS.storage)} /></main>;
  }
  if (!canManageStorageFiles(storage)) {
    return <main className="file-manager-page"><PageState title="暂不能管理文件" description={storage.type === 'cloud-disk' ? '请先挂载云硬盘并初始化文件系统。' : '当前存储状态不可用。'} actionLabel="查看存储详情" onAction={() => navigate(storageDetailPath(storage.id))} /></main>;
  }

  void revision;
  const currentFolderId = history[historyIndex] ?? root.nodeId;
  const currentFolder = getFileNode(currentFolderId) ?? root;
  const allNodes = listFileNodes(storageId);
  const directoryRows = listDirectory(storageId, currentFolderId, search, sort);
  const searchTerm = search.trim().toLocaleLowerCase();
  const quickRows = allNodes
    .filter((node) => node.parentId !== null)
    .filter((node) => !searchTerm || node.name.toLocaleLowerCase().includes(searchTerm))
    .filter((node) => {
      if (quickAccess === 'recent') return true;
      if (quickAccess === 'images') return node.type === 'file' && node.mimeType.startsWith('image/');
      if (quickAccess === 'documents') return node.type === 'file' && (
        node.mimeType.startsWith('text/')
        || node.mimeType === 'application/json'
        || node.mimeType === 'application/pdf'
        || ['md', 'json', 'txt'].includes(node.extension)
      );
      return false;
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const rows = quickAccess === 'folder' ? directoryRows : quickRows;
  const selected = selectedIds.map(getFileNode).filter((item): item is FileNode => Boolean(item));
  const detailNode = selected.length === 1 ? selected[0] : undefined;

  function refresh(message?: string) {
    setRevision((value) => value + 1);
    setSelectedIds([]);
    lastSelectedId.current = undefined;
    if (message) setFeedback(message);
  }

  function openFolder(nodeId: string) {
    if (nodeId === currentFolderId) return;
    const next = [...history.slice(0, historyIndex + 1), nodeId];
    setHistory(next);
    setHistoryIndex(next.length - 1);
    setSelectedIds([]);
    setSearch('');
    setQuickAccess('folder');
  }

  function goHistory(index: number) {
    if (index < 0 || index >= history.length) return;
    setHistoryIndex(index);
    setSelectedIds([]);
    setSearch('');
    setQuickAccess('folder');
  }

  function toggleSelection(nodeId: string, additive = false, range = false) {
    setSelectedIds((current) => {
      if (range && lastSelectedId.current) {
        const start = rows.findIndex((node) => node.nodeId === lastSelectedId.current);
        const end = rows.findIndex((node) => node.nodeId === nodeId);
        if (start >= 0 && end >= 0) {
          const ids = rows.slice(Math.min(start, end), Math.max(start, end) + 1).map((node) => node.nodeId);
          return Array.from(new Set(additive ? [...current, ...ids] : ids));
        }
      }
      return additive
        ? current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId]
        : [nodeId];
    });
    lastSelectedId.current = nodeId;
    if (window.innerWidth >= 1600) setDetailsOpen(true);
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

  function selectQuickAccess(next: typeof quickAccess) {
    setQuickAccess(next);
    setSearch('');
    setSelectedIds([]);
  }

  function copySelection(mode: 'copy' | 'cut') {
    if (!selectedIds.length) return;
    setClipboard({ mode, nodeIds: selectedIds });
    setFeedback(`${selectedIds.length} 个对象已${mode === 'copy' ? '复制' : '剪切'}，请选择目标目录后粘贴。`);
  }

  function pasteClipboard(targetId = currentFolderId) {
    if (!clipboard?.nodeIds.length) {
      setFeedback('剪贴板中没有可粘贴的对象。');
      return;
    }
    try {
      if (clipboard.mode === 'copy') copyNodes(clipboard.nodeIds, targetId);
      else moveNodes(clipboard.nodeIds, targetId);
      if (clipboard.mode === 'cut') setClipboard(undefined);
      refresh(`${clipboard.nodeIds.length} 个对象已更新到目标目录。`);
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : '粘贴失败。');
    }
  }

  function undoLast() {
    try {
      const label = undoLastFileOperation(storageId);
      refresh(`已撤销：${label}。`);
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : '撤销失败。');
    }
  }

  function openNode(node: FileNode) {
    if (node.type === 'folder') openFolder(node.nodeId);
    else setDialog({ type: 'preview', node });
  }

  function handleWorkspaceKey(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, [contenteditable="true"]')) return;
    const command = event.metaKey || event.ctrlKey;
    if (command && event.key.toLocaleLowerCase() === 'a') {
      event.preventDefault();
      setSelectedIds(rows.map((node) => node.nodeId));
    } else if (command && event.key.toLocaleLowerCase() === 'c') {
      event.preventDefault();
      copySelection('copy');
    } else if (command && event.key.toLocaleLowerCase() === 'x') {
      event.preventDefault();
      copySelection('cut');
    } else if (command && event.key.toLocaleLowerCase() === 'v') {
      event.preventDefault();
      pasteClipboard();
    } else if (command && event.key.toLocaleLowerCase() === 'z') {
      event.preventDefault();
      undoLast();
    } else if (event.key === 'Escape') {
      setSelectedIds([]);
      setContextTarget(undefined);
    } else if (event.key === 'Delete' && selectedIds.length) {
      setDialog({ type: 'delete', nodeIds: selectedIds });
    } else if (event.key === 'F2' && selected.length === 1) {
      event.preventDefault();
      setDialog({ type: 'rename', node: selected[0] });
    } else if (event.key === 'Enter' && selected.length === 1) {
      openNode(selected[0]);
    }
  }

  function moveDrop(nodeIds: readonly string[], targetId: string) {
    try {
      moveNodes(nodeIds, targetId);
      refresh(`${nodeIds.length} 个对象已移动到目标目录。`);
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : '移动失败。');
    } finally {
      setDragTargetId('');
    }
  }

  return (
    <main
      ref={workspaceRef}
      className="file-manager-page"
      tabIndex={-1}
      onKeyDown={handleWorkspaceKey}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (event.dataTransfer.files.length) void handleFiles(event.dataTransfer.files);
      }}
    >
      <header className="file-manager-header">
        <div>
          <TextButton onClick={() => navigate(storageDetailPath(storage.id))}>返回存储详情</TextButton>
          <h2>{storage.name}</h2>
          <p>{storage.site} · 当前路径 {getNodePath(currentFolderId)}</p>
        </div>
        <div className="file-manager-header-actions">
          <Button onClick={() => setDetailsOpen((value) => !value)} aria-pressed={detailsOpen}>详细信息</Button>
          <Button onClick={() => setTaskOpen(true)}>任务中心 ({listFileTasks(storageId).length})</Button>
        </div>
      </header>

      {feedback && (
        <div className="file-manager-feedback" role="status">
          <span>{feedback}</span>
          {canUndoFileOperation(storageId) && <Button variant="ghost" onClick={undoLast}>撤销</Button>}
          <button type="button" aria-label="关闭提示" onClick={() => setFeedback('')}>×</button>
        </div>
      )}
      <section className="file-manager-shell" data-details={detailsOpen ? 'open' : 'closed'} data-tree={treeOpen ? 'open' : 'closed'}>
        <div className="file-manager-toolbar">
          <div className="file-manager-address-row">
            <div className="file-manager-nav-buttons" role="toolbar" aria-label="目录导航">
              <Button aria-label="后退" title="后退" disabled={historyIndex <= 0} onClick={() => goHistory(historyIndex - 1)}>后退</Button>
              <Button aria-label="前进" title="前进" disabled={historyIndex >= history.length - 1} onClick={() => goHistory(historyIndex + 1)}>前进</Button>
              <Button aria-label="返回上级" title="返回上级" disabled={!currentFolder.parentId} onClick={() => currentFolder.parentId && openFolder(currentFolder.parentId)}>上级</Button>
              <Button aria-label="刷新当前目录" onClick={() => refresh('当前目录已刷新。')}>刷新</Button>
            </div>
            <nav className="file-manager-breadcrumbs" aria-label="当前路径">
              {getPathNodes(currentFolderId).map((item, index, items) => (
                <span key={item.nodeId}><button type="button" onClick={() => openFolder(item.nodeId)}>{item.parentId === null ? storage.name : item.name}</button>{index < items.length - 1 && <b>/</b>}</span>
              ))}
            </nav>
            <SearchInput value={search} placeholder="搜索文件和文件夹" onChange={(event) => setSearch(event.target.value)} clearable onClear={() => setSearch('')} />
          </div>

          {selected.length > 0 ? (
            <div className="file-manager-selection-bar" role="toolbar" aria-label="已选文件操作">
              <strong>已选择 {selected.length} 项</strong>
              <Button onClick={downloadSelection}>下载</Button>
              <Button onClick={() => copySelection('copy')}>复制</Button>
              <Button onClick={() => copySelection('cut')}>剪切</Button>
              <Button onClick={() => setDialog({ type: 'move', nodeIds: selectedIds })}>移动到</Button>
              {selected.length === 1 && <Button onClick={() => setDialog({ type: 'rename', node: selected[0] })}>重命名</Button>}
              <Button variant="danger" onClick={() => setDialog({ type: 'delete', nodeIds: selectedIds })}>删除</Button>
              <Button variant="ghost" onClick={() => setSelectedIds([])}>取消选择</Button>
            </div>
          ) : (
            <div className="file-manager-command-row" role="toolbar" aria-label="文件操作">
              <input ref={inputRef} className="file-manager-file-input" type="file" multiple onChange={(event) => event.target.files && void handleFiles(event.target.files)} />
              <Button variant="primary" onClick={() => inputRef.current?.click()}>上传文件</Button>
              <Button onClick={() => setDialog({ type: 'folder' })}>新建文件夹</Button>
              <Button disabled={!clipboard?.nodeIds.length} onClick={() => pasteClipboard()}>粘贴</Button>
              <Button disabled={!canUndoFileOperation(storageId)} onClick={undoLast}>撤销</Button>
              <span className="file-manager-command-spacer" />
              <Select aria-label="排序" value={sort} onValueChange={(value) => setSort(value as FileSort)} options={[{ value: 'name-asc', label: '名称升序' }, { value: 'name-desc', label: '名称降序' }, { value: 'updated-desc', label: '最近修改' }, { value: 'size-desc', label: '大小降序' }]} />
              <Button aria-pressed={view === 'list'} onClick={() => setView('list')}>列表</Button>
              <Button aria-pressed={view === 'grid'} onClick={() => setView('grid')}>网格</Button>
            </div>
          )}
        </div>

        <aside className="file-manager-tree">
          <div className="file-manager-pane-heading"><strong>导航</strong><button type="button" onClick={() => setTreeOpen(false)} aria-label="收起导航">‹</button></div>
          <div className="file-manager-quick-access" aria-label="快速访问">
            <span>快速访问</span>
            <button type="button" data-current={quickAccess === 'folder' && currentFolderId === root.nodeId || undefined} onClick={() => { openFolder(root.nodeId); selectQuickAccess('folder'); }}>根目录</button>
            <button type="button" data-current={quickAccess === 'recent' || undefined} onClick={() => selectQuickAccess('recent')}>最近使用</button>
            <button type="button" data-current={quickAccess === 'images' || undefined} onClick={() => selectQuickAccess('images')}>图片</button>
            <button type="button" data-current={quickAccess === 'documents' || undefined} onClick={() => selectQuickAccess('documents')}>文档</button>
          </div>
          <div className="file-manager-tree-section">
            <span>文件夹</span>
            <DirectoryTree
              nodes={allNodes}
              parentId={null}
              currentId={currentFolderId}
              dragTargetId={dragTargetId}
              onOpen={openFolder}
              onContext={(node, event) => {
                event.preventDefault();
                event.stopPropagation();
                setContextTarget({ kind: 'folder', node, x: event.clientX, y: event.clientY });
              }}
              onDropNodes={moveDrop}
              onDragTarget={setDragTargetId}
            />
          </div>
          <div className="file-manager-tree-capacity">
            <strong>{storage.name}</strong>
            <UsageMeter used={storage.usedGb} total={storage.capacityGb} label="存储容量使用率" size="mini" />
          </div>
        </aside>
        {!treeOpen && <button className="file-manager-pane-opener file-manager-pane-opener--tree" type="button" onClick={() => setTreeOpen(true)} aria-label="展开目录树">›</button>}

        <section
          className="file-manager-content"
          onClick={(event) => {
            if (event.currentTarget === event.target) setSelectedIds([]);
          }}
          onContextMenu={(event) => {
            if (event.currentTarget !== event.target) return;
            event.preventDefault();
            setContextTarget({ kind: 'blank', x: event.clientX, y: event.clientY });
          }}
        >
          {dragging && <div className="file-manager-drop-zone">释放后将文件加入“{currentFolder.name}”</div>}
          {!rows.length ? (
            <div className="file-manager-empty">
              <PageState title={search ? '没有找到文件' : '当前目录为空'} description={search ? '调整搜索词或返回当前目录。' : '可拖拽文件到此区域，或使用下方操作。'} actionLabel={search ? '清除搜索' : '上传文件'} onAction={() => search ? setSearch('') : inputRef.current?.click()} />
              {!search && <div><Button onClick={() => setDialog({ type: 'folder' })}>新建文件夹</Button>{currentFolder.parentId && <Button variant="ghost" onClick={() => currentFolder.parentId && openFolder(currentFolder.parentId)}>返回上级</Button>}</div>}
            </div>
          ) : view === 'list' ? (
            <div className="file-list" role="grid" aria-label="文件列表">
              <div className="file-list-row file-list-head" role="row">
                <Checkbox
                  checked={rows.length > 0 && rows.every((node) => selectedIds.includes(node.nodeId))}
                  indeterminate={selectedIds.length > 0 && !rows.every((node) => selectedIds.includes(node.nodeId))}
                  onCheckedChange={(checked) => setSelectedIds(checked ? rows.map((node) => node.nodeId) : [])}
                  aria-label="选择当前视图全部对象"
                >
                  {' '}
                </Checkbox>
                <span>名称</span><span>修改时间</span><span>类型</span><span>大小</span><span>所有者</span><span>操作</span>
              </div>
              {rows.map((node) => (
                <div
                  className="file-list-row"
                  data-selected={selectedIds.includes(node.nodeId) || undefined}
                  data-drag-target={dragTargetId === node.nodeId || undefined}
                  key={node.nodeId}
                  role="row"
                  tabIndex={0}
                  draggable
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest('.ui-checkbox')) return;
                    toggleSelection(node.nodeId, event.metaKey || event.ctrlKey, event.shiftKey);
                  }}
                  onDoubleClick={() => openNode(node)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!selectedIds.includes(node.nodeId)) toggleSelection(node.nodeId);
                    setContextTarget({ kind: 'node', node, x: event.clientX, y: event.clientY });
                  }}
                  onDragStart={(event) => {
                    const ids = selectedIds.includes(node.nodeId) ? selectedIds : [node.nodeId];
                    event.dataTransfer.setData('application/x-file-node-ids', JSON.stringify(ids));
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(event) => {
                    if (node.type !== 'folder' || !event.dataTransfer.types.includes('application/x-file-node-ids')) return;
                    event.preventDefault();
                    event.stopPropagation();
                    setDragTargetId(node.nodeId);
                  }}
                  onDragLeave={() => setDragTargetId('')}
                  onDrop={(event) => {
                    if (node.type !== 'folder') return;
                    const data = event.dataTransfer.getData('application/x-file-node-ids');
                    if (!data) return;
                    event.preventDefault();
                    event.stopPropagation();
                    moveDrop(JSON.parse(data) as string[], node.nodeId);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    openNode(node);
                  }}
                >
                  <Checkbox
                    checked={selectedIds.includes(node.nodeId)}
                    onClick={(event) => event.stopPropagation()}
                    onCheckedChange={() => toggleSelection(node.nodeId, true)}
                    aria-label={`选择${node.name}`}
                  >
                    {' '}
                  </Checkbox>
                  <span className="file-name-cell"><i><FileTypeIcon node={node} /></i><strong>{node.name}</strong></span>
                  <span>{new Date(node.updatedAt).toLocaleString('zh-CN', { hour12: false })}</span>
                  <span>{node.type === 'folder' ? '文件夹' : node.extension.toUpperCase() || node.mimeType}</span>
                  <span>{node.type === 'folder' ? '—' : formatBytes(node.sizeBytes)}</span>
                  <span>{node.owner}</span>
                  <div className="file-row-actions">
                    <TextButton onClick={(event) => { event.stopPropagation(); openNode(node); }}>{node.type === 'folder' ? '打开' : '预览'}</TextButton>
                    {node.type === 'file' && <TextButton onClick={(event) => { event.stopPropagation(); downloadNode(node.nodeId); refresh('下载已在浏览器中发起。'); }}>下载</TextButton>}
                    <NodeMenu node={node} onOpen={() => openNode(node)} onDetails={() => { setSelectedIds([node.nodeId]); setDetailsOpen(true); }} onAction={setDialog} onDownload={() => { downloadNode(node.nodeId); refresh('下载已在浏览器中发起。'); }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="file-grid">
              {rows.map((node) => (
                <article
                  className="file-card"
                  data-selected={selectedIds.includes(node.nodeId) || undefined}
                  key={node.nodeId}
                  tabIndex={0}
                  draggable
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest('.ui-checkbox')) return;
                    toggleSelection(node.nodeId, event.metaKey || event.ctrlKey, event.shiftKey);
                  }}
                  onDoubleClick={() => openNode(node)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!selectedIds.includes(node.nodeId)) toggleSelection(node.nodeId);
                    setContextTarget({ kind: 'node', node, x: event.clientX, y: event.clientY });
                  }}
                  onDragStart={(event) => {
                    const ids = selectedIds.includes(node.nodeId) ? selectedIds : [node.nodeId];
                    event.dataTransfer.setData('application/x-file-node-ids', JSON.stringify(ids));
                  }}
                >
                  <Checkbox
                    checked={selectedIds.includes(node.nodeId)}
                    onClick={(event) => event.stopPropagation()}
                    onCheckedChange={() => toggleSelection(node.nodeId, true)}
                    aria-label={`选择${node.name}`}
                  >
                    {' '}
                  </Checkbox>
                  <span className="file-card-icon"><FileTypeIcon node={node} /></span>
                  <strong>{node.name}</strong>
                  <small>{node.type === 'folder' ? `${directorySummary(node.nodeId).files} 个文件` : formatBytes(node.sizeBytes)}</small>
                  <NodeMenu node={node} onOpen={() => openNode(node)} onDetails={() => { setSelectedIds([node.nodeId]); setDetailsOpen(true); }} onAction={setDialog} onDownload={() => { downloadNode(node.nodeId); refresh('下载已在浏览器中发起。'); }} />
                </article>
              ))}
            </div>
          )}
        </section>

        {detailsOpen ? (
          <aside className="file-manager-details">
            <div className="file-manager-pane-heading"><strong>详细信息</strong><button type="button" onClick={() => setDetailsOpen(false)} aria-label="收起详细信息">›</button></div>
            {detailNode
              ? <FileDetails node={detailNode} storage={storage} onPreview={() => setDialog({ type: 'preview', node: detailNode })} />
              : selected.length > 1
                ? (
                  <div className="file-details-summary">
                    <span>选择汇总</span>
                    <strong>{selected.length} 个对象</strong>
                    <dl>
                      <div><dt>文件</dt><dd>{selected.filter((node) => node.type === 'file').length}</dd></div>
                      <div><dt>文件夹</dt><dd>{selected.filter((node) => node.type === 'folder').length}</dd></div>
                      <div><dt>文件大小</dt><dd>{formatBytes(selected.filter((node) => node.type === 'file').reduce((total, node) => total + node.sizeBytes, 0))}</dd></div>
                    </dl>
                    <Button onClick={() => setDialog({ type: 'move', nodeIds: selectedIds })}>移动所选对象</Button>
                  </div>
                )
                : <FileDetails node={currentFolder} storage={storage} onPreview={() => undefined} />}
          </aside>
        ) : <button className="file-manager-pane-opener file-manager-pane-opener--details" type="button" onClick={() => setDetailsOpen(true)} aria-label="展开详细信息">‹</button>}
      </section>

      {contextTarget && (
        <ContextMenu
          target={contextTarget}
          canPaste={Boolean(clipboard?.nodeIds.length)}
          onClose={() => setContextTarget(undefined)}
          onOpen={(node) => openNode(node)}
          onUpload={() => inputRef.current?.click()}
          onCreateFolder={() => setDialog({ type: 'folder' })}
          onPaste={() => pasteClipboard(contextTarget.kind === 'folder' ? contextTarget.node.nodeId : currentFolderId)}
          onRefresh={() => refresh('当前目录已刷新。')}
          onView={setView}
          onSort={setSort}
          onDownload={(node) => { downloadNode(node.nodeId); refresh('下载已在浏览器中发起。'); }}
          onDetails={(node) => { setSelectedIds([node.nodeId]); setDetailsOpen(true); }}
          onAction={setDialog}
        />
      )}

      <TaskDrawer
        open={taskOpen}
        storageId={storageId}
        onClose={() => setTaskOpen(false)}
        onChanged={(message) => {
          setRevision((value) => value + 1);
          setFeedback(message);
        }}
      />

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

function DirectoryTree({
  nodes,
  parentId,
  currentId,
  dragTargetId,
  onOpen,
  onContext,
  onDropNodes,
  onDragTarget,
}: Readonly<{
  nodes: readonly FileNode[];
  parentId: string | null;
  currentId: string;
  dragTargetId: string;
  onOpen: (nodeId: string) => void;
  onContext: (node: FileNode, event: MouseEvent<HTMLButtonElement>) => void;
  onDropNodes: (nodeIds: readonly string[], targetId: string) => void;
  onDragTarget: (nodeId: string) => void;
}>) {
  const folders = nodes.filter((item) => item.type === 'folder' && item.parentId === parentId);
  if (!folders.length) return null;
  return (
    <ul>
      {folders.map((folder) => (
        <li key={folder.nodeId}>
          <button
            type="button"
            data-current={folder.nodeId === currentId || undefined}
            data-drag-target={folder.nodeId === dragTargetId || undefined}
            onClick={() => onOpen(folder.nodeId)}
            onContextMenu={(event) => onContext(folder, event)}
            onDragOver={(event) => {
              if (!event.dataTransfer.types.includes('application/x-file-node-ids')) return;
              event.preventDefault();
              event.stopPropagation();
              onDragTarget(folder.nodeId);
            }}
            onDragLeave={() => onDragTarget('')}
            onDrop={(event) => {
              const data = event.dataTransfer.getData('application/x-file-node-ids');
              if (!data) return;
              event.preventDefault();
              event.stopPropagation();
              onDropNodes(JSON.parse(data) as string[], folder.nodeId);
            }}
          >
            <span className="file-tree-chevron" aria-hidden="true">›</span>
            <span className="file-tree-icon"><NavigationIcon name="storage" /></span>
            <span>{folder.parentId === null ? '根目录' : folder.name}</span>
          </button>
          <DirectoryTree
            nodes={nodes}
            parentId={folder.nodeId}
            currentId={currentId}
            dragTargetId={dragTargetId}
            onOpen={onOpen}
            onContext={onContext}
            onDropNodes={onDropNodes}
            onDragTarget={onDragTarget}
          />
        </li>
      ))}
    </ul>
  );
}

function NodeMenu({ node, onOpen, onDetails, onAction, onDownload }: Readonly<{ node: FileNode; onOpen: () => void; onDetails: () => void; onAction: (dialog: ActionDialog) => void; onDownload: () => void }>) {
  return (
    <DropdownMenu trigger={<span>更多</span>} aria-label={`${node.name}更多操作`}>
      <DropdownMenuItem onSelect={onOpen}>{node.type === 'folder' ? '打开文件夹' : '预览文件'}</DropdownMenuItem>
      {node.type === 'file' && <DropdownMenuItem onSelect={onDownload}>下载文件</DropdownMenuItem>}
      <DropdownMenuItem onSelect={() => onAction({ type: 'rename', node })}>重命名</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction({ type: 'copy', nodeIds: [node.nodeId] })}>复制到</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction({ type: 'move', nodeIds: [node.nodeId] })}>移动到</DropdownMenuItem>
      <DropdownMenuItem onSelect={onDetails}>查看详细信息</DropdownMenuItem>
      <DropdownMenuItem danger onSelect={() => onAction({ type: 'delete', nodeIds: [node.nodeId] })}>删除</DropdownMenuItem>
    </DropdownMenu>
  );
}

function ContextMenu({
  target,
  canPaste,
  onClose,
  onOpen,
  onUpload,
  onCreateFolder,
  onPaste,
  onRefresh,
  onView,
  onSort,
  onDownload,
  onDetails,
  onAction,
}: Readonly<{
  target: ContextTarget;
  canPaste: boolean;
  onClose: () => void;
  onOpen: (node: FileNode) => void;
  onUpload: () => void;
  onCreateFolder: () => void;
  onPaste: () => void;
  onRefresh: () => void;
  onView: (view: 'list' | 'grid') => void;
  onSort: (sort: FileSort) => void;
  onDownload: (node: FileNode) => void;
  onDetails: (node: FileNode) => void;
  onAction: (dialog: ActionDialog) => void;
}>) {
  const node = target.kind === 'blank' ? undefined : target.node;
  function run(action: () => void) {
    action();
    onClose();
  }
  return (
    <div
      className="file-context-menu"
      role="menu"
      aria-label={node ? `${node.name}操作` : '目录操作'}
      style={{ left: Math.min(target.x, window.innerWidth - 220), top: Math.min(target.y, window.innerHeight - 360) }}
      onClick={(event) => event.stopPropagation()}
    >
      {node ? (
        <>
          <button role="menuitem" type="button" onClick={() => run(() => onOpen(node))}>{node.type === 'folder' ? '打开文件夹' : '打开预览'}</button>
          {node.type === 'file' && <button role="menuitem" type="button" onClick={() => run(() => onDownload(node))}>下载文件</button>}
          <hr />
          <button role="menuitem" type="button" onClick={() => run(() => onAction({ type: 'rename', node }))}>重命名</button>
          <button role="menuitem" type="button" onClick={() => run(() => onAction({ type: 'copy', nodeIds: [node.nodeId] }))}>复制到</button>
          <button role="menuitem" type="button" onClick={() => run(() => onAction({ type: 'move', nodeIds: [node.nodeId] }))}>移动到</button>
          <button role="menuitem" type="button" onClick={() => run(() => onDetails(node))}>查看详细信息</button>
          <hr />
          <button className="file-context-menu__danger" role="menuitem" type="button" onClick={() => run(() => onAction({ type: 'delete', nodeIds: [node.nodeId] }))}>删除</button>
        </>
      ) : (
        <>
          <button role="menuitem" type="button" onClick={() => run(onUpload)}>上传文件</button>
          <button role="menuitem" type="button" onClick={() => run(onCreateFolder)}>新建文件夹</button>
          <button role="menuitem" type="button" disabled={!canPaste} onClick={() => run(onPaste)}>粘贴</button>
          <button role="menuitem" type="button" onClick={() => run(onRefresh)}>刷新</button>
          <hr />
          <button role="menuitem" type="button" onClick={() => run(() => onView('list'))}>列表视图</button>
          <button role="menuitem" type="button" onClick={() => run(() => onView('grid'))}>网格视图</button>
          <button role="menuitem" type="button" onClick={() => run(() => onSort('name-asc'))}>按名称排序</button>
          <button role="menuitem" type="button" onClick={() => run(() => onSort('updated-desc'))}>按修改时间排序</button>
        </>
      )}
    </div>
  );
}

function TaskDrawer({
  open,
  storageId,
  onClose,
  onChanged,
}: Readonly<{
  open: boolean;
  storageId: string;
  onClose: () => void;
  onChanged: (message: string) => void;
}>) {
  if (!open) return null;
  const tasks = listFileTasks(storageId);
  return (
    <aside className="file-task-drawer" role="dialog" aria-label="文件任务中心" aria-modal="false">
      <header>
        <div><span>传输与操作</span><h2>任务中心</h2></div>
        <button type="button" onClick={onClose} aria-label="关闭任务中心">×</button>
      </header>
      <div className="file-task-drawer__actions">
        <span>{tasks.length} 个任务</span>
        <Button
          variant="ghost"
          disabled={!tasks.some((task) => task.status === 'completed')}
          onClick={() => {
            clearCompletedTasks(storageId);
            onChanged('已清除完成任务。');
          }}
        >
          清除已完成
        </Button>
      </div>
      {tasks.length ? (
        <ul className="file-task-list">
          {tasks.map((task) => (
            <li key={task.id}>
              <div><strong>{task.operation} · {task.subject}</strong><span>{task.targetPath ?? '当前目录'}</span></div>
              <Progress value={task.progress} label={`${task.operation}进度`} />
              <StatusBadge tone={task.status === 'failed' ? 'error' : task.status === 'completed' ? 'success' : 'info'}>{task.status === 'failed' ? '失败' : task.status === 'completed' ? '已完成' : '进行中'}</StatusBadge>
              {task.error && <p>{task.error}</p>}
              {task.status === 'failed' && <Button onClick={() => { retryFileTask(task.id); onChanged('任务已重新处理。'); }}>重试</Button>}
              <time>{task.completedAt ? new Date(task.completedAt).toLocaleString('zh-CN', { hour12: false }) : '处理中'}</time>
            </li>
          ))}
        </ul>
      ) : <PageState title="暂无文件任务" description="上传、复制、移动、删除和下载操作会显示在这里。" />}
    </aside>
  );
}

function FileDetails({ node, storage, onPreview }: Readonly<{ node: FileNode; storage: NonNullable<ReturnType<typeof getStorageSpace>>; onPreview: () => void }>) {
  const summary = node.type === 'folder' ? directorySummary(node.nodeId) : undefined;
  return (
    <div className="file-details-card">
      <span className="file-details-icon"><FileTypeIcon node={node} /></span>
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

  if (!dialog) return null;
  if (dialog.type === 'preview') {
    return <PreviewModal node={dialog.node} onClose={onClose} onDownload={() => { downloadNode(dialog.node.nodeId); onDone('下载已发起。'); }} />;
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
  return <ul className="file-directory-picker">{folders.map((folder) => <li key={folder.nodeId}><button type="button" data-selected={folder.nodeId === targetId || undefined} onClick={() => onSelect(folder.nodeId)}><NavigationIcon name="storage" /> {folder.parentId === null ? '根目录' : folder.name}</button><DirectoryPicker nodes={nodes} parentId={folder.nodeId} targetId={targetId} onSelect={onSelect} /></li>)}</ul>;
}

function PreviewModal({ node, onClose, onDownload }: Readonly<{ node: FileNode; onClose: () => void; onDownload: () => void }>) {
  const source = node.objectUrl;
  const text = node.content;
  let content = <div className="file-preview-fallback"><span><FileTypeIcon node={node} /></span><h3>{node.name}</h3><p>{node.mimeType || node.extension || '未知文件类型'} · {formatBytes(node.sizeBytes)}</p></div>;
  if (node.mimeType.startsWith('image/') && source) content = <img className="file-preview-media" src={source} alt={node.name} />;
  else if ((node.mimeType.startsWith('text/') || node.mimeType === 'application/json' || ['md', 'json', 'txt'].includes(node.extension)) && text !== undefined) content = <pre className="file-preview-text">{text}</pre>;
  else if (node.mimeType === 'application/pdf' && source) content = <iframe className="file-preview-frame" src={source} title={node.name} />;
  else if (node.mimeType.startsWith('audio/') && source) content = <audio controls src={source}>当前浏览器不支持音频播放。</audio>;
  else if (node.mimeType.startsWith('video/') && source) content = <video className="file-preview-media" controls src={source}>当前浏览器不支持视频播放。</video>;
  return <Modal open title={`预览 · ${node.name}`} onClose={onClose} secondaryAction={{ label: '下载文件', onClick: onDownload }} primaryAction={{ label: '关闭', onClick: onClose }}><div className="file-preview">{content}</div></Modal>;
}
