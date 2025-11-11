import jsPDF from 'jspdf';
import type { Story, Character } from '../types';
import storageService from './storage';
import { formatDate, generateId } from '../utils/helpers';

// 模板类型定义
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  templateData: Partial<Story>;
  category: 'modern' | 'fantasy' | 'historical' | 'scifi' | 'horror';
}

export interface CharacterTemplate {
  id: string;
  name: string;
  description: string;
  characterData: Partial<Character>;
}

export interface ScriptStructureTemplate {
  id: string;
  name: string;
  description: string;
  structure: {
    acts: number;
    scenesPerAct: number;
    recommendedLength: string;
    description: string;
  };
}

class ExportImportService {
  // PDF导出配置
  private readonly PDF_CONFIG = {
    margin: 15,
    fontSize: 12,
    titleSize: 18,
    subtitleSize: 14,
    lineHeight: 1.5,
  };

  // 项目模板库
  private readonly PROJECT_TEMPLATES: ProjectTemplate[] = [
    {
      id: 'template-modern-mystery',
      name: '现代都市谜案',
      description: '经典的现代都市背景谋杀案',
      category: 'modern',
      templateData: {
        title: '都市谜案',
        description: '一个发生在现代都市中的离奇谋杀案',
        setting: '繁华的现代都市',
        theme: '悬疑、推理、人性',
        plotSummary: '在繁华的都市中，一位成功人士被发现死于自己的公寓中。表面上看起来是自杀，但随着调查的深入，越来越多的线索指向这是一起精心策划的谋杀案...',
      },
    },
    {
      id: 'template-fantasy-adventure',
      name: '奇幻冒险',
      description: '充满魔法和神秘的奇幻世界',
      category: 'fantasy',
      templateData: {
        title: '魔法谜城',
        description: '在一个充满魔法的奇幻世界中，一座古城的秘密',
        setting: '魔法世界中的古城',
        theme: '魔法、冒险、友谊',
        plotSummary: '在遥远的魔法世界中，古老城市的守护者突然失踪，随之而来的是一系列离奇的事件。六位不同背景的冒险者被命运牵引到一起，揭开隐藏已久的秘密...',
      },
    },
    {
      id: 'template-historical-whodunit',
      name: '历史悬案',
      description: '古代背景下的神秘案件',
      category: 'historical',
      templateData: {
        title: '宫廷谜案',
        description: '古代宫廷中的谋杀悬案',
        setting: '古代宫廷',
        theme: '权力、阴谋、忠诚',
        plotSummary: '在古代宫廷中，一位重要官员突然暴毙。皇帝大怒，责令三天内破案。宫廷内外，各方势力明争暗斗，真相究竟如何...',
      },
    },
  ];

  // 角色模板库
  private readonly CHARACTER_TEMPLATES: CharacterTemplate[] = [
    {
      id: 'char-detective',
      name: '资深侦探',
      description: '经验丰富的侦探角色',
      characterData: {
        description: '眼神锐利，思维敏捷，善于观察细节。曾经破获过多起离奇案件。',
        background: '前警队精英，因某些原因离开警队，成为私人侦探。职业生涯中遇到过无数挑战，养成了冷静理智的性格。',
      },
    },
    {
      id: 'char-suspicious-entrepreneur',
      name: '可疑企业家',
      description: '表面风光但隐藏秘密的成功人士',
      characterData: {
        description: '衣着考究，举止优雅，总是带着自信的微笑。眼神中偶尔闪过一丝不易察觉的锐利。',
        background: '白手起家的成功企业家，事业蒸蒸日上。但在成功的背后，似乎隐藏着不为人知的秘密交易和黑暗过往。',
      },
    },
    {
      id: 'char-mysterious-stranger',
      name: '神秘陌生人',
      description: '身份不明的神秘角色',
      characterData: {
        description: '总是穿着深色衣服，行踪诡秘。很少与人交流，对周围的一切保持警惕。',
        background: '没有人知道他来自哪里，也不知道他为什么会出现在这里。身上带着许多未解之谜，似乎与案件有着千丝万缕的联系。',
      },
    },
  ];

