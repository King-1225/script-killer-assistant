// 冲突检测系统
import type { Character, Scene, Clue } from '../types/index';
// 直接定义TimelineEvent接口，因为从types导入失败
export interface TimelineEvent {
  id: string;
  characterId: string;
  sceneId: string;
  startTime: number;
  endTime: number;
  description: string;
  location?: string;
}

// 定义EvidenceChain接口
export interface EvidenceChain {
  id: string;
  name: string;
  clueIds: string[];
  description?: string;
}

// 冲突类型（使用const对象代替enum）
export const ConflictType = {
  LOCATION_CONFLICT: 'location_conflict',
  TIME_CONFLICT: 'time_conflict',
  EVIDENCE_TIMELINE_CONFLICT: 'evidence_timeline_conflict',
  EVIDENCE_STATEMENT_CONFLICT: 'evidence_statement_conflict',
  MISSING_KEY_EVIDENCE: 'missing_key_evidence',
  MISSING_MOTIVE: 'missing_motive',
  SECRET_REVEAL_CONFLICT: 'secret_reveal_conflict',
  TASK_REACHABILITY_CONFLICT: 'task_reachability_conflict'
} as const;

export type ConflictType = typeof ConflictType[keyof typeof ConflictType];

// 冲突严重程度（使用const对象代替enum）
export const ConflictSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
} as const;

export type ConflictSeverity = typeof ConflictSeverity[keyof typeof ConflictSeverity];

// 冲突建议类型
export interface ConflictSuggestion {
  id: string;
  description: string;
  implementationSteps: string[];
}

// 冲突报告项
export interface ConflictReportItem {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  description: string;
  relatedEntities: {
    characterIds?: string[];
    clueIds?: string[];
    sceneIds?: string[];
    eventIds?: string[];
  };
  time?: string;
  location?: string;
  suggestions: ConflictSuggestion[];
  isIgnored?: boolean;
}

// 冲突忽略列表项
export interface ConflictIgnoreItem {
  conflictId: string;
  reason: string;
  ignoredAt: string;
}

// 冲突检测结果
export interface ConflictDetectionResult {
  totalConflicts: number;
  conflictsBySeverity: {
    [key in ConflictSeverity]: ConflictReportItem[];
  };
  conflictsByType: {
    [key in ConflictType]?: ConflictReportItem[];
  };
  allConflicts: ConflictReportItem[];
  ignoreList: ConflictIgnoreItem[];
}

