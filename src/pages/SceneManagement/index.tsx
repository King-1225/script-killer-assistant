import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, Table, Button, Input, Form, Modal, Tabs, List, Upload, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';

import storageService from '../../services/storage';
import type { Scene, SceneResource } from '../../types';
import './styles.css';

const { Title, Text } = Typography;
const { Content } = Layout;
const { TextArea } = Input;

interface SceneTableColumn {
  title: string;
  dataIndex: string;
  key: string;
  render?: (text: any, record: Scene) => React.ReactNode;
}

const SceneManagementPage: React.FC = () => {
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [resources, setResources] = useState<SceneResource[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [form] = Form.useForm();

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
        if (project) {
          setScenes(project.scenes || []);
          setResources(project.sceneResources || []);
        }
      }
    } catch (error) {
      console.error('加载项目数据失败:', error);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, []);

  // 保存场景数据
  const saveScenes = () => {
    if (!currentProjectId) return;
    
    try {
      const project = storageService.getProject(currentProjectId);
      if (project) {
        project.scenes = scenes;
        project.sceneResources = resources;
        storageService.saveProject(project);
        console.log('场景数据已保存');
      }
    } catch (error) {
      console.error('保存场景数据失败:', error);
    }
  };

  // 打开场景编辑模态框
  const openSceneModal = (scene?: Scene) => {
    if (scene) {
      setEditingScene(scene);
      form.setFieldsValue({
        title: scene.title,
        description: scene.description,
        keyEvents: scene.keyEvents,
        settingDescription: scene.settingDescription
      });
    } else {
      setEditingScene(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  // 关闭场景编辑模态框
  const closeSceneModal = () => {
    setIsModalVisible(false);
    setEditingScene(null);
    form.resetFields();
  };

  // 保存场景
  const saveScene = (values: any) => {
    const newScene: Scene = {
      id: editingScene?.id || Date.now().toString(),
      name: values.title, // 使用title作为name值
      title: values.title,
      description: values.description,
      keyEvents: values.keyEvents,
      settingDescription: values.settingDescription,
      clues: editingScene?.clues || [],
      characterAppearances: editingScene?.characterAppearances || [],
      timelinePoint: editingScene?.timelinePoint || null
    };

    if (editingScene) {
      setScenes(prevScenes => prevScenes.map(scene => 
        scene.id === editingScene.id ? newScene : scene
      ));
    } else {
      setScenes(prevScenes => [...prevScenes, newScene]);
    }

    saveScenes();
    closeSceneModal();
  };

  // 删除场景
  const deleteScene = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个场景吗？',
      onOk: () => {
        setScenes(prevScenes => prevScenes.filter(scene => scene.id !== id));
        saveScenes();
      }
    });
  };

  // 表格列配置
  const columns: SceneTableColumn[] = [
    {
      title: '场景名称',
      dataIndex: 'title',
      key: 'title'
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => <Text ellipsis>{text}</Text>
    },
    {
      title: '关键事件',
      dataIndex: 'keyEvents',
      key: 'keyEvents',
      render: (text: string) => <Text ellipsis>{text}</Text>
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} size="small" onClick={() => openSceneModal(record)}>编辑</Button>
          <Button danger icon={<DeleteOutlined />} size="small" onClick={() => deleteScene(record.id)}>删除</Button>
        </Space>
      )
    }
  ];

  // Tabs配置
  const tabItems: TabsProps['items'] = [
    {
      key: 'list',
      label: '场景列表',
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={5}>所有场景</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openSceneModal()}>添加场景</Button>
          </div>
          <Table 
            columns={columns} 
            dataSource={scenes} 
            rowKey="id" 
            pagination={{ pageSize: 10 }}
          />
        </div>
      )
    },
    {
      key: 'resources',
      label: '场景资源库',
      children: (
        <div>
          <Title level={5}>场景资源</Title>
          <Card>
            <Upload.Dragger
              name="file"
              multiple
              beforeUpload={(file) => {
                // 这里只是模拟上传，实际项目中需要调用上传接口
                console.log('上传文件:', file);
                return false;
              }}
            >
              <p className="ant-upload-drag-icon">
                <PlusOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个或批量上传图片、音乐等场景参考资源
              </p>
            </Upload.Dragger>
            
            <div style={{ marginTop: 24 }}>
              <Title level={5}>已上传资源</Title>
              {resources.length > 0 ? (
                <List
                  grid={{ gutter: 16, column: 4 }}
                  dataSource={resources}
                  renderItem={(resource) => (
                    <List.Item>
                      <Card size="small" title={resource.name}>
                        <Text type="secondary">类型: {resource.type}</Text>
                      </Card>
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="secondary">暂无资源</Text>
              )}
            </div>
          </Card>
        </div>
      )
    }
  ];

  return (
    <>
      <Content style={{ padding: '24px' }}>
        <div className="scene-management-container">
          <Card title="场景管理" variant="outlined">
            <p>剧本场景管理、场景切换逻辑、环境描写库、场景资源管理</p>
          </Card>
          
          <div className="scene-tabs">
            <Tabs defaultActiveKey="list" items={tabItems} />
          </div>
        </div>
      </Content>

      {/* 场景编辑模态框 */}
      <Modal
        title={editingScene ? "编辑场景" : "创建新场景"}
        open={isModalVisible}
        onCancel={closeSceneModal}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveScene}
          initialValues={{
            title: '',
            description: '',
            keyEvents: '',
            settingDescription: ''
          }}
        >
          <Form.Item
            name="title"
            label="场景名称"
            rules={[{ required: true, message: '请输入场景名称' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="场景描述"
          >
            <TextArea rows={3} />
          </Form.Item>
          
          <Form.Item
            name="keyEvents"
            label="关键事件"
          >
            <TextArea rows={2} placeholder="用逗号分隔多个关键事件" />
          </Form.Item>
          
          <Form.Item
            name="settingDescription"
            label="环境描写"
          >
            <TextArea rows={4} placeholder="详细描述场景环境、氛围等" />
          </Form.Item>
          
          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={closeSceneModal} style={{ marginRight: 8 }}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SceneManagementPage;