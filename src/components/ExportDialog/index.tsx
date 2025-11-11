import React, { useState } from 'react';
import { Modal, Button, Checkbox, Select, Typography, Divider, Form } from 'antd';
import exportImportService from '../../services/exportImportService';
import type { Character } from '../../types';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  characters: Character[];
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  projectId,
  projectTitle,
  characters,
}) => {
  const [exportType, setExportType] = useState<'json' | 'characterPdf' | 'organizerPdf' | 'printVersion'>('json');
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCharacterToggle = (characterId: string) => {
    setSelectedCharacters((prev) =>
      prev.includes(characterId)
        ? prev.filter((id) => id !== characterId)
        : [...prev, characterId]
    );
  };

  const handleSelectAllCharacters = () => {
    if (selectedCharacters.length === characters.length) {
      setSelectedCharacters([]);
    } else {
      setSelectedCharacters(characters.map((char) => char.id));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    let success = false;

    try {
      switch (exportType) {
        case 'json':
          const jsonData = exportImportService.exportProjectAsJSON(projectId);
          if (jsonData) {
            // 创建下载链接
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${projectTitle}_完整项目_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            success = true;
          }
          break;
        case 'characterPdf':
          success = await exportImportService.exportCharacterScriptsAsPDF(
            projectId,
            selectedCharacters.length > 0 ? selectedCharacters : undefined
          );
          break;
        case 'organizerPdf':
          success = await exportImportService.exportOrganizerGuideAsPDF(projectId);
          break;
        case 'printVersion':
          success = await exportImportService.exportPrintOptimizedVersion(projectId);
          break;
      }

      if (success) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      title="导出项目"
      open={open}
      onCancel={onClose}
      width={800}
      footer={null}
    >
        <Form.Item label="导出格式">
          <Select
            value={exportType}
            onChange={(value: any) => setExportType(value)}
            style={{ width: '100%' }}
          >
            <Select.Option value="json">完整项目包 (JSON)</Select.Option>
            <Select.Option value="characterPdf">角色剧本集 (PDF)</Select.Option>
            <Select.Option value="organizerPdf">主持人手册 (PDF)</Select.Option>
            <Select.Option value="printVersion">打印优化版</Select.Option>
          </Select>
        </Form.Item>

        {exportType === 'characterPdf' && (
          <div style={{ marginTop: 20 }}>
            <Typography.Text type="secondary">
              选择要导出的角色（不选择则导出所有角色）：
            </Typography.Text>
            <Form.Item>
              <Checkbox
                checked={selectedCharacters.length === characters.length}
                onChange={handleSelectAllCharacters}
              >
                全选
              </Checkbox>
            </Form.Item>
            <Divider style={{ margin: '10px 0' }} />
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {characters.map((character) => (
                <Form.Item key={character.id}>
                <Checkbox
                  checked={selectedCharacters.includes(character.id)}
                  onChange={() => handleCharacterToggle(character.id)}
                >
                  {character.name}
                </Checkbox>
              </Form.Item>
              ))}
            </div>
          </div>
        )}

        {showSuccess && (
          <Typography.Text type="success" style={{ marginTop: 20, display: 'block' }}>
            导出成功！
          </Typography.Text>
        )}
        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <Button onClick={onClose} disabled={exporting} style={{ marginRight: '8px' }}>
            取消
          </Button>
          <Button onClick={handleExport} type="primary" disabled={exporting}>
            {exporting ? '导出中...' : '导出'}
          </Button>
        </div>
    </Modal>
  );
};

export default ExportDialog;