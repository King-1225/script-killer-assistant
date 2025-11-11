import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout,
  Card,
  Typography,
  Tabs,
  Button,
  Input,
  List,
  Tag,
  Divider,
  Modal,
  Form,
  Space,
  Select,
  Avatar,
  Progress,
  message,
  Tooltip,
  Dropdown,
  Menu
} from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  CompassOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  FilePdfOutlined,
  CopyOutlined,
  CheckOutlined,
  BulbOutlined,
  FormatPainterOutlined,
  AlignLeftOutlined,
  LinkOutlined,
  ScissorOutlined,
  EyeOutlined
} from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import type { Character } from '../../types';
import storageService from '../../services/storage';
import exportImportService from '../../services/exportImportService';
import AIAssistantPanel from '../../components/AIAssistantPanel';
import './styles.css';

const { Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// 角色剧本编辑器页面
const CharacterScriptEditor: React.FC = () => {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [character, setCharacter] = useState<Character | null>(null);
  const [activeTab, setActiveTab] = useState<string>('background');
  const [scriptContent, setScriptContent] = useState<{
    background: string;
    acts: { id: string; title: string; content: string }[];
    secrets: { id: string; content: string; condition?: string; relatedCharacterId?: string }[];
  }>({
    background: '',
    acts: [
      { id: 'act1', title: '第一幕', content: '' },
      { id: 'act2', title: '第二幕', content: '' },
      { id: 'act3', title: '第三幕', content: '' }
    ],
    secrets: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimer, setSaveTimer] = useState<number | null>(null);
  const [showAddActModal, setShowAddActModal] = useState(false);
  const [showAddSecretModal, setShowAddSecretModal] = useState(false);
  const [editingSecret, setEditingSecret] = useState<typeof scriptContent.secrets[0] | null>(null);
  const [newActTitle, setNewActTitle] = useState('');
  const [relatedCharacters, setRelatedCharacters] = useState<Character[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<string>('');
  
  const [form] = Form.useForm();
  const mdEditorRef = useRef<typeof MDEditor>(null);

  // 剧本模板
  const scriptTemplates = [
    {
      id: 'classic',
      name: '经典三幕剧',
      description: '传统的三幕结构：铺垫、冲突、解决',
      content: {
        background: '# 角色背景\n\n在这里介绍角色的成长经历、性格特点、动机和目标。\n\n## 童年经历\n\n描述角色的童年回忆和重要事件。\n\n## 关键转折点\n\n描述塑造角色的关键生活事件。\n\n## 动机和目标\n\n清晰说明角色在故事中的核心动机和目标。'
      }
    },
    {
      id: 'reverse',
      name: '倒叙结构',
      description: '从事件结果开始，逐步揭示原因',
      content: {
        background: '# 角色现状\n\n描述角色当前的处境和面临的挑战。\n\n## 关键决定\n\n描述导致当前局面的关键决定。\n\n## 往事回忆\n\n倒叙角色的过去经历。\n\n## 真相大白\n\n揭示隐藏的真相和动机。'
      }
    },
    {
      id: 'mystery',
      name: '悬疑风格',
      description: '充满谜团和伏笔的叙事方式',
      content: {
        background: '# 表面身份\n\n描述角色对外展示的身份和形象。\n\n## 隐藏的秘密\n\n揭示角色不为人知的秘密。\n\n## 可疑的行为\n\n描述角色可能引人怀疑的行为。\n\n## 真实动机\n\n说明角色行为背后的真实动机。'
      }
    }
  ];

  // 初始化数据
  useEffect(() => {
    if (!characterId) return;
    
    // 获取当前项目ID
    const projectId = storageService.getCurrentProjectId();
    if (projectId) {
      setCurrentProjectId(projectId);
      loadCharacterData(projectId, characterId);
      loadRelatedCharacters(projectId, characterId);
    }
  }, [characterId]);

  // 加载角色数据
  const loadCharacterData = (projectId: string, charId: string) => {
    const char = storageService.getCharacter(projectId, charId);
    if (char) {
      setCharacter(char);
      
      // 解析角色背景到编辑器内容
      const backgroundContent = char.background || '';
      
      // 尝试从description中解析结构化内容
      const parsedContent = parseStructuredContent(char.description || '');
      
      setScriptContent({
        background: backgroundContent,
        acts: parsedContent.acts || [
          { id: 'act1', title: '第一幕', content: '' },
          { id: 'act2', title: '第二幕', content: '' },
          { id: 'act3', title: '第三幕', content: '' }
        ],
        secrets: parsedContent.secrets || []
      });
    } else {
      message.error('角色不存在');
      navigate('/characters');
    }
  };

  // 加载相关角色
  const loadRelatedCharacters = (projectId: string, currentCharId: string) => {
    const allCharacters = storageService.getCharacters(projectId);
    const relatedChars = allCharacters.filter(char => char.id !== currentCharId);
    setRelatedCharacters(relatedChars);
  };

  // 解析结构化内容
  const parseStructuredContent = (content: string) => {
    try {
      // 尝试JSON解析
      const parsed = JSON.parse(content);
      if (parsed.acts && parsed.secrets) {
        return parsed;
      }
    } catch (e) {
      // 如果不是JSON，返回空结构
    }
    return { acts: [], secrets: [] };
  };

  // 保存内容到角色
  const saveToCharacter = () => {
    if (!currentProjectId || !character) return;
    
    setIsSaving(true);
    
    // 构建结构化内容
    const structuredContent = JSON.stringify({
      acts: scriptContent.acts,
      secrets: scriptContent.secrets
    });
    
    // 更新角色数据
    const updated = storageService.updateCharacter(currentProjectId, character.id, {
      background: scriptContent.background,
      description: structuredContent
    });
    
    if (updated) {
      message.success('保存成功');
    } else {
      message.error('保存失败');
    }
    
    setIsSaving(false);
  };

  // 防抖保存
  const debounceSave = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    
    const timer = setTimeout(() => {
      saveToCharacter();
    }, 2000);
    
    setSaveTimer(timer);
  };

  // 处理内容变化
  const handleContentChange = (value: string, section: string, actId?: string) => {
    if (section === 'background') {
      setScriptContent(prev => ({ ...prev, background: value || '' }));
    } else if (section === 'act' && actId) {
      setScriptContent(prev => ({
        ...prev,
        acts: prev.acts.map(act => 
          act.id === actId ? { ...act, content: value || '' } : act
        )
      }));
    }
    debounceSave();
  };

  // 添加新幕
  const addNewAct = () => {
    if (!newActTitle.trim()) {
      message.warning('请输入幕标题');
      return;
    }
    
    const newAct = {
      id: `act${Date.now()}`,
      title: newActTitle,
      content: ''
    };
    
    setScriptContent(prev => ({ ...prev, acts: [...prev.acts, newAct] }));
    setNewActTitle('');
    setShowAddActModal(false);
    message.success('添加成功');
    debounceSave();
  };

  // 删除幕
  const deleteAct = (actId: string) => {
    if (scriptContent.acts.length <= 1) {
      message.warning('至少保留一幕');
      return;
    }
    
    Modal.confirm({
      title: '确定删除',
      content: '删除后不可恢复，确定要删除这一幕吗？',
      onOk: () => {
        setScriptContent(prev => ({
          ...prev,
          acts: prev.acts.filter(act => act.id !== actId)
        }));
        message.success('删除成功');
        debounceSave();
        
        // 如果删除的是当前激活的标签，切换到第一个
        if (activeTab === actId) {
          setActiveTab('background');
        }
      }
    });
  };

  // 复制幕内容
  const copyActContent = (sourceActId: string, targetActId: string) => {
    const sourceAct = scriptContent.acts.find(act => act.id === sourceActId);
    if (sourceAct) {
      setScriptContent(prev => ({
        ...prev,
        acts: prev.acts.map(act => 
          act.id === targetActId ? { ...act, content: sourceAct.content } : act
        )
      }));
      message.success('内容已复制');
      debounceSave();
    }
  };

  // 添加秘密
  const addSecret = () => {
    const values = form.getFieldsValue();
    const newSecret = {
      id: `secret${Date.now()}`,
      content: values.secretContent || '',
      condition: values.secretCondition || '',
      relatedCharacterId: values.relatedCharacterId
    };
    
    setScriptContent(prev => ({ ...prev, secrets: [...prev.secrets, newSecret] }));
    form.resetFields();
    setShowAddSecretModal(false);
    setEditingSecret(null);
    message.success('秘密添加成功');
    debounceSave();
  };

  // 编辑秘密
  const editSecret = (secret: typeof scriptContent.secrets[0]) => {
    setEditingSecret(secret);
    form.setFieldsValue({
      secretContent: secret.content,
      secretCondition: secret.condition,
      relatedCharacterId: secret.relatedCharacterId
    });
    setShowAddSecretModal(true);
  };

  // 更新秘密
  const updateSecret = () => {
    if (!editingSecret) return;
    
    const values = form.getFieldsValue();
    setScriptContent(prev => ({
      ...prev,
      secrets: prev.secrets.map(secret => 
        secret.id === editingSecret.id
          ? {
              ...secret,
              content: values.secretContent || '',
              condition: values.secretCondition || '',
              relatedCharacterId: values.relatedCharacterId
            }
          : secret
      )
    }));
    
    form.resetFields();
    setShowAddSecretModal(false);
    setEditingSecret(null);
    message.success('秘密更新成功');
    debounceSave();
  };

  // 删除秘密
  const deleteSecret = (secretId: string) => {
    Modal.confirm({
      title: '确定删除',
      content: '确定要删除这个秘密吗？',
      onOk: () => {
        setScriptContent(prev => ({
          ...prev,
          secrets: prev.secrets.filter(secret => secret.id !== secretId)
        }));
        message.success('删除成功');
        debounceSave();
      }
    });
  };

  // 应用模板
  const applyTemplate = (templateId: string) => {
    const template = scriptTemplates.find(t => t.id === templateId);
    if (template) {
      Modal.confirm({
        title: '应用模板',
        content: '应用模板将替换当前背景内容，确定继续吗？',
        onOk: () => {
          setScriptContent(prev => ({ ...prev, background: template.content.background }));
          setActiveTemplate(templateId);
          message.success(`已应用「${template.name}」模板`);
          debounceSave();
        }
      });
    }
  };

  // 导出PDF（模拟实现）
  const exportToPDF = async (allCharacters = false) => {
    if (!currentProjectId) {
      message.error('请先选择项目');
      return;
    }
    
    try {
      setIsSaving(true); // 复用保存状态的loading效果
      const project = storageService.getProject(currentProjectId);
      
      if (!project) {
        message.error('项目不存在');
        return;
      }
      
      if (allCharacters) {
        // 导出所有角色剧本
        await exportImportService.exportCharacterScriptsAsPDF(project.id);
        message.success('所有角色剧本导出成功');
      } else {
        // 只导出当前角色剧本
        if (!character) {
          message.error('角色不存在');
          return;
        }
        await exportImportService.exportSingleCharacterScriptAsPDF(project.id, character.id);
        message.success('角色剧本导出成功');
      }
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 计算写作进度
  const calculateProgress = () => {
    const totalLength = 
      scriptContent.background.length +
      scriptContent.acts.reduce((sum, act) => sum + act.content.length, 0);
    
    const targetLength = 2000; // 目标字数
    return Math.min(Math.round((totalLength / targetLength) * 100), 100);
  };

  // 获取角色关系信息
  const getCharacterRelationships = () => {
    if (!character) return [];
    return character.relationships || [];
  };

  // 写作提示
  const writingTips = [
    '保持角色对话符合其性格特点',
    '确保每个角色都有明确的动机和目标',
    '在关键情节埋下伏笔，增加故事深度',
    '注意角色之间的互动和冲突设计',
    '合理安排线索的揭示时机'
  ];

  // 处理AI建议应用
  const handleAISuggestionApply = (type: string, suggestion: string) => {
    // 根据不同类型的建议应用到相应的内容区域
    switch (type) {
      case '角色背景故事':
        setScriptContent(prev => ({ 
          ...prev, 
          background: prev.background ? `${prev.background}\n\n--- AI生成 ---\n\n${suggestion}` : suggestion 
        }));
        setActiveTab('background');
        debounceSave();
        break;
      case '剧情发展建议':
        if (scriptContent.acts.length > 0) {
          const currentAct = scriptContent.acts[scriptContent.acts.length - 1];
          setScriptContent(prev => ({
            ...prev,
            acts: prev.acts.map(act => 
              act.id === currentAct.id
                ? { ...act, content: `${act.content}\n\n--- AI建议 ---\n\n${suggestion}` }
                : act
            )
          }));
          setActiveTab('acts');
          debounceSave();
        }
        break;
      // 可以根据需要添加更多类型的处理
      default:
        message.info('建议已复制到剪贴板');
        navigator.clipboard.writeText(suggestion).catch(err => {
          console.error('复制失败:', err);
        });
    }
  };

  // 获取当前项目数据（用于AI助手）
  const getCurrentProjectForAI = () => {
    if (!character) return undefined;
    // 这里简化处理，实际可能需要从storageService获取完整项目信息
    return {
      title: character.name + '的剧本',
      description: character.description,
      setting: '', // 可以从项目中获取
      plotSummary: scriptContent.background,
      characters: [character, ...relatedCharacters]
    };
  };

  if (!character) {
    return (
      <Card>
        <Text type="secondary">加载中...</Text>
      </Card>
    );
  }

  return (
    <Layout className="character-script-editor" style={{ minHeight: '100vh' }}>
      <Layout>
        {/* 左栏：角色信息面板 */}
        <Sider width="30%" theme="light" style={{ padding: '16px', background: '#fff', marginRight: '16px', height: '100vh', overflow: 'auto' }}>
          <Card title="角色信息" style={{ marginBottom: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <Avatar size={80} icon={<UserOutlined />} />
              <Title level={4}>{character.name}</Title>
            </div>
            <Text>秘密数量: {scriptContent.secrets.length}</Text>
            <Divider />
            <Paragraph ellipsis={{ rows: 3 }}>{character.description}</Paragraph>
          </Card>

          <Card title="快速导航" style={{ marginBottom: '16px' }}>
            <List
              dataSource={[
                { key: 'background', title: '背景故事', icon: <UserOutlined /> },
                { key: 'acts', title: '分幕剧本', icon: <FileTextOutlined />, children: scriptContent.acts },
                { key: 'secrets', title: '秘密与任务', icon: <CompassOutlined /> }
              ]}
              renderItem={item => (
                <List.Item
                  onClick={() => {
                    if (item.key === 'background' || item.key === 'secrets') {
                      setActiveTab(item.key);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                  actions={item.key === 'acts' ? [] : [
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={() => setActiveTab(item.key)}
                    >
                      编辑
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={item.icon}
                    title={item.title}
                  />
                  {item.children && (
                    <List
                      dataSource={item.children}
                      renderItem={child => (
                        <List.Item
                          onClick={() => setActiveTab(child.id)}
                          style={{ 
                            marginLeft: '20px', 
                            cursor: 'pointer',
                            backgroundColor: activeTab === child.id ? '#f0f0f0' : 'transparent'
                          }}
                          actions={[
                            <Button 
                              type="link" 
                              size="small" 
                              icon={<DeleteOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAct(child.id);
                              }}
                            />
                          ]}
                        >
                          <Text>{child.title}</Text>
                        </List.Item>
                      )}
                    />
                  )}
                </List.Item>
              )}
            />
          </Card>

          <Card title="关联线索" style={{ marginBottom: '16px' }}>
            <Button 
              type="dashed" 
              block 
              icon={<PlusOutlined />}
              onClick={() => message.info('功能开发中')}
            >
              添加关联线索
            </Button>
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: '16px' }}>
              暂无关联线索
            </Text>
          </Card>

          <Card title="关联时间线事件">
            <Button 
              type="dashed" 
              block 
              icon={<PlusOutlined />}
              onClick={() => message.info('功能开发中')}
            >
              添加时间线事件
            </Button>
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: '16px' }}>
              暂无关联事件
            </Text>
          </Card>
          
          {/* AI助手面板 - 确保它在侧边栏中可见 */}
          <Card title="AI写作助手" style={{ marginBottom: '16px' }}>
            <AIAssistantPanel
              currentProject={getCurrentProjectForAI()}
              onSuggestionApply={handleAISuggestionApply}
            />
          </Card>
        </Sider>

        {/* 中栏：剧本编辑器 */}
        <Content style={{ width: '50%', padding: '16px', background: '#fff', marginRight: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Title level={4}>{character.name} - 剧本编辑器</Title>
            <Space>
              <Tooltip title={isSaving ? '保存中...' : '保存'}>
                <Button 
                  type="primary" 
                  icon={isSaving ? <SaveOutlined /> : <CheckOutlined />}
                  onClick={saveToCharacter}
                  loading={isSaving}
                >
                  {isSaving ? '保存中' : '保存'}
                </Button>
              </Tooltip>
              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item key="1" onClick={() => exportToPDF(false)}>
                      <FilePdfOutlined /> 导出当前角色
                    </Menu.Item>
                    <Menu.Item key="2" onClick={() => exportToPDF(true)}>
                      <FilePdfOutlined /> 导出所有角色
                    </Menu.Item>
                  </Menu>
                }
              >
                <Button icon={<FilePdfOutlined />}>导出</Button>
              </Dropdown>
            </Space>
          </div>

          <Progress percent={calculateProgress()} showInfo style={{ marginBottom: '16px' }} />
          <Text type="secondary">
            字数: {scriptContent.background.length + scriptContent.acts.reduce((sum, act) => sum + act.content.length, 0)}
          </Text>

          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            style={{ marginTop: '16px' }}
            tabBarExtraContent={
              <Space>
                {activeTab !== 'secrets' && (
                  <Button 
                    type="link" 
                    icon={<PlusOutlined />}
                    onClick={() => setShowAddActModal(true)}
                  >
                    添加幕
                  </Button>
                )}
              </Space>
            }
          >
            <TabPane tab="背景故事" key="background">
              <MDEditor
                ref={mdEditorRef}
                value={scriptContent.background}
                onChange={(val) => handleContentChange(val || '', 'background')}
                height={600}
              />
            </TabPane>
            
            {scriptContent.acts.map(act => (
              <TabPane 
                tab={
                  <Space>
                    <Text>{act.title}</Text>
                    <Dropdown
                      overlay={
                        <Menu>
                          {scriptContent.acts.map(otherAct => (
                            <Menu.Item 
                              key={otherAct.id}
                              onClick={() => copyActContent(otherAct.id, act.id)}
                              disabled={otherAct.id === act.id}
                            >
                              <CopyOutlined /> 从{otherAct.title}复制
                            </Menu.Item>
                          ))}
                          <Menu.Item 
                            key="delete"
                            danger
                            onClick={() => deleteAct(act.id)}
                          >
                            <DeleteOutlined /> 删除
                          </Menu.Item>
                        </Menu>
                      }
                    >
                      <EllipsisOutlined />
                    </Dropdown>
                  </Space>
                } 
                key={act.id}
              >
                <Input 
                  value={act.title}
                  onChange={(e) => {
                    setScriptContent(prev => ({
                      ...prev,
                      acts: prev.acts.map(a => 
                        a.id === act.id ? { ...a, title: e.target.value } : a
                      )
                    }));
                    debounceSave();
                  }}
                  style={{ marginBottom: '16px' }}
                />
                <MDEditor
                  value={act.content}
                  onChange={(val) => handleContentChange(val || '', 'act', act.id)}
                  height="calc(100vh - 350px)"
                  style={{ minHeight: '400px' }}
                />
              </TabPane>
            ))}
            
            <TabPane tab="秘密与任务" key="secrets">
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  form.resetFields();
                  setEditingSecret(null);
                  setShowAddSecretModal(true);
                }}
                style={{ marginBottom: '16px' }}
              >
                添加秘密
              </Button>
              
              <List
                dataSource={scriptContent.secrets}
                renderItem={secret => {
                  const relatedChar = relatedCharacters.find(c => c.id === secret.relatedCharacterId);
                  return (
                    <Card 
                      style={{ marginBottom: '16px' }}
                      actions={[
                        <Button 
                          type="link" 
                          icon={<EditOutlined />}
                          onClick={() => editSecret(secret)}
                        />,
                        <Button 
                          type="link" 
                          icon={<DeleteOutlined />}
                          danger
                          onClick={() => deleteSecret(secret.id)}
                        />
                      ]}
                    >
                      <Typography.Text mark>秘密内容：</Typography.Text>
                      <Paragraph>{secret.content}</Paragraph>
                      {secret.condition && (
                        <div>
                          <Typography.Text mark>暴露条件：</Typography.Text>
                          <Paragraph>{secret.condition}</Paragraph>
                        </div>
                      )}
                      {relatedChar && (
                        <div>
                          <Typography.Text mark>关联角色：</Typography.Text>
                          <Tag color="blue">{relatedChar.name}</Tag>
                        </div>
                      )}
                    </Card>
                  );
                }}
                locale={{ emptyText: '暂无秘密，点击添加按钮创建' }}
              />
            </TabPane>
          </Tabs>
        </Content>

        {/* 右栏：辅助工具 */}
        <Sider width="20%" theme="light" style={{ padding: '16px', background: '#fff' }}>
          <Card title="模板快速插入" style={{ marginBottom: '16px' }}>
            <List
              dataSource={scriptTemplates}
              renderItem={template => (
                <List.Item
                  actions={[
                    <Button 
                      size="small" 
                      type={activeTemplate === template.id ? "primary" : "default"}
                      onClick={() => applyTemplate(template.id)}
                    >
                      应用
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={template.name}
                    description={template.description}
                  />
                </List.Item>
              )}
            />
            <Divider />
            <Button 
              type="dashed" 
              block 
              icon={<SaveOutlined />}
              onClick={() => message.info('功能开发中')}
            >
              保存自定义模板
            </Button>
          </Card>

          <Card title="角色关系图谱" style={{ marginBottom: '16px' }}>
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Button 
                type="link" 
                icon={<EyeOutlined />}
                onClick={() => message.info('功能开发中')}
              >
                查看完整图谱
              </Button>
            </div>
            <List
              dataSource={getCharacterRelationships().slice(0, 3)}
              renderItem={rel => {
                const relatedChar = relatedCharacters.find(c => c.id === rel.targetCharacterId);
                return (
                  <List.Item>
                    <LinkOutlined style={{ marginRight: '8px' }} />
                    <Text>{relatedChar?.name || '未知角色'}</Text>
                    <Tag color="purple" style={{ marginLeft: '8px' }}>
                      {rel.type === 'friend' ? '朋友' : 
                       rel.type === 'enemy' ? '敌人' : 
                       rel.type === 'family' ? '家人' : '中立'}
                    </Tag>
                  </List.Item>
                );
              }}
            />
          </Card>

          {/* AI助手面板 */}
          <AIAssistantPanel
            currentProject={getCurrentProjectForAI()}
            onSuggestionApply={handleAISuggestionApply}
          />

          <Card title="写作提示" style={{ marginBottom: '16px' }}>
            <List
              dataSource={writingTips}
              renderItem={tip => (
                <List.Item>
                  <BulbOutlined style={{ marginRight: '8px', color: '#faad14' }} />
                  <Text type="secondary">{tip}</Text>
                </List.Item>
              )}
            />
          </Card>

          <Card title="格式工具">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                icon={<AlignLeftOutlined />} 
                block
                onClick={() => message.info('功能开发中')}
              >
                格式化文本
              </Button>
              <Button 
                icon={<FormatPainterOutlined />} 
                block
                onClick={() => message.info('功能开发中')}
              >
                复制格式
              </Button>
              <Button 
                icon={<ScissorOutlined />} 
                block
                onClick={() => message.info('功能开发中')}
              >
                内容分离
              </Button>
            </Space>
          </Card>
        </Sider>
      </Layout>

      {/* 添加幕模态框 */}
      <Modal
        title="添加新幕"
        open={showAddActModal}
        onCancel={() => setShowAddActModal(false)}
        onOk={addNewAct}
        okText="确定"
        cancelText="取消"
      >
        <Input
          placeholder="请输入幕标题"
          value={newActTitle}
          onChange={(e) => setNewActTitle(e.target.value)}
          onPressEnter={addNewAct}
        />
      </Modal>

      {/* 添加/编辑秘密模态框 */}
      <Modal
        title={editingSecret ? "编辑秘密" : "添加秘密"}
        open={showAddSecretModal}
        onCancel={() => {
          setShowAddSecretModal(false);
          form.resetFields();
          setEditingSecret(null);
        }}
        onOk={editingSecret ? updateSecret : addSecret}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="secretContent"
            label="秘密内容"
            rules={[{ required: true, message: '请输入秘密内容' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入秘密的具体内容" />
          </Form.Item>
          <Form.Item
            name="secretCondition"
            label="暴露条件（可选）"
          >
            <Input.TextArea rows={2} placeholder="在什么情况下这个秘密会被揭露？" />
          </Form.Item>
          <Form.Item
            name="relatedCharacterId"
            label="关联角色（可选）"
          >
            <Select placeholder="选择相关联的角色">
              {relatedCharacters.map(char => (
                <Option key={char.id} value={char.id}>{char.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

// 省略号图标组件
const EllipsisOutlined: React.FC = () => (
  <span style={{ fontSize: '16px', cursor: 'pointer' }}>...</span>
);

export default CharacterScriptEditor;