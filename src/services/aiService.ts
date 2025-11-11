// AI服务集成
import { debounce } from '../utils/helpers';

// Deepseek API配置
const DEEPSEEK_API_KEY = 'sk-bbd02bd5e9154fca9013e2ab7b937a46';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 缓存接口定义
interface CacheItem {
  key: string;
  value: any;
  timestamp: number;
}

// 缓存配置
const CACHE_TTL = 30 * 60 * 1000; // 30分钟
const MAX_CACHE_SIZE = 50;

// 请求限流配置
const RATE_LIMIT_INTERVAL = 1000; // 1秒
const MAX_REQUESTS_PER_INTERVAL = 5;

class AIService {
  private cache: Map<string, CacheItem> = new Map();
  private requestTimestamps: number[] = [];
  private debouncedCleanCache = debounce(() => this.cleanCache(), 60000); // 每分钟清理一次缓存

  constructor() {
    // 初始化时清理过期缓存
    this.cleanCache();
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(prompt: string, systemPrompt?: string): string {
    const content = systemPrompt ? `${systemPrompt}_${prompt}` : prompt;
    // 使用简单的字符串哈希作为缓存键
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `ai_cache_${hash}`;
  }

  /**
   * 添加缓存项
   */
  private addToCache(key: string, value: any): void {
    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now(),
    });

    // 如果缓存大小超过限制，删除最旧的项
    if (this.cache.size > MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    // 触发缓存清理
    this.debouncedCleanCache();
  }

  /**
   * 获取缓存项
   */
  private getFromCache(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() - item.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * 清理过期缓存
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 检查请求限流
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    // 保留指定时间间隔内的请求
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < RATE_LIMIT_INTERVAL
    );

    // 检查请求数量是否超过限制
    if (this.requestTimestamps.length >= MAX_REQUESTS_PER_INTERVAL) {
      return false; // 超过限流
    }

