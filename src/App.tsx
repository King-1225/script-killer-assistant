import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css'; // 使用index.css替代App.css，确保全局样式正确

// 导入布局组件
import AppLayout from './components/Layout';

// 导入页面组件
import ProjectOverview from './pages/ProjectOverview';
import ProjectSettings from './pages/ProjectSettings';
import CharacterManagement from './pages/CharacterManagement';
import CharacterScriptEditor from './pages/CharacterScriptEditor';
import TimelineEditor from './pages/TimelineEditor';

import TimelinePage from './pages/Timeline';
import RelationshipPage from './pages/Relationship';
import RelationshipGraph from './pages/RelationshipGraph';
import CluesPage from './pages/Clues';
import ClueManagement from './pages/ClueManagement';
import OrganizerGuidePage from './pages/OrganizerGuide';
import StoryOutline from './pages/StoryOutline';
import SceneManagement from './pages/SceneManagement';
import ConflictDetectionPage from './pages/ConflictDetection';
import AIAssistantPage from './pages/AIAssistant';
import TestSimulation from './pages/TestSimulation';
import { initializeServices } from './services';

function App() {
  // 在应用启动时初始化服务
  useEffect(() => {
    initializeServices();
    // 设置全局样式
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  }, []);

  return (
    <Router>
      <Routes>
        {/* 根路径重定向到项目概览 */}
        <Route path="/" element={<Navigate to="/projects" replace />} />
        
        {/* 使用嵌套路由和共享布局 */}
        <Route path="/projects" element={<AppLayout><ProjectOverview /></AppLayout>} />
        <Route path="/characters" element={<AppLayout><CharacterManagement /></AppLayout>} />
        <Route path="/character-script/:characterId" element={<AppLayout><CharacterScriptEditor /></AppLayout>} />
        <Route path="/timeline-editor" element={<AppLayout><TimelineEditor /></AppLayout>} />
        <Route path="/timeline" element={<AppLayout><TimelinePage /></AppLayout>} />
        <Route path="/relationship" element={<AppLayout><RelationshipPage /></AppLayout>} />
        <Route path="/relationship-graph" element={<AppLayout><RelationshipGraph /></AppLayout>} />
        <Route path="/clues" element={<AppLayout><CluesPage /></AppLayout>} />
        <Route path="/clue-management" element={<AppLayout><ClueManagement /></AppLayout>} />
        <Route path="/organizer-guide" element={<AppLayout><OrganizerGuidePage /></AppLayout>} />
        <Route path="/story-outline" element={<AppLayout><StoryOutline /></AppLayout>} />
        <Route path="/scene-management" element={<AppLayout><SceneManagement /></AppLayout>} />
        <Route path="/project-settings" element={<AppLayout><ProjectSettings /></AppLayout>} />
        <Route path="/conflict-detection" element={<AppLayout><ConflictDetectionPage /></AppLayout>} />
        <Route path="/ai-assistant" element={<AppLayout><AIAssistantPage /></AppLayout>} />
        <Route path="/test-simulation" element={<AppLayout><TestSimulation /></AppLayout>} />
      </Routes>
    </Router>
  );
}

export default App;
