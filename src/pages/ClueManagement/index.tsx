import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Typography,
  Table,
  Form,
  Input,
  Select,
  Modal,
  message,
  Tag,
  Space,
  Badge,
  Tabs,
  Checkbox,
  Radio,
  Progress
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  LinkOutlined,
  SettingOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import type { Clue, Character, Scene } from '../../types';
import storageService from '../../services/storage';

const { Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// 线索发放时机类型
type DistributionTiming = {
  type: 'immediate' | 'delayed' | 'conditional';
  delayTime?: string;
  condition?: string;
  relatedClueId?: string;
  relatedEventId?: string;
};

// 线索扩展接口，添加额外的管理属性
interface ClueWithManagement extends Clue {
  isKeyEvidence?: boolean;
  distributionTiming?: DistributionTiming;
  relatedClueIds?: string[];
 发放场景?: string;
  foundByCharacterName?: string;
}

// 证据链接口
interface EvidenceChain {
  id: string;
  name: string;
  clueIds: string[];
  description: string;
}

const ClueManagement: React.FC = () => {
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [clues, setClues] = useState<ClueWithManagement[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [evidenceChains, setEvidenceChains] = useState<EvidenceChain[]>([]);
  
  // 筛选和搜索状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [selectedRelevance, setSelectedRelevance] = useState<string>('');
  const [isKeyEvidenceOnly, setIsKeyEvidenceOnly] = useState(false);
  
  // 模态框状态
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDistributionModalVisible, setIsDistributionModalVisible] = useState(false);
  const [isEvidenceChainModalVisible, setIsEvidenceChainModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 表单和编辑状态
  const [form] = Form.useForm();
  const [distributionForm] = Form.useForm();
  const [evidenceChainForm] = Form.useForm();
  const [editingClue, setEditingClue] = useState<ClueWithManagement | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [editingEvidenceChain, setEditingEvidenceChain] = useState<EvidenceChain | null>(null);

  // 初始化数据加载
  useEffect(() => {
    loadData();
  }, []);

  // 加载项目数据
  const loadData = async () => {
    setIsLoading(true);
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
        await loadProjectData(projectId);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('数据加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 加载项目具体数据
  const loadProjectData = async (projectId: string) => {
    const project = storageService.getProject(projectId);
    if (!project) return;
    
    setCharacters(project.characters);
    setScenes(project.scenes);
    
    // 收集所有场景中的线索
    const allClues: ClueWithManagement[] = [];
    project.scenes.forEach(scene => {
      scene.clues.forEach(clue => {
        const foundByCharacter = project.characters.find(c => c.id === clue.foundBy);
        allClues.push({
          ...clue,
          发放场景: scene.name,
          foundByCharacterName: foundByCharacter?.name
        });
      });
    });
    
    setClues(allClues);
    
    // 初始化示例证据链
    if (allClues.length > 0 && evidenceChains.length === 0) {
      setEvidenceChains([{
        id: 'chain1',
        name: '主要证据链',
        description: '案件的核心证据链',
        clueIds: allClues.slice(0, Math.min(3, allClues.length)).map(c => c.id)
      }]);
    }
  };

  // 筛选和搜索线索
  const getFilteredClues = () => {
    return clues.filter(clue => {
      // 关键词搜索
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        const matchesKeyword = clue.name.toLowerCase().includes(keyword) || 
                            clue.description.toLowerCase().includes(keyword);
        if (!matchesKeyword) return false;
      }
      
      // 角色筛选
      if (selectedCharacter && clue.foundBy !== selectedCharacter) {
        return false;
      }
      
      // 重要程度筛选
      if (selectedRelevance && clue.relevance !== selectedRelevance) {
        return false;
      }
      
      // 仅显示关键证据
      if (isKeyEvidenceOnly && !clue.isKeyEvidence) {
        return false;
      }
      
      return true;
    });
  };

  // 显示添加线索模态框
  const showAddModal = () => {
    form.resetFields();
    setEditingClue(null);
    setIsAddModalVisible(true);
  };

  // 显示编辑线索模态框
  const showEditModal = (clue: ClueWithManagement) => {
    setEditingClue(clue);
    form.setFieldsValue({
      name: clue.name,
      description: clue.description,
      relevance: clue.relevance,
      foundBy: clue.foundBy,
      isKeyEvidence: clue.isKeyEvidence || false,
      relatedClueIds: clue.relatedClueIds || []
    });
    setIsEditModalVisible(true);
  };

  // 保存线索
  const saveClue = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingClue) {
        // 更新线索
        const updatedClue: Clue = {
          id: editingClue.id,
          name: values.name,
          description: values.description,
          relevance: values.relevance,
          foundBy: values.foundBy
        };
        
        // 查找线索所在的场景
        for (const scene of scenes) {
          const clueIndex = scene.clues.findIndex(c => c.id === editingClue.id);
          if (clueIndex !== -1) {
            const success = storageService.updateClue(
              currentProjectId,
              scene.id,
              editingClue.id,
              updatedClue
            );
            
            if (success) {
              message.success('线索更新成功');
              setIsEditModalVisible(false);
              loadProjectData(currentProjectId);
            } else {
              message.error('线索更新失败');
            }
            break;
          }
        }
      } else {
        // 添加新线索
        const newClue: Omit<Clue, 'id'> = {
          name: values.name,
          description: values.description,
          relevance: values.relevance,
          foundBy: values.foundBy
        };
        
        // 添加到第一个场景（实际应用中应该允许选择场景）
        if (scenes.length > 0) {
          const success = storageService.createClue(
            currentProjectId,
            scenes[0].id,
            newClue
          );
          
          if (success) {
            message.success('线索添加成功');
            setIsAddModalVisible(false);
            form.resetFields();
            loadProjectData(currentProjectId);
          } else {
            message.error('线索添加失败');
          }
        } else {
          message.error('请先创建场景');
        }
      }
    } catch (error) {
      console.error('保存线索失败:', error);
    }
  };

  // 删除线索
  const deleteClue = (clue: ClueWithManagement) => {
    Modal.confirm({
      title: '确定删除',
      content: `确定要删除线索 "${clue.name}" 吗？`,
      onOk: async () => {
        // 查找线索所在的场景
        for (const scene of scenes) {
          const success = storageService.deleteClue(
            currentProjectId,
            scene.id,
            clue.id
          );
          
          if (success) {
            message.success('线索删除成功');
            loadProjectData(currentProjectId);
            break;
          }
        }
      }
    });
  };

  // 设置线索发放计划
  const showDistributionModal = (clue: ClueWithManagement) => {
    setEditingClue(clue);
    distributionForm.setFieldsValue({
      distributionType: clue.distributionTiming?.type || 'immediate',
      delayTime: clue.distributionTiming?.delayTime,
      condition: clue.distributionTiming?.condition,
      relatedClueId: clue.distributionTiming?.relatedClueId
    });
    setIsDistributionModalVisible(true);
  };

  // 保存发放计划
  const saveDistributionPlan = async () => {
    try {
      const values = await distributionForm.validateFields();
      
      if (editingClue) {
        const distributionTiming: DistributionTiming = {
          type: values.distributionType,
          delayTime: values.delayTime,
          condition: values.condition,
          relatedClueId: values.relatedClueId
        };
        
        // 更新线索的发放计划（在实际应用中应该保存到后端）
        setClues(prev => prev.map(clue => 
          clue.id === editingClue.id
            ? { ...clue, distributionTiming }
            : clue
        ));
        
        message.success('发放计划设置成功');
        setIsDistributionModalVisible(false);
      }
    } catch (error) {
      console.error('保存发放计划失败:', error);
    }
  };

  // 检查证据链完整性
  const checkEvidenceChainCompleteness = (chain: EvidenceChain): number => {
    if (chain.clueIds.length === 0) return 0;
    
    // 简化的完整性计算：检查所有线索是否都有关联关系
    let connectedCount = 0;
    chain.clueIds.forEach(clueId => {
      const clue = clues.find(c => c.id === clueId);
      if (clue?.relatedClueIds && clue.relatedClueIds.length > 0) {
        connectedCount++;
      }
    });
    
    return Math.round((connectedCount / chain.clueIds.length) * 100);
  };

  // 显示证据链编辑模态框
  const showEvidenceChainModal = (chain?: EvidenceChain) => {
    if (chain) {
      setEditingEvidenceChain(chain);
      evidenceChainForm.setFieldsValue({
        name: chain.name,
        description: chain.description,
        clueIds: chain.clueIds
      });
    } else {
      setEditingEvidenceChain(null);
      evidenceChainForm.resetFields();
    }
    setIsEvidenceChainModalVisible(true);
  };

  // 保存证据链
  const saveEvidenceChain = async () => {
    try {
      const values = await evidenceChainForm.validateFields();
      
      if (editingEvidenceChain) {
        // 更新证据链
        setEvidenceChains(prev => prev.map(chain => 
          chain.id === editingEvidenceChain.id
            ? { ...chain, ...values }
            : chain
        ));
      } else {
        // 添加新证据链
        const newChain: EvidenceChain = {
          id: `chain_${Date.now()}`,
          ...values
        };
        setEvidenceChains(prev => [...prev, newChain]);
      }
      
      message.success('证据链保存成功');
      setIsEvidenceChainModalVisible(false);
    } catch (error) {
      console.error('保存证据链失败:', error);
    }
  };

  // 删除证据链
  const deleteEvidenceChain = (chainId: string) => {
    Modal.confirm({
      title: '确定删除',
      content: '确定要删除这个证据链吗？',
      onOk: () => {
        setEvidenceChains(prev => prev.filter(chain => chain.id !== chainId));
        message.success('证据链删除成功');
      }
    });
  };

  // 获取相关线索的名称列表
  const getRelatedClueNames = (clueIds?: string[]): string => {
    if (!clueIds || clueIds.length === 0) return '无';
    return clueIds
      .map(id => clues.find(c => c.id === id)?.name)
      .filter(name => name)
      .join(', ');
  };

  // 线索表格列定义
  const clueColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ClueWithManagement) => (
        <Space>
          <Text strong>{text}</Text>
          {record.isKeyEvidence && (
            <Badge.Ribbon text="关键" color="red" />
          )}
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 200,
      render: (text: string) => <Text ellipsis>{text}</Text>
    },
    {
      title: '重要程度',
      dataIndex: 'relevance',
      key: 'relevance',
      render: (relevance: string) => {
        let color = 'default';
        let text = '低';
        
        if (relevance === 'high') {
          color = 'red';
          text = '高';
        } else if (relevance === 'medium') {
          color = 'orange';
          text = '中';
        }
        
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '发现角色',
      dataIndex: 'foundByCharacterName',
      key: 'foundByCharacterName',
      render: (name?: string) => name || '未指定'
    },
    {
      title: '发放场景',
      dataIndex: '发放场景',
      key: '发放场景'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ClueWithManagement) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<SettingOutlined />}
            onClick={() => showDistributionModal(record)}
          >
            发放计划
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteClue(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  // 证据链表格列定义
  const evidenceChainColumns = [
    {
      title: '证据链名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '线索数量',
      dataIndex: 'clueIds',
      key: 'clueCount',
      render: (clueIds: string[]) => clueIds.length
    },
    {
      title: '完整性',
      key: 'completeness',
      render: (_: any, record: EvidenceChain) => {
        const completeness = checkEvidenceChainCompleteness(record);
        return (
          <div>
            <Progress percent={completeness} size="small" status="active" />
            <Text type="secondary">{completeness}%</Text>
          </div>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: EvidenceChain) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showEvidenceChainModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteEvidenceChain(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  // 发放计划配置项
  const renderDistributionConfig = (type: string) => {
    switch (type) {
      case 'delayed':
        return (
          <Form.Item name="delayTime" label="延迟时间">
            <Input placeholder="如：30min, 2h" />
          </Form.Item>
        );
      case 'conditional':
        return (
          <>
            <Form.Item name="condition" label="触发条件">
              <Input.TextArea rows={2} placeholder="描述触发条件" />
            </Form.Item>
            <Form.Item name="relatedClueId" label="关联线索">
              <Select placeholder="选择关联线索">
                {clues.map(clue => (
                  <Option key={clue.id} value={clue.id}>{clue.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="clue-management">
      <Card title="线索管理" style={{ marginBottom: 24 }}>
        {/* 工具栏 */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showAddModal}
            >
              添加线索
            </Button>
          </Space>
          
          {/* 搜索和筛选 */}
          <Space>
            <Form layout="inline">
              <Form.Item>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="搜索线索"
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  style={{ width: 200 }}
                />
              </Form.Item>
              <Form.Item>
                <Select
                  placeholder="选择角色"
                  value={selectedCharacter}
                  onChange={value => setSelectedCharacter(value)}
                  style={{ width: 120 }}
                  allowClear
                >
                  {characters.map(character => (
                    <Option key={character.id} value={character.id}>{character.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item>
                <Select
                  placeholder="重要程度"
                  value={selectedRelevance}
                  onChange={value => setSelectedRelevance(value)}
                  style={{ width: 100 }}
                  allowClear
                >
                  <Option value="high">高</Option>
                  <Option value="medium">中</Option>
                  <Option value="low">低</Option>
                </Select>
              </Form.Item>
              <Form.Item>
                <Checkbox
                  checked={isKeyEvidenceOnly}
                  onChange={e => setIsKeyEvidenceOnly(e.target.checked)}
                >
                  仅显示关键证据
                </Checkbox>
              </Form.Item>
            </Form>
          </Space>
        </div>

        {/* 标签页切换 */}
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 线索列表 */}
          <TabPane tab="线索列表" key="list">
            <Table
              columns={clueColumns}
              dataSource={getFilteredClues()}
              rowKey="id"
              loading={isLoading}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1200 }}
            />
          </TabPane>

          {/* 证据链管理 */}
          <TabPane tab="证据链管理" key="chains">
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<LinkOutlined />}
                onClick={() => showEvidenceChainModal()}
              >
                创建证据链
              </Button>
            </div>
            <Table
              columns={evidenceChainColumns}
              dataSource={evidenceChains}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              expandable={{
                expandedRowRender: (record: EvidenceChain) => (
                  <div>
                    <p>描述: {record.description}</p>
                    <p>包含线索: {getRelatedClueNames(record.clueIds)}</p>
                    {checkEvidenceChainCompleteness(record) < 100 && (
                      <Tag color="warning" icon={<ExclamationCircleOutlined />}>不完整</Tag>
                    )}
                  </div>
                )
              }}
            />
          </TabPane>

          {/* 发放计划 */}
          <TabPane tab="发放计划" key="distribution">
            <Card title="线索发放计划概览">
              <Table
                columns={[
                  {
                    title: '线索名称',
                    dataIndex: 'name',
                    key: 'name'
                  },
                  {
                    title: '发放时机',
                    key: 'timing',
                    render: (_, record: ClueWithManagement) => {
                      const timing = record.distributionTiming;
                      if (!timing) return <Text type="secondary">未设置</Text>;
                      
                      switch (timing.type) {
                        case 'immediate':
                          return <Tag color="green">立即发放</Tag>;
                        case 'delayed':
                          return <Tag color="blue">延迟发放 ({timing.delayTime})</Tag>;
                        case 'conditional':
                          return <Tag color="orange">条件触发</Tag>;
                        default:
                          return <Text type="secondary">未设置</Text>;
                      }
                    }
                  },
                  {
                    title: '触发条件',
                    key: 'condition',
                    render: (_, record: ClueWithManagement) => {
                      const condition = record.distributionTiming?.condition;
                      return condition || <Text type="secondary">无</Text>;
                    }
                  },
                  {
                    title: '操作',
                    key: 'action',
                    render: (_, record: ClueWithManagement) => (
                      <Button
                        type="link"
                        onClick={() => showDistributionModal(record)}
                      >
                        设置
                      </Button>
                    )
                  }
                ]}
                dataSource={clues}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      {/* 添加/编辑线索模态框 */}
      <Modal
        title={editingClue ? "编辑线索" : "添加线索"}
        open={isAddModalVisible || isEditModalVisible}
        onOk={saveClue}
        onCancel={() => {
          setIsAddModalVisible(false);
          setIsEditModalVisible(false);
        }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="线索名称"
            rules={[{ required: true, message: '请输入线索名称' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="线索描述"
            rules={[{ required: true, message: '请输入线索描述' }]}
          >
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}>
              <MDEditor
                value={form.getFieldValue('description') || ''}
                onChange={(value) => form.setFieldsValue({ description: value || '' })}
                height={200}
              />
            </div>
          </Form.Item>
          
          <Form.Item
            name="relevance"
            label="重要程度"
            rules={[{ required: true, message: '请选择重要程度' }]}
          >
            <Select>
              <Option value="high">高</Option>
              <Option value="medium">中</Option>
              <Option value="low">低</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="foundBy"
            label="发现角色"
          >
            <Select placeholder="选择发现该线索的角色" allowClear>
              {characters.map(character => (
                <Option key={character.id} value={character.id}>{character.name}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="isKeyEvidence"
            valuePropName="checked"
            label="关键证据"
          >
            <Checkbox>标记为关键证据</Checkbox>
          </Form.Item>
          
          <Form.Item
            name="relatedClueIds"
            label="关联线索"
          >
            <Select mode="multiple" placeholder="选择相关的线索">
              {clues
                .filter(clue => !editingClue || clue.id !== editingClue.id)
                .map(clue => (
                  <Option key={clue.id} value={clue.id}>{clue.name}</Option>
                ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 线索发放计划模态框 */}
      <Modal
        title="设置线索发放计划"
        open={isDistributionModalVisible}
        onOk={saveDistributionPlan}
        onCancel={() => setIsDistributionModalVisible(false)}
        width={600}
      >
        <Form form={distributionForm} layout="vertical">
          <Form.Item
            name="distributionType"
            label="发放类型"
            rules={[{ required: true, message: '请选择发放类型' }]}
          >
            <Radio.Group>
              <Radio value="immediate">立即发放</Radio>
              <Radio value="delayed">延迟发放</Radio>
              <Radio value="conditional">条件触发</Radio>
            </Radio.Group>
          </Form.Item>
          
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.distributionType !== currentValues.distributionType}>
            {({ getFieldValue }) => renderDistributionConfig(getFieldValue('distributionType'))}
          </Form.Item>
        </Form>
      </Modal>

      {/* 证据链编辑模态框 */}
      <Modal
        title={editingEvidenceChain ? "编辑证据链" : "创建证据链"}
        open={isEvidenceChainModalVisible}
        onOk={saveEvidenceChain}
        onCancel={() => setIsEvidenceChainModalVisible(false)}
        width={700}
      >
        <Form form={evidenceChainForm} layout="vertical">
          <Form.Item
            name="name"
            label="证据链名称"
            rules={[{ required: true, message: '请输入证据链名称' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入证据链描述' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          
          <Form.Item
            name="clueIds"
            label="包含线索"
            rules={[{ required: true, message: '请至少选择一个线索' }]}
          >
            <Select mode="multiple" placeholder="选择线索" style={{ width: '100%' }}>
              {clues.map(clue => (
                <Option key={clue.id} value={clue.id}>{clue.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClueManagement;