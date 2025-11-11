import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Modal, Form, Input, Select, Progress, Tooltip, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ImportOutlined, ExportOutlined, UserOutlined, FileTextOutlined, CompassOutlined, LinkOutlined, DatabaseOutlined, CheckOutlined } from '@ant-design/icons';

import { storageService } from '../../services';

import type { Story } from '../../types';
import ExportDialog from '../../components/ExportDialog';
import ImportDialog from '../../components/ImportDialog';
import TemplateLibrary from '../../components/TemplateLibrary';

import './styles.css';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface ProjectStats {
  characterCount: number;
  sceneCount: number;
  clueCount: number;
  relationshipCount: number;
}

interface ProjectProgress {
  characterCompletion: number;
  scriptCompletion: number;
  guideCompletion: number;
}

const ProjectOverview: React.FC = () => {
  const [projects, setProjects] = useState<Story[]>([]);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentProject, setCurrentProject] = useState<Story | null>(null);
  const [isExportDialogVisible, setIsExportDialogVisible] = useState(false);
  const [isImportDialogVisible, setIsImportDialogVisible] = useState(false);
  const [isTemplateLibraryVisible, setIsTemplateLibraryVisible] = useState(false);
  const [selectedProjectForExport, setSelectedProjectForExport] = useState<{id: string, title: string, characters: any[]}>({id: '', title: '', characters: []});
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // 加载项目列表
  const loadProjects = () => {
    const projectList = storageService.getProjects();
    setProjects(projectList);
  };

  // 计算项目统计信息
  const calculateStats = (project: Story): ProjectStats => {
    const characterCount = project.characters.length;
    const sceneCount = project.scenes.length;
    const clueCount = project.scenes.reduce((sum, scene) => sum + scene.clues.length, 0);
    const relationshipCount = project.characters.reduce((sum, character) => sum + character.relationships.length, 0);
    
    return {
      characterCount,
      sceneCount,
      clueCount,
      relationshipCount,
    };
  };

  // 计算项目进度
  const calculateProgress = (project: Story): ProjectProgress => {
    // 角色完成度：有背景故事的角色数 / 总角色数
    const characterCompletion = project.characters.length > 0
      ? (project.characters.filter(c => c.background && c.background.trim().length > 0).length / project.characters.length) * 100
      : 0;

    // 剧本完成度：有内容的剧本幕数 / 总幕数（这里简化为场景数）
    const scriptCompletion = project.scenes.length > 0
      ? (project.scenes.filter(s => s.description && s.description.trim().length > 50).length / project.scenes.length) * 100
      : 0;

    // 手册完成度：简化计算，这里使用项目描述和剧情概要的完成情况
    const guideCompletion = ((project.description && project.description.length > 100 ? 0.5 : 0) +
      (project.plotSummary && project.plotSummary.length > 200 ? 0.5 : 0)) * 100;

    return {
      characterCompletion,
      scriptCompletion,
      guideCompletion,
    };
  };

  // 创建新项目
  const handleCreateProject = () => {
    setIsCreateModalVisible(true);
  };

  // 提交创建项目表单
  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      const newProject = storageService.createProject({
        title: values.title,
        description: values.description,
        setting: values.setting,
        theme: values.theme,
        plotSummary: values.plotSummary,
        characters: [],
        scenes: [],
      });
      
      if (newProject) {
        message.success('项目创建成功');
        setIsCreateModalVisible(false);
        createForm.resetFields();
        loadProjects();
      }
    } catch (error) {
      console.error('创建项目失败:', error);
    }
  };

  // 编辑项目
  const handleEditProject = (project: Story) => {
    setCurrentProject(project);
    editForm.setFieldsValue({
      title: project.title,
      description: project.description,
      setting: project.setting,
      theme: project.theme,
      plotSummary: project.plotSummary,
    });
    setIsEditModalVisible(true);
  };

  // 提交编辑项目表单
  const handleEditSubmit = async () => {
    if (!currentProject) return;
    
    try {
      const values = await editForm.validateFields();
      const updatedProject = storageService.updateProject(currentProject.id, values);
      
      if (updatedProject) {
        message.success('项目更新成功');
        setIsEditModalVisible(false);
        setCurrentProject(null);
        editForm.resetFields();
        loadProjects();
      }
    } catch (error) {
      console.error('更新项目失败:', error);
    }
  };

  // 删除项目
  const handleDeleteProject = (projectId: string) => {
    const success = storageService.deleteProject(projectId);
    if (success) {
      message.success('项目删除成功');
      loadProjects();
    } else {
      message.error('项目删除失败');
    }
  };

  // 打开导出对话框
  const handleExportProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSelectedProjectForExport({
        id: project.id,
        title: project.title,
        characters: project.characters || []
      });
      setIsExportDialogVisible(true);
    }
  };
  
  // 处理项目导入成功
  const handleImportSuccess = () => {
    message.success('项目导入成功');
    loadProjects();
    // 可以选择是否直接跳转到新导入的项目
  };
  
  // 应用项目模板
  const handleApplyProjectTemplate = (templateData: Partial<Story>) => {
    // 填充创建表单
    createForm.setFieldsValue({
      title: templateData.title || '新剧本杀项目',
      description: templateData.description || '',
      setting: templateData.setting || '',
      theme: templateData.theme || '悬疑',
      plotSummary: templateData.plotSummary || ''
    });
    // 打开创建对话框
    setIsCreateModalVisible(true);
  };

  // 选择项目
  const handleSelectProject = (projectId: string) => {
    const success = storageService.setCurrentProjectId(projectId);
    if (success) {
      message.success('项目已选择');
      setCurrentProjectId(projectId);
    } else {
      message.error('选择项目失败');
    }
  };
  
  // 获取当前选中的项目ID
  const getCurrentProjectId = (): string => {
    const id = storageService.getCurrentProjectId();
    return id || '';
  };



  // 组件挂载时加载项目列表和当前选中的项目ID
  useEffect(() => {
    loadProjects();
    const id = getCurrentProjectId();
    setCurrentProjectId(id);
  }, []);

  return (
    <div className="project-overview-container">
      <div className="page-header">
        <h3>项目概览</h3>
        <div className="header-actions">
          <Button 
            icon={<ImportOutlined />}
            onClick={() => setIsImportDialogVisible(true)}
            className="action-btn"
          >
            导入项目
          </Button>
          <Button 
            icon={<DatabaseOutlined />}
            onClick={() => setIsTemplateLibraryVisible(true)}
            className="action-btn"
          >
            模板库
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreateProject}
            className="action-btn primary-action-btn"
          >
            创建项目
          </Button>
        </div>
      </div>

      {/* 项目列表 */}
      <div className="project-grid">
        {projects.length === 0 ? (
          <div className="empty-card">
            <Typography>
              <Text className="empty-text">暂无项目，点击上方按钮创建新项目</Text>
            </Typography>
          </div>
        ) : (
          projects.map((project) => {
            const stats = calculateStats(project);
            const progress = calculateProgress(project);
            
            return (
              <div key={project.id}>
                <Card
                  className="project-card"
                >
                  <div className="card-header">
                    <h4 className="card-title">{project.title}</h4>
                    <div className="card-actions">
                      <Tooltip title="编辑">
                        <Button type="text" icon={<EditOutlined />} onClick={() => handleEditProject(project)} />
                      </Tooltip>
                      <Popconfirm
                        title="确认删除"
                        description="确定要删除这个项目吗？此操作不可恢复。"
                        onConfirm={() => handleDeleteProject(project.id)}
                        okText="删除"
                        cancelText="取消"
                      >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </div>
                  </div>
                  <Button 
                    size="small" 
                    onClick={() => handleExportProject(project.id)} 
                    icon={<ExportOutlined />}
                    className="card-export-btn"
                  />
                  
                  <Paragraph className="project-description">{project.description}</Paragraph>
                  
                  {/* 项目信息 */}
                  <div className="project-info">
                    <div className="project-meta">
                      创建时间：{project.created}
                      <br />
                      更新时间：{project.updated}
                    </div>
                  </div>
                  
                  {/* 项目统计 */}
                  <div className="stats-grid">
                    <div className="stat-item">
                      <div className="stat-icon"><UserOutlined /></div>
                      <div className="stat-title">角色数</div>
                      <div className="stat-value">{stats.characterCount}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon"><FileTextOutlined /></div>
                      <div className="stat-title">场景数</div>
                      <div className="stat-value">{stats.sceneCount}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon"><CompassOutlined /></div>
                      <div className="stat-title">线索数</div>
                      <div className="stat-value">{stats.clueCount}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon"><LinkOutlined /></div>
                      <div className="stat-title">关系数</div>
                      <div className="stat-value">{stats.relationshipCount}</div>
                    </div>
                  </div>
                  
                  {/* 进度显示 */}
                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-label">角色完成度</span>
                      <span className="progress-percentage">{Math.round(progress.characterCompletion)}%</span>
                    </div>
                    <Progress percent={progress.characterCompletion} status="active" className="progress-bar" />
                  </div>
                  
                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-label">剧本完成度</span>
                      <span className="progress-percentage">{Math.round(progress.scriptCompletion)}%</span>
                    </div>
                    <Progress percent={progress.scriptCompletion} status="active" className="progress-bar" />
                  </div>
                  
                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-label">手册完成度</span>
                      <span className="progress-percentage">{Math.round(progress.guideCompletion)}%</span>
                    </div>
                    <Progress percent={progress.guideCompletion} status="active" className="progress-bar" />
                  </div>
                  
                  {/* 快速操作 */}
                  <div className="card-footer">
                    <Button 
                      type={currentProjectId === project.id ? "default" : "primary"} 
                      icon={<CheckOutlined />} 
                      className={`action-btn ${currentProjectId === project.id ? 'selected-project-btn' : 'primary-action-btn'}`}
                      onClick={() => handleSelectProject(project.id)}
                      style={{width: '100%'}}
                    >
                      {currentProjectId === project.id ? '已选择项目' : '选择项目'}
                    </Button>
                  </div>
                </Card>
              </div>
            );
          })
        )}
      </div>

      {/* 创建项目模态框 */}
      <Modal
        title="创建新项目"
        open={isCreateModalVisible}
        onOk={handleCreateSubmit}
        onCancel={() => setIsCreateModalVisible(false)}
        okText="创建"
        cancelText="取消"
        className="project-modal"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="title"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
            className="form-item"
          >
            <Input placeholder="请输入项目名称" className="form-input" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="项目描述"
            rules={[{ required: true, message: '请输入项目描述' }]}
            className="form-item"
          >
            <Input.TextArea rows={3} placeholder="请输入项目描述" className="form-textarea" />
          </Form.Item>
          
          <Form.Item
            name="setting"
            label="故事背景"
            rules={[{ required: true, message: '请输入故事背景' }]}
            className="form-item"
          >
            <Input placeholder="例如：1920年代的英国乡村古宅" className="form-input" />
          </Form.Item>
          
          <Form.Item
            name="theme"
            label="故事主题"
            rules={[{ required: true, message: '请选择故事主题' }]}
            className="form-item"
          >
            <Select placeholder="请选择故事主题" className="form-select">
              <Option value="悬疑">悬疑</Option>
              <Option value="推理">推理</Option>
              <Option value="恐怖">恐怖</Option>
              <Option value="情感">情感</Option>
              <Option value="历史">历史</Option>
              <Option value="科幻">科幻</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="plotSummary"
            label="剧情概要"
            rules={[{ required: true, message: '请输入剧情概要' }]}
            className="form-item"
          >
            <Input.TextArea rows={4} placeholder="请输入剧情概要" className="form-textarea" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑项目模态框 */}
      <Modal
        title="编辑项目"
        open={isEditModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setIsEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
        className="project-modal"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="title"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
            className="form-item"
          >
            <Input placeholder="请输入项目名称" className="form-input" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="项目描述"
            rules={[{ required: true, message: '请输入项目描述' }]}
            className="form-item"
          >
            <Input.TextArea rows={3} placeholder="请输入项目描述" className="form-textarea" />
          </Form.Item>
          
          <Form.Item
            name="setting"
            label="故事背景"
            rules={[{ required: true, message: '请输入故事背景' }]}
            className="form-item"
          >
            <Input placeholder="例如：1920年代的英国乡村古宅" className="form-input" />
          </Form.Item>
          
          <Form.Item
            name="theme"
            label="故事主题"
            rules={[{ required: true, message: '请选择故事主题' }]}
            className="form-item"
          >
            <Select placeholder="请选择故事主题" className="form-select">
              <Option value="悬疑">悬疑</Option>
              <Option value="推理">推理</Option>
              <Option value="恐怖">恐怖</Option>
              <Option value="情感">情感</Option>
              <Option value="历史">历史</Option>
              <Option value="科幻">科幻</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="plotSummary"
            label="剧情概要"
            rules={[{ required: true, message: '请输入剧情概要' }]}
            className="form-item"
          >
            <Input.TextArea rows={4} placeholder="请输入剧情概要" className="form-textarea" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导出对话框 */}
      <ExportDialog
        open={isExportDialogVisible}
        onClose={() => setIsExportDialogVisible(false)}
        projectId={selectedProjectForExport.id}
        projectTitle={selectedProjectForExport.title}
        characters={selectedProjectForExport.characters}
      />

      {/* 导入对话框 */}
      <ImportDialog
        open={isImportDialogVisible}
        onClose={() => setIsImportDialogVisible(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* 模板库对话框 */}
      <TemplateLibrary
        open={isTemplateLibraryVisible}
        onClose={() => setIsTemplateLibraryVisible(false)}
        onApplyProjectTemplate={handleApplyProjectTemplate}
      />
    </div>
  );
};

export default ProjectOverview;