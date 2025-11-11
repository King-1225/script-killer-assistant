import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import AIAssistantPanel from '../../components/AIAssistantPanel';
import storageService from '../../services/storage';
import type { Character, Scene, Clue } from '../../types';

const { Header, Content } = Layout;
const { Title } = Typography;

const AIAssistantPage: React.FC = () => {
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [projectTitle, setProjectTitle] = useState<string>('');

  // 加载当前项目数据
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
        if (project) {
          setProjectTitle(project.title || '未命名项目');
          setCharacters(project.characters || []);
          setScenes(project.scenes || []);
          
          // 收集所有场景中的线索
          const allClues: Clue[] = [];
          project.scenes.forEach(scene => {
            scene.clues.forEach(clue => {
              allClues.push(clue);
            });
          });
          setClues(allClues);
        }
      }
    } catch (error) {
      console.error('加载项目数据失败:', error);
      message.error('数据加载失败');
    }
  };

  useEffect(() => {
    loadProjectData();
  }, []);

  // 准备AI助手需要的项目数据
  const getCurrentProjectForAI = () => {
    if (!currentProjectId) return undefined;
    
    return {
      title: projectTitle,
      description: '', // 可以从项目中获取
      setting: '', // 可以从项目中获取
      plotSummary: '', // 可以从项目中提取
      characters,
      scenes,
      clues
    };
  };

  // 处理AI建议的应用
  const handleAISuggestionApply = (type: string, suggestion: string) => {
    message.success(`${type}建议已应用`);
    console.log('AI建议:', type, suggestion);
    // 这里可以根据不同类型的建议进行相应的处理
  };

  return (
    <Layout>
      <Header style={{ background: '#fff', padding: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center' }}>
          <EditOutlined style={{ fontSize: '20px', marginRight: '12px', color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>AI写作助手</Title>
        </div>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Card title="智能剧本创作助手" bordered={false}>
          <p>欢迎使用AI写作助手！这里提供了多种智能功能，可以帮助您快速创作和完善剧本杀内容。</p>
          <p>当前项目：{projectTitle}</p>
        </Card>
        
        <div style={{ marginTop: 20 }}>
          <AIAssistantPanel 
            currentProject={getCurrentProjectForAI()} 
            onSuggestionApply={handleAISuggestionApply}
          />
        </div>
      </Content>
    </Layout>
  );
};

export default AIAssistantPage;