import React, { useState } from 'react';
import { Layout, Card, Typography, Tabs, Button, Slider, Form, Input, Radio, Rate, Table, Avatar } from 'antd';
import { PlayCircleOutlined, UserOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';

import storageService from '../../services/storage';
import type { TestSimulationConfig, PlayerFeedback } from '../../types';
import './styles.css';

const { Title, Text } = Typography;
const { Content } = Layout;
const { TextArea } = Input;



const TestSimulationPage: React.FC = () => {
  const [config, setConfig] = useState<TestSimulationConfig>({
    playerCount: 4,
    estimatedDuration: 240,
    difficultyLevel: 3,
    simulatedPlayers: []
  });
  const [feedbacks, setFeedbacks] = useState<PlayerFeedback[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [playerViewMode, setPlayerViewMode] = useState<string>('player1');



  // 保存配置
  const saveConfig = () => {
    try {
      const projectId = storageService.getCurrentProjectId();
      if (projectId) {
        storageService.updateProject(projectId, {
          testSimulationConfig: config,
          playerFeedbacks: feedbacks
        });
        console.log('配置已保存');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  };

  // 开始模拟
  const startSimulation = () => {
    setIsSimulating(true);
    setSimulationProgress(0);
    
    // 模拟进度更新
    const interval = setInterval(() => {
      setSimulationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSimulating(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  // 提交反馈
  const submitFeedback = (values: any) => {
    const newFeedback: PlayerFeedback = {
      id: Date.now().toString(),
      playerName: values.playerName,
      rating: values.rating,
      difficultyFeedback: values.difficulty,
      durationFeedback: values.duration,
      comments: values.comments,
      timestamp: new Date().toISOString()
    };
    
    setFeedbacks(prev => [...prev, newFeedback]);
    saveConfig();
  };

  // Tabs配置
  const tabItems: TabsProps['items'] = [
    {
      key: 'player-view',
      label: '玩家视角',
      children: (
        <div>
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Title level={5}>切换玩家视角</Title>
              <Radio.Group value={playerViewMode} onChange={(e) => setPlayerViewMode(e.target.value)}>
                <Radio.Button value="player1">玩家 1</Radio.Button>
                <Radio.Button value="player2">玩家 2</Radio.Button>
                <Radio.Button value="player3">玩家 3</Radio.Button>
                <Radio.Button value="player4">玩家 4</Radio.Button>
              </Radio.Group>
            </div>
            
            <div className="player-script-viewer">
              <div className="player-script-header">
                <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
                <Text strong>{playerViewMode === 'player1' ? '玩家 A' : 
                              playerViewMode === 'player2' ? '玩家 B' : 
                              playerViewMode === 'player3' ? '玩家 C' : '玩家 D'}</Text>
              </div>
              <div className="player-script-content">
                <Text type="secondary">玩家视角剧本查看器 - 功能开发中...</Text>
              </div>
            </div>
          </Card>
        </div>
      )
    },
    {
      key: 'simulation',
      label: '流程模拟',
      children: (
        <Card>
          <Title level={5}>游戏流程模拟器</Title>
          
          <div className="simulation-controls">
            <div style={{ marginBottom: 16 }}>
              <Text strong>模拟进度:</Text>
              <ProgressBar progress={simulationProgress} />
            </div>
            
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={startSimulation}
              disabled={isSimulating}
              style={{ marginRight: 16 }}
            >
              {isSimulating ? '模拟中...' : '开始模拟'}
            </Button>
            
            <Button disabled={!isSimulating}>
              暂停
            </Button>
          </div>
          
          <div className="simulation-log" style={{ marginTop: 24 }}>
            <Title level={5}>模拟日志</Title>
            <div className="log-container">
              <Text type="secondary">模拟开始后将显示游戏流程日志...</Text>
            </div>
          </div>
        </Card>
      )
    },
    {
      key: 'duration',
      label: '时长估算',
      children: (
        <Card>
          <Title level={5}>预计游戏时长: {config.estimatedDuration / 60} 小时</Title>
          
          <div className="duration-calculator">
            <Form.Item label="调整预计时长（分钟）">
              <Slider
                min={60}
                max={480}
                value={config.estimatedDuration}
                onChange={(value) => {
                  setConfig((prev: TestSimulationConfig) => ({ ...prev, estimatedDuration: value }));
                  saveConfig();
                }}
                marks={{
                  60: '1小时',
                  120: '2小时',
                  180: '3小时',
                  240: '4小时',
                  360: '6小时',
                  480: '8小时'
                }}
              />
            </Form.Item>
            
            <div className="duration-breakdown" style={{ marginTop: 24 }}>
              <Title level={5}>时长分配参考</Title>
              <Table 
                size="small" 
                columns={[
                  { title: '环节', dataIndex: 'section', key: 'section' },
                  { title: '预计时长', dataIndex: 'duration', key: 'duration' },
                  { title: '占比', dataIndex: 'percentage', key: 'percentage' }
                ]} 
                dataSource={[
                  { key: '1', section: '角色介绍', duration: '30分钟', percentage: '12.5%' },
                  { key: '2', section: '第一轮搜证', duration: '60分钟', percentage: '25%' },
                  { key: '3', section: '讨论分析', duration: '60分钟', percentage: '25%' },
                  { key: '4', section: '第二轮搜证', duration: '45分钟', percentage: '18.75%' },
                  { key: '5', section: '最终推理', duration: '45分钟', percentage: '18.75%' }
                ]}
              />
            </div>
          </div>
        </Card>
      )
    },
    {
      key: 'difficulty',
      label: '难度评分',
      children: (
        <Card>
          <Title level={5}>当前难度等级: {config.difficultyLevel}</Title>
          
          <div className="difficulty-score">
            <Text strong>调整难度等级:</Text>
            <Rate 
              value={config.difficultyLevel} 
              onChange={(value) => {
                setConfig((prev: TestSimulationConfig) => ({ ...prev, difficultyLevel: value }));
                saveConfig();
              }}
              count={5}
            />
          </div>
          
          <div className="difficulty-breakdown" style={{ marginTop: 24 }}>
            <Title level={5}>难度分析</Title>
            <Table 
              size="small" 
              columns={[
                { title: '评估项', dataIndex: 'item', key: 'item' },
                { title: '评分', dataIndex: 'score', key: 'score' },
                { title: '说明', dataIndex: 'description', key: 'description' }
              ]} 
              dataSource={[
                { key: '1', item: '推理复杂度', score: '3/5', description: '中等复杂度的推理逻辑' },
                { key: '2', item: '线索隐藏度', score: '4/5', description: '部分线索需要深入挖掘' },
                { key: '3', item: '时间线复杂度', score: '3/5', description: '较为清晰的时间线设计' },
                { key: '4', item: '角色关系复杂度', score: '4/5', description: '复杂的角色关系网络' }
              ]}
            />
          </div>
        </Card>
      )
    },
    {
      key: 'feedback',
      label: '反馈收集',
      children: (
        <Card>
          <Title level={5}>玩家反馈表单</Title>
          
          <Form 
            layout="vertical" 
            onFinish={submitFeedback}
            initialValues={{
              playerName: '',
              rating: 5,
              difficulty: '中等',
              duration: '合适',
              comments: ''
            }}
          >
            <Form.Item
              name="playerName"
              label="玩家名称"
              rules={[{ required: true, message: '请输入玩家名称' }]}
            >
              <Input />
            </Form.Item>
            
            <Form.Item
              name="rating"
              label="整体评分"
            >
              <Rate />
            </Form.Item>
            
            <Form.Item
              name="difficulty"
              label="难度反馈"
            >
              <Radio.Group>
                <Radio value="简单">简单</Radio>
                <Radio value="中等">中等</Radio>
                <Radio value="困难">困难</Radio>
                <Radio value="非常困难">非常困难</Radio>
              </Radio.Group>
            </Form.Item>
            
            <Form.Item
              name="duration"
              label="时长反馈"
            >
              <Radio.Group>
                <Radio value="太短">太短</Radio>
                <Radio value="合适">合适</Radio>
                <Radio value="太长">太长</Radio>
              </Radio.Group>
            </Form.Item>
            
            <Form.Item
              name="comments"
              label="其他反馈"
            >
              <TextArea rows={4} />
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" htmlType="submit">提交反馈</Button>
            </Form.Item>
          </Form>
          
          <div className="feedback-list" style={{ marginTop: 32 }}>
            <Title level={5}>已收集的反馈</Title>
            <Table 
              size="small" 
              columns={[
                { 
                  title: '玩家', 
                  dataIndex: 'playerName', 
                  key: 'playerName' 
                },
                { 
                  title: '评分', 
                  dataIndex: 'rating', 
                  key: 'rating',
                  render: (rating) => <Rate value={rating} disabled />
                },
                { 
                  title: '难度反馈', 
                  dataIndex: 'difficulty', 
                  key: 'difficulty' 
                },
                { 
                  title: '时间', 
                  dataIndex: 'timestamp', 
                  key: 'timestamp',
                  render: (time) => new Date(time).toLocaleString()
                }
              ]} 
              dataSource={feedbacks}
              rowKey="id"
            />
          </div>
        </Card>
      )
    }
  ];

  return (
      <Content style={{ padding: '24px' }}>
        <div className="test-simulation-container">
          <Card title="测试模拟器" bordered={false}>
            <p>玩家视角测试、流程时长估算、难度平衡测试、主持人模拟</p>
          </Card>
          
          <div className="simulation-tabs">
            <Tabs defaultActiveKey="player-view" items={tabItems} />
          </div>
        </div>
      </Content>
  );
};

// 进度条组件
const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="progress-bar-container">
      <div 
        className="progress-bar-fill" 
        style={{ width: `${progress}%` }}
      />
      <Text className="progress-text">{progress}%</Text>
    </div>
  );
};

export default TestSimulationPage;