// 时间线冲突检测
export const detectTimelineConflicts = (
  timelineEvents: TimelineEvent[],
  characters: Character[]
): ConflictReportItem[] => {
  const conflicts: ConflictReportItem[] = [];
  const locationConflicts = new Map<string, Map<string, string[]>>(); // 时间 -> 地点 -> 角色ID列表
  const characterEventsMap = new Map<string, Map<string, TimelineEvent>>(); // 角色ID -> 时间 -> 事件

  // 构建角色事件映射
  timelineEvents.forEach(event => {
    if (!characterEventsMap.has(event.characterId)) {
      characterEventsMap.set(event.characterId, new Map());
    }
    // 使用事件ID作为键，因为时间可能有重叠
    characterEventsMap.get(event.characterId)!.set(event.id, event);
  });

  // 检测地点冲突（同一时间同一地点的多角色冲突）
  timelineEvents.forEach(event => {
    if (!event.location) return;
    
    if (!locationConflicts.has(String(event.startTime))) {
      locationConflicts.set(String(event.startTime), new Map());
    }
    
    const locationMap = locationConflicts.get(String(event.startTime))!;
    if (!locationMap.has(event.location)) {
      locationMap.set(event.location, []);
    }
    locationMap.get(event.location)!.push(event.characterId);
  });

  // 生成地点冲突报告
  locationConflicts.forEach((locationMap, startTime) => {
    locationMap.forEach((characterIds, location) => {
      if (characterIds.length > 1) {
        conflicts.push({
          id: `location_conflict_${startTime}_${location}`,
          type: ConflictType.LOCATION_CONFLICT,
          severity: ConflictSeverity.MEDIUM,
          description: `在时间 ${startTime}，地点 ${location} 有 ${characterIds.length} 个角色同时出现`,
          relatedEntities: {
            characterIds
          },
          time: startTime,
          location,
          suggestions: [
            {
              id: `suggestion_${startTime}_${location}_1`,
              description: '修改部分角色的位置',
              implementationSteps: [
                '为冲突角色选择不同的地点',
                '考虑添加合理的不在场证明'
              ]
            },
            {
              id: `suggestion_${startTime}_${location}_2`,
              description: '调整时间点',
              implementationSteps: [
                '将部分角色的时间点错开',
                '保持叙事连贯性'
              ]
            }
          ]
        });
      }
    });
  });

  // 检测时间逻辑矛盾（角色不可能同时出现在两个地方）
  characters.forEach(character => {
    const events = Array.from(characterEventsMap.get(character.id)?.values() || []);
    
    // 按时间分组，检查是否有时间重叠的事件出现在不同地点
    const timeLocationMap = new Map<string, Set<string>>();
    
    events.forEach(event => {
      if (!event.location) return;
      
      // 使用startTime作为时间标识
      if (!timeLocationMap.has(String(event.startTime))) {
        timeLocationMap.set(String(event.startTime), new Set());
      }
      timeLocationMap.get(String(event.startTime))!.add(event.location);
    });
    
    // 同一时间出现在多个地点
    timeLocationMap.forEach((locations, startTime) => {
      if (locations.size > 1) {
        conflicts.push({
          id: `time_conflict_${character.id}_${startTime}`,
          type: ConflictType.TIME_CONFLICT,
          severity: ConflictSeverity.HIGH,
          description: `角色 ${character.name} 在时间 ${startTime} 出现在多个地点: ${Array.from(locations).join('、')}`,
          relatedEntities: {
            characterIds: [character.id]
          },
          time: startTime,
          suggestions: [
            {
              id: `suggestion_time_${character.id}_${startTime}_1`,
              description: '统一角色在该时间点的位置',
              implementationSteps: [
                '保留一个最合理的地点',
                '移除或调整其他地点的记录'
              ]
            },
            {
              id: `suggestion_time_${character.id}_${startTime}_2`,
              description: '将行动分散到不同时间点',
              implementationSteps: [
                '将部分行动移至前后时间点',
                '确保行动顺序合理'
              ]
            }
          ]
        });
      }
    });
  });

  return conflicts;
};