    // 添加当前请求时间戳
    this.requestTimestamps.push(now);
    return true; // 未超过限流
  }

  /**
   * 调用Deepseek API
   */
  private async callDeepseekAPI(
    prompt: string,
    systemPrompt?: string,
    useCache: boolean = true
  ): Promise<string> {
    // 生成缓存键
    const cacheKey = this.generateCacheKey(prompt, systemPrompt);

    // 检查缓存
    if (useCache) {
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        console.log('AI Response from cache');
        return cachedResult;
      }
    }

    // 检查限流
    if (!this.checkRateLimit()) {
      throw new Error('请求过于频繁，请稍后再试');
    }

    try {
      const messages = [];
      
      // 添加系统提示
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      
      // 添加用户提示
      messages.push({ role: 'user', content: prompt });

      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.statusText}`);
      }

      const data = await response.json();
      const result = data.choices?.[0]?.message?.content;

      if (!result) {
        throw new Error('未收到API响应内容');
      }

      // 存入缓存
      if (useCache) {
        this.addToCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Deepseek API调用失败:', error);
      throw error;
    }
  }

  /**
   * 生成角色背景故事
   */
  async generateCharacterBackground(
    name: string,
    description: string,
    setting: string
  ): Promise<string> {
    const systemPrompt = '你是一位专业的剧本杀作家，擅长创作引人入胜的角色背景故事。请生成一个详细、有深度的角色背景故事，包含合理的动机和秘密。';
    
    const prompt = `请为名为${name}的角色创作一个背景故事。角色描述：${description}。故事背景设定：${setting}。\n\n请提供：\n1. 角色的成长经历\n2. 角色的主要动机\n3. 角色可能隐藏的秘密\n4. 角色与故事背景的联系\n\n背景故事应该有逻辑性，并且与剧本杀游戏环境相符。`;

    return this.callDeepseekAPI(prompt, systemPrompt);
  }

  /**
   * 生成剧情发展建议
   */
  async generatePlotSuggestions(
    currentPlot: string,
    characters: string[],
    setting: string
  ): Promise<string> {
    const systemPrompt = '你是一位专业的剧本杀剧情策划师，擅长创作悬念丛生、逻辑严密的剧情发展。';
    
    const prompt = `基于以下信息，为剧本杀游戏提供3-5个剧情发展建议：\n\n当前剧情概要：${currentPlot}\n\n主要角色：${characters.join('、')}\n\n故事背景：${setting}\n\n请为每个建议提供：\n1. 具体的剧情转折点\n2. 涉及的角色及他们的反应\n3. 可能引入的新线索或证据\n4. 这个发展对整体故事的影响\n\n建议应该具有创新性，同时保持逻辑连贯性。`;

    return this.callDeepseekAPI(prompt, systemPrompt);
  }

  /**
   * 生成谜题设计灵感
   */
  async generatePuzzleIdeas(
    difficulty: 'easy' | 'medium' | 'hard',
    theme: string,
    setting: string
  ): Promise<string> {
    const systemPrompt = '你是一位谜题设计专家，擅长创作适合剧本杀游戏的各类谜题。';
    
    const prompt = `请设计3-5个适合剧本杀游戏的谜题。\n\n难度：${difficulty === 'easy' ? '简单' : difficulty === 'medium' ? '中等' : '困难'}\n\n主题：${theme}\n\n故事背景：${setting}\n\n请为每个谜题提供：\n1. 谜题的具体描述\n2. 解谜所需的线索\n3. 解题思路和方法\n4. 谜题与剧情的关联性\n\n谜题设计应该新颖有趣，同时与剧本杀游戏环境相契合。`;

    return this.callDeepseekAPI(prompt, systemPrompt);
  }

  /**
   * 润色和语法检查
   */
  async polishText(text: string, context?: string): Promise<string> {
    const systemPrompt = '你是一位专业的文字编辑，擅长润色文本并纠正语法错误，同时保持原文的意思和风格。';
    
    let prompt = `请润色以下文本，纠正语法错误，改进表达，使其更加流畅自然：\n\n${text}`;
    
    if (context) {
      prompt += `\n\n上下文信息：${context}`;
    }

    return this.callDeepseekAPI(prompt, systemPrompt);
  }

  /**
   * 剧情逻辑检查
   */
  async checkPlotLogic(
    plotSummary: string,
    characterActions: Record<string, string[]>
  ): Promise<string> {
    const systemPrompt = '你是一位逻辑分析专家，擅长发现剧本杀剧情中的逻辑漏洞和不合理之处。';
    
    let characterActionsText = '';
    for (const [character, actions] of Object.entries(characterActions)) {
      characterActionsText += `${character}的行动：${actions.join('、')}\n`;
    }
    
    const prompt = `请检查以下剧本杀剧情是否存在逻辑漏洞或不合理之处：\n\n剧情概要：${plotSummary}\n\n各角色行动：\n${characterActionsText}\n\n请提供：\n1. 发现的逻辑问题或不一致之处\n2. 这些问题可能对游戏体验的影响\n3. 改进建议\n\n分析应该客观、全面，并且基于剧本杀游戏的特点。`;

    return this.callDeepseekAPI(prompt, systemPrompt);
  }

  /**
   * 对话风格优化
   */
  async optimizeDialogue(
    dialogue: string,
    characterDescription: string,
    context?: string
  ): Promise<string> {
    const systemPrompt = '你是一位对话写作专家，擅长根据角色特点优化对话风格，使其更加符合角色个性。';
    
    let prompt = `请根据角色特点优化以下对话，使其更加符合角色个性和说话风格：\n\n对话内容：${dialogue}\n\n角色描述：${characterDescription}`;
    
    if (context) {
      prompt += `\n\n上下文情境：${context}`;
    }

    return this.callDeepseekAPI(prompt, systemPrompt);
  }

  /**
   * 生成角色关系建议
   */
  async generateRelationshipSuggestions(
    characters: Array<{ id: string; name: string; description: string }>
  ): Promise<string> {
    const systemPrompt = '你是一位人物关系设计专家，擅长为剧本杀游戏创建复杂而合理的角色关系网。';
    
    let charactersText = '';
    for (const char of characters) {
      charactersText += `角色：${char.name}\n描述：${char.description}\n\n`;
    }
    
    const prompt = `请为以下角色设计可能的关系网络：\n\n${charactersText}\n\n请提供：\n1. 角色间可能存在的关系类型（朋友、敌人、家人、秘密关系等）\n2. 每种关系的具体描述和背景故事\n3. 这些关系如何推动剧情发展\n4. 哪些关系可以作为游戏中的隐藏线索\n\n关系设计应该复杂有趣，同时具有逻辑连贯性。`;

    return this.callDeepseekAPI(prompt, systemPrompt);
  }

  /**
   * 智能分配线索建议
   */
  async suggestClueDistribution(
    clues: Array<{ id: string; name: string; description: string; relevance: string }>,
    characters: Array<{ id: string; name: string }>,
    plotPhase: string
  ): Promise<string> {
    const systemPrompt = '你是一位剧本杀游戏设计师，擅长合理分配线索以保证游戏的平衡性和趣味性。';
    
    let cluesText = '';
    for (const clue of clues) {
      cluesText += `线索：${clue.name}\n描述：${clue.description}\n重要性：${clue.relevance}\n\n`;
    }
    
    const charactersList = characters.map(c => c.name).join('、');
    
    const prompt = `请为以下线索提供合理的分配建议，确保游戏的平衡性和趣味性：\n\n线索列表：\n${cluesText}\n\n角色列表：${charactersList}\n\n当前剧情阶段：${plotPhase}\n\n请提供：\n1. 每条线索的分配方案（谁发现、何时发现）\n2. 线索的发现方式建议\n3. 线索的隐藏难度级别\n4. 线索之间的关联和组合分析\n\n分配方案应该考虑游戏的进程，确保玩家体验流畅且具有挑战性。`;

    return this.callDeepseekAPI(prompt, systemPrompt);
  }

  /**
   * 主持流程优化建议
   */
  async suggestHostingImprovements(
    currentSteps: string[],
    plotComplexity: 'simple' | 'medium' | 'complex',
    playerExperience: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<string> {
    const systemPrompt = '你是一位经验丰富的剧本杀主持人，擅长优化游戏流程以提升玩家体验。';
    
    const stepsText = currentSteps.map((step, index) => `${index + 1}. ${step}`).join('\n');
    
    const prompt = `请根据以下信息，为剧本杀游戏提供主持流程优化建议：\n\n当前流程步骤：\n${stepsText}\n\n剧情复杂度：${plotComplexity === 'simple' ? '简单' : plotComplexity === 'medium' ? '中等' : '复杂'}\n\n玩家经验水平：${playerExperience === 'beginner' ? '新手' : playerExperience === 'intermediate' ? '中级' : '高级'}\n\n请提供：\n1. 流程步骤的优化建议\n2. 各环节的时间分配建议\n3. 主持人应注意的关键点\n4. 可能遇到的问题及应对策略\n5. 如何增强玩家参与感和游戏氛围\n\n建议应该具体实用，并且考虑到不同经验水平玩家的需求。`;

    return this.callDeepseekAPI(prompt, systemPrompt);
  }

  /**
   * 自定义提示词调用
   */
  async customQuery(prompt: string, systemPrompt?: string, useCache: boolean = true): Promise<string> {
    return this.callDeepseekAPI(prompt, systemPrompt, useCache);
  }
}

// 创建单例实例
const aiService = new AIService();

export default aiService;