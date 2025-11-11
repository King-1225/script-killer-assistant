import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Typography,
  Table,
  Input,
  Button,
  Modal,
  Form,
  Select,
  Space,
  Tag,
  Alert,
  Tabs,
  message,
  Tooltip,
  Upload,
  Empty,
  Switch,
  List
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  FileTextOutlined,
  AlertOutlined,
  EyeOutlined,
  ApiOutlined,
  CopyOutlined,
  ClockCircleOutlined,
  TagOutlined,
  LayoutOutlined,
  FilterOutlined,
  MoreOutlined
} from '@ant-design/icons';
import type { Character } from '../../types';
import storageService from '../../services/storage';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
import { Dropdown, Menu } from 'antd';

interface TimelineEvent {
  id: string;
  characterId: string;
  time: string;
  location?: string;
  action?: string;
  notes?: string;
  isConflicting?: boolean;
  conflictType?: 'location' | 'action';
  conflictWith?: string[];
}

interface TimeRangeConfig {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  interval: number; // 分钟
}

interface TimePoint {
  id: string;
  label: string;
  time: string; // HH:mm 格式
}

interface ConflictReportItem {
  id: string;
  time: string;
  characters: string[];
  locations?: string[];
  type: 'location' | 'action';
  description: string;
}

interface TimelineTemplate {
  id: string;
  name: string;
  description: string;
  structure: {
    timePoints: TimePoint[];
    defaultEvents: Omit<TimelineEvent, 'id' | 'characterId'>[];
  };
}

