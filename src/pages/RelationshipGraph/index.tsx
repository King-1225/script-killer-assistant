import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, Typography, Modal, Form, Select, Input, message, Spin, Space, Divider } from 'antd';
import { PlusOutlined, DownloadOutlined, UserOutlined } from '@ant-design/icons';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'react-flow-renderer';
import type { Node, Edge } from 'react-flow-renderer';
import html2canvas from 'html2canvas';
import type { Character } from '../../types';
import storageService from '../../services/storage';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 关系类型配置
const relationshipTypes = [
  { value: 'love', label: '爱情', color: '#ff4d4f' },
  { value: 'hate', label: '仇恨', color: '#1890ff' },
  { value: 'family', label: '血缘', color: '#52c41a' },
  { value: 'interest', label: '利益', color: '#faad14' },
  { value: 'friend', label: '友情', color: '#722ed1' },
  { value: 'enemy', label: '敌人', color: '#eb2f96' },
  { value: 'neutral', label: '中立', color: '#8c8c8c' },
];

// 自定义节点组件
const CustomNode: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div 
      style={{
        background: '#fff',
        border: '1px solid #d9d9d9',
        borderRadius: 8,
        padding: 8,
        width: 150,
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div style={{ marginBottom: 8 }}>
        {data.imageUrl ? (
          <div style={{ width: 40, height: 40, margin: '0 auto', borderRadius: '50%', overflow: 'hidden' }}>
            <img src={data.imageUrl} alt={data.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{ width: 40, height: 40, margin: '0 auto', borderRadius: '50%', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserOutlined style={{ fontSize: 20, color: '#8c8c8c' }} />
          </div>
        )}
      </div>
      <Text style={{ fontWeight: 'bold' }}>{data.name}</Text>
    </div>
  );
};

const RelationshipGraph: React.FC = () => {
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<{
    source: string;
    target: string;
    type: string;
    description: string;
  } | null>(null);
  
  const [relationshipForm] = Form.useForm();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // 初始化数据
  useEffect(() => {
    const projectId = storageService.getCurrentProjectId();
    if (projectId) {
      setCurrentProjectId(projectId);
      loadData(projectId);
    } else {
      // 如果没有当前项目，尝试获取第一个项目
      const projects = storageService.getProjects();
      if (projects.length > 0) {
        setCurrentProjectId(projects[0].id);
        loadData(projects[0].id);
      } else {
        setLoading(false);
      }
    }
  }, []);

  // 加载角色和关系数据
  const loadData = (projectId: string) => {
    setLoading(true);
    const projectCharacters = storageService.getCharacters(projectId);
    setCharacters(projectCharacters);
    
    // 转换为React Flow需要的节点格式
    const newNodes: Node[] = projectCharacters.map((character, index) => ({
      id: character.id,
      type: 'custom' as const,
      position: {
        x: 100 + (index % 5) * 200,
        y: 100 + Math.floor(index / 5) * 150
      },
      data: character
    }));
    
    // 构建关系边
    const newEdges: Edge[] = [];
    projectCharacters.forEach(character => {
      character.relationships.forEach(relationship => {
        const relationshipType = relationshipTypes.find(type => type.value === relationship.type) || relationshipTypes[relationshipTypes.length - 1];
        newEdges.push({
          id: `${character.id}-${relationship.targetCharacterId}`,
          source: character.id,
          target: relationship.targetCharacterId,
          label: relationship.description,
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: relationshipType.color
          },
          style: {
            stroke: relationshipType.color,
            strokeWidth: 2
          },
          labelStyle: {
            fill: '#333',
            backgroundColor: '#fff',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12
          }
        });
      });
    });
    
    setNodes(newNodes);
    setEdges(newEdges);
    setLoading(false);
  };

  // 节点点击事件
  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
    setShowCharacterModal(true);
  };

  // 添加关系
  const handleAddRelationship = () => {
    setEditingRelationship(null);
    relationshipForm.resetFields();
    setShowRelationshipModal(true);
  };

  // 编辑关系
  const handleEditRelationship = (edge: Edge) => {
    const [source, target] = edge.id.split('-');
    const relationship = {
      source,
      target,
      type: (edge.style?.stroke as string) || 'neutral',
      description: (edge.label as string) || ''
    };
    setEditingRelationship(relationship);
    relationshipForm.setFieldsValue(relationship);
    setShowRelationshipModal(true);
  };

  // 保存关系
  const handleSaveRelationship = async () => {
    try {
      const values = await relationshipForm.validateFields();
      
      // 保存到存储
      if (currentProjectId && values.source && values.target) {
        // 检查关系是否已存在
        const existingRelationship = storageService.getRelationships(currentProjectId, values.source)
          .find(r => r.targetCharacterId === values.target);
        
        if (existingRelationship) {
          // 更新现有关系
          storageService.updateRelationship(currentProjectId, values.source, values.target, {
            description: values.description,
            type: values.type as any
          });
        } else {
          // 创建新关系
          storageService.createRelationship(currentProjectId, values.source, {
            targetCharacterId: values.target,
            description: values.description,
            type: values.type as any
          });
        }
        
        // 重新加载数据
        loadData(currentProjectId);
        message.success('关系保存成功');
        setShowRelationshipModal(false);
      }
    } catch (error) {
      message.error('保存失败，请检查输入');
    }
  };

  // 删除关系
  const handleDeleteRelationship = (edge: Edge) => {
    if (currentProjectId && edge.id.includes('-')) {
      const [source, target] = edge.id.split('-');
      storageService.deleteRelationship(currentProjectId, source, target);
      // 重新加载数据
      loadData(currentProjectId);
      message.success('关系删除成功');
    }
  };

  // 自动布局
  const handleAutoLayout = () => {
    if (nodes.length === 0) return;
    
    const centerX = 400;
    const centerY = 300;
    const radius = Math.max(100, Math.min(300, nodes.length * 20));
    
    const newNodes = nodes.map((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      return {
        ...node,
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        }
      };
    });
    
    setNodes(newNodes);
  };

  // 导出关系图为图片
  const handleExportImage = () => {
    if (!reactFlowWrapper.current) return;
    
    html2canvas(reactFlowWrapper.current).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = '关系图谱.png';
      link.href = imgData;
      link.click();
    });
  };

  // 导出关系数据
  const handleExportData = () => {
    const relationshipData = {
      characters: characters,
      relationships: edges.map(edge => {
        const [source, target] = edge.id.split('-');
        return {
          sourceCharacterId: source,
          targetCharacterId: target,
          description: edge.label || '',
          type: edge.style?.stroke || 'neutral'
        };
      })
    };
    
    const dataStr = JSON.stringify(relationshipData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = '关系数据.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 边点击事件
  const handleEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    
    Modal.confirm({
      title: '关系操作',
      content: `源角色：${characters.find(c => c.id === edge.source)?.name}\n目标角色：${characters.find(c => c.id === edge.target)?.name}\n描述：${edge.label || '无'}`,
      footer: (
        <Space>
          <Button key="cancel" onClick={() => Modal.destroyAll()}>取消</Button>
          <Button key="edit" type="primary" onClick={() => { Modal.destroyAll(); handleEditRelationship(edge); }}>编辑</Button>
          <Button key="delete" danger onClick={() => { Modal.destroyAll(); handleDeleteRelationship(edge); }}>删除</Button>
        </Space>
      )
    });
  };

  // 处理连接完成
  const onConnect = useCallback(
    (params: any) => {
      if (params.source && params.target) {
        // 自动打开关系编辑对话框
        relationshipForm.setFieldsValue({
          source: params.source,
          target: params.target,
          type: 'neutral',
          description: ''
        });
        setEditingRelationship(null);
        setShowRelationshipModal(true);
      }
    },
    [relationshipForm]
  );

  // 节点类型映射
  const nodeTypes = {
    custom: CustomNode
  };

  // React Flow配置
  const reactFlowStyle = {
    width: '100%',
    height: 'calc(100vh - 120px)'
  };

  return (
    <div>
      <div style={{ padding: '16px 0' }}>
        <Title level={4} style={{ margin: 0, display: 'inline-block' }}>角色关系图谱</Title>
        <div style={{ float: 'right' }}>
          <Space>
            <Button type="primary" onClick={handleAutoLayout}>
              自动布局
            </Button>
            <Button onClick={handleAddRelationship}>
              <PlusOutlined /> 添加关系
            </Button>
            <Button onClick={handleExportImage}>
              <DownloadOutlined /> 导出图片
            </Button>
            <Button onClick={handleExportData}>
              <DownloadOutlined /> 导出数据
            </Button>
          </Space>
        </div>
      </div>
      
      <Card style={{ height: 'calc(100vh - 180px)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin tip="加载中..." />
          </div>
        ) : (
          <div ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              style={reactFlowStyle}
              defaultZoom={0.8}
            >
              <Controls />
              <MiniMap 
                nodeStrokeColor={() => '#1890ff'} 
                nodeColor={() => 'white'} 
                nodeBorderRadius={3} 
              />
              <Background gap={12} size={1} />
            </ReactFlow>
          </div>
        )}
      </Card>

      {/* 角色详情模态框 */}
      <Modal
        title="角色详情"
        open={showCharacterModal}
        onCancel={() => {
          setShowCharacterModal(false);
          setSelectedNode(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setShowCharacterModal(false);
            setSelectedNode(null);
          }}>关闭</Button>
        ]}
      >
        {selectedNode && (
          <div>
            {(() => {
              const character = characters.find(c => c.id === selectedNode);
              if (!character) return <p>角色不存在</p>;
              
              return (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    {character.imageUrl && (
                      <div style={{ width: 80, height: 80, marginBottom: 16, borderRadius: '50%', overflow: 'hidden' }}>
                        <img src={character.imageUrl} alt={character.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <h3>{character.name}</h3>
                    <p>描述：{character.description}</p>
                    <p>背景：{character.background}</p>
                  </div>
                  
                  <Divider>关系</Divider>
                  {character.relationships.length > 0 ? (
                    <ul>
                      {character.relationships.map((rel, index) => {
                        const targetCharacter = characters.find(c => c.id === rel.targetCharacterId);
                        const relType = relationshipTypes.find(t => t.value === rel.type);
                        return (
                          <li key={index}>
                            <Text style={{ color: relType?.color }}>
                              {relType?.label} - {targetCharacter?.name}: {rel.description}
                            </Text>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p>暂无关系</p>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* 关系编辑模态框 */}
      <Modal
        title={editingRelationship ? "编辑关系" : "添加关系"}
        open={showRelationshipModal}
        onOk={handleSaveRelationship}
        onCancel={() => setShowRelationshipModal(false)}
      >
        <Form form={relationshipForm} layout="vertical">
          <Form.Item
            name="source"
            label="源角色"
            rules={[{ required: true, message: '请选择源角色' }]}
          >
            <Select placeholder="选择源角色">
              {characters.map(character => (
                <Option key={character.id} value={character.id}>{character.name}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="target"
            label="目标角色"
            rules={[{ required: true, message: '请选择目标角色' }]}
          >
            <Select placeholder="选择目标角色">
              {characters.map(character => (
                <Option key={character.id} value={character.id}>{character.name}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="type"
            label="关系类型"
            rules={[{ required: true, message: '请选择关系类型' }]}
          >
            <Select placeholder="选择关系类型">
              {relationshipTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  <span style={{ color: type.color }}>{type.label}</span>
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="description"
            label="关系描述"
            rules={[{ required: true, message: '请输入关系描述' }]}
          >
            <TextArea rows={4} placeholder="请输入详细的关系描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RelationshipGraph;