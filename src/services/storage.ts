import type { Story, Character, Scene, Clue, Relationship } from '../types/index';
import { generateId, formatDateTime } from '../utils/helpers';

// localStorage 键名常量
const STORAGE_KEYS = {
  PROJECTS: 'script_killer_projects',
  CURRENT_PROJECT: 'script_killer_current_project',
  VERSION: 'script_killer_version',
};

// 当前数据版本
const DATA_VERSION = '1.0.0';

// 基础存储操作类
class StorageService {
  // 获取数据
  private getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  // 存储数据
  private setItem<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  }

  // 删除数据
  private removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }

  // 清除所有数据
  clearAll(): boolean {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  // 获取当前数据版本
  getVersion(): string {
    return this.getItem<string>(STORAGE_KEYS.VERSION) || '0.0.0';
  }

  // 设置数据版本
  setVersion(version: string): boolean {
    return this.setItem(STORAGE_KEYS.VERSION, version);
  }

  // 项目相关操作
  // 获取所有项目
  getProjects(): Story[] {
    return this.getItem<Story[]>(STORAGE_KEYS.PROJECTS) || [];
  }

  // 获取单个项目
  getProject(projectId: string): Story | null {
    const projects = this.getProjects();
    return projects.find(p => p.id === projectId) || null;
  }

  // 创建项目
  createProject(project: Omit<Story, 'id' | 'created' | 'updated'>): Story {
    const now = formatDateTime(new Date());
    const newProject: Story = {
      ...project,
      id: generateId(),
      created: now,
      updated: now,
    };
    
    const projects = this.getProjects();
    projects.push(newProject);
    this.setItem(STORAGE_KEYS.PROJECTS, projects);
    
    // 设置为当前项目
    this.setItem(STORAGE_KEYS.CURRENT_PROJECT, newProject.id);
    
    return newProject;
  }

  // 更新项目
  updateProject(projectId: string, updates: Partial<Story>): Story | null {
    const projects = this.getProjects();
    const index = projects.findIndex(p => p.id === projectId);
    
    if (index === -1) return null;
    
    projects[index] = {
      ...projects[index],
      ...updates,
      updated: formatDateTime(new Date()),
    };
    
    this.setItem(STORAGE_KEYS.PROJECTS, projects);
    return projects[index];
  }
  
  // 保存完整项目
  saveProject(project: Story): Story | null {
    const projects = this.getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    
    if (index === -1) return null;
    
    projects[index] = {
      ...project,
      updated: formatDateTime(new Date()),
    };
    
    this.setItem(STORAGE_KEYS.PROJECTS, projects);
    return projects[index];
  }

  // 删除项目
  deleteProject(projectId: string): boolean {
    const projects = this.getProjects();
    const newProjects = projects.filter(p => p.id !== projectId);
    
    if (newProjects.length === projects.length) return false;
    
    this.setItem(STORAGE_KEYS.PROJECTS, newProjects);
    
    // 如果删除的是当前项目，清除当前项目设置
    const currentProject = this.getCurrentProjectId();
    if (currentProject === projectId) {
      this.removeItem(STORAGE_KEYS.CURRENT_PROJECT);
    }
    
    return true;
  }

  // 获取当前项目ID
  getCurrentProjectId(): string | null {
    return this.getItem<string>(STORAGE_KEYS.CURRENT_PROJECT);
  }

  // 设置当前项目ID
  setCurrentProjectId(projectId: string): boolean {
    // 验证项目是否存在
    const project = this.getProject(projectId);
    if (!project) return false;
    
    return this.setItem(STORAGE_KEYS.CURRENT_PROJECT, projectId);
  }

  // 角色相关操作
  // 获取项目中的所有角色
  getCharacters(projectId: string): Character[] {
    const project = this.getProject(projectId);
    return project?.characters || [];
  }

  // 获取单个角色
  getCharacter(projectId: string, characterId: string): Character | null {
    const characters = this.getCharacters(projectId);
    return characters.find(c => c.id === characterId) || null;
  }

  // 创建角色
  createCharacter(projectId: string, character: Omit<Character, 'id'>): Character | null {
    const newCharacter: Character = {
      ...character,
      id: generateId(),
    };
    
    const project = this.getProject(projectId);
    if (!project) return null;
    
    project.characters.push(newCharacter);
    this.updateProject(projectId, { characters: project.characters });
    
    return newCharacter;
  }

  // 更新角色
  updateCharacter(projectId: string, characterId: string, updates: Partial<Character>): Character | null {
    const project = this.getProject(projectId);
    if (!project) return null;
    
    const characterIndex = project.characters.findIndex(c => c.id === characterId);
    if (characterIndex === -1) return null;
    
    project.characters[characterIndex] = {
      ...project.characters[characterIndex],
      ...updates,
    };
    
    this.updateProject(projectId, { characters: project.characters });
    return project.characters[characterIndex];
  }

  // 删除角色
  deleteCharacter(projectId: string, characterId: string): boolean {
    const project = this.getProject(projectId);
    if (!project) return false;
    
    const newCharacters = project.characters.filter(c => c.id !== characterId);
    if (newCharacters.length === project.characters.length) return false;
    
    this.updateProject(projectId, { characters: newCharacters });
    return true;
  }

  // 场景（时间线事件）相关操作
  // 获取项目中的所有场景
  getScenes(projectId: string): Scene[] {
    const project = this.getProject(projectId);
    return project?.scenes || [];
  }

  // 获取单个场景
  getScene(projectId: string, sceneId: string): Scene | null {
    const scenes = this.getScenes(projectId);
    return scenes.find(s => s.id === sceneId) || null;
  }

  // 创建场景
  createScene(projectId: string, scene: Omit<Scene, 'id'>): Scene | null {
    const newScene: Scene = {
      ...scene,
      id: generateId(),
    };
    
    const project = this.getProject(projectId);
    if (!project) return null;
    
    project.scenes.push(newScene);
    this.updateProject(projectId, { scenes: project.scenes });
    
    return newScene;
  }

  // 更新场景
  updateScene(projectId: string, sceneId: string, updates: Partial<Scene>): Scene | null {
    const project = this.getProject(projectId);
    if (!project) return null;
    
    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return null;
    
    project.scenes[sceneIndex] = {
      ...project.scenes[sceneIndex],
      ...updates,
    };
    
    this.updateProject(projectId, { scenes: project.scenes });
    return project.scenes[sceneIndex];
  }

  // 删除场景
  deleteScene(projectId: string, sceneId: string): boolean {
    const project = this.getProject(projectId);
    if (!project) return false;
    
    const newScenes = project.scenes.filter(s => s.id !== sceneId);
    if (newScenes.length === project.scenes.length) return false;
    
    this.updateProject(projectId, { scenes: newScenes });
    return true;
  }

  // 线索相关操作
  // 获取场景中的所有线索
  getClues(projectId: string, sceneId: string): Clue[] {
    const scene = this.getScene(projectId, sceneId);
    return scene?.clues || [];
  }

  // 获取单个线索
  getClue(projectId: string, sceneId: string, clueId: string): Clue | null {
    const clues = this.getClues(projectId, sceneId);
    return clues.find(c => c.id === clueId) || null;
  }

  // 创建线索
  createClue(projectId: string, sceneId: string, clue: Omit<Clue, 'id'>): Clue | null {
    const newClue: Clue = {
      ...clue,
      id: generateId(),
    };
    
    const project = this.getProject(projectId);
    if (!project) return null;
    
    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return null;
    
    project.scenes[sceneIndex].clues.push(newClue);
    this.updateProject(projectId, { scenes: project.scenes });
    
    return newClue;
  }

  // 更新线索
  updateClue(projectId: string, sceneId: string, clueId: string, updates: Partial<Clue>): Clue | null {
    const project = this.getProject(projectId);
    if (!project) return null;
    
    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return null;
    
    const clueIndex = project.scenes[sceneIndex].clues.findIndex(c => c.id === clueId);
    if (clueIndex === -1) return null;
    
    project.scenes[sceneIndex].clues[clueIndex] = {
      ...project.scenes[sceneIndex].clues[clueIndex],
      ...updates,
    };
    
    this.updateProject(projectId, { scenes: project.scenes });
    return project.scenes[sceneIndex].clues[clueIndex];
  }

  // 删除线索
  deleteClue(projectId: string, sceneId: string, clueId: string): boolean {
    const project = this.getProject(projectId);
    if (!project) return false;
    
    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return false;
    
    const newClues = project.scenes[sceneIndex].clues.filter(c => c.id !== clueId);
    if (newClues.length === project.scenes[sceneIndex].clues.length) return false;
    
    project.scenes[sceneIndex].clues = newClues;
    this.updateProject(projectId, { scenes: project.scenes });
    return true;
  }

  // 角色关系相关操作
  // 获取角色的所有关系
  getRelationships(projectId: string, characterId: string): Relationship[] {
    const character = this.getCharacter(projectId, characterId);
    return character?.relationships || [];
  }

  // 创建角色关系
  createRelationship(projectId: string, characterId: string, relationship: Relationship): Relationship | null {
    const project = this.getProject(projectId);
    if (!project) return null;
    
    const characterIndex = project.characters.findIndex(c => c.id === characterId);
    if (characterIndex === -1) return null;
    
    project.characters[characterIndex].relationships.push(relationship);
    this.updateProject(projectId, { characters: project.characters });
    
    return relationship;
  }

  // 更新角色关系
  updateRelationship(projectId: string, characterId: string, targetCharacterId: string, updates: Partial<Relationship>): Relationship | null {
    const project = this.getProject(projectId);
    if (!project) return null;
    
    const characterIndex = project.characters.findIndex(c => c.id === characterId);
    if (characterIndex === -1) return null;
    
    const relationshipIndex = project.characters[characterIndex].relationships.findIndex(r => r.targetCharacterId === targetCharacterId);
    if (relationshipIndex === -1) return null;
    
    project.characters[characterIndex].relationships[relationshipIndex] = {
      ...project.characters[characterIndex].relationships[relationshipIndex],
      ...updates,
    };
    
    this.updateProject(projectId, { characters: project.characters });
    return project.characters[characterIndex].relationships[relationshipIndex];
  }

  // 删除角色关系
  deleteRelationship(projectId: string, characterId: string, targetCharacterId: string): boolean {
    const project = this.getProject(projectId);
    if (!project) return false;
    
    const characterIndex = project.characters.findIndex(c => c.id === characterId);
    if (characterIndex === -1) return false;
    
    const newRelationships = project.characters[characterIndex].relationships.filter(r => r.targetCharacterId !== targetCharacterId);
    if (newRelationships.length === project.characters[characterIndex].relationships.length) return false;
    
    project.characters[characterIndex].relationships = newRelationships;
    this.updateProject(projectId, { characters: project.characters });
    return true;
  }

  // 数据导入导出
  // 导出单个项目
  exportProject(projectId: string): string | null {
    const project = this.getProject(projectId);
    if (!project) return null;
    
    const exportData = {
      version: DATA_VERSION,
      project,
      exportedAt: formatDateTime(new Date()),
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // 导出所有项目
  exportAllProjects(): string {
    const projects = this.getProjects();
    const exportData = {
      version: DATA_VERSION,
      projects,
      exportedAt: formatDateTime(new Date()),
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // 导入项目
  importProject(jsonData: string): Story | null {
    try {
      const data = JSON.parse(jsonData);
      
      // 验证数据格式
      if (!data.version || !data.project || !data.project.id) {
        throw new Error('Invalid project data format');
      }
      
      // 检查是否已存在同名项目
      const existingProjects = this.getProjects();
      const existingProject = existingProjects.find(p => p.id === data.project.id);
      
      if (existingProject) {
        // 更新现有项目
        return this.updateProject(data.project.id, data.project);
      } else {
        // 创建新项目，保持原有ID
        const projectToCreate = { ...data.project };
        delete (projectToCreate as any).id;
        delete (projectToCreate as any).created;
        delete (projectToCreate as any).updated;
        
        const newProject = this.createProject(projectToCreate);
        // 更新为原始ID
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === newProject.id);
        if (index !== -1) {
          projects[index].id = data.project.id;
          this.setItem(STORAGE_KEYS.PROJECTS, projects);
          return projects[index];
        }
        return newProject;
      }
    } catch (error) {
      console.error('Error importing project:', error);
      return null;
    }
  }

  // 导入多个项目
  importProjects(jsonData: string): number {
    try {
      const data = JSON.parse(jsonData);
      
      // 验证数据格式
      if (!data.version || !Array.isArray(data.projects)) {
        throw new Error('Invalid projects data format');
      }
      
      let importedCount = 0;
      
      for (const projectData of data.projects) {
        const result = this.importProject(JSON.stringify({ version: data.version, project: projectData }));
        if (result) {
          importedCount++;
        }
      }
      
      return importedCount;
    } catch (error) {
      console.error('Error importing projects:', error);
      return 0;
    }
  }

  // 数据验证
  validateProjectData(project: any): boolean {
    if (!project || typeof project !== 'object') return false;
    
    const requiredFields = ['title', 'description', 'setting'];
    for (const field of requiredFields) {
      if (!project[field] || typeof project[field] !== 'string') {
        return false;
      }
    }
    
    // 验证角色数组
    if (project.characters && !Array.isArray(project.characters)) {
      return false;
    }
    
    // 验证场景数组
    if (project.scenes && !Array.isArray(project.scenes)) {
      return false;
    }
    
    return true;
  }
}

// 数据初始化函数
export const initializeData = (storage: StorageService): void => {
  const version = storage.getVersion();
  
  // 如果是首次使用，设置版本号并创建示例数据
  if (!version || version === '0.0.0') {
    storage.setVersion(DATA_VERSION);
    
    // 创建示例项目
    const exampleProject: Omit<Story, 'id' | 'created' | 'updated'> = {
      title: '神秘古宅谋杀案',
      description: '一座古老宅邸中发生的离奇谋杀案，每位客人都有不可告人的秘密。',
      setting: '1920年代的英国乡村古宅',
      theme: '悬疑、推理',
      plotSummary: '在一个风雨交加的夜晚，一群互不相识的客人被邀请到一座古老宅邸。当主人被发现死于书房后，所有人都成为了嫌疑人。随着调查的深入，每个人的秘密都将被揭露...',
      characters: [
        {
          id: generateId(),
          name: '威廉·布莱克',
          description: '45岁，古宅的现任主人，神秘的收藏家',
          background: '曾在国外经商多年，最近突然回到英国继承家族遗产。',
          secrets: ['实际上是冒充的继承人', '暗中寻找家族宝藏'],
          relationships: [],
        },
        {
          id: generateId(),
          name: '艾莉丝·怀特',
          description: '30岁，美丽的女演员，有着神秘的过去',
          background: '近期因一部电影而声名鹊起，但过去的经历鲜为人知。',
          secrets: ['曾是威廉的情妇', '掌握着威廉的把柄'],
          relationships: [],
        },
        {
          id: generateId(),
          name: '詹姆斯·格林',
          description: '40岁，私人侦探，受雇调查某件事情',
          background: '著名的私人侦探，善于解决复杂案件。',
          secrets: ['真正身份是警方卧底', '正在调查一起珠宝盗窃案'],
          relationships: [],
        },
      ],
      scenes: [
        {
          id: generateId(),
          name: '古宅大厅',
          description: '宽敞的大厅，装饰着古老的油画和盔甲。',
          title: '古宅大厅',
          charactersPresent: [],
          characterAppearances: [],
          timelinePoint: '1',
          keyEvents: '开始调查',
          settingDescription: '典雅而陈旧的大厅',
          clues: [
            {
              id: generateId(),
              name: '撕碎的信件',
              description: '一封被撕碎的信，部分内容提到了宝藏的位置。',
              relevance: 'high',
            },
            {
              id: generateId(),
              name: '脚印',
              description: '大厅地板上有泥脚印，通向书房。',
              relevance: 'medium',
            },
          ],
          time: '晚上8点',
          location: '古宅一层',
        },
        {
          id: generateId(),
          name: '书房',
          description: '死者所在的房间，书架上摆满了古籍。',
          title: '古宅书房',
          charactersPresent: [],
          characterAppearances: [],
          timelinePoint: '2',
          keyEvents: '发现尸体',
          settingDescription: '堆满古籍的神秘书房',
          clues: [
            {
              id: generateId(),
              name: '血迹',
              description: '书桌上有喷射状血迹。',
              relevance: 'high',
            },
            {
              id: generateId(),
              name: '钥匙',
              description: '一把奇怪的钥匙，似乎不是古宅内的。',
              relevance: 'medium',
            },
          ],
          time: '晚上9点',
          location: '古宅二层',
        },
      ],
    };
    
    // 添加角色关系
    const williamId = exampleProject.characters[0].id;
    const aliceId = exampleProject.characters[1].id;
    const jamesId = exampleProject.characters[2].id;
    
    exampleProject.characters[0].relationships = [
      {
        targetCharacterId: aliceId,
        description: '曾经的情人关系',
        type: 'neutral',
      },
      {
        targetCharacterId: jamesId,
        description: '雇佣关系，但互不信任',
        type: 'neutral',
      },
    ];
    
    exampleProject.characters[1].relationships = [
      {
        targetCharacterId: williamId,
        description: '想要敲诈的对象',
        type: 'enemy',
      },
    ];
    
    exampleProject.characters[2].relationships = [
      {
        targetCharacterId: williamId,
        description: '调查的目标',
        type: 'neutral',
      },
    ];
    
    // 设置角色在场景中的出现
    exampleProject.scenes[0].charactersPresent = [williamId, aliceId, jamesId];
    exampleProject.scenes[1].charactersPresent = [williamId];
    
    // 创建示例项目
    storage.createProject(exampleProject);
    
    console.log('示例数据已初始化');
  }
  
  // 数据迁移逻辑可以在这里添加
  // if (version === '0.1.0') {
  //   // 执行从0.1.0到1.0.0的数据迁移
  // }
};

// 导出单例实例
const storageService = new StorageService();
export default storageService;