// 证据链冲突检测
export const detectEvidenceConflicts = (
  clues: Clue[],
  scenes: Scene[],
  characters: Character[],
  evidenceChains: EvidenceChain[],
  timelineEvents?: TimelineEvent[]
): ConflictReportItem[] => {
  const conflicts: ConflictReportItem[] = [];
  
  // 1. 证据与时间线矛盾检测
  if (timelineEvents && timelineEvents.length > 0) {
    clues.forEach(clue => {
      // 查找线索所在的场景
      const clueScene = scenes.find(scene => 
        scene.clues.some((c: Clue) => c.id === clue.id)
      );
      
      if (clueScene) {
        // 检查发现线索的角色是否在该时间该地点
        if (clue.foundBy) {
            // 将clueScene.time转换为数字进行比较
            const sceneTime = clueScene.time ? 
              (typeof clueScene.time === 'string' ? parseInt(clueScene.time) || 0 : clueScene.time) : 0;
            const characterEventsAtTime = timelineEvents.filter(
              event => event.characterId === clue.foundBy && 
                      event.startTime <= sceneTime && 
                      event.endTime >= sceneTime
            );
            
            const isCharacterAtLocation = characterEventsAtTime.some(event => event.location === clueScene.location);
        
          if (!isCharacterAtLocation) {
            const character = characters.find(c => c.id === clue.foundBy);
            conflicts.push({
              id: `evidence_timeline_conflict_${clue.id}_${clueScene.id}`,
              type: ConflictType.EVIDENCE_TIMELINE_CONFLICT,
              severity: ConflictSeverity.HIGH,
              description: `线索「${clue.name}」由${character?.name || '未知角色'}发现，但时间线显示该角色在${clueScene.time}不在${clueScene.location}`,
              relatedEntities: {
                clueIds: [clue.id],
                characterIds: [clue.foundBy],
                sceneIds: [clueScene.id]
              },
              time: clueScene.time,
              location: clueScene.location,
              suggestions: [
                {
                  id: `suggestion_evidence_timeline_${clue.id}_1`,
                  description: '调整角色时间线',
                  implementationSteps: [
                    `将${character?.name}在${clueScene.time}的位置修改为${clueScene.location}`,
                    '或调整发现线索的时间'
                  ]
                },
                {
                  id: `suggestion_evidence_timeline_${clue.id}_2`,
                  description: '修改线索发现者',
                  implementationSteps: [
                    '选择当时在场的其他角色作为发现者',
                    '或改为公开发现'
                  ]
                }
              ]
            });
          }
        }
      }
    });
  }
  
  // 2. 证据与角色陈述矛盾检测
  // 这里简化实现，实际应检查角色脚本中的陈述与证据是否矛盾
  characters.forEach(character => {
    const characterClues = clues.filter(clue => clue.foundBy === character.id);
    
    // 检查角色是否拥有与其秘密相矛盾的证据
    if (character.secrets && character.secrets.length > 0 && characterClues.length > 0) {
      conflicts.push({
        id: `evidence_statement_conflict_${character.id}`,
        type: ConflictType.EVIDENCE_STATEMENT_CONFLICT,
        severity: ConflictSeverity.MEDIUM,
        description: `角色 ${character.name} 拥有证据，但也有未公开的秘密，可能存在陈述矛盾`,
        relatedEntities: {
          characterIds: [character.id],
          clueIds: characterClues.map(c => c.id)
        },
        suggestions: [
          {
            id: `suggestion_evidence_statement_${character.id}_1`,
            description: '确保角色陈述与证据一致',
            implementationSteps: [
              '检查角色脚本中的陈述',
              '确保角色对证据的解释合理'
            ]
          },
          {
            id: `suggestion_evidence_statement_${character.id}_2`,
            description: '调整证据与秘密的关系',
            implementationSteps: [
              '修改证据内容或发现方式',
              '调整秘密的性质或重要性'
            ]
          }
        ]
      });
    }
  });
  
  // 3. 关键证据缺失检测
  evidenceChains.forEach(chain => {
    const chainClues = chain.clueIds.map((id: string) => clues.find(c => c.id === id)).filter(Boolean) as Clue[];
    const keyEvidenceCount = chainClues.filter(clue => clue.relevance === 'high').length;
    
    if (keyEvidenceCount === 0 && chain.clueIds.length > 0) {
      conflicts.push({
        id: `missing_key_evidence_${chain.id}`,
        type: ConflictType.MISSING_KEY_EVIDENCE,
        severity: ConflictSeverity.HIGH,
        description: `证据链「${chain.name}」缺少关键证据，无法有效支持结论`,
        relatedEntities: {
          clueIds: chain.clueIds,
          characterIds: [],
          sceneIds: []
        },
        suggestions: [
          {
            id: `suggestion_missing_key_evidence_${chain.id}_1`,
            description: '添加关键证据',
            implementationSteps: [
              '为证据链添加高相关性的关键证据',
              '确保关键证据能够直接支持结论'
            ]
          },
          {
            id: `suggestion_missing_key_evidence_${chain.id}_2`,
            description: '提升现有证据的相关性',
            implementationSteps: [
              '增强部分证据的描述和重要性',
              '调整证据之间的关联关系'
            ]
          }
        ]
      });
    }
    
    // 检查证据链的完整性和连贯性
    const connectedClueIds = new Set<string>();
    chain.clueIds.forEach((clueId: string) => {
      const clue = clues.find(c => c.id === clueId);
      if (clue && 'relatedClueIds' in clue && clue.relatedClueIds && Array.isArray(clue.relatedClueIds)) {
        (clue.relatedClueIds as string[]).forEach((relatedId: string) => {
          if (chain.clueIds.includes(relatedId)) {
            connectedClueIds.add(clueId);
            connectedClueIds.add(relatedId);
          }
        });
      }
    });
    
    if (connectedClueIds.size < chain.clueIds.length * 0.7 && chain.clueIds.length > 2) {
      conflicts.push({
        id: `evidence_chain_incomplete_${chain.id}`,
        type: ConflictType.MISSING_KEY_EVIDENCE,
        severity: ConflictSeverity.MEDIUM,
        description: `证据链「${chain.name}」的证据之间缺乏足够的关联性`,
        relatedEntities: {
          clueIds: chain.clueIds,
          characterIds: [],
          sceneIds: []
        },
        suggestions: [
          {
            id: `suggestion_evidence_chain_${chain.id}_1`,
            description: '增强证据之间的关联性',
            implementationSteps: [
              '为证据添加relatedClueIds关联',
              '确保证据链形成逻辑闭环'
            ]
          },
          {
            id: `suggestion_evidence_chain_${chain.id}_2`,
            description: '重新组织证据链',
            implementationSteps: [
              '移除关联性弱的证据',
              '添加过渡性证据连接关键节点'
            ]
          }
        ]
      });
    }
  });
  
  return conflicts;
};