  // 剧本结构模板
  private readonly SCRIPT_STRUCTURE_TEMPLATES: ScriptStructureTemplate[] = [
    {
      id: 'structure-classic',
      name: '经典三幕剧',
      description: '传统的三幕剧结构',
      structure: {
        acts: 3,
        scenesPerAct: 3,
        recommendedLength: '2-3小时',
        description: '第一幕：介绍角色和背景，案件发生\n第二幕：调查和线索收集，冲突升级\n第三幕：真相揭露，高潮和结局',
      },
    },
    {
      id: 'structure-inverted',
      name: '倒叙结构',
      description: '从结局开始，逐步回溯到开始',
      structure: {
        acts: 4,
        scenesPerAct: 2,
        recommendedLength: '3-4小时',
        description: '第一幕：发现尸体/案件\n第二幕：重要线索揭示，嫌疑锁定\n第三幕：关键回忆，真相渐明\n第四幕：时间回到最初，揭示完整真相',
      },
    },
    {
      id: 'structure-branching',
      name: '分支剧情',
      description: '多线程分支剧情结构',
      structure: {
        acts: 3,
        scenesPerAct: 4,
        recommendedLength: '4-5小时',
        description: '角色有不同的调查路径，每个选择都会影响剧情发展\n最终根据玩家的选择和发现，达成不同的结局',
      },
    },
  ];

  // 导出项目为JSON
  exportProjectAsJSON(projectId: string): string | null {
    return storageService.exportProject(projectId);
  }

  // 导出所有项目为JSON
  exportAllProjectsAsJSON(): string {
    return storageService.exportAllProjects();
  }

  // 导出角色剧本集为PDF
  // 导出单个角色剧本为PDF
  async exportSingleCharacterScriptAsPDF(projectId: string, characterId: string): Promise<void> {
    try {
      const project = storageService.getProject(projectId);
      if (!project) {
        throw new Error('项目不存在');
      }
      
      const character = project.characters.find(c => c.id === characterId);
      if (!character) {
        throw new Error('角色不存在');
      }
      
      // 复用角色剧本导出逻辑，只传入单个角色ID
      await this.exportCharacterScriptsAsPDF(projectId, [characterId]);
    } catch (error) {
      console.error('导出单个角色剧本失败:', error);
      throw error;
    }
  }
  
