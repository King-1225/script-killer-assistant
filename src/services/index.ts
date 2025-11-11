import storageService, { initializeData } from './storage';
import aiService from './aiService';

// 导出存储服务实例
export { storageService };

// 导出AI服务实例
export { aiService };

// 导出初始化函数
export { initializeData };

// 导出服务初始化函数，用于应用启动时初始化数据
export const initializeServices = (): void => {
  try {
    // 初始化数据
    initializeData(storageService);
    console.log('服务初始化完成');
  } catch (error) {
    console.error('服务初始化失败:', error);
  }
};