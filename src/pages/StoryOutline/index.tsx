import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, Form, Input, Button, Tag, List, Tabs } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';

import storageService from '../../services/storage';
import type { StoryOutline, Chapter, ThemeTag, Inspiration } from '../../types';
import './styles.css';

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

const StoryOutlinePage: React.FC = () => {
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [outline, setOutline] = useState<StoryOutline>({
    synopsis: '',
    chapters: [],
    tricks: [],
    themes: [],
    inspirations: []
  });
  const [isEditingSynopsis, setIsEditingSynopsis] = useState(false);
  const [tempSynopsis, setTempSynopsis] = useState('');
  const [newThemeTag, setNewThemeTag] = useState('');
  const [newInspiration, setNewInspiration] = useState('');

  // 加载项目数据
  const loadProjectData = async () => {
    try {
      let projectId = storageService.getCurrentProjectId();
      if (!projectId) {
        const projects = storageService.getProjects();
        if (projects.length > 0) {
          projectId = projects[0].id;
          storageService.setCurrentProjectId(projectId);
        }
      }
      
      if (projectId) {
        setCurrentProjectId(projectId);
        const project = storageService.getProject(projectId);
        if (project && project.storyOutline) {
          setOutline(project.storyOutline);
        }
      }
    } catch (error) {
      console.error('加载项目数据失败:', error);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, []);

  // 保存大纲数据
  const saveOutline = () => {
    if (!currentProjectId) return;
    
    try {
      const project = storageService.getProject(currentProjectId);
      if (project) {
        project.storyOutline = outline;
        storageService.saveProject(project);
        console.log('故事大纲已保存');
      }
    } catch (error) {
      console.error('保存大纲失败:', error);
    }
  };

  // 保存故事梗概
  const saveSynopsis = () => {
    setOutline(prev => ({ ...prev, synopsis: tempSynopsis }));
    setIsEditingSynopsis(false);
    saveOutline();
  };

  // 添加章节
  const addChapter = () => {
    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: '新章节',
      description: '',
      content: '',
      order: outline.chapters.length + 1,
      subChapters: []
    };
    setOutline(prev => ({ ...prev, chapters: [...prev.chapters, newChapter] }));
  };

  // 删除章节
  const deleteChapter = (id: string) => {
    setOutline(prev => ({
      ...prev,
      chapters: prev.chapters.filter(chapter => chapter.id !== id)
    }));
  };

  // 更新章节
  const updateChapter = (id: string, updates: Partial<Chapter>) => {
    setOutline(prev => ({
      ...prev,
      chapters: prev.chapters.map(chapter => 
        chapter.id === id ? { ...chapter, ...updates } : chapter
      )
    }));
  };

  // 添加主题标签
  const addThemeTag = () => {
    if (!newThemeTag.trim()) return;
    
    const tag: ThemeTag = {
      id: Date.now().toString(),
      name: newThemeTag.trim(),
      description: ''
    };
    
    setOutline(prev => ({ ...prev, themes: [...prev.themes, tag] }));
    setNewThemeTag('');
  };

  // 删除主题标签
  const deleteThemeTag = (id: string) => {
    setOutline(prev => ({
      ...prev,
      themes: prev.themes.filter(tag => tag.id !== id)
    }));
  };

  // 添加灵感碎片
  const addInspiration = () => {
    if (!newInspiration.trim()) return;
    
    const inspiration: Inspiration = {
      id: Date.now().toString(),
      content: newInspiration.trim(),
      timestamp: new Date().toISOString()
    };
    
    setOutline(prev => ({ ...prev, inspirations: [inspiration, ...prev.inspirations] }));
    setNewInspiration('');
  };

  // 删除灵感碎片
  const deleteInspiration = (id: string) => {
    setOutline(prev => ({
      ...prev,
      inspirations: prev.inspirations.filter(insp => insp.id !== id)
    }));
  };

  // Tabs配置
  const tabItems: TabsProps['items'] = [
    {
      key: 'synopsis',
      label: '故事梗概',
      children: (
        <div>
          {isEditingSynopsis ? (
            <div>
              <Form.Item>
                <Input.TextArea 
                  rows={6} 
                  value={tempSynopsis} 
                  onChange={(e) => setTempSynopsis(e.target.value)} 
                  placeholder="输入故事梗概"
                />
              </Form.Item>
              <Button type="primary" onClick={saveSynopsis}>保存</Button>
              <Button style={{ marginLeft: 8 }} onClick={() => {
                setIsEditingSynopsis(false);
                setTempSynopsis(outline.synopsis);
              }}>取消</Button>
            </div>
          ) : (
            <div>
              {outline.synopsis ? (
                <Paragraph>{outline.synopsis}</Paragraph>
              ) : (
                <Text type="secondary">暂无故事梗概</Text>
              )}
              <Button 
                type="primary" 
                icon={<EditOutlined />} 
                onClick={() => {
                  setTempSynopsis(outline.synopsis);
                  setIsEditingSynopsis(true);
                }}
              >
                编辑梗概
              </Button>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'chapters',
      label: '章节结构',
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={5}>章节列表</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={addChapter}>添加章节</Button>
          </div>
          <List
            dataSource={outline.chapters}
            renderItem={(chapter) => (
              <Card 
                key={chapter.id} 
                style={{ marginBottom: 16 }}
                actions={[
                  <Button key="delete" danger icon={<DeleteOutlined />} onClick={() => deleteChapter(chapter.id)} />
                ]}
              >
                <Input 
                  value={chapter.title} 
                  onChange={(e) => updateChapter(chapter.id, { title: e.target.value })} 
                  placeholder="章节标题"
                />
                <Input.TextArea 
                  rows={3} 
                  value={chapter.description} 
                  onChange={(e) => updateChapter(chapter.id, { description: e.target.value })} 
                  placeholder="章节描述"
                  style={{ marginTop: 8 }}
                />
              </Card>
            )}
          />
        </div>
      )
    },
    {
      key: 'tricks',
      label: '核心诡计',
      children: (
        <div>
          <Title level={5}>核心诡计记录</Title>
          <Card>
            <Text type="secondary">功能开发中...</Text>
          </Card>
        </div>
      )
    },
    {
      key: 'themes',
      label: '主题标签',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Input.Group compact>
              <Input 
                value={newThemeTag} 
                onChange={(e) => setNewThemeTag(e.target.value)} 
                placeholder="添加主题标签"
                style={{ width: 'calc(100% - 80px)' }}
              />
              <Button type="primary" onClick={addThemeTag}>添加</Button>
            </Input.Group>
          </div>
          <List
            dataSource={outline.themes}
            renderItem={(tag) => (
              <Tag 
                closable 
                onClose={() => deleteThemeTag(tag.id)}
                style={{ margin: 4, fontSize: '14px', padding: '4px 8px' }}
              >
                {tag.name}
              </Tag>
            )}
          />
        </div>
      )
    },
    {
      key: 'inspirations',
      label: '灵感碎片',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Input.Group compact>
              <Input.TextArea 
                rows={2} 
                value={newInspiration} 
                onChange={(e) => setNewInspiration(e.target.value)} 
                placeholder="记录灵感瞬间"
                style={{ width: 'calc(100% - 80px)' }}
              />
              <Button type="primary" onClick={addInspiration}>添加</Button>
            </Input.Group>
          </div>
          <List
            dataSource={outline.inspirations}
            renderItem={(inspiration) => (
              <Card 
                key={inspiration.id} 
                style={{ marginBottom: 12 }}
                actions={[
                  <Button key="delete" danger icon={<DeleteOutlined />} onClick={() => deleteInspiration(inspiration.id)} />
                ]}
              >
                <Paragraph>{inspiration.content}</Paragraph>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {new Date(inspiration.timestamp).toLocaleString()}
                </Text>
              </Card>
            )}
            locale={{ emptyText: '暂无灵感记录' }}
          />
        </div>
      )
    }
  ];

  return (
      <Content style={{ padding: '24px' }}>
        <div className="story-outline-container">
          <Card title="故事大纲编辑器" bordered={false}>
            <p>整体故事脉络规划、章节结构设计、核心诡计记录、主题立意明确</p>
          </Card>
          
          <div className="outline-tabs">
            <Tabs defaultActiveKey="synopsis" items={tabItems} />
          </div>
          
          <div className="outline-footer">
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={saveOutline}
              style={{ float: 'right' }}
            >
              保存所有更改
            </Button>
          </div>
        </div>
      </Content>
  );
};

export default StoryOutlinePage;