// 剧本完整性检查
export const checkScriptCompleteness = (
  characters: Character[],
  clues: Clue[],
  _evidenceChains?: EvidenceChain[],
  _timelineEvents?: TimelineEvent[]
): ConflictReportItem[] => {
  const conflicts: ConflictReportItem[] = [];
  
  // 1. 角色动机缺失检查
  characters.forEach(character => {
    // 检查角色是否有足够详细的背景和动机描述
    if (!character.background || character.background.trim().length < 100) {
      conflicts.push({
        id: `missing_motive_${character.id}`,
        type: ConflictType.MISSING_MOTIVE,
        severity: ConflictSeverity.HIGH,
        description: `角色 ${character.name} 的背景描述过于简单，缺乏明确的动机说明`,
        relatedEntities: {
          characterIds: [character.id],
          clueIds: [],
          sceneIds: []
        },
        suggestions: [
          {
            id: `suggestion_missing_motive_${character.id}_1`,
            description: '完善角色背景和动机',
            implementationSteps: [
              '详细描述角色的成长经历',
              '明确说明角色的核心动机和目标',
              '添加推动角色行动的关键事件'
            ]
          }
        ]
      });
    }
    
    // 检查角色是否有足够的秘密作为潜在动机
    if (!character.secrets || character.secrets.length === 0) {
      conflicts.push({
        id: `missing_secrets_${character.id}`,
        type: ConflictType.MISSING_MOTIVE,
        severity: ConflictSeverity.MEDIUM,
        description: `角色 ${character.name} 没有设置任何秘密，缺乏行动的潜在动机`,
        relatedEntities: {
          characterIds: [character.id],
          clueIds: [],
          sceneIds: []
        },
        suggestions: [
          {
            id: `suggestion_missing_secrets_${character.id}_1`,
            description: '为角色添加秘密和隐藏动机',
            implementationSteps: [
              '添加1-3个重要秘密',
              '确保秘密与角色动机和故事主线相关'
            ]
          }
        ]
      });
    }
  });
  
  // 2. 秘密暴露条件合理性检查
  // 简化实现，实际应检查秘密的暴露条件是否合理且有触发机制
  characters.forEach(character => {
    if (character.secrets && character.secrets.length > 0) {
      // 检查是否有关联的线索能揭示这些秘密
      const hasRelevantClues = clues.some(clue => {
        // 简化判断：检查线索描述是否与秘密相关
        return character.secrets!.some((secret: any) => 
          clue.description.includes(secret.substring(0, 20))
        );
      });
      
      if (!hasRelevantClues) {
        conflicts.push({
          id: `secret_reveal_conflict_${character.id}`,
          type: ConflictType.SECRET_REVEAL_CONFLICT,
          severity: ConflictSeverity.MEDIUM,
          description: `角色 ${character.name} 的秘密缺乏相应的线索支持，难以在游戏中被合理揭示`,
          relatedEntities: {
            characterIds: [character.id],
            clueIds: [],
            sceneIds: []
          },
          suggestions: [
            {
              id: `suggestion_secret_reveal_${character.id}_1`,
              description: '添加揭示角色秘密的线索',
              implementationSteps: [
                '为每个重要秘密创建对应线索',
                '设置合理的线索发现条件'
              ]
            },
            {
              id: `suggestion_secret_reveal_${character.id}_2`,
              description: '通过其他角色揭示秘密',
              implementationSteps: [
                '设置其他角色知道该秘密',
                '创建角色之间的互动场景'
              ]
            }
          ]
        });
      }
    }
  });
  
  // 3. 任务可达性验证 - 注释掉使用organizerGuide的部分
  // if (organizerGuide && organizerGuide.hostingSteps) {
  //   const totalDuration = organizerGuide.hostingSteps.reduce(
  //     (sum: number, step: any) => sum + (step.duration || 0), 0
  //   );
  //   
  //   // 检查总时长合理性
  //   if (totalDuration < 180 || totalDuration > 480) {
  //     conflicts.push({
  //       id: 'task_reachability_duration',
  //       type: ConflictType.TASK_REACHABILITY_CONFLICT,
  //       severity: ConflictSeverity.MEDIUM,
  //       description: `游戏总时长 ${totalDuration} 分钟不合理，建议控制在3-8小时内`,
  //       relatedEntities: {
  //         characterIds: [],
  //         clueIds: [],
  //         sceneIds: []
  //       },
  //       suggestions: [
  //         {
  //           id: 'suggestion_duration_1',
  //           description: '调整游戏流程时长',
  //           implementationSteps: [
  //             totalDuration < 180 ? '增加关键环节的讨论时间' : '精简不必要的环节',
  //             '确保每个环节有足够的时间完成'
  //           ]
  //         }
  //       ]
  //     });
  //   }
  //   
  //   // 检查环节是否有明确的任务目标
  //   organizerGuide.hostingSteps.forEach((step: any, index: number) => {
  //     if (!step.playerTasks || step.playerTasks.length === 0) {
  //       conflicts.push({
  //         id: `task_reachability_missing_${index}`,
  //         type: ConflictType.TASK_REACHABILITY_CONFLICT,
  //         severity: ConflictSeverity.HIGH,
  //         description: `环节「${step.title}」缺乏明确的玩家任务，可能导致游戏流程不清晰`,
  //         relatedEntities: {
  //           characterIds: [],
  //           clueIds: [],
  //           sceneIds: []
  //         },
  //         suggestions: [
  //           {
  //             id: `suggestion_task_${index}_1`,
  //             description: '为环节添加明确的任务目标',
  //             implementationSteps: [
  //               '明确玩家在该环节需要完成的任务',
  //               '确保任务与剧情进展相关'
  //             ]
  //           }
  //         ]
  //       });
  //     }
  //   });
  // }
  
  return conflicts;
};

