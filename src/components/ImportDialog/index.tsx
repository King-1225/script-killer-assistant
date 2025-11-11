import React, { useState } from 'react';
import { Modal, Button, Typography, Divider } from 'antd';
import exportImportService from '../../services/exportImportService';
import storageService from '../../services/storage';
import type { Story } from '../../types';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

type ConflictAction = 'replace' | 'keep' | 'merge' | null;

interface ImportFileData {
  name: string;
  content: string;
  project?: Story;
  version?: string;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onClose,
  onImportSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<ImportFileData | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string>('');
  const [conflict, setConflict] = useState<{ imported: Story; existing: Story } | null>(null);
  const [conflictAction, setConflictAction] = useState<ConflictAction>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsedData = JSON.parse(content);
          
          if (!parsedData.version || !parsedData.project) {
            throw new Error('文件格式无效，缺少必要信息');
          }

          setFileData({
            name: file.name,
            content,
            project: parsedData.project,
            version: parsedData.version,
          });
          setError('');
          setConflict(null);
          setConflictAction(null);
        } catch (err) {
          setError('文件解析失败，请确保选择的是有效的剧本杀项目文件');
          setFileData(null);
          setConflict(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConflictResolve = (action: ConflictAction) => {
    setConflictAction(action);
  };

  const handleImport = async () => {
    if (!fileData || !fileData.content) return;

    setImporting(true);
    setError('');

    try {
      // 如果有冲突且已选择操作
      if (conflict && conflictAction) {
        const importedProject = exportImportService.importProject(
          fileData.content,
          () => conflictAction
        );
        
        if (importedProject) {
          handleImportSuccess();
        } else {
          throw new Error('导入失败，请重试');
        }
      } else {
        // 先检查是否存在冲突
        const existingProjects = storageService.getProjects();
        const projectToImport = fileData.project!;
        const existingProject = existingProjects.find(p => p.id === projectToImport.id);

        if (existingProject) {
          // 发现冲突，显示冲突解决选项
          setConflict({ imported: projectToImport, existing: existingProject });
        } else {
          // 无冲突，直接导入
          const importedProject = exportImportService.importProject(fileData.content);
          if (importedProject) {
            handleImportSuccess();
          } else {
            throw new Error('导入失败，请重试');
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败，请重试');
    } finally {
      setImporting(false);
    }
  };

  const handleImportSuccess = () => {
    setShowSuccess(true);
    if (onImportSuccess) {
      onImportSuccess();
    }
    setTimeout(() => {
      resetDialog();
      onClose();
    }, 2000);
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setFileData(null);
    setError('');
    setConflict(null);
    setConflictAction(null);
    setShowSuccess(false);
    // 重置文件输入
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  return (
    <Modal
        title="导入项目"
        open={open}
        onCancel={() => {
          resetDialog();
          onClose();
        }}
        width={800}
        footer={null}
      >
        {!fileData && !conflict && (
          <div>
            <input
              id="file-input"
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-input">
                <Button
                  type="default"
                  style={{ borderStyle: 'solid', padding: '20px' }}
                >
                  选择剧本杀项目文件 (JSON)
                </Button>
              </label>
            {selectedFile && (
              <Typography.Text style={{ marginTop: 10, display: 'block' }}>{selectedFile.name}</Typography.Text>
            )}
            {error && (
              <Typography.Text type="danger" style={{ marginTop: 10, display: 'block' }}>{error}</Typography.Text>
            )}
          </div>
        )}

        {fileData && !conflict && !selectedFile && (
          <div>
            <Typography.Title level={5}>项目信息</Typography.Title>
            <div style={{ padding: 16, marginBottom: 16, border: '1px solid #f0f0f0' }}>
              <Typography.Text><strong>文件名:</strong> {fileData.name}</Typography.Text><br/>
              <Typography.Text><strong>项目标题:</strong> {fileData.project?.title}</Typography.Text><br/>
              <Typography.Text><strong>版本:</strong> {fileData.version}</Typography.Text><br/>
              <Typography.Text><strong>角色数量:</strong> {fileData.project?.characters?.length || 0}</Typography.Text><br/>
              <Typography.Text><strong>场景数量:</strong> {fileData.project?.scenes?.length || 0}</Typography.Text>
            </div>
          </div>
        )}

        {conflict && conflictAction === null && (
          <div>
            <Typography.Text type="warning">
              检测到项目冲突！已存在同名ID的项目。
            </Typography.Text>
            <div style={{ padding: 16, marginBottom: 16, border: '1px solid #f0f0f0' }}>
              <Typography.Text type="secondary">导入的项目:</Typography.Text>
              <Typography.Text>{conflict.imported.title} (ID: {conflict.imported.id})</Typography.Text>
              <Divider style={{ margin: '10px 0' }} />
              <Typography.Text type="secondary">现有的项目:</Typography.Text>
              <Typography.Text>{conflict.existing.title} (ID: {conflict.existing.id})</Typography.Text>
            </div>
            <Typography.Text style={{ marginBottom: 10, display: 'block' }}>请选择如何处理冲突:</Typography.Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button
                type="default"
                style={{ borderStyle: 'solid' }}
                onClick={() => handleConflictResolve('replace')}
                block
              >
                替换 - 使用导入的项目覆盖现有项目
              </Button>
              <Button
                type="default"
                style={{ borderStyle: 'solid' }}
                onClick={() => handleConflictResolve('keep')}
                block
              >
                保留 - 保留现有项目，不导入新项目
              </Button>
              <Button
                type="default"
                style={{ borderStyle: 'solid' }}
                onClick={() => handleConflictResolve('merge')}
                block
              >
                合并 - 合并两个项目的内容（保留两者的角色和场景）
              </Button>
            </div>
          </div>
        )}

        {showSuccess && (
          <Typography.Text type="success">
            项目导入成功！
          </Typography.Text>
        )}
      <div style={{ marginTop: '20px', textAlign: 'right' }}>
          {!conflict && (
            <Button
              onClick={() => {
                resetDialog();
                onClose();
              }}
              disabled={importing}
              style={{ marginRight: '8px' }}
            >
              取消
            </Button>
          )}
          {(fileData && !conflict) && (
            <Button
              onClick={handleImport}
              type="primary"
              disabled={importing}
            >
              {importing ? '导入中...' : '导入'}
            </Button>
          )}
          {conflict && conflictAction && (
            <Button
              onClick={handleImport}
              type="primary"
              disabled={importing}
            >
              {importing ? '处理中...' : '确认'}
            </Button>
          )}
        </div>
      </Modal>
  );
};

export default ImportDialog;