import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Card,
  Typography,
  Space,
  Popconfirm,
  Upload,
  message,
  Row,
  Col,
  Badge,
  Progress
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileExcelOutlined, UploadOutlined, FileTextOutlined, BookOutlined } from '@ant-design/icons';
import type { Character } from '../../types';
import storageService from '../../services/storage';

const { Title, Text } = Typography;

// 剧本状态类型
type ScriptStatus = 'notStarted' | 'inProgress' | 'completed';

// 扩展角色接口，添加剧本状态
interface CharacterWithStatus extends Character {
  scriptStatus: ScriptStatus;
  scriptCompletion: number;
}

const CharacterManagement: React.FC = () => {
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [characters, setCharacters] = useState<CharacterWithStatus[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [form] = Form.useForm();

  // 获取当前项目并加载角色数据
  useEffect(() => {
    const projectId = storageService.getCurrentProjectId();
    if (projectId) {
      setCurrentProjectId(projectId);
      loadCharacters(projectId);
    } else {
      // 如果没有当前项目，尝试获取第一个项目
      const projects = storageService.getProjects();
      if (projects.length > 0) {
        setCurrentProjectId(projects[0].id);
        loadCharacters(projects[0].id);
      }
    }
  }, []);

  // 加载角色数据并计算剧本状态
  const loadCharacters = (projectId: string) => {
    const chars = storageService.getCharacters(projectId);
    const charactersWithStatus = chars.map(char => ({
      ...char,
      scriptStatus: calculateScriptStatus(char),
      scriptCompletion: calculateScriptCompletion(char)
    }));
    setCharacters(charactersWithStatus);
  };

  // 计算剧本状态
  const calculateScriptStatus = (character: Character): ScriptStatus => {
    // 简化的状态计算逻辑：根据背景和描述的长度判断
    if (!character.background || character.background.trim().length < 10) {
      return 'notStarted';
    }
    if (character.background.trim().length < 100) {
      return 'inProgress';
    }
    return 'completed';
  };

  // 计算剧本完成度
  const calculateScriptCompletion = (character: Character): number => {
    // 简化的完成度计算
    const maxLength = 500;
    const currentLength = (character.background || '').length + (character.description || '').length;
    return Math.min(Math.round((currentLength / maxLength) * 100), 100);
  };

  // 获取状态显示文本和颜色
  const getStatusDisplay = (status: ScriptStatus) => {
    switch (status) {
      case 'notStarted':
        return { text: '未开始', color: 'default' as const };
      case 'inProgress':
        return { text: '进行中', color: 'processing' as const };
      case 'completed':
        return { text: '已完成', color: 'success' as const };
      default:
        return { text: '未开始', color: 'default' as const };
    }
  };

  // 打开添加角色模态框
  const showAddModal = () => {
    form.resetFields();
    setIsAddModalVisible(true);
  };

  // 打开编辑角色模态框
  const showEditModal = (character: Character) => {
    setEditingCharacter(character);
    form.setFieldsValue({
      name: character.name,
      description: character.description,
      background: character.background,
      secrets: character.secrets.join('\n')
    });
    setIsEditModalVisible(true);
  };

  // 保存角色（添加或编辑）
  const saveCharacter = async () => {
    try {
      const values = await form.validateFields();
      const secrets = values.secrets ? values.secrets.split('\n').filter(Boolean) : [];
      
      if (!currentProjectId) {
        message.error('请先选择项目');
        return;
      }

      if (editingCharacter) {
        // 编辑模式
        const updated = storageService.updateCharacter(currentProjectId, editingCharacter.id, {
          name: values.name,
          description: values.description,
          background: values.background,
          secrets: secrets
        });
        if (updated) {
          message.success('角色更新成功');
          loadCharacters(currentProjectId);
          setIsEditModalVisible(false);
        }
      } else {
        // 添加模式
        const newCharacter = storageService.createCharacter(currentProjectId, {
          name: values.name,
          description: values.description,
          background: values.background || '',
          secrets: secrets,
          relationships: []
        });
        if (newCharacter) {
          message.success('角色创建成功');
          loadCharacters(currentProjectId);
          setIsAddModalVisible(false);
        }
      }
    } catch (error) {
      console.error('保存角色失败:', error);
      message.error('保存失败，请重试');
    }
  };

  // 删除单个角色
  const deleteCharacter = (characterId: string) => {
    if (!currentProjectId) return;
    
    const success = storageService.deleteCharacter(currentProjectId, characterId);
    if (success) {
      message.success('角色删除成功');
      loadCharacters(currentProjectId);
    } else {
      message.error('角色删除失败');
    }
  };

  // 批量删除角色
  const deleteSelectedCharacters = () => {
    if (!currentProjectId || selectedRowKeys.length === 0) return;
    
    selectedRowKeys.forEach(key => {
      storageService.deleteCharacter(currentProjectId, key.toString());
    });
    
    message.success(`已删除 ${selectedRowKeys.length} 个角色`);
    setSelectedRowKeys([]);
    loadCharacters(currentProjectId);
  };

  // 导出角色数据
  const exportCharacters = () => {
    if (!currentProjectId) return;
    
    const data = storageService.getCharacters(currentProjectId);
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `characters_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    message.success('角色数据导出成功');
  };

  // 批量导出角色剧本
  const exportCharacterScripts = () => {
    if (!currentProjectId || selectedRowKeys.length === 0) {
      message.warning('请先选择角色');
      return;
    }
    
    const selectedChars = characters.filter(char => 
      selectedRowKeys.includes(char.id)
    );
    
    const scriptData = selectedChars.map(char => ({
      id: char.id,
      name: char.name,
      background: char.background,
      description: char.description,
      secrets: char.secrets
    }));
    
    const jsonStr = JSON.stringify(scriptData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `character_scripts_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    message.success('角色剧本导出成功');
  };

  // 导入角色数据
  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const importedCharacters = JSON.parse(jsonData) as Character[];
        
        if (!Array.isArray(importedCharacters)) {
          message.error('导入数据格式错误');
          return;
        }
        
        // 验证数据结构
        const validCharacters = importedCharacters.filter(char => 
          char.name && typeof char.name === 'string'
        );
        
        // 导入有效角色
        validCharacters.forEach(char => {
          storageService.createCharacter(currentProjectId, {
            name: char.name,
            description: char.description || '',
            background: char.background || '',
            secrets: char.secrets || [],
            relationships: char.relationships || []
          });
        });
        
        loadCharacters(currentProjectId);
        message.success(`成功导入 ${validCharacters.length} 个角色`);
      } catch (error) {
        console.error('导入失败:', error);
        message.error('导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    
    return false; // 阻止默认上传行为
  };

  // 编辑角色剧本
  const editCharacterScript = (characterId: string) => {
    window.location.href = `/character-script/${characterId}`;
  };

  // 表格列配置
  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '背景描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 200
    },
    {
      title: '秘密数量',
      dataIndex: 'secrets',
      key: 'secrets',
      render: (secrets: string[]) => secrets.length,
      width: 100
    },
    {
      title: '剧本完成度',
      key: 'scriptCompletion',
      width: 150,
      render: (_text: string, record: CharacterWithStatus) => (
        <Progress 
          percent={record.scriptCompletion} 
          size="small" 
          status={record.scriptCompletion === 100 ? 'success' : undefined}
        />
      )
    },
    {
      title: '剧本状态',
      key: 'scriptStatus',
      width: 100,
      render: (_text: string, record: CharacterWithStatus) => {
        const status = getStatusDisplay(record.scriptStatus);
        return <Badge status={status.color} text={status.text} />;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_text: string, record: Character) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => showEditModal(record)} 
            size="small"
          >
            编辑
          </Button>
          <Button 
            type="link" 
            icon={<BookOutlined />} 
            onClick={() => editCharacterScript(record.id)} 
            size="small"
            style={{ color: '#1890ff' }}
          >
            编辑剧本
          </Button>
          <Popconfirm
            title="确定要删除这个角色吗？"
            onConfirm={() => deleteCharacter(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              icon={<DeleteOutlined />} 
              danger 
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 表格选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    }
  };

  // 角色模板库
  const characterTemplates = [
    {
      name: '侦探',
      description: '经验丰富的侦探，善于观察细节',
      background: '作为一名资深侦探，我已经破解了无数案件。这次的案件似乎比以往更加复杂...'
    },
    {
      name: '嫌疑人',
      description: '神秘的嫌疑人，似乎隐藏着什么秘密',
      background: '我只是一个普通的上班族，为什么会卷入这起谋杀案？我必须找出真相...'
    },
    {
      name: '受害者家属',
      description: '失去亲人的家属，情绪激动',
      background: '当我得知亲人的死讯时，我的世界崩塌了。我一定要找出凶手...'
    }
  ];

  // 使用模板创建角色
  const useTemplate = (template: typeof characterTemplates[0]) => {
    form.setFieldsValue({
      name: `${template.name}_${Date.now().toString().slice(-4)}`,
      description: template.description,
      background: template.background,
      secrets: ''
    });
    setIsAddModalVisible(true);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={4}>角色管理</Title>
        
        {/* 操作栏 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col flex="auto">
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={showAddModal}
              >
                添加角色
              </Button>
              
              {selectedRowKeys.length > 0 && (
                <>
                  <Button 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={deleteSelectedCharacters}
                  >
                    批量删除 ({selectedRowKeys.length})
                  </Button>
                  <Button 
                    icon={<FileTextOutlined />}
                    onClick={exportCharacterScripts}
                  >
                    批量导出剧本
                  </Button>
                </>
              )}
              
              <Upload
                beforeUpload={handleImport}
                showUploadList={false}
                accept=".json"
              >
                <Button icon={<UploadOutlined />}>导入角色</Button>
              </Upload>
              
              <Button 
                icon={<FileExcelOutlined />}
                onClick={exportCharacters}
              >
                导出所有角色
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 角色列表 */}
        <Table
          rowKey="id"
          rowSelection={rowSelection}
          columns={columns}
          dataSource={characters}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: '暂无角色数据'
          }}
        />

        {/* 角色模板库 */}
        {characters.length === 0 && (
          <div style={{ marginTop: '40px' }}>
            <Title level={5}>角色模板库</Title>
            <Row gutter={[16, 16]}>
              {characterTemplates.map((template, index) => (
                <Col key={index} span={6}>
                  <Card
                    title={template.name}
                    extra={
                      <Button 
                        type="primary" 
                        size="small" 
                        onClick={() => useTemplate(template)}
                      >
                        使用模板
                      </Button>
                    }
                  >
                    <Text type="secondary">{template.description}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Card>

      {/* 添加/编辑角色模态框 */}
      <Modal
        title={editingCharacter ? "编辑角色" : "添加角色"}
        open={isAddModalVisible || isEditModalVisible}
        onCancel={() => {
          setIsAddModalVisible(false);
          setIsEditModalVisible(false);
          setEditingCharacter(null);
          form.resetFields();
        }}
        onOk={saveCharacter}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            secrets: ''
          }}
        >
          <Form.Item
            name="name"
            label="角色姓名"
            rules={[{ required: true, message: '请输入角色姓名' }]}
          >
            <Input placeholder="请输入角色姓名" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="角色描述"
          >
            <Input.TextArea rows={3} placeholder="请输入角色简短描述" />
          </Form.Item>
          
          <Form.Item
            name="background"
            label="角色背景"
          >
            <Input.TextArea rows={6} placeholder="请输入角色详细背景故事" />
          </Form.Item>
          
          <Form.Item
            name="secrets"
            label="角色秘密"
            tooltip="每行一个秘密"
          >
            <Input.TextArea 
              rows={4} 
              placeholder="请输入角色的秘密，每行一个"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CharacterManagement;