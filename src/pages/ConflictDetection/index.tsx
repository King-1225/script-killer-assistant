import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Typography,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Checkbox,
  message,
  Tooltip,
  Tabs
} from 'antd';
import {
  AlertOutlined,
  DownloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Character, Scene, Clue } from '../../types';
// //50| // // // const { Option } = Select;
// import type { EvidenceChain } from '../ClueManagement';
// import type { TimelineEvent } from '../TimelineEditor';
import {
  detectAllConflicts,
  exportConflictReport,
  ConflictType,
  ConflictSeverity,
  type ConflictReportItem,
  type ConflictIgnoreItem,
  type ConflictSuggestion
} from '../../utils/conflictDetector';
import storageService from '../../services/storage';


const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
// const { Option } = Select;
const { TextArea } = Input;

const ConflictDetectionPage: React.FC = () => {
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [evidenceChains, setEvidenceChains] = useState<any[]>([]);
  // const [organizerGuide, setOrganizerGuide] = useState<OrganizerGuide | undefined>();
  const [conflictResult, setConflictResult] = useState<any>(null);
  // const [selectedConflicts, setSelectedConflicts] = useState<string[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<ConflictReportItem | null>(null);
  const [showIgnoreModal, setShowIgnoreModal] = useState(false);
  const [ignoreReason, setIgnoreReason] = useState('');
  const [ignoreList, setIgnoreList] = useState<ConflictIgnoreItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [filters, _setFilters] = useState<{
    severity?: string;
    type?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);



  const loadProjectData = async () => {
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
        const project = storageService.getProject(projectId);
        if (project) {
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
          
          // 加载组织者手册
          // setOrganizerGuide(project.organizerGuide);
          
          // 尝试加载时间线事件（这里需要从存储中获取）
          // 由于时间线可能存储在不同位置，这里简化处理
          setTimelineEvents([]);
          
          // 尝试加载证据链（这里简化处理，实际应从存储中获取）
          setEvidenceChains([{
            id: 'main_chain',
            name: '主要证据链',
            description: '案件的核心证据链',
            clueIds: allClues.slice(0, Math.min(3, allClues.length)).map(c => c.id)
          }]);
          
          // 加载忽略列表
          // 临时修复，实际应从正确的存储方法获取
          // const savedIgnoreList = [];
          // if (savedIgnoreList) {
          //   setIgnoreList(JSON.parse(savedIgnoreList));
          // }
        }
      }
    } catch (error) {
      console.error('加载项目数据失败:', error);
      message.error('数据加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, []);

  const runConflictDetection = () => {
    setIsLoading(true);
    try {
      const result = detectAllConflicts({
        characters,
        scenes,
        clues,
        timelineEvents,
        evidenceChains,
        // organizerGuide已从detectAllConflicts参数中移除
        ignoreList
      });
      setConflictResult(result);
      message.success(`冲突检测完成，发现 ${result.totalConflicts} 个冲突`);
    } catch (error) {
      console.error('冲突检测失败:', error);
      message.error('冲突检测失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = (format: 'json' | 'txt') => {
    if (!conflictResult) {
      message.warning('请先运行冲突检测');
      return;
    }
    
    const content = exportConflictReport(conflictResult, format);
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 'text/plain' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conflict_report_${new Date().getTime()}.${format}`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    message.success('冲突报告导出成功');
  };

  const handleIgnoreConflict = () => {
    if (!currentConflict) return;
    
    const newIgnoreItem: ConflictIgnoreItem = {
      conflictId: currentConflict.id,
      reason: ignoreReason || '无特定原因',
      ignoredAt: new Date().toISOString()
    };
    
    const newIgnoreList = [...ignoreList, newIgnoreItem];
    setIgnoreList(newIgnoreList);
    
    // 保存到存储
    if (currentProjectId) {
      // storageService.setProjectSetting( 临时修复
      //   currentProjectId, 
      //   'conflictIgnoreList', 
      //   JSON.stringify(newIgnoreList)
      // );
    }
    
    // 重新运行检测以更新状态
    runConflictDetection();
    
    setShowIgnoreModal(false);
    setIgnoreReason('');
    message.success('已将冲突添加到忽略列表');
  };

  const handleRemoveFromIgnoreList = (conflictId: string) => {
    Modal.confirm({
      title: '确认移除',
      content: '确定要将此冲突从忽略列表中移除吗？',
      onOk: () => {
        const newIgnoreList = ignoreList.filter(item => item.conflictId !== conflictId);
        setIgnoreList(newIgnoreList);
        
        if (currentProjectId) {
          // storageService.setProjectSetting( 临时修复
          //   currentProjectId, 
          //   'conflictIgnoreList', 
          //   JSON.stringify(newIgnoreList)
          // );
        }
        
        runConflictDetection();
        message.success('已从忽略列表移除');
      }
    });
  };

  const showConflictDetail = (conflict: ConflictReportItem) => {
    setCurrentConflict(conflict);
    setShowDetailModal(true);
  };

  const showIgnoreDialog = (conflict: ConflictReportItem) => {
    setCurrentConflict(conflict);
    setShowIgnoreModal(true);
  };

  const getConflictSeverityTag = (severity: ConflictSeverity) => {
    switch (severity) {
      case ConflictSeverity.HIGH:
        return <Tag color="red">严重</Tag>;
      case ConflictSeverity.MEDIUM:
        return <Tag color="orange">中等</Tag>;
      case ConflictSeverity.LOW:
        return <Tag color="blue">轻微</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  const getConflictTypeText = (type: ConflictType) => {
    const typeMap: { [key in ConflictType]: string } = {
      [ConflictType.LOCATION_CONFLICT]: '地点冲突',
      [ConflictType.TIME_CONFLICT]: '时间冲突',
      [ConflictType.EVIDENCE_TIMELINE_CONFLICT]: '证据-时间线矛盾',
      [ConflictType.EVIDENCE_STATEMENT_CONFLICT]: '证据-陈述矛盾',
      [ConflictType.MISSING_KEY_EVIDENCE]: '关键证据缺失',
      [ConflictType.MISSING_MOTIVE]: '动机缺失',
      [ConflictType.SECRET_REVEAL_CONFLICT]: '秘密暴露不合理',
      [ConflictType.TASK_REACHABILITY_CONFLICT]: '任务不可达'
    };
    return typeMap[type] || '未知类型';
  };

  const getFilteredConflicts = (): ConflictReportItem[] => {
    if (!conflictResult) return [];
    
    let conflicts = conflictResult.allConflicts.filter((c: any) => !c.isIgnored);
    
    // 按标签筛选
    if (activeTab === 'high') {
      conflicts = conflicts.filter((c: any) => c.severity === ConflictSeverity.HIGH);
    } else if (activeTab === 'medium') {
      conflicts = conflicts.filter((c: any) => c.severity === ConflictSeverity.MEDIUM);
    } else if (activeTab === 'low') {
      conflicts = conflicts.filter((c: any) => c.severity === ConflictSeverity.LOW);
    }
    
    // 按严重程度筛选
    if (filters.severity) {
      conflicts = conflicts.filter((c: any) => c.severity === filters.severity);
    }
    // 按类型筛选
    if (filters.type) {
      conflicts = conflicts.filter((c: any) => c.type === filters.type);
    }
    
    return conflicts;
  };

  const columns: ColumnsType<ConflictReportItem> = [
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => getConflictSeverityTag(severity)
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => getConflictTypeText(type)
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text, record) => (
        <Tooltip title={text}>
          <span onClick={() => showConflictDetail(record)} style={{ cursor: 'pointer', color: '#1890ff' }}>
            {text}
          </span>
        </Tooltip>
      )
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      render: (time) => time || '-'
    },
    {
      title: '地点',
      dataIndex: 'location',
      key: 'location',
      render: (location) => location || '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={() => showConflictDetail(record)}
          >
            详情
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<EyeInvisibleOutlined />}
            onClick={() => showIgnoreDialog(record)}
          >
            忽略
          </Button>
        </Space>
      )
    }
  ];

  const ignoreListColumns: ColumnsType<ConflictIgnoreItem> = [
    {
      title: '冲突ID',
      dataIndex: 'conflictId',
      key: 'conflictId',
      ellipsis: true
    },
    {
      title: '忽略原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true
    },
    {
      title: '忽略时间',
      dataIndex: 'ignoredAt',
      key: 'ignoredAt',
      render: (time) => new Date(time).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          danger 
          type="link" 
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveFromIgnoreList(record.conflictId)}
        >
          移除
        </Button>
      )
    }
  ];

  const renderSuggestion = (suggestion: ConflictSuggestion) => (
    <Card key={suggestion.id} title={suggestion.description} size="small" style={{ marginBottom: 16 }}>
      <Title level={5}>实施步骤：</Title>
      <ul>
        {suggestion.implementationSteps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ul>
    </Card>
  );

  return (
    <Layout>
      <Header style={{ background: '#fff', padding: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center' }}>
          <AlertOutlined style={{ fontSize: '20px', marginRight: '12px', color: '#faad14' }} />
          <Title level={4} style={{ margin: 0 }}>冲突检测系统</Title>
        </div>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Card
          title="冲突检测控制面板"
          extra={
            <Space>
              <Button 
                type="primary" 
                icon={<AlertOutlined />}
                onClick={runConflictDetection}
                loading={isLoading}
              >
                运行冲突检测
              </Button>
              <Button 
                icon={<DownloadOutlined />}
                onClick={() => handleExportReport('txt')}
                disabled={!conflictResult}
              >
                导出报告
              </Button>
            </Space>
          }
        >
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="全部冲突" key="all">
              <Table
                columns={columns}
                dataSource={getFilteredConflicts()}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                loading={isLoading}
                locale={{ emptyText: '暂无冲突数据' }}
                rowSelection={{
                  onChange: (_selectedRowKeys) => {
                    // setSelectedConflicts(selectedRowKeys as string[]);
                  }
                }}
              />
            </TabPane>
            <TabPane tab="严重冲突" key="high">
              <Table
                columns={columns}
                dataSource={getFilteredConflicts()}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: '暂无严重冲突' }}
              />
            </TabPane>
            <TabPane tab="中等冲突" key="medium">
              <Table
                columns={columns}
                dataSource={getFilteredConflicts()}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: '暂无中等冲突' }}
              />
            </TabPane>
            <TabPane tab="轻微冲突" key="low">
              <Table
                columns={columns}
                dataSource={getFilteredConflicts()}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: '暂无轻微冲突' }}
              />
            </TabPane>
            <TabPane tab="忽略列表" key="ignored">
              <Table
                columns={ignoreListColumns}
                dataSource={ignoreList}
                rowKey="conflictId"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: '忽略列表为空' }}
              />
            </TabPane>
          </Tabs>
        </Card>



        {/* 冲突详情模态框 */}
        <Modal
          title="冲突详情"
          open={showDetailModal}
          onCancel={() => setShowDetailModal(false)}
          footer={[
            <Button key="ignore" danger onClick={() => showIgnoreDialog(currentConflict!)}>
              添加到忽略列表
            </Button>,
            <Button key="close" onClick={() => setShowDetailModal(false)}>
              关闭
            </Button>
          ]}
          width={800}
        >
          {currentConflict && (
            <div>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>严重程度：</Text>
                  {getConflictSeverityTag(currentConflict.severity)}
                </div>
                <div>
                  <Text strong>冲突类型：</Text>
                  {getConflictTypeText(currentConflict.type)}
                </div>
                <div>
                  <Text strong>描述：</Text>
                  <Paragraph>{currentConflict.description}</Paragraph>
                </div>
                {currentConflict.time && (
                  <div>
                    <Text strong>发生时间：</Text>
                    {currentConflict.time}
                  </div>
                )}
                {currentConflict.location && (
                  <div>
                    <Text strong>发生地点：</Text>
                    {currentConflict.location}
                  </div>
                )}
                <div>
                  <Text strong>相关实体：</Text>
                  <div style={{ marginLeft: 20 }}>
                    {currentConflict.relatedEntities.characterIds && (
                      <div>
                        <Text>角色：</Text>
                        {currentConflict.relatedEntities.characterIds.map(id => {
                          const character = characters.find(c => c.id === id);
                          return <Tag key={id}>{character?.name || id}</Tag>;
                        })}
                      </div>
                    )}
                    {currentConflict.relatedEntities.clueIds && (
                      <div>
                        <Text>线索：</Text>
                        {currentConflict.relatedEntities.clueIds.map(id => {
                          const clue = clues.find(c => c.id === id);
                          return <Tag key={id}>{clue?.name || id}</Tag>;
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Text strong>解决方案建议：</Text>
                  {currentConflict.suggestions.map(renderSuggestion)}
                </div>
              </Space>
            </div>
          )}
        </Modal>

        {/* 忽略冲突模态框 */}
        <Modal
          title="忽略冲突"
          open={showIgnoreModal}
          onCancel={() => {
            setShowIgnoreModal(false);
            setIgnoreReason('');
          }}
          onOk={handleIgnoreConflict}
        >
          <Form layout="vertical">
            <Form.Item
              label="冲突描述"
            >
              <TextArea rows={3} value={currentConflict?.description} disabled />
            </Form.Item>
            <Form.Item
              label="忽略原因（可选）"
              tooltip="请说明为什么要忽略这个冲突"
            >
              <TextArea 
                rows={3} 
                value={ignoreReason}
                onChange={(e) => setIgnoreReason(e.target.value)}
                placeholder="例如：这是有意设计的剧情冲突..."
              />
            </Form.Item>
            <Form.Item>
              <Checkbox defaultChecked>
                确认将此冲突添加到忽略列表
              </Checkbox>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};

export default ConflictDetectionPage;