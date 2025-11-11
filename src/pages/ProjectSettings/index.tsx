import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, Tabs, Form, Input, Select, Radio, Button, Switch, Upload, Table, Tag } from 'antd';
import { DownloadOutlined, CloudUploadOutlined, UserOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';
import storageService from '../../services/storage';
import type { ProjectConfig } from '../../types';
import './styles.css';

const { Title, Text } = Typography;
const { Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;



const ProjectSettingsPage: React.FC = () => {
  const [config, setConfig] = useState<ProjectConfig>({
    projectName: '',
    description: '',
    author: '',
    version: '1.0.0',
    playerCount: 4,
    estimatedDuration: 240,
    difficultyLevel: '中等',
    exportOptions: {
      format: 'pdf',
      includeImages: true,
      includeNotes: false
    },
    members: [
      {
        id: '1',
        name: '当前用户',
        role: '所有者',
        email: 'user@example.com',
        avatar: '',
        permissions: ['read', 'write', 'admin']
      }
    ]
  });
  const [form] = Form.useForm();

  // 加载项目配置
  useEffect(() => {
    loadProjectConfig();
  }, []);

  const loadProjectConfig = () => {
    try {
      const projectId = storageService.getCurrentProjectId();
      if (projectId) {
        const project = storageService.getProject(projectId);
        if (project && project.config) {
          setConfig(project.config);
          form.setFieldsValue({
            ...project.config,
            ...project.config.exportOptions
          });
        } else {
          // 初始化默认配置
          const defaultConfig: ProjectConfig = {
            projectName: '新剧本项目',
            description: '剧本杀游戏项目',
            author: '作者名称',
            version: '1.0.0',
            playerCount: 4,
            estimatedDuration: 240,
            difficultyLevel: '中等',
            exportOptions: {
              format: 'pdf',
              includeImages: true,
              includeNotes: false
            },
            members: [
              {
                id: '1',
                name: '当前用户',
                role: '所有者',
                email: 'user@example.com',
                avatar: '',
                permissions: ['read', 'write', 'admin']
              }
            ]
          };
          setConfig(defaultConfig);
          form.setFieldsValue({
            ...defaultConfig,
            ...defaultConfig.exportOptions
          });
        }
      }
    } catch (error) {
      console.error('加载项目配置失败:', error);
    }
  };

  // 保存项目配置
  const saveProjectConfig = (values: any) => {
    try {
      const newConfig: ProjectConfig = {
        ...config,
        projectName: values.projectName,
        description: values.description,
        author: values.author,
        version: values.version,
        playerCount: values.playerCount,
        estimatedDuration: values.estimatedDuration,
        difficultyLevel: values.difficultyLevel,
        exportOptions: {
          format: values.format,
          includeImages: values.includeImages,
          includeNotes: values.includeNotes
        }
      };
      
      setConfig(newConfig);
      
      const projectId = storageService.getCurrentProjectId();
      if (projectId) {
        storageService.updateProject(projectId, { config: newConfig });
        console.log('项目配置已保存');
      }
    } catch (error) {
      console.error('保存项目配置失败:', error);
    }
  };

  // 导出项目
  const exportProject = () => {
    console.log('导出项目:', config.exportOptions);
    // 这里应该实现实际的导出逻辑
  };

  // 导入项目
  const importProject = (file: File) => {
    console.log('导入项目文件:', file.name);
    // 这里应该实现实际的导入逻辑
  };

  // 备份数据
  const backupData = () => {
    console.log('备份项目数据');
    // 这里应该实现实际的备份逻辑
  };

  // 恢复数据
  const restoreData = (file: File) => {
    console.log('恢复项目数据:', file.name);
    // 这里应该实现实际的恢复逻辑
  };

  // Tabs配置
  const tabItems: TabsProps['items'] = [
    {
      key: 'basic',
      label: '基础信息',
      children: (
        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={saveProjectConfig}
            initialValues={{
              projectName: config.projectName,
              description: config.description,
              author: config.author,
              version: config.version
            }}
          >
            <Form.Item
              name="projectName"
              label="项目名称"
              rules={[{ required: true, message: '请输入项目名称' }]}
            >
              <Input placeholder="输入剧本项目名称" />
            </Form.Item>

            <Form.Item
              name="description"
              label="项目描述"
            >
              <TextArea rows={4} placeholder="描述你的剧本项目" />
            </Form.Item>

            <Form.Item
              name="author"
              label="作者"
              rules={[{ required: true, message: '请输入作者名称' }]}
            >
              <Input placeholder="输入作者名称" />
            </Form.Item>

            <Form.Item
              name="version"
              label="版本号"
            >
              <Input placeholder="输入版本号，如 1.0.0" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">保存基础信息</Button>
            </Form.Item>
          </Form>
        </Card>
      )
    },
    {
      key: 'game-config',
      label: '游戏配置',
      children: (
        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={saveProjectConfig}
          >
            <Form.Item
              name="playerCount"
              label="玩家数量"
              rules={[{ required: true, message: '请选择玩家数量' }]}
            >
              <Select placeholder="选择玩家数量">
                <Option value={3}>3人</Option>
                <Option value={4}>4人</Option>
                <Option value={5}>5人</Option>
                <Option value={6}>6人</Option>
                <Option value={7}>7人</Option>
                <Option value={8}>8人</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="estimatedDuration"
              label="预计时长"
              rules={[{ required: true, message: '请选择预计时长' }]}
            >
              <Select placeholder="选择预计游戏时长">
                <Option value={120}>2小时</Option>
                <Option value={180}>3小时</Option>
                <Option value={240}>4小时</Option>
                <Option value={300}>5小时</Option>
                <Option value={360}>6小时</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="difficultyLevel"
              label="难度等级"
              rules={[{ required: true, message: '请选择难度等级' }]}
            >
              <Radio.Group>
                <Radio value="简单">简单</Radio>
                <Radio value="中等">中等</Radio>
                <Radio value="困难">困难</Radio>
                <Radio value="极难">极难</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">保存游戏配置</Button>
            </Form.Item>
          </Form>
        </Card>
      )
    },
    {
      key: 'export',
      label: '导出设置',
      children: (
        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={saveProjectConfig}
          >
            <Form.Item
              name="format"
              label="导出格式"
              rules={[{ required: true, message: '请选择导出格式' }]}
            >
              <Radio.Group>
                <Radio value="pdf">PDF</Radio>
                <Radio value="word">Word</Radio>
                <Radio value="markdown">Markdown</Radio>
                <Radio value="html">HTML</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="includeImages"
              label="包含图片"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="includeNotes"
              label="包含创作笔记"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">保存导出设置</Button>
              <Button 
                type="default" 
                icon={<DownloadOutlined />}
                onClick={exportProject}
                style={{ marginLeft: 16 }}
              >
                立即导出
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )
    },
    {
      key: 'collaboration',
      label: '协作管理',
      children: (
        <Card>
          <div className="collaboration-section">
            <Title level={5}>协作者列表</Title>
            <Table 
              size="small" 
              columns={[
                {
                  title: '成员',
                  dataIndex: 'name',
                  key: 'name',
                  render: (name) => (
                    <div className="member-info">
                      <UserOutlined style={{ marginRight: 8 }} />
                      {name}
                    </div>
                  )
                },
                {
                  title: '角色',
                  dataIndex: 'role',
                  key: 'role',
                  render: (role) => <Tag color={role === '所有者' ? 'red' : 'blue'}>{role}</Tag>
                },
                {
                  title: '邮箱',
                  dataIndex: 'email',
                  key: 'email'
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_, record) => (
                    record.role !== '所有者' ? (
                      <Button danger size="small">移除</Button>
                    ) : null
                  )
                }
              ]} 
              dataSource={config.members}
              rowKey="id"
              pagination={false}
            />

            <div className="add-member-form" style={{ marginTop: 24 }}>
              <Title level={5}>添加协作者</Title>
              <Form layout="inline">
                <Form.Item>
                  <Input placeholder="邮箱地址" />
                </Form.Item>
                <Form.Item>
                  <Select placeholder="选择角色">
                    <Option value="编辑者">编辑者</Option>
                    <Option value="查看者">查看者</Option>
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Button type="primary">邀请</Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </Card>
      )
    },
    {
      key: 'backup',
      label: '数据备份',
      children: (
        <Card>
          <div className="backup-section">
            <Title level={5}>备份与恢复</Title>
            
            <div className="backup-actions" style={{ marginBottom: 32 }}>
              <Button 
                type="primary" 
                icon={<CloudUploadOutlined />}
                onClick={backupData}
                style={{ marginBottom: 16 }}
              >
                创建备份
              </Button>
              <Text type="secondary">将项目数据备份到本地</Text>
            </div>

            <div className="import-export">
              <Title level={5}>导入/导出项目</Title>
              
              <div className="upload-section">
                <Text strong>导入项目：</Text>
                <Upload
                  name="project-file"
                  accept=".jsons,.zip"
                  beforeUpload={(file) => {
                    importProject(file);
                    return false; // 阻止默认上传行为
                  }}
                  showUploadList={false}
                >
                  <Button>选择项目文件</Button>
                </Upload>
              </div>

              <div className="restore-section" style={{ marginTop: 16 }}>
                <Text strong>恢复备份：</Text>
                <Upload
                  name="backup-file"
                  accept=".json,.bak"
                  beforeUpload={(file) => {
                    restoreData(file);
                    return false; // 阻止默认上传行为
                  }}
                  showUploadList={false}
                >
                  <Button>选择备份文件</Button>
                </Upload>
              </div>
            </div>

            <div className="backup-history" style={{ marginTop: 32 }}>
              <Title level={5}>备份历史</Title>
              <Table 
                size="small" 
                columns={[
                  {
                    title: '备份名称',
                    dataIndex: 'name',
                    key: 'name'
                  },
                  {
                    title: '备份时间',
                    dataIndex: 'time',
                    key: 'time'
                  },
                  {
                    title: '大小',
                    dataIndex: 'size',
                    key: 'size'
                  },
                  {
                    title: '操作',
                    key: 'action',
                    render: () => (
                      <span>
                        <Button size="small">恢复</Button>
                        <Button danger size="small" style={{ marginLeft: 8 }}>删除</Button>
                      </span>
                    )
                  }
                ]} 
                dataSource={[
                  { key: '1', name: '项目备份_20240115', time: '2024-01-15 14:30', size: '2.5 MB' },
                  { key: '2', name: '项目备份_20240110', time: '2024-01-10 09:15', size: '2.3 MB' }
                ]}
                pagination={false}
              />
            </div>
          </div>
        </Card>
      )
    }
  ];

  return (
    <Content style={{ padding: '24px' }}>
      <div className="project-settings-container">
        <Card title="项目设置" bordered={false}>
          <p>管理项目基本信息、游戏配置、导出设置、协作权限和数据备份</p>
        </Card>
        
        <div className="settings-tabs">
          <Tabs defaultActiveKey="basic" items={tabItems} />
        </div>
      </div>
    </Content>
  );
};

export default ProjectSettingsPage;