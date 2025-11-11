import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Select,
  Spin,
  message,
  Typography,
  Divider,
  Space,
  Checkbox
} from 'antd';
import './styles.css';
import { SendOutlined, LoadingOutlined, BulbOutlined } from '@ant-design/icons';
import type { Character, Scene, Clue } from '../../types';
import { aiService } from '../../services';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface AIAssistantPanelProps {
  currentProject?: {
    title?: string;
    description?: string;
    setting?: string;
    plotSummary?: string;
    characters?: Character[];
    scenes?: Scene[];
    clues?: Clue[];
  };
  onSuggestionApply?: (type: string, suggestion: string) => void;
}

type AITaskType =
  | 'characterBackground'
  | 'plotSuggestion'
  | 'puzzleIdea'
  | 'textPolish'
  | 'plotLogicCheck'
  | 'dialogueOptimize'
  | 'relationshipGenerate'
  | 'clueDistribution'
  | 'hostingImprove';

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  currentProject,
  onSuggestionApply
}) => {
  const [activeTab, setActiveTab] = useState<string>('intelligent');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>('');
  const [resultTitle, setResultTitle] = useState<string>('');
  const [characterForm] = Form.useForm();
  const [plotForm] = Form.useForm();
  const [puzzleForm] = Form.useForm();
  const [polishForm] = Form.useForm();
  const [logicForm] = Form.useForm();
  const [dialogueForm] = Form.useForm();
  const [relationshipForm] = Form.useForm();
  const [clueForm] = Form.useForm();
  const [hostingForm] = Form.useForm();



  // 处理Tab切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setResult('');
    setResultTitle('');
  };

  // 处理AI任务请求
  const handleAIRequest = async (
    taskType: AITaskType,
    formData: any
  ): Promise<void> => {
    setLoading(true);
    setResult('');
    setResultTitle('');

    try {
      let response = '';
      let title = '';

      switch (taskType) {
        case 'characterBackground':
          title = '角色背景故事';
          response = await aiService.generateCharacterBackground(
            formData.characterName,
            formData.characterDescription,
            formData.setting || currentProject?.setting || ''
          );
          break;
        
        case 'plotSuggestion':
          title = '剧情发展建议';
          response = await aiService.generatePlotSuggestions(
            formData.currentPlot || currentProject?.plotSummary || '',
            formData.characters?.split(',').map((c: string) => c.trim()) ||
              (currentProject?.characters?.map(c => c.name) || []),
            formData.setting || currentProject?.setting || ''
          );
          break;
        
        case 'puzzleIdea':
          title = '谜题设计灵感';
          response = await aiService.generatePuzzleIdeas(
            formData.difficulty as any,
            formData.theme,
            formData.setting || currentProject?.setting || ''
          );
          break;
        
        case 'textPolish':
          title = '文本润色结果';
          response = await aiService.polishText(
            formData.text,
            formData.context
          );
          break;
        
        case 'plotLogicCheck':
          title = '剧情逻辑分析';
          response = await aiService.checkPlotLogic(
            formData.plotSummary || currentProject?.plotSummary || '',
            formData.characterActions
          );
          break;
        
        case 'dialogueOptimize':
          title = '对话优化结果';
          response = await aiService.optimizeDialogue(
            formData.dialogue,
            formData.characterDescription,
            formData.context
          );
          break;
        
        case 'relationshipGenerate':
          title = '角色关系建议';
          const charactersData = formData.useProjectCharacters
            ? (currentProject?.characters || []).map(c => ({
                id: c.id,
                name: c.name,
                description: c.description
              }))
            : formData.customCharacters
                .split(';')
                .map((char: string) => {
                  const [name, ...descParts] = char.split(':');
                  return {
                    id: `temp_${Date.now()}`,
                    name: name.trim(),
                    description: descParts.join(':').trim()
                  };
                })
                .filter((c: any) => c.name && c.description);
          
          response = await aiService.generateRelationshipSuggestions(charactersData);
          break;
        
        case 'clueDistribution':
          title = '线索分配建议';
          const cluesData = formData.useProjectClues
            ? (currentProject?.scenes
                ?.flatMap(s => s.clues)
                .map(c => ({
                  id: c.id,
                  name: c.name,
                  description: c.description,
                  relevance: c.relevance
                })) || [])
            : formData.customClues
                .split(';')
                .map((clue: string) => {
                  const [name, desc, relevance] = clue.split(':');
                  return {
                    id: `temp_${Date.now()}`,
                    name: name.trim(),
                    description: desc.trim(),
                    relevance: relevance?.trim() || 'medium'
                  };
                })
                .filter((c: any) => c.name && c.description);
          
          const charactersForClues = formData.useProjectCharacters
            ? (currentProject?.characters || []).map(c => ({
                id: c.id,
                name: c.name
              }))
            : formData.charactersForClues
                .split(',')
                .map((name: string) => ({
                  id: `temp_${Date.now()}`,
                  name: name.trim()
                }))
                .filter((c: any) => c.name);
          
          response = await aiService.suggestClueDistribution(
            cluesData,
            charactersForClues,
            formData.plotPhase
          );
          break;
        
        case 'hostingImprove':
          title = '主持流程优化建议';
          response = await aiService.suggestHostingImprovements(
            formData.steps.split('\n').filter((s: string) => s.trim()),
            formData.complexity as any,
            formData.experience as any
          );
          break;
      }

      setResult(response);
      setResultTitle(title);
      message.success('AI建议生成成功！');
    } catch (error) {
      console.error('AI请求失败:', error);
      message.error('AI请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理应用建议
  const handleApplySuggestion = () => {
    if (onSuggestionApply && result) {
      onSuggestionApply(resultTitle, result);
      message.success('建议已应用');
    }
  };

  return (
    <Card title="AI辅助写作" bordered={false} className="ai-assistant-container">
      <Tabs activeKey={activeTab} onChange={handleTabChange} className="ai-tabs">
        <TabPane tab="智能提示" key="intelligent">
          <Tabs defaultActiveKey="character" className="nested-tabs">
            <TabPane tab="角色背景" key="character">
              <Form
                form={characterForm}
                layout="vertical"
                onFinish={(values) => handleAIRequest('characterBackground', values)}
              >
                <Form.Item
                  name="characterName"
                  label="角色名称"
                  rules={[{ required: true, message: '请输入角色名称' }]}
                  className="compact-form-item"
                >
                  <Input placeholder="输入角色名称" />
                </Form.Item>
                
                <Form.Item
                  name="characterDescription"
                  label="角色描述"
                  rules={[{ required: true, message: '请输入角色描述' }]}
                  className="compact-form-item"
                >
                  <TextArea
                    rows={2}
                    placeholder="简要描述角色的外貌、性格、特点等"
                    autoSize={{ minRows: 2, maxRows: 4 }}
                  />
                </Form.Item>
                
                <Form.Item
                  name="setting"
                  label="故事背景（可选）"
                  initialValue={currentProject?.setting}
                  className="compact-form-item"
                >
                  <TextArea
                    rows={2}
                    placeholder="如：1920年代的英国乡村古宅"
                    autoSize={{ minRows: 2, maxRows: 3 }}
                  />
                </Form.Item>
                
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    生成背景故事
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
            
            <TabPane tab="剧情建议" key="plot">
              <Form
                form={plotForm}
                layout="vertical"
                onFinish={(values) => handleAIRequest('plotSuggestion', values)}
              >
                <Form.Item
                  name="currentPlot"
                  label="当前剧情概要"
                  initialValue={currentProject?.plotSummary}
                  className="compact-form-item"
                >
                  <TextArea 
                    rows={3} 
                    placeholder="描述当前剧情发展情况" 
                    autoSize={{ minRows: 3, maxRows: 5 }}
                  />
                </Form.Item>
                
                <Form.Item
                  name="characters"
                  label="主要角色（可选，用逗号分隔）"
                  className="compact-form-item"
                >
                  <Input
                    placeholder="如：张三,李四,王五"
                      disabled={!!(currentProject?.characters?.length && currentProject.characters.length > 0)}
                      value={currentProject && currentProject.characters && currentProject.characters.length > 0
                        ? currentProject.characters.map(c => c.name).join(',')
                        : ''}
                    />
                </Form.Item>
                
                <Form.Item
                  name="setting"
                  label="故事背景（可选）"
                  initialValue={currentProject?.setting}
                  className="compact-form-item"
                >
                  <TextArea
                    rows={2}
                    placeholder="如：1920年代的英国乡村古宅"
                    autoSize={{ minRows: 2, maxRows: 3 }}
                  />
                </Form.Item>
                
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    生成剧情建议
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
            
            <TabPane tab="谜题设计" key="puzzle">
              <Form
                form={puzzleForm}
                layout="vertical"
                onFinish={(values) => handleAIRequest('puzzleIdea', values)}
              >
                <Form.Item
                  name="difficulty"
                  label="难度级别"
                  rules={[{ required: true, message: '请选择难度级别' }]}
                >
                  <Select placeholder="选择谜题难度">
                    <Select.Option value="easy">简单</Select.Option>
                    <Select.Option value="medium">中等</Select.Option>
                    <Select.Option value="hard">困难</Select.Option>
                  </Select>
                </Form.Item>
                
                <Form.Item
                  name="theme"
                  label="谜题主题"
                  rules={[{ required: true, message: '请输入谜题主题' }]}
                >
                  <Input placeholder="如：密码锁、密室逃脱、逻辑推理等" />
                </Form.Item>
                
                <Form.Item
                  name="setting"
                  label="故事背景（可选）"
                  initialValue={currentProject?.setting}
                >
                  <TextArea
                    rows={2}
                    placeholder="如：1920年代的英国乡村古宅"
                  />
                </Form.Item>
                
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    生成谜题灵感
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
          </Tabs>
        </TabPane>
        
        <TabPane tab="内容优化" key="optimize">
          <Tabs defaultActiveKey="polish">
            <TabPane tab="文本润色" key="polish">
              <Form
                form={polishForm}
                layout="vertical"
                onFinish={(values) => handleAIRequest('textPolish', values)}
              >
                <Form.Item
                  name="text"
                  label="需要润色的文本"
                  rules={[{ required: true, message: '请输入需要润色的文本' }]}
                  className="compact-form-item"
                >
                  <TextArea 
                    rows={4} 
                    placeholder="输入需要润色和语法检查的文本" 
                    autoSize={{ minRows: 4, maxRows: 7 }}
                  />
                </Form.Item>
                
                <Form.Item
                  name="context"
                  label="上下文信息（可选）"
                  className="compact-form-item"
                >
                  <TextArea
                    rows={2}
                    placeholder="提供额外的上下文信息，帮助AI更好地理解文本"
                    autoSize={{ minRows: 2, maxRows: 3 }}
                  />
                </Form.Item>
                
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    润色文本
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
            
            <TabPane tab="逻辑检查" key="logic">
              <Form
                form={logicForm}
                layout="vertical"
                onFinish={(values) => handleAIRequest('plotLogicCheck', values)}
              >
                <Form.Item
                  name="plotSummary"
                  label="剧情概要"
                  initialValue={currentProject?.plotSummary}
                  className="compact-form-item"
                >
                  <TextArea 
                    rows={3} 
                    placeholder="描述完整剧情" 
                    autoSize={{ minRows: 3, maxRows: 5 }}
                  />
                </Form.Item>
                
                <Form.Item
                  name="characterActions"
                  label="角色行动（可选）"
                  className="compact-form-item"
                >
                  <TextArea
                    rows={3}
                    placeholder="格式：角色名:行动1,行动2\n另一个角色:行动1,行动2"
                    autoSize={{ minRows: 3, maxRows: 5 }}
                  />
                </Form.Item>
                
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    检查逻辑
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
            
            <TabPane tab="对话优化" key="dialogue">
              <Form
                form={dialogueForm}
                layout="vertical"
                onFinish={(values) => handleAIRequest('dialogueOptimize', values)}
              >
                <Form.Item
                  name="dialogue"
                  label="对话内容"
                  rules={[{ required: true, message: '请输入对话内容' }]}
                  className="compact-form-item"
                >
                  <TextArea 
                    rows={3} 
                    placeholder="输入需要优化的对话内容" 
                    autoSize={{ minRows: 3, maxRows: 6 }}
                  />
                </Form.Item>
                
                <Form.Item
                  name="characterDescription"
                  label="角色描述"
                  rules={[{ required: true, message: '请输入角色描述' }]}
                  className="compact-form-item"
                >
                  <TextArea
                    rows={2}
                    placeholder="描述角色的性格、说话风格等"
                    autoSize={{ minRows: 2, maxRows: 3 }}
                  />
                </Form.Item>
                
                <Form.Item
                  name="context"
                  label="对话情境（可选）"
                  className="compact-form-item"
                >
                  <TextArea
                    rows={2}
                    placeholder="描述对话发生的场景和背景"
                    autoSize={{ minRows: 2, maxRows: 3 }}
                  />
                </Form.Item>
                
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    优化对话
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
          </Tabs>
        </TabPane>
        
        <TabPane tab="自动化生成" key="auto">
          <Tabs defaultActiveKey="relationship">
            <TabPane tab="角色关系" key="relationship">
              <Form
                form={relationshipForm}
                layout="vertical"
                onFinish={(values) => handleAIRequest('relationshipGenerate', values)}
              >
                <Form.Item
                  name="useProjectCharacters"
                  valuePropName="checked"
                  label="使用当前项目角色"
                >
                  <Checkbox
                    defaultChecked={!!(currentProject?.characters?.length && currentProject.characters.length > 0)}
                    disabled={!(currentProject?.characters?.length && currentProject?.characters.length > 0)}
                  >
                    使用项目中已有的角色信息
                  </Checkbox>
                </Form.Item>
                
                <Form.Item
                  name="customCharacters"
                  label="自定义角色（每个角色用分号分隔）"
                  hidden={!!(currentProject?.characters?.length && currentProject.characters.length > 0)}
                  rules={[
                    {
                      required: !currentProject?.characters?.length,
                      message: '请输入角色信息'
                    }
                  ]}
                  className="compact-form-item"
                >
                  <TextArea
                    rows={3}
                    placeholder="格式：角色名:角色描述;另一个角色:角色描述"
                    autoSize={{ minRows: 3, maxRows: 5 }}
                  />
                </Form.Item>
                
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    生成关系建议
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
            
            <TabPane tab="线索分配" key="clue">
              <Form
                form={clueForm}
                layout="vertical"
                onFinish={(values) => handleAIRequest('clueDistribution', values)}
              >
                <Form.Item
                  name="useProjectClues"
                  valuePropName="checked"
                  label="使用当前项目线索"
                >
                  <Checkbox
                    defaultChecked={
                      currentProject?.scenes?.some(s => s.clues.length > 0)
                    }
                    disabled={
                      !(currentProject?.scenes?.some(s => s.clues.length > 0))
                    }
                  >
                    使用项目中已有的线索信息
                  </Checkbox>
                </Form.Item>
                
                <Form.Item
                  name="customClues"
                  label="自定义线索（每个线索用分号分隔）"
                  hidden={currentProject?.scenes?.some(s => s.clues.length > 0)}
                  rules={[
                    {
                      required: !currentProject?.scenes?.some(s => s.clues.length > 0),
                      message: '请输入线索信息'
                    }
                  ]}
                  className="compact-form-item"
                >
                  <TextArea
                    rows={3}
                    placeholder="格式：线索名:线索描述:重要性;另一个线索:描述:重要性"
                    autoSize={{ minRows: 3, maxRows: 5 }}
                  />
                </Form.Item>
                
                <Form.Item
                  name="useProjectCharacters"
                  valuePropName="checked"
                  label="使用当前项目角色"
                >
                  <Checkbox
                    defaultChecked={!!(currentProject?.characters?.length && currentProject.characters.length > 0)}
                    disabled={!(currentProject?.characters?.length && currentProject.characters.length > 0)}
                  >
                    使用项目中已有的角色信息
                  </Checkbox>
                </Form.Item>
                
                <Form.Item
                  name="charactersForClues"
                  label="角色列表（用逗号分隔）"
                  hidden={!!(currentProject?.characters?.length && currentProject.characters.length > 0)}
                  rules={[
                    {
                      required: !currentProject?.characters?.length,
                      message: '请输入角色信息'
                    }
                  ]}
                >
                  <Input placeholder="如：张三,李四,王五" />
                </Form.Item>
                
                <Form.Item
                  name="plotPhase"
                  label="当前剧情阶段"
                  rules={[{ required: true, message: '请输入剧情阶段' }]}
                >
                  <Input placeholder="如：开场、第一轮调查、第二轮调查、结局" />
                </Form.Item>
                
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    生成线索分配建议
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
            
            <TabPane tab="主持流程" key="hosting">
              <Form
                form={hostingForm}
                layout="vertical"
                onFinish={(values) => handleAIRequest('hostingImprove', values)}
              >
                <Form.Item
                  name="steps"
                  label="当前流程步骤"
                  rules={[{ required: true, message: '请输入流程步骤' }]}
                  className="compact-form-item"
                >
                  <TextArea
                    rows={4}
                    placeholder="每行输入一个步骤，按顺序排列"
                    autoSize={{ minRows: 4, maxRows: 6 }}
                  />
                </Form.Item>
                
                <Form.Item
                  name="complexity"
                  label="剧情复杂度"
                  rules={[{ required: true, message: '请选择复杂度' }]}
                >
                  <Select placeholder="选择剧情复杂度">
                    <Select.Option value="simple">简单</Select.Option>
                    <Select.Option value="medium">中等</Select.Option>
                    <Select.Option value="complex">复杂</Select.Option>
                  </Select>
                </Form.Item>
                
                <Form.Item
                  name="experience"
                  label="玩家经验水平"
                  rules={[{ required: true, message: '请选择玩家经验水平' }]}
                >
                  <Select placeholder="选择玩家经验水平">
                    <Select.Option value="beginner">新手</Select.Option>
                    <Select.Option value="intermediate">中级</Select.Option>
                    <Select.Option value="advanced">高级</Select.Option>
                  </Select>
                </Form.Item>
                
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    生成优化建议
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
          </Tabs>
        </TabPane>
      </Tabs>
      
      <div style={{ marginTop: 16, minHeight: '120px' }}>
        {result ? (
          <>
            <Divider style={{ margin: '12px 0' }}>
              <Space align="center">
                <Title level={5} style={{ margin: 0 }}>{resultTitle}</Title>
                {onSuggestionApply && (
                  <Button
                    type="link"
                    onClick={handleApplySuggestion}
                    icon={<SendOutlined />}
                  >
                    应用建议
                  </Button>
                )}
              </Space>
            </Divider>
            <Card size="small" className="result-card">
              <Paragraph
                className="ai-result"
                style={{ whiteSpace: 'pre-wrap', margin: 0 }}
              >
                {result}
              </Paragraph>
            </Card>
          </>
        ) : (
          <Card size="small" className="placeholder-card" style={{ backgroundColor: '#fafafa', borderColor: '#e8e8e8' }}>
            <Space align="center" style={{ width: '100%', justifyContent: 'center', padding: '20px 0' }}>
              <BulbOutlined style={{ color: '#bfbfbf' }} />
              <Text type="secondary">AI生成的内容将显示在这里</Text>
            </Space>
          </Card>
        )}
      </div>
      
      {loading && (
        <div className="loading-overlay">
          <Spin
            tip="AI正在思考中..."
            indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
            size="large"
          />
        </div>
      )}
    </Card>
  );
};

// 添加CSS类名到根元素
export default (props: AIAssistantPanelProps) => (
  <div className="ai-assistant-panel">
    <AIAssistantPanel {...props} />
  </div>
);