// 综合冲突检测
export const detectAllConflicts = ({
  characters,
  scenes,
  clues,
  timelineEvents,
  evidenceChains,
  ignoreList = []
}: {
  characters: Character[];
  scenes: Scene[];
  clues: Clue[];
  timelineEvents?: TimelineEvent[];
  evidenceChains?: EvidenceChain[];
  ignoreList?: ConflictIgnoreItem[];
}): ConflictDetectionResult => {
  let allConflicts: ConflictReportItem[] = [];
  
  // 检测时间线冲突
  if (timelineEvents && timelineEvents.length > 0) {
    allConflicts = allConflicts.concat(detectTimelineConflicts(timelineEvents, characters));
  }
  
  // 检测证据链冲突
  if (evidenceChains && evidenceChains.length > 0) {
    allConflicts = allConflicts.concat(detectEvidenceConflicts(
      clues,
      scenes,
      characters,
      evidenceChains,
      timelineEvents
    ));
  }
  
  // 检查剧本完整性
  allConflicts = allConflicts.concat(checkScriptCompleteness(
    characters,
    clues,
    evidenceChains,
    timelineEvents
  ));
  
  // 应用忽略列表
  const ignoredIds = new Set(ignoreList.map(item => item.conflictId));
  allConflicts = allConflicts.map(conflict => ({
    ...conflict,
    isIgnored: ignoredIds.has(conflict.id)
  }));
  
  // 按严重程度分组
  const conflictsBySeverity = {
    [ConflictSeverity.LOW]: allConflicts.filter(c => c.severity === ConflictSeverity.LOW && !c.isIgnored),
    [ConflictSeverity.MEDIUM]: allConflicts.filter(c => c.severity === ConflictSeverity.MEDIUM && !c.isIgnored),
    [ConflictSeverity.HIGH]: allConflicts.filter(c => c.severity === ConflictSeverity.HIGH && !c.isIgnored)
  };
  
  // 按类型分组
  const conflictsByType: { [key: string]: ConflictReportItem[] } = {};
  allConflicts.forEach(conflict => {
    if (!conflict.isIgnored) {
      if (!conflictsByType[conflict.type]) {
        conflictsByType[conflict.type] = [];
      }
      conflictsByType[conflict.type].push(conflict);
    }
  });
  
  return {
    totalConflicts: allConflicts.filter(c => !c.isIgnored).length,
    conflictsBySeverity,
    conflictsByType,
    allConflicts,
    ignoreList
  };
};