const TimelineEditor: React.FC = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timePoints, setTimePoints] = useState<TimePoint[]>([]);
  const [timeRangeConfig, setTimeRangeConfig] = useState<TimeRangeConfig>({
    startHour: 17,
    startMinute: 0,
    endHour: 23,
    endMinute: 0,
    interval: 15
  });
  const [conflicts, setConflicts] = useState<ConflictReportItem[]>([]);
  const [showTimeRangeModal, setShowTimeRangeModal] = useState(false);
  const [showAddTimePointModal, setShowAddTimePointModal] = useState(false);
  const [showBatchFillModal, setShowBatchFillModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'gantt' | 'path'>('table');
  const [showConflictReport, setShowConflictReport] = useState(true);
  
  const [timeRangeForm] = Form.useForm();
  const [batchFillForm] = Form.useForm();
  const [addTimePointForm] = Form.useForm();

  const timelineTemplates: TimelineTemplate[] = [
    {
      id: 'standard',
      name: '标准流程',
      description: '经典的剧本杀时间线流程',
      structure: {
        timePoints: [
          { id: 't1', label: '自我介绍', time: '17:00' },
          { id: 't2', label: '第一轮取证', time: '18:00' },
          { id: 't3', label: '第一次讨论', time: '19:00' },
          { id: 't4', label: '第二轮取证', time: '20:00' },
          { id: 't5', label: '第二次讨论', time: '21:00' },
          { id: 't6', label: '投票', time: '22:00' },
          { id: 't7', label: '真相大白', time: '22:30' }
        ],
        defaultEvents: [
          { time: '17:00', location: '大厅', action: '角色自我介绍' },
          { time: '18:00', location: '现场', action: '搜集证据' },
          { time: '19:00', location: '大厅', action: '讨论发现' },
          { time: '20:00', location: '其他区域', action: '深入调查' },
          { time: '21:00', location: '大厅', action: '集中讨论' },
          { time: '22:00', location: '大厅', action: '投票环节' },
          { time: '22:30', location: '大厅', action: '揭晓真相' }
        ]
      }
    },
    {
      id: 'mystery',
      name: '悬疑递进',
      description: '逐步揭示线索的悬疑风格',
      structure: {
        timePoints: [
          { id: 't1', label: '案发', time: '17:00' },
          { id: 't2', label: '初步调查', time: '17:30' },
          { id: 't3', label: '发现线索', time: '18:30' },
          { id: 't4', label: '深入挖掘', time: '19:30' },
          { id: 't5', label: '关键证据', time: '20:30' },
          { id: 't6', label: '锁定嫌疑人', time: '21:30' },
          { id: 't7', label: '最终推理', time: '22:30' }
        ],
        defaultEvents: [
          { time: '17:00', location: '案发现场', action: '发现尸体' },
          { time: '17:30', location: '现场', action: '初步勘查' },
          { time: '18:30', location: '各处', action: '寻找线索' },
          { time: '19:30', location: '各处', action: '深入调查' },
          { time: '20:30', location: '关键区域', action: '发现重要证据' },
          { time: '21:30', location: '大厅', action: '锁定嫌疑人' },
          { time: '22:30', location: '大厅', action: '最终推理' }
        ]
      }
    },
    {
      id: 'party',
      name: '派对形式',
      description: '轻松互动的派对式流程',
      structure: {
        timePoints: [
          { id: 't1', label: '宾客到场', time: '17:00' },
          { id: 't2', label: '欢迎仪式', time: '17:30' },
          { id: 't3', label: '自由交流', time: '18:00' },
          { id: 't4', label: '突发状况', time: '19:00' },
          { id: 't5', label: '调查取证', time: '19:30' },
          { id: 't6', label: '欢乐讨论', time: '20:30' },
          { id: 't7', label: '结局揭晓', time: '22:00' }
        ],
        defaultEvents: [
          { time: '17:00', location: '入口', action: '迎接宾客' },
          { time: '17:30', location: '大厅', action: '欢迎致辞' },
          { time: '18:00', location: '各处', action: '自由交流' },
          { time: '19:00', location: '大厅', action: '突发状况发生' },
          { time: '19:30', location: '各处', action: '调查取证' },
          { time: '20:30', location: '大厅', action: '欢乐讨论' },
          { time: '22:00', location: '大厅', action: '揭晓结局' }
        ]
      }
    }
  ];

  useEffect(() => {
    // 初始化数据
    const projects = storageService.getProjects();
    if (projects.length > 0) {
      loadProjectData(projects[0].id);
    }
  }, []);

  const loadProjectData = (projectId: string) => {
      const project = storageService.getProject(projectId);
      if (project) {
        setCharacters(project.characters || []);
        generateTimePoints();
        initializeTimelineEvents(project.characters || []);
      }
    };

  const initializeTimelineEvents = (projectCharacters: Character[]) => {
    const events: TimelineEvent[] = [];
    projectCharacters.forEach(character => {
      timePoints.forEach(timePoint => {
        events.push({
          id: `${character.id}_${timePoint.time}`,
          characterId: character.id,
          time: timePoint.time
        });
      });
    });
    setTimelineEvents(events);
  };

  const generateTimePoints = () => {
    const points: TimePoint[] = [];
    const { startHour, startMinute, endHour, endMinute, interval } = timeRangeConfig;
    
    // 转换为分钟数
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    for (let time = startTime; time <= endTime; time += interval) {
      const hour = Math.floor(time / 60);
      const minute = time % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      points.push({
        id: `time_${timeString}`,
        label: timeString,
        time: timeString
      });
    }
    
    setTimePoints(points);
  };

  const updateTimeRange = () => {
    const values = timeRangeForm.getFieldsValue();
    setTimeRangeConfig({
      startHour: values.startHour || 17,
      startMinute: values.startMinute || 0,
      endHour: values.endHour || 23,
      endMinute: values.endMinute || 0,
      interval: values.interval || 15
    });
    generateTimePoints();
    initializeTimelineEvents(characters);
    setShowTimeRangeModal(false);
  };

  const addTimePoint = () => {
    const values = addTimePointForm.getFieldsValue();
    const newTimePoint: TimePoint = {
      id: `time_${values.time}`,
      label: values.time,
      time: values.time
    };
    
    setTimePoints([...timePoints, newTimePoint]);
    
    // 为每个角色添加对应时间点的事件
    const newEvents: TimelineEvent[] = [];
    characters.forEach(character => {
      newEvents.push({
        id: `${character.id}_${values.time}`,
        characterId: character.id,
        time: values.time
      });
    });
    
    setTimelineEvents([...timelineEvents, ...newEvents]);
    setShowAddTimePointModal(false);
  };

  const deleteTimePoint = (timePointId: string) => {
    const timePoint = timePoints.find(tp => tp.id === timePointId);
    if (timePoint) {
      setTimePoints(timePoints.filter(tp => tp.id !== timePointId));
      setTimelineEvents(timelineEvents.filter(event => event.time !== timePoint.time));
    }
  };

  const updateTimelineEvent = (characterId: string, time: string, field: keyof TimelineEvent, value: string) => {
    setTimelineEvents(timelineEvents.map(event => {
      if (event.characterId === characterId && event.time === time) {
        return { ...event, [field]: value };
      }
      return event;
    }));
  };

  const detectConflicts = () => {
    const conflictReports: ConflictReportItem[] = [];
    const locationConflicts = new Map<string, Map<string, string[]>>(); // 时间 -> 地点 -> 角色ID列表
    
    // 重置所有冲突标记
    setTimelineEvents(timelineEvents.map(event => ({ ...event, isConflicting: false, conflictType: undefined, conflictWith: [] })));
    
    // 检测地点冲突
    timePoints.forEach(timePoint => {
      locationConflicts.set(timePoint.time, new Map());
      
      characters.forEach(character => {
        const event = timelineEvents.find(e => e.characterId === character.id && e.time === timePoint.time);
        if (event && event.location) {
          if (!locationConflicts.get(timePoint.time)?.has(event.location)) {
            locationConflicts.get(timePoint.time)?.set(event.location, []);
          }
          locationConflicts.get(timePoint.time)?.get(event.location)?.push(character.id);
        }
      });
      
      // 检查每个地点是否有多个角色
      locationConflicts.get(timePoint.time)?.forEach((characterIds, location) => {
        if (characterIds.length > 1) {
          const conflictId = `location_${timePoint.time}_${location}`;
          conflictReports.push({
            id: conflictId,
            time: timePoint.time,
            characters: characterIds,
            locations: [location],
            type: 'location',
            description: `多人同时在${location}`
          });
          
          // 更新冲突标记
          setTimelineEvents(prev => prev.map(event => {
            if (event.time === timePoint.time && event.location === location) {
              return {
                ...event,
                isConflicting: true,
                conflictType: 'location',
                conflictWith: characterIds.filter(id => id !== event.characterId)
              };
            }
            return event;
          }));
        }
      });
    });
    
    setConflicts(conflictReports);
    message.success('冲突检测完成，发现 ' + conflictReports.length + ' 个冲突');
  };

  const batchFillTimeline = () => {
    const values = batchFillForm.getFieldsValue();
    const { characterIds = [], timePointIds = [], location, action, notes } = values;
    
    setTimelineEvents(timelineEvents.map(event => {
      if (characterIds.includes(event.characterId) && timePointIds.includes(event.time)) {
        return {
          ...event,
          location: location || event.location,
          action: action || event.action,
          notes: notes || event.notes
        };
      }
      return event;
    }));
    
    setShowBatchFillModal(false);
    message.success('批量填充完成');
  };

  const applyTemplate = (templateId: string) => {
    const template = timelineTemplates.find(t => t.id === templateId);
    if (template) {
      setTimePoints(template.structure.timePoints);
      
      const newEvents: TimelineEvent[] = [];
      characters.forEach(character => {
        template.structure.timePoints.forEach(timePoint => {
          const defaultEvent = template.structure.defaultEvents.find(e => e.time === timePoint.time);
          newEvents.push({
            id: `${character.id}_${timePoint.time}`,
            characterId: character.id,
            time: timePoint.time,
            ...defaultEvent
          });
        });
      });
      
      setTimelineEvents(newEvents);
      message.success('已应用 ' + template.name + ' 模板');
    }
  };

  const exportTimeline = (format: 'json' | 'txt') => {
    if (format === 'json') {
      const exportData = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        characters,
        timePoints,
        events: timelineEvents
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'timeline_export_' + new Date().getTime() + '.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else {
      // 导出为文本表格
      let textContent = '角色\t';
      timePoints.forEach(timePoint => {
        textContent += `${timePoint.label}\t`;
      });
      textContent += '\n';
      
      characters.forEach(character => {
        textContent += `${character.name}\t`;
        timePoints.forEach(timePoint => {
          const event = timelineEvents.find(e => e.characterId === character.id && e.time === timePoint.time);
          if (event) {
            textContent += (event.location || '-') + ':' + (event.action || '-') + '\t';
          } else {
            textContent += '\t';
          }
        });
        textContent += '\n';
      });
      
      const dataUri = 'data:text/plain;charset=utf-8,'+ encodeURIComponent(textContent);
      const exportFileDefaultName = 'timeline_export_' + new Date().getTime() + '.txt';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
    
    setShowExportModal(false);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);
        
        if (importData.timePoints && importData.events) {
          setTimePoints(importData.timePoints);
          setTimelineEvents(importData.events);
          message.success('时间线导入成功');
        } else {
          message.error('导入文件格式错误');
        }
      } catch (error) {
        message.error('导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  };

  const copyTimePointContent = (sourceTime: string, targetTime: string) => {
    const sourceEvents = timelineEvents.filter(event => event.time === sourceTime);
    
    setTimelineEvents(timelineEvents.map(event => {
      if (event.time === targetTime) {
        const sourceEvent = sourceEvents.find(e => e.characterId === event.characterId);
        if (sourceEvent) {
          return {
            ...event,
            location: sourceEvent.location,
            action: sourceEvent.action,
            notes: sourceEvent.notes
          };
        }
      }
      return event;
    }));
    
    message.success('已从 ' + sourceTime + ' 复制内容到 ' + targetTime);
  };

  const fillEmptyCells = () => {
    // 查找每个角色的填充模式
    const characterPatterns = new Map<string, Map<string, string>>(); // 角色ID -> 字段 -> 最常见值
    
    characters.forEach(character => {
      const locationCounts = new Map<string, number>();
      const actionCounts = new Map<string, number>();
      
      timelineEvents.filter(event => event.characterId === character.id).forEach(event => {
        if (event.location) {
          locationCounts.set(event.location, (locationCounts.get(event.location) || 0) + 1);
        }
        if (event.action) {
          actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1);
        }
      });
      
      // 找出最常见的地点和行动
      let mostCommonLocation = '';
      let maxLocationCount = 0;
      locationCounts.forEach((count, location) => {
        if (count > maxLocationCount) {
          mostCommonLocation = location;
          maxLocationCount = count;
        }
      });
      
      let mostCommonAction = '';
      let maxActionCount = 0;
      actionCounts.forEach((count, action) => {
        if (count > maxActionCount) {
          mostCommonAction = action;
          maxActionCount = count;
        }
      });
      
      characterPatterns.set(character.id, new Map([
        ['location', mostCommonLocation],
        ['action', mostCommonAction]
      ]));
    });
    
    // 填充空白单元格
    setTimelineEvents(timelineEvents.map(event => {
      const patterns = characterPatterns.get(event.characterId);
      if (patterns) {
        return {
          ...event,
          location: event.location || patterns.get('location'),
          action: event.action || patterns.get('action')
        };
      }
      return event;
    }));
    
    message.success('空白单元格填充完成');
  };

  const jumpToConflict = (conflict: ConflictReportItem) => {
    // 在实际应用中，这里可以实现滚动到冲突位置的逻辑
    message.info('定位到 ' + conflict.time + ' 的冲突');
  };

  const getEventAtTime = (characterId: string, time: string) => {
    return timelineEvents.find(event => event.characterId === characterId && event.time === time);
  };

  const getCharacterName = (characterId: string) => {
    const character = characters.find(c => c.id === characterId);
    return character ? character.name : '未知角色';
  };

  const getConflictCellStyle = (event: TimelineEvent | undefined) => {
    if (event?.isConflicting) {
      return { backgroundColor: '#fff1f0', borderColor: '#ffccc7' };
    }
    return {};
  };

  const filteredCharacters = characters;
  const filteredTimePoints = timePoints;

  return (
    <Layout style={{ minHeight: '100vh', padding: '24px' }}>
      <Layout>
        <Sider width={300} theme="light" style={{ padding: '16px', background: '#fff', marginRight: '16px' }}>
          <Card title="时间线设置" style={{ marginBottom: '16px' }}>
            <Button 
              type="primary" 
              block 
              icon={<ClockCircleOutlined />}
              onClick={() => {
                timeRangeForm.setFieldsValue(timeRangeConfig);
                setShowTimeRangeModal(true);
              }}
              style={{ marginBottom: '16px' }}
            >
              调整时间范围
            </Button>
            
            <Button 
              type="default" 
              block 
              icon={<PlusOutlined />}
              onClick={() => setShowAddTimePointModal(true)}
              style={{ marginBottom: '16px' }}
            >
              添加时间点
            </Button>
            
            <Button 
              type="default" 
              block 
              icon={<ApiOutlined />}
              onClick={detectConflicts}
              style={{ marginBottom: '16px' }}
            >
              检测冲突
            </Button>
            
            <Button 
              type="default" 
              block 
              icon={<CopyOutlined />}
              onClick={fillEmptyCells}
              style={{ marginBottom: '16px' }}
            >
              填充空白单元格
            </Button>
            
            <Button 
              type="default" 
              block 
              icon={<FilterOutlined />}
              onClick={() => setShowBatchFillModal(true)}
              style={{ marginBottom: '16px' }}
            >
              批量填充
            </Button>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>时间线模板</Text>
              <Select 
                placeholder="选择模板" 
                style={{ width: '100%' }}
                onChange={applyTemplate}
              >
                {timelineTemplates.map(template => (
                  <Option key={template.id} value={template.id}>
                    <div>
                      <div>{template.name}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{template.description}</div>
                    </div>
                  </Option>
                ))}
              </Select>
            </div>
            
            <Upload.Dragger 
              beforeUpload={(file) => {
                handleImport(file);
                return false;
              }}
              style={{ marginBottom: '16px' }}
              accept=".json"
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 JSON 格式的时间线导入
              </p>
            </Upload.Dragger>
            
            <Button 
              type="default" 
              block 
              icon={<DownloadOutlined />}
              onClick={() => setShowExportModal(true)}
              style={{ marginTop: '16px' }}
            >
              导出时间线
            </Button>
          </Card>

          {showConflictReport && conflicts.length > 0 && (
            <Card 
              title={
                <Space>
                  <AlertOutlined style={{ color: '#f5222d' }} />
                  <Text>冲突报告 ({conflicts.length})</Text>
                </Space>
              }
              style={{ marginTop: '16px', borderColor: '#ffccc7' }}
              type="inner"
            >
              <List
                dataSource={conflicts}
                renderItem={conflict => (
                  <List.Item
                    actions={[
                      <Button 
                        type="link" 
                        
                        onClick={() => jumpToConflict(conflict)}
                      >
                        定位
                      </Button>
                    ]}
                  >
                    <Alert
                      message={
                        <Space>
                          <Text mark>{conflict.time}</Text>
                          <Text type="danger">{conflict.description}</Text>
                        </Space>
                      }
                      description={
                        <div>
                          <Text>涉及角色: </Text>
                          {conflict.characters.map(id => (
                            <Tag key={id} color="red">{getCharacterName(id)}</Tag>
                          ))}
                        </div>
                      }
                      type="error"
                      showIcon
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}
        </Sider>

        <Content style={{ flex: 1, padding: '16px', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Title level={4}>时间线编辑器</Title>
            <Space>
              <Tabs activeKey={activeView} onChange={v => setActiveView(v as any)}>
                <TabPane tab={<span><TableOutlined /> 表格视图</span>} key="table" />
                <TabPane tab={<span><LayoutOutlined /> 甘特图</span>} key="gantt" />
                <TabPane tab={<span><TagOutlined /> 路径图</span>} key="path" />
              </Tabs>
              <Switch 
                checked={showConflictReport}
                onChange={setShowConflictReport}
                checkedChildren="显示冲突"
                unCheckedChildren="隐藏冲突"
              />
            </Space>
          </div>

          {activeView === 'table' && (
            <Card>
              <Table
                bordered
                dataSource={filteredCharacters}
                rowKey="id"
                pagination={false}
                scroll={{ x: 'max-content', y: 600 }}
                columns={[
                  {
                    title: '角色',
                    dataIndex: ['name'],
                    key: 'name',
                    fixed: 'left',
                    width: 150,
                    render: (text: string) => <Text strong>{text}</Text>
                  },
                  ...filteredTimePoints.map(timePoint => ({
                    title: (
                      <Tooltip title={timePoint.time}>
                        <div style={{ position: 'relative' }}>
                          {timePoint.label}
                          <Dropdown
                            overlay={
                              <Menu>
                                <Menu.Item onClick={() => deleteTimePoint(timePoint.id)}>
                                  <DeleteOutlined /> 删除时间点
                                </Menu.Item>
                                {filteredTimePoints.map(otherTime => (
                                  <Menu.Item
                                    key={otherTime.id}
                                    onClick={() => copyTimePointContent(otherTime.time, timePoint.time)}
                                    disabled={otherTime.id === timePoint.id}
                                  >
                                    <CopyOutlined /> 从{otherTime.label}复制
                                  </Menu.Item>
                                ))}
                              </Menu>
                            }
                          >
                            <MoreOutlined style={{ position: 'absolute', right: -12, top: -8, fontSize: '12px' }} />
                          </Dropdown>
                        </div>
                      </Tooltip>
                    ),
                    key: timePoint.id,
                    width: 200,
                    render: (_: any, character: Character) => {
                      const event = getEventAtTime(character.id, timePoint.time);
                      return (
                        <div 
                          style={{
                            padding: '4px',
                            border: '1px solid #d9d9d9',
                            borderRadius: '2px',
                            minHeight: '60px',
                            ...getConflictCellStyle(event)
                          }}
                        >
                          <Input
                            size="small"
                            placeholder="地点"
                            value={event?.location || ''}
                            onChange={(e) => updateTimelineEvent(character.id, timePoint.time, 'location', e.target.value)}
                            style={{ marginBottom: '4px' }}
                          />
                          <Input
                            size="small"
                            placeholder="行动"
                            value={event?.action || ''}
                            onChange={(e) => updateTimelineEvent(character.id, timePoint.time, 'action', e.target.value)}
                          />
                          {event?.isConflicting && (
                            <Tooltip title={'与' + (event.conflictWith?.map(id => getCharacterName(id)).join('、') || '') + '冲突'}>
                              <AlertOutlined style={{ color: '#f5222d', fontSize: '12px' }} />
                            </Tooltip>
                          )}
                        </div>
                      );
                    }
                  }))
                ]}
              />
            </Card>
          )}

          {activeView === 'gantt' && (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Empty description="甘特图视图开发中" />
                <Button 
                  type="primary" 
                  icon={<EyeOutlined />}
                  onClick={() => message.info('甘特图可视化功能正在开发中')}
                  style={{ marginTop: '16px' }}
                >
                  预览模式
                </Button>
              </div>
            </Card>
          )}

          {activeView === 'path' && (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Empty description="角色行动路径图开发中" />
                <Button 
                  type="primary" 
                  icon={<TagOutlined />}
                  onClick={() => message.info('角色行动路径图功能正在开发中')}
                  style={{ marginTop: '16px' }}
                >
                  查看路径
                </Button>
              </div>
            </Card>
          )}
        </Content>
      </Layout>

      <Modal
        title="时间范围设置"
        open={showTimeRangeModal}
        onCancel={() => setShowTimeRangeModal(false)}
        onOk={updateTimeRange}
        okText="确定"
        cancelText="取消"
      >
        <Form form={timeRangeForm} layout="vertical">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <Form.Item name="startHour" label="开始时间">
                <Select placeholder="小时">
                  {Array.from({ length: 24 }, (_, i) => (
                    <Option key={i} value={i}>{i.toString().padStart(2, '0')}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Text>:</Text>
              <Form.Item name="startMinute">
                <Select placeholder="分钟">
                  {[0, 15, 30, 45].map(min => (
                    <Option key={min} value={min}>{min.toString().padStart(2, '0')}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Space>
            
            <Space>
              <Form.Item name="endHour" label="结束时间">
                <Select placeholder="小时">
                  {Array.from({ length: 24 }, (_, i) => (
                    <Option key={i} value={i}>{i.toString().padStart(2, '0')}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Text>:</Text>
              <Form.Item name="endMinute">
                <Select placeholder="分钟">
                  {[0, 15, 30, 45].map(min => (
                    <Option key={min} value={min}>{min.toString().padStart(2, '0')}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Space>
            
            <Form.Item name="interval" label="时间间隔（分钟）">
              <Select>
                <Option value={5}>5分钟</Option>
                <Option value={10}>10分钟</Option>
                <Option value={15}>15分钟</Option>
                <Option value={20}>20分钟</Option>
                <Option value={30}>30分钟</Option>
                <Option value={60}>60分钟</Option>
              </Select>
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal
        title="添加时间点"
        open={showAddTimePointModal}
        onCancel={() => setShowAddTimePointModal(false)}
        onOk={addTimePoint}
        okText="确定"
        cancelText="取消"
      >
        <Form form={addTimePointForm} layout="vertical">
          <Form.Item 
            name="time" 
            label="时间点"
            rules={[{ required: true, message: '请输入时间点' }]}
          >
            <Input placeholder="格式: HH:mm，例如: 18:30" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量填充时间线"
        open={showBatchFillModal}
        onCancel={() => setShowBatchFillModal(false)}
        onOk={batchFillTimeline}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form form={batchFillForm} layout="vertical">
          <Form.Item 
            name="characterIds" 
            label="选择角色"
            rules={[{ required: true, message: '请至少选择一个角色' }]}
          >
            <Select mode="multiple" placeholder="选择要填充的角色">
              {characters.map(char => (
                <Option key={char.id} value={char.id}>{char.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item 
            name="timePointIds" 
            label="选择时间点"
            rules={[{ required: true, message: '请至少选择一个时间点' }]}
          >
            <Select mode="multiple" placeholder="选择要填充的时间点">
              {timePoints.map(time => (
                <Option key={time.time} value={time.time}>{time.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="location" label="地点（可选）">
            <Input placeholder="输入地点" />
          </Form.Item>

          <Form.Item name="action" label="行动（可选）">
            <Input placeholder="输入行动描述" />
          </Form.Item>

          <Form.Item name="notes" label="备注（可选）">
            <Input.TextArea rows={2} placeholder="输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="导出时间线"
        open={showExportModal}
        onCancel={() => setShowExportModal(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button 
            type="primary" 
            block 
            icon={<FileTextOutlined />}
            onClick={() => exportTimeline('json')}
          >
            导出为JSON文件
          </Button>
          <Button 
            type="default" 
            block 
            icon={<FileTextOutlined />}
            onClick={() => exportTimeline('txt')}
          >
            导出为文本表格
          </Button>
          <Button 
            type="default" 
            block 
            onClick={() => setShowExportModal(false)}
          >
            取消
          </Button>
        </Space>
      </Modal>
    </Layout>
  );
};

const TableOutlined: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/>
    <path d="M1 4v10h14V4H1zm8 9H3V5h6v8zm6 0h-3V5h3v8z"/>
  </svg>
);

export default TimelineEditor;