  // 导出角色剧本集为PDF
  async exportCharacterScriptsAsPDF(projectId: string, characterIds?: string[]): Promise<boolean> {
    try {
      const project = storageService.getProject(projectId);
      if (!project) return false;

      let characters = project.characters;
      if (characterIds && characterIds.length > 0) {
        characters = characters.filter(char => characterIds.includes(char.id));
      }

      const doc = new jsPDF();
      let yPosition = this.PDF_CONFIG.margin;

      // 添加标题
      doc.setFontSize(this.PDF_CONFIG.titleSize);
      doc.text(`${project.title} - 角色剧本集`, doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
      yPosition += 25;

      doc.setFontSize(this.PDF_CONFIG.fontSize);
      doc.text(`导出日期: ${formatDate(new Date())}`, doc.internal.pageSize.width - this.PDF_CONFIG.margin, yPosition, { align: 'right' });
      yPosition += 20;

      // 为每个角色生成剧本
      for (const character of characters) {
        // 检查是否需要新页面
        if (yPosition > doc.internal.pageSize.height - 50) {
          doc.addPage();
          yPosition = this.PDF_CONFIG.margin;
        }

        // 角色信息
        doc.setFontSize(this.PDF_CONFIG.subtitleSize);
        doc.text(`角色：${character.name}`, this.PDF_CONFIG.margin, yPosition);
        yPosition += 15;

        doc.setFontSize(this.PDF_CONFIG.fontSize);
        
        // 角色背景
        if (character.background) {
          doc.text('背景故事:', this.PDF_CONFIG.margin, yPosition);
          yPosition += 10;
          const backgroundLines = doc.splitTextToSize(character.background, doc.internal.pageSize.width - this.PDF_CONFIG.margin * 2);
          doc.text(backgroundLines, this.PDF_CONFIG.margin, yPosition);
          yPosition += backgroundLines.length * 7;
          yPosition += 10;
        }

        // 角色描述
        if (character.description) {
          doc.text('角色描述:', this.PDF_CONFIG.margin, yPosition);
          yPosition += 10;
          const descriptionLines = doc.splitTextToSize(character.description, doc.internal.pageSize.width - this.PDF_CONFIG.margin * 2);
          doc.text(descriptionLines, this.PDF_CONFIG.margin, yPosition);
          yPosition += descriptionLines.length * 7;
          yPosition += 10;
        }

        // 角色秘密
        if (character.secrets && character.secrets.length > 0) {
          doc.text('角色秘密:', this.PDF_CONFIG.margin, yPosition);
          yPosition += 10;
          character.secrets.forEach((secret, index) => {
            const secretText = `${index + 1}. ${secret}`;
            const secretLines = doc.splitTextToSize(secretText, doc.internal.pageSize.width - this.PDF_CONFIG.margin * 2 - 10);
            doc.text(secretLines, this.PDF_CONFIG.margin + 10, yPosition);
            yPosition += secretLines.length * 7;
          });
          yPosition += 15;
        }

        // 分割线
        if (characters.indexOf(character) !== characters.length - 1) {
          doc.line(this.PDF_CONFIG.margin, yPosition, doc.internal.pageSize.width - this.PDF_CONFIG.margin, yPosition);
          yPosition += 20;
        }
      }

      // 保存PDF
      doc.save(`${project.title}_角色剧本集_${formatDate(new Date()).replace(/\//g, '-')}.pdf`);
      return true;
    } catch (error) {
      console.error('导出角色剧本PDF失败:', error);
      return false;
    }
  }

  // 导出主持人手册为PDF
  async exportOrganizerGuideAsPDF(projectId: string): Promise<boolean> {
      try {
        const project = storageService.getProject(projectId);
        if (!project || !project.organizerGuide) return false;

      const doc = new jsPDF();
      let yPosition = this.PDF_CONFIG.margin;

      // 添加标题
      doc.setFontSize(this.PDF_CONFIG.titleSize);
      doc.text(`${project.title} - 主持人手册`, doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
      yPosition += 25;

      doc.setFontSize(this.PDF_CONFIG.fontSize);
      doc.text(`导出日期: ${formatDate(new Date())}`, doc.internal.pageSize.width - this.PDF_CONFIG.margin, yPosition, { align: 'right' });
      yPosition += 20;

      // 项目概要
      doc.setFontSize(this.PDF_CONFIG.subtitleSize);
      doc.text('项目概要', this.PDF_CONFIG.margin, yPosition);
      yPosition += 15;

      doc.setFontSize(this.PDF_CONFIG.fontSize);
      if (project.description) {
        const descriptionLines = doc.splitTextToSize(project.description, doc.internal.pageSize.width - this.PDF_CONFIG.margin * 2);
        doc.text(descriptionLines, this.PDF_CONFIG.margin, yPosition);
        yPosition += descriptionLines.length * 7;
        yPosition += 15;
      }

      // 真相章节
      if (project.organizerGuide.truthChapters && project.organizerGuide.truthChapters.length > 0) {
        if (yPosition > doc.internal.pageSize.height - 100) {
          doc.addPage();
          yPosition = this.PDF_CONFIG.margin;
        }
        
        doc.setFontSize(this.PDF_CONFIG.subtitleSize);
        doc.text('真相揭示', this.PDF_CONFIG.margin, yPosition);
        yPosition += 15;

        doc.setFontSize(this.PDF_CONFIG.fontSize);
        project.organizerGuide.truthChapters.forEach((chapter, index) => {
          if (yPosition > doc.internal.pageSize.height - 150) {
            doc.addPage();
            yPosition = this.PDF_CONFIG.margin;
          }
          
          doc.text(`${index + 1}. ${chapter.title}`, this.PDF_CONFIG.margin, yPosition);
          yPosition += 10;
          const contentLines = doc.splitTextToSize(chapter.content, doc.internal.pageSize.width - this.PDF_CONFIG.margin * 2);
          doc.text(contentLines, this.PDF_CONFIG.margin, yPosition);
          yPosition += contentLines.length * 7;
          yPosition += 15;
        });
      }

      // 主持流程
      if (project.organizerGuide.hostingSteps && project.organizerGuide.hostingSteps.length > 0) {
        if (yPosition > doc.internal.pageSize.height - 100) {
          doc.addPage();
          yPosition = this.PDF_CONFIG.margin;
        }
        
        doc.setFontSize(this.PDF_CONFIG.subtitleSize);
        doc.text('主持流程', this.PDF_CONFIG.margin, yPosition);
        yPosition += 15;

        doc.setFontSize(this.PDF_CONFIG.fontSize);
        project.organizerGuide.hostingSteps.forEach((step, index) => {
          if (yPosition > doc.internal.pageSize.height - 150) {
            doc.addPage();
            yPosition = this.PDF_CONFIG.margin;
          }
          
          doc.text(`${index + 1}. ${step.title} (${step.duration}分钟)`, this.PDF_CONFIG.margin, yPosition);
          yPosition += 10;
          doc.text(`主持人行动: ${step.hostAction}`, this.PDF_CONFIG.margin + 10, yPosition);
          yPosition += 10;
          doc.text('玩家任务:', this.PDF_CONFIG.margin + 10, yPosition);
          yPosition += 10;
          step.playerTasks.forEach(task => {
            const taskText = `- ${task}`;
            const taskLines = doc.splitTextToSize(taskText, doc.internal.pageSize.width - this.PDF_CONFIG.margin * 2 - 20);
            doc.text(taskLines, this.PDF_CONFIG.margin + 20, yPosition);
            yPosition += taskLines.length * 7;
          });
          yPosition += 15;
        });
      }

      // 线索分配
      if (project.organizerGuide.clueDistributions && project.organizerGuide.clueDistributions.length > 0) {
        if (yPosition > doc.internal.pageSize.height - 100) {
          doc.addPage();
          yPosition = this.PDF_CONFIG.margin;
        }
        
        doc.setFontSize(this.PDF_CONFIG.subtitleSize);
        doc.text('线索分配', this.PDF_CONFIG.margin, yPosition);
        yPosition += 15;

        doc.setFontSize(this.PDF_CONFIG.fontSize);
        project.organizerGuide.clueDistributions.forEach((distribution, index) => {
          if (yPosition > doc.internal.pageSize.height - 100) {
            doc.addPage();
            yPosition = this.PDF_CONFIG.margin;
          }
          
          doc.text(`${index + 1}. ${distribution.clueName}`, this.PDF_CONFIG.margin, yPosition);
          yPosition += 10;
          doc.text(`阶段: ${distribution.phase}`, this.PDF_CONFIG.margin + 10, yPosition);
          yPosition += 7;
          doc.text(`方式: ${distribution.method}`, this.PDF_CONFIG.margin + 10, yPosition);
          yPosition += 7;
          doc.text(`条件: ${distribution.condition}`, this.PDF_CONFIG.margin + 10, yPosition);
          yPosition += 15;
        });
      }

      // 保存PDF
      doc.save(`${project.title}_主持人手册_${formatDate(new Date()).replace(/\//g, '-')}.pdf`);
      return true;
    } catch (error) {
      console.error('导出主持人手册PDF失败:', error);
      return false;
    }
  }
  
  // 导出主持流程卡片PDF
   async exportHostingCardsPDF(projectId: string): Promise<void> {
    const project = storageService.getProject(projectId);
    try {
      if (!project || !project.organizerGuide?.hostingSteps) return;
      
      const doc = new jsPDF();
      let yPosition = this.PDF_CONFIG.margin;
      
      // 添加标题
      doc.setFontSize(this.PDF_CONFIG.titleSize);
      doc.text(`${project.title} - 主持流程卡片`, doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
      yPosition += 25;
      
      // 为每个步骤创建卡片
      for (const [index, step] of project.organizerGuide.hostingSteps.entries()) {
        // 每个步骤创建新页面
        if (index > 0) {
          doc.addPage();
          yPosition = this.PDF_CONFIG.margin;
        }
        
        doc.setFontSize(this.PDF_CONFIG.subtitleSize);
        doc.text(`步骤 ${index + 1}: ${step.title}`, this.PDF_CONFIG.margin, yPosition);
        yPosition += 15;
        
        if (step.duration) {
          doc.setFontSize(this.PDF_CONFIG.fontSize);
          doc.text(`预计时长: ${step.duration}分钟`, this.PDF_CONFIG.margin, yPosition);
          yPosition += 15;
        }
        
        if (step.hostAction) {
          doc.setFontSize(this.PDF_CONFIG.fontSize);
          doc.text('主持人行动:', this.PDF_CONFIG.margin, yPosition);
          yPosition += 10;
          const hostActionLines = doc.splitTextToSize(step.hostAction, doc.internal.pageSize.width - this.PDF_CONFIG.margin * 2);
          doc.text(hostActionLines, this.PDF_CONFIG.margin, yPosition);
          yPosition += hostActionLines.length * 7;
          yPosition += 15;
        }
        
        if (step.playerTasks && step.playerTasks.length > 0) {
          doc.setFontSize(this.PDF_CONFIG.fontSize);
          doc.text('玩家任务:', this.PDF_CONFIG.margin, yPosition);
          yPosition += 10;
          step.playerTasks.forEach(task => {
            const taskText = `- ${task}`;
            const taskLines = doc.splitTextToSize(taskText, doc.internal.pageSize.width - this.PDF_CONFIG.margin * 2 - 10);
            doc.text(taskLines, this.PDF_CONFIG.margin + 10, yPosition);
            yPosition += taskLines.length * 7;
          });
        }
      }
      
      // 保存PDF
      doc.save(`${project.title}_主持流程卡片_${formatDate(new Date()).replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error('导出主持流程卡片PDF失败:', error);
      throw error;
    }
  }
  
  // 导出真相揭示表PDF
    async exportTruthTablePDF(projectId: string): Promise<void> {
      try {
      const project = storageService.getProject(projectId);
      if (!project || !project.organizerGuide) return;
      
      const doc = new jsPDF();
      let yPosition = this.PDF_CONFIG.margin;
      
      // 添加标题
      doc.setFontSize(this.PDF_CONFIG.titleSize);
      doc.text(`${project.title} - 真相揭示表`, doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
      yPosition += 25;
      
      // 真相章节
      if (project.organizerGuide.truthChapters && project.organizerGuide.truthChapters.length > 0) {
        doc.setFontSize(this.PDF_CONFIG.subtitleSize);
        doc.text('真相解析', this.PDF_CONFIG.margin, yPosition);
        yPosition += 15;
        
        doc.setFontSize(this.PDF_CONFIG.fontSize);
        for (const chapter of project.organizerGuide.truthChapters) {
          if (yPosition > doc.internal.pageSize.height - 150) {
            doc.addPage();
            yPosition = this.PDF_CONFIG.margin;
          }
          
          doc.text(chapter.title, this.PDF_CONFIG.margin, yPosition);
          yPosition += 10;
          const contentLines = doc.splitTextToSize(chapter.content, doc.internal.pageSize.width - this.PDF_CONFIG.margin * 2);
          doc.text(contentLines, this.PDF_CONFIG.margin, yPosition);
          yPosition += contentLines.length * 7;
          yPosition += 15;
        }
      }
      
      // 结局汇总
      if (project.organizerGuide.endings && project.organizerGuide.endings.length > 0) {
        if (yPosition > doc.internal.pageSize.height - 100) {
          doc.addPage();
          yPosition = this.PDF_CONFIG.margin;
        }
        
        doc.setFontSize(this.PDF_CONFIG.subtitleSize);
        doc.text('结局汇总', this.PDF_CONFIG.margin, yPosition);
        yPosition += 15;
        
        doc.setFontSize(this.PDF_CONFIG.fontSize);
        project.organizerGuide.endings.forEach(ending => {
          if (yPosition > doc.internal.pageSize.height - 100) {
            doc.addPage();
            yPosition = this.PDF_CONFIG.margin;
          }
          
          doc.text(ending.title, this.PDF_CONFIG.margin, yPosition);
          yPosition += 10;
          if (ending.conditions) {
            const conditionText = `触发条件: ${ending.conditions}`;
            const conditionLines = doc.splitTextToSize(conditionText, doc.internal.pageSize.width - this.PDF_CONFIG.margin * 2);
            doc.text(conditionLines, this.PDF_CONFIG.margin, yPosition);
            yPosition += conditionLines.length * 7;
          }
          yPosition += 10;
        });
      }
      
      // 保存PDF
      doc.save(`${project.title}_真相揭示表_${formatDate(new Date()).replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error('导出真相揭示表PDF失败:', error);
      throw error;
    }
  }

  // 导出打印优化版（简化布局，适合打印）
  async exportPrintOptimizedVersion(projectId: string): Promise<boolean> {
    try {
      const project = storageService.getProject(projectId);
      if (!project) return false;

      const doc = new jsPDF();
      let yPosition = this.PDF_CONFIG.margin;

      // 添加标题
      doc.setFontSize(this.PDF_CONFIG.titleSize);
      doc.text(`${project.title} - 打印版`, doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // 基本信息
      doc.setFontSize(this.PDF_CONFIG.fontSize);
      doc.text(`场景数量: ${project.scenes.length}`, this.PDF_CONFIG.margin, yPosition);
      yPosition += 10;
      doc.text(`角色数量: ${project.characters.length}`, this.PDF_CONFIG.margin, yPosition);
      yPosition += 20;

      // 角色列表
      doc.setFontSize(this.PDF_CONFIG.subtitleSize);
      doc.text('角色列表', this.PDF_CONFIG.margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(this.PDF_CONFIG.fontSize);
      project.characters.forEach((char, index) => {
        if (yPosition > doc.internal.pageSize.height - 50) {
          doc.addPage();
          yPosition = this.PDF_CONFIG.margin;
        }
        doc.text(`${index + 1}. ${char.name}`, this.PDF_CONFIG.margin, yPosition);
        yPosition += 8;
      });

      // 场景列表
      doc.addPage();
      yPosition = this.PDF_CONFIG.margin;
      doc.setFontSize(this.PDF_CONFIG.subtitleSize);
      doc.text('场景列表', this.PDF_CONFIG.margin, yPosition);
      yPosition += 15;

      doc.setFontSize(this.PDF_CONFIG.fontSize);
      project.scenes.forEach((scene, index) => {
        if (yPosition > doc.internal.pageSize.height - 50) {
          doc.addPage();
          yPosition = this.PDF_CONFIG.margin;
        }
        doc.text(`${index + 1}. ${scene.name}`, this.PDF_CONFIG.margin, yPosition);
        yPosition += 8;
      });

      // 保存PDF
      doc.save(`${project.title}_打印版_${formatDate(new Date()).replace(/\//g, '-')}.pdf`);
      return true;
    } catch (error) {
      console.error('导出打印优化版失败:', error);
      return false;
    }
  }

  // 导入项目文件
  importProject(jsonData: string, onConflict?: (importedProject: Story, existingProject: Story) => 'replace' | 'keep' | 'merge'): Story | null {
    try {
      const data = JSON.parse(jsonData);
      
      // 数据验证和清洗
      const cleanedData = this.validateAndCleanProjectData(data);
      if (!cleanedData) {
        throw new Error('数据验证失败');
      }

      const project = cleanedData.project;
      
      // 检查是否存在冲突
      const existingProjects = storageService.getProjects();
      const existingProject = existingProjects.find(p => p.id === project.id);
      
      if (existingProject) {
        if (onConflict) {
          const action = onConflict(project, existingProject);
          
          switch (action) {
            case 'replace':
              return storageService.updateProject(project.id, project);
            case 'keep':
              return existingProject;
            case 'merge':
              // 合并项目数据
              const mergedProject = this.mergeProjects(existingProject, project);
              return storageService.updateProject(existingProject.id, mergedProject);
            default:
              return null;
          }
        } else {
          // 默认行为：询问用户或使用时间戳重命名
          const newId = `${project.id}_imported_${Date.now()}`;
          const renamedProject = { ...project, id: newId };
          return storageService.updateProject(existingProject.id, renamedProject);
        }
      } else {
        // 直接导入新项目
        return storageService.importProject(jsonData);
      }
    } catch (error) {
      console.error('导入项目失败:', error);
      return null;
    }
  }

  // 验证和清洗项目数据
  validateAndCleanProjectData(data: any): { version: string; project: Story } | null {
    try {
      // 基本验证
      if (!data || !data.version || !data.project) {
        return null;
      }

      const project = data.project;
      
      // 必需字段验证
      const requiredFields = ['title', 'description'];
      for (const field of requiredFields) {
        if (!project[field] || typeof project[field] !== 'string') {
          project[field] = project[field] || '未命名';
        }
      }

      // 清理和验证角色数据
      if (!Array.isArray(project.characters)) {
        project.characters = [];
      } else {
        project.characters = project.characters
          .filter((char: any) => char && typeof char === 'object')
          .map((char: any) => ({
            id: char.id || generateId(),
            name: char.name || '未命名角色',
            description: char.description || '',
            background: char.background || '',
            secrets: Array.isArray(char.secrets) ? char.secrets : [],
            relationships: Array.isArray(char.relationships) ? char.relationships : [],
          }));
      }

      // 清理和验证场景数据
      if (!Array.isArray(project.scenes)) {
        project.scenes = [];
      } else {
        project.scenes = project.scenes
          .filter((scene: any) => scene && typeof scene === 'object')
          .map((scene: any) => ({
            id: scene.id || generateId(),
            name: scene.name || '未命名场景',
            description: scene.description || '',
            charactersPresent: Array.isArray(scene.charactersPresent) ? scene.charactersPresent : [],
            clues: Array.isArray(scene.clues) ? scene.clues : [],
            time: scene.time || '',
            location: scene.location || '',
          }));

        // 清理线索数据
        project.scenes.forEach((scene: any) => {
          scene.clues = scene.clues
            .filter((clue: any) => clue && typeof clue === 'object')
            .map((clue: any) => ({
              id: clue.id || generateId(),
              name: clue.name || '未命名线索',
              description: clue.description || '',
              foundBy: clue.foundBy || undefined,
              relevance: ['high', 'medium', 'low'].includes(clue.relevance) ? clue.relevance : 'medium',
            }));
        });
      }

      return { version: data.version, project: project as Story };
    } catch (error) {
      console.error('验证和清洗项目数据失败:', error);
      return null;
    }
  }

  // 合并项目数据
  mergeProjects(existingProject: Story, importedProject: Story): Partial<Story> {
    const mergedProject: Partial<Story> = { ...existingProject };
    
    // 合并基本信息（优先使用导入的项目）
    mergedProject.title = importedProject.title;
    mergedProject.description = importedProject.description;
    (mergedProject as any).setting = (importedProject as any).setting || (existingProject as any).setting;
    (mergedProject as any).theme = (importedProject as any).theme || (existingProject as any).theme;
    (mergedProject as any).plotSummary = (importedProject as any).plotSummary || (existingProject as any).plotSummary;

    // 合并角色（保留两者，但避免重复）
    const existingCharacterIds = new Set((existingProject as any).characters.map((c: any) => c.id));
    const newCharacters = (importedProject as any).characters.filter((c: any) => !existingCharacterIds.has(c.id));
    (mergedProject as any).characters = [...(existingProject as any).characters, ...newCharacters];

    // 合并场景（保留两者，但避免重复）
    const existingSceneIds = new Set((existingProject as any).scenes.map((s: any) => s.id));
    const newScenes = (importedProject as any).scenes.filter((s: any) => !existingSceneIds.has(s.id));
    (mergedProject as any).scenes = [...(existingProject as any).scenes, ...newScenes];

    // 处理组织者手册（如果存在）- 使用类型断言避免类型错误
    if ('organizerGuide' in importedProject && importedProject.organizerGuide) {
      if ('organizerGuide' in existingProject && existingProject.organizerGuide) {
        (mergedProject as any).organizerGuide = {
          truthChapters: [...((existingProject.organizerGuide as any)?.truthChapters || []), ...((importedProject.organizerGuide as any)?.truthChapters || [])],
          hostingSteps: [...((existingProject.organizerGuide as any)?.hostingSteps || []), ...((importedProject.organizerGuide as any)?.hostingSteps || [])],
          clueDistributions: [...((existingProject.organizerGuide as any)?.clueDistributions || []), ...((importedProject.organizerGuide as any)?.clueDistributions || [])],
          faqs: [...((existingProject.organizerGuide as any)?.faqs || []), ...((importedProject.organizerGuide as any)?.faqs || [])],
          endings: [...((existingProject.organizerGuide as any)?.endings || []), ...((importedProject.organizerGuide as any)?.endings || [])],
        };
      } else {
        (mergedProject as any).organizerGuide = importedProject.organizerGuide;
      }
    }

    return mergedProject;
  }

  // 获取项目模板库
  getProjectTemplates(category?: string): ProjectTemplate[] {
    if (category) {
      return this.PROJECT_TEMPLATES.filter(template => template.category === category);
    }
    return this.PROJECT_TEMPLATES;
  }

  // 获取角色模板库
  getCharacterTemplates(): CharacterTemplate[] {
    return this.CHARACTER_TEMPLATES;
  }

  // 获取剧本结构模板
  getScriptStructureTemplates(): ScriptStructureTemplate[] {
    return this.SCRIPT_STRUCTURE_TEMPLATES;
  }

  // 应用项目模板
  applyProjectTemplate(templateId: string): Partial<Story> {
    const template = this.PROJECT_TEMPLATES.find(t => t.id === templateId);
    return template ? { ...template.templateData } : {};
  }

  // 应用角色模板
  applyCharacterTemplate(templateId: string): Partial<Character> {
    const template = this.CHARACTER_TEMPLATES.find(t => t.id === templateId);
    return template ? { ...template.characterData } : {};
  }
}

const exportImportService = new ExportImportService();
export default exportImportService;