// 导出冲突报告
export const exportConflictReport = (result: ConflictDetectionResult, format: 'json' | 'txt'): string => {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  } else {
    let text = `剧本杀冲突检测报告\n`;
    text += `生成时间: ${new Date().toLocaleString()}\n`;
    text += `总冲突数: ${result.totalConflicts}\n\n`;
    
    text += `=== 严重冲突 (${result.conflictsBySeverity[ConflictSeverity.HIGH].length}) ===\n`;
    result.conflictsBySeverity[ConflictSeverity.HIGH].forEach(conflict => {
      text += `- [严重] ${conflict.description}\n`;
      text += `  相关实体: ${formatRelatedEntities(conflict.relatedEntities)}\n`;
      text += `  建议: ${conflict.suggestions[0]?.description || '无建议'}\n\n`;
    });
    
    text += `=== 中等冲突 (${result.conflictsBySeverity[ConflictSeverity.MEDIUM].length}) ===\n`;
    result.conflictsBySeverity[ConflictSeverity.MEDIUM].forEach(conflict => {
      text += `- [中等] ${conflict.description}\n`;
      text += `  相关实体: ${formatRelatedEntities(conflict.relatedEntities)}\n`;
      text += `  建议: ${conflict.suggestions[0]?.description || '无建议'}\n\n`;
    });
    
    text += `=== 轻微冲突 (${result.conflictsBySeverity[ConflictSeverity.LOW].length}) ===\n`;
    result.conflictsBySeverity[ConflictSeverity.LOW].forEach(conflict => {
      text += `- [轻微] ${conflict.description}\n`;
      text += `  相关实体: ${formatRelatedEntities(conflict.relatedEntities)}\n`;
      text += `  建议: ${conflict.suggestions[0]?.description || '无建议'}\n\n`;
    });
    
    if (result.ignoreList.length > 0) {
      text += `=== 已忽略的冲突 (${result.ignoreList.length}) ===\n`;
      result.ignoreList.forEach(item => {
        const conflict = result.allConflicts.find(c => c.id === item.conflictId);
        if (conflict) {
          text += `- ${conflict.description}\n`;
          text += `  忽略原因: ${item.reason}\n\n`;
        }
      });
    }
    
    return text;
  }
};

// 格式化相关实体信息
const formatRelatedEntities = (entities: {
  characterIds?: string[];
  clueIds?: string[];
  sceneIds?: string[];
  eventIds?: string[];
}): string => {
  const parts: string[] = [];
  if (entities.characterIds && entities.characterIds.length > 0) {
    parts.push(`角色: ${entities.characterIds.length}个`);
  }
  if (entities.clueIds && entities.clueIds.length > 0) {
    parts.push(`线索: ${entities.clueIds.length}个`);
  }
  if (entities.sceneIds && entities.sceneIds.length > 0) {
    parts.push(`场景: ${entities.sceneIds.length}个`);
  }
  if (entities.eventIds && entities.eventIds.length > 0) {
    parts.push(`事件: ${entities.eventIds.length}个`);
  }
  return parts.join(', ') || '无';
};

// 自动修复简单冲突
export const autoFixConflicts = (
  _conflicts: ConflictReportItem[],
  _characters: Character[],
  _scenes: Scene[],
  _clues: Clue[],
  _timelineEvents?: TimelineEvent[]
): {
  fixedConflicts: ConflictReportItem[];
  updatedData: {
    characters?: Character[];
    scenes?: Scene[];
    clues?: Clue[];
    timelineEvents?: TimelineEvent[];
  };
} => {
  const fixedConflicts: ConflictReportItem[] = [];
  const updatedData: any = {};
  
  // 这里可以实现一些简单的自动修复逻辑
  // 例如：修复明显的时间线冲突、自动关联缺失的关系等
  
  return {
    fixedConflicts,
    updatedData
  };
};