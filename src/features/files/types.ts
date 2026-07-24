export type FileNodeType = 'file' | 'folder';

export type FileNode = Readonly<{
  nodeId: string;
  storageId: string;
  parentId: string | null;
  type: FileNodeType;
  name: string;
  extension: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  owner: string;
  permissions: string;
  content?: string;
  objectUrl?: string;
}>;

export type FileTask = Readonly<{
  id: string;
  storageId: string;
  operation: '上传' | '下载' | '复制' | '移动' | '删除';
  subject: string;
  targetPath?: string;
  progress: number;
  status: 'running' | 'completed' | 'failed';
  completedAt?: string;
  error?: string;
}>;

export type FileSort = 'name-asc' | 'name-desc' | 'updated-desc' | 'size-desc';

export type DirectorySummary = Readonly<{
  files: number;
  folders: number;
  sizeBytes: number;
}>;
