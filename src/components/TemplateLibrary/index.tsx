import React, { useState } from 'react';
import { Modal, Typography, Card, Row, Col, Tabs, Select, Button, Divider } from 'antd';
import exportImportService from '../../services/exportImportService';
import type {
  ProjectTemplate,
  CharacterTemplate,
  ScriptStructureTemplate,
} from '../../services/exportImportService';
import type { Story, Character } from '../../types';

interface TemplateLibraryProps {
  open: boolean;
  onClose: () => void;
  onApplyProjectTemplate?: (templateData: Partial<Story>) => void;
  onApplyCharacterTemplate?: (templateData: Partial<Character>) => void;
  onApplyScriptStructure?: (structure: ScriptStructureTemplate['structure']) => void;
}

type TabValue = 'project' | 'character' | 'structure';

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  open,
  onClose,
  onApplyProjectTemplate,
  onApplyCharacterTemplate,
  onApplyScriptStructure,
}) => {
  const [tabValue, setTabValue] = useState<TabValue>('project');
  const [projectCategory, setProjectCategory] = useState<string>('all');
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);


  // 获取模板数据
  const projectTemplates = exportImportService.getProjectTemplates(
    projectCategory === 'all' ? undefined : projectCategory
  );
  const characterTemplates = exportImportService.getCharacterTemplates();
  const structureTemplates = exportImportService.getScriptStructureTemplates();

  const handleTabChange = (activeKey: string) => {
    setTabValue(activeKey as TabValue);
    setAppliedTemplate(null);
  };

  const handleApplyProjectTemplate = (templateId: string) => {
    const templateData = exportImportService.applyProjectTemplate(templateId);
    if (onApplyProjectTemplate) {
      onApplyProjectTemplate(templateData);
    }
    setAppliedTemplate(templateId);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleApplyCharacterTemplate = (templateId: string) => {
    const templateData = exportImportService.applyCharacterTemplate(templateId);
    if (onApplyCharacterTemplate) {
      onApplyCharacterTemplate(templateData);
    }
    setAppliedTemplate(templateId);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleApplyStructureTemplate = (structure: ScriptStructureTemplate['structure']) => {
    if (onApplyScriptStructure) {
      onApplyScriptStructure(structure);
    }
    setAppliedTemplate(structure.recommendedLength);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  // 渲染项目模板卡片
  const renderProjectTemplateCard = (template: ProjectTemplate) => (
    <Col xs={24} sm={12} key={template.id}>
      <Card style={{ padding: 16, height: '100%' }}>
        <Typography.Title level={5}>{template.name}</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 10, fontSize: 14 }}>
          类别: {getCategoryName(template.category)}
        </Typography.Paragraph>
        <Typography.Paragraph style={{ marginBottom: 16, fontSize: 14 }}>
          {template.description}
        </Typography.Paragraph>
        <Button
          type="primary"
          block
          onClick={() => handleApplyProjectTemplate(template.id)}
          disabled={appliedTemplate === template.id}
        >
          {appliedTemplate === template.id ? '已应用' : '应用模板'}
        </Button>
      </Card>
    </Col>
  );

  // 渲染角色模板卡片
  const renderCharacterTemplateCard = (template: CharacterTemplate) => (
    <Col xs={24} key={template.id}>
      <Card style={{ padding: 16 }}>
        <Typography.Title level={5}>{template.name}</Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 10, fontSize: 14 }}>
          {template.description}
        </Typography.Paragraph>
        {template.characterData.description && (
          <div style={{ marginBottom: 10 }}>
            <Typography.Title level={5} style={{ fontSize: 14, fontWeight: 'bold' }}>角色描述:</Typography.Title>
            <Typography.Paragraph style={{ fontSize: 14 }}>{template.characterData.description}</Typography.Paragraph>
          </div>
        )}
        {template.characterData.background && (
          <div style={{ marginBottom: 16 }}>
            <Typography.Title level={5} style={{ fontSize: 14, fontWeight: 'bold' }}>角色背景:</Typography.Title>
            <Typography.Paragraph style={{ fontSize: 14 }}>{template.characterData.background}</Typography.Paragraph>
          </div>
        )}
        <Button
          type="primary"
          onClick={() => handleApplyCharacterTemplate(template.id)}
          disabled={appliedTemplate === template.id}
        >
          {appliedTemplate === template.id ? '已应用' : '应用模板'}
        </Button>
      </Card>
    </Col>
  );

  // 渲染剧本结构模板卡片
  const renderStructureTemplateCard = (template: ScriptStructureTemplate) => (
    <Col xs={24} key={template.id}>
      <Card style={{ padding: 16 }}>
        <Typography.Title level={5}>{template.name}</Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 10, fontSize: 14 }}>
          {template.description}
        </Typography.Paragraph>
        <Divider style={{ margin: '10px 0' }} />
        <Typography.Paragraph style={{ fontSize: 14 }}>
          <strong>幕数:</strong> {template.structure.acts}
        </Typography.Paragraph>
        <Typography.Paragraph style={{ fontSize: 14 }}>
          <strong>每幕场景数:</strong> {template.structure.scenesPerAct}
        </Typography.Paragraph>
        <Typography.Paragraph style={{ fontSize: 14 }}>
          <strong>建议时长:</strong> {template.structure.recommendedLength}
        </Typography.Paragraph>
        <Divider style={{ margin: '10px 0' }} />
        <Typography.Title level={5} style={{ fontSize: 14, fontWeight: 'bold' }}>结构描述:</Typography.Title>
        <Typography.Paragraph style={{ whiteSpace: 'pre-line', marginBottom: 16, fontSize: 14 }}>
          {template.structure.description}
        </Typography.Paragraph>
        <Button
          type="primary"
          onClick={() => handleApplyStructureTemplate(template.structure)}
          disabled={appliedTemplate === template.structure.recommendedLength}
        >
          {appliedTemplate === template.structure.recommendedLength ? '已应用' : '应用模板'}
        </Button>
      </Card>
    </Col>
  );

  // 获取类别中文名称
  const getCategoryName = (category: string): string => {
    const categoryMap: Record<string, string> = {
      modern: '现代',
      fantasy: '奇幻',
      historical: '历史',
      scifi: '科幻',
      horror: '恐怖',
    };
    return categoryMap[category] || category;
  };

  return (
      <Modal
        title="模板库"
        open={open}
        onCancel={onClose}
        width={1000}
        footer={null}
      >
        <div style={{ borderBottom: '1px solid #f0f0f0', marginBottom: '16px' }}>
          <Tabs
            activeKey={tabValue}
            onChange={handleTabChange}
            type="card"
            size="large"
          >
            <Tabs.TabPane tab="项目模板" key="project" />
            <Tabs.TabPane tab="角色模板" key="character" />
            <Tabs.TabPane tab="剧本结构" key="structure" />
          </Tabs>
        </div>
  
        {tabValue === 'project' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px' }}>类别筛选</div>
              <Select
                style={{ width: '100%' }}
                value={projectCategory}
                onChange={(value) => setProjectCategory(value as string)}
                options={[
                  { value: 'all', label: '全部类别' },
                  { value: 'modern', label: '现代' },
                  { value: 'fantasy', label: '奇幻' },
                  { value: 'historical', label: '历史' },
                  { value: 'scifi', label: '科幻' },
                  { value: 'horror', label: '恐怖' },
                ]}
              />
            </div>
            <Typography.Title level={4} style={{ marginBottom: '10px' }}>
              选择一个模板快速创建新项目:
            </Typography.Title>
            <Row gutter={[16, 16]}>
              {projectTemplates.map(renderProjectTemplateCard)}
            </Row>
          </div>
        )}
  
        {tabValue === 'character' && (
          <div>
            <Typography.Title level={4} style={{ marginBottom: '10px' }}>
              选择角色模板快速创建新角色:
            </Typography.Title>
            <Row gutter={[16, 16]}>
              {characterTemplates.map(renderCharacterTemplateCard)}
            </Row>
          </div>
        )}
  
        {tabValue === 'structure' && (
          <div>
            <Typography.Title level={4} style={{ marginBottom: '10px' }}>
              选择剧本结构模板规划剧情:
            </Typography.Title>
            <Row gutter={[16, 16]}>
              {structureTemplates.map(renderStructureTemplateCard)}
            </Row>
          </div>
        )}
  
        {appliedTemplate && (
          <div style={{ marginTop: '16px' }}>
            <Typography.Text type="success">
              模板已成功应用！
            </Typography.Text>
          </div>
        )}
      </Modal>
    );
};

export default TemplateLibrary;