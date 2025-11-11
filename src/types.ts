// 剧本项目相关类型定义

export interface Story {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  config?: ProjectConfig;
  // 其他现有属性...
}

export interface ProjectConfig {
  projectName: string;
  description: string;
  author: string;
  version: string;
  playerCount: number;
  estimatedDuration: number;
  difficultyLevel: string;
  exportOptions: {
    format: string;
    includeImages: boolean;
    includeNotes: boolean;
  };
  members: ProjectMember[];
}

export interface ProjectMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  permissions: string[];
}

export interface TestSimulationConfig {
  playerCount: number;
  estimatedDuration: number;
  difficultyLevel: number;
  simulatedPlayers: any[];
}

export interface PlayerFeedback {
  id: string;
  playerName: string;
  rating: number;
  difficultyFeedback: string;
  durationFeedback: string;
  comments: string;
  timestamp: string;
}