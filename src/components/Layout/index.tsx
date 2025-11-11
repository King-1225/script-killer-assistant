import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Typography } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  TeamOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  LogoutOutlined,
  SettingOutlined,
  BarChartOutlined,
  EditOutlined,
  FolderOpenOutlined,
  LayoutOutlined,
  PlayCircleOutlined,
  StarOutlined
} from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';
import './styles.css';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

// 菜单项配置，按功能分组
const menuItems: MenuProps['items'] = [
  // 项目中心
  {
    key: 'projects-group',
    label: <span className="menu-group-title">项目中心</span>,
    type: 'group'
  },
  {
    key: 'projects',
    icon: <HomeOutlined className="menu-item-icon" />,
    label: <span className="menu-item-text">项目概览</span>,
  },
  {
    key: 'project-settings',
    icon: <SettingOutlined className="menu-item-icon" />,
    label: <span className="menu-item-text">项目设置</span>,
  },
  
  // 角色系统
  {    key: 'characters-group',    label: <span className="menu-group-title">角色系统</span>,    type: 'group'  },  {    key: 'characters',    icon: <TeamOutlined className="menu-item-icon" />,    label: <span className="menu-item-text">角色管理</span>,  },  {    key: 'relationship-graph',    icon: <BarChartOutlined className="menu-item-icon" />,    label: <span className="menu-item-text">关系图谱</span>,  },
  
  // 时间与线索
  {
    key: 'time-clues-group',
    label: <span className="menu-group-title">时间与线索</span>,
    type: 'group'
  },
  {
    key: 'timeline-editor',
    icon: <ClockCircleOutlined className="menu-item-icon" />,
    label: <span className="menu-item-text">时间线编辑</span>,
  },
  {
    key: 'clue-management',
    icon: <FolderOpenOutlined className="menu-item-icon" />,
    label: <span className="menu-item-text">线索管理</span>,
  },
  
  // 剧本内容
  {
    key: 'content-group',
    label: <span className="menu-group-title">剧本内容</span>,
    type: 'group'
  },
  {
    key: 'story-outline',
    icon: <LayoutOutlined className="menu-item-icon" />,
    label: <span className="menu-item-text">故事大纲</span>,
  },
  {
    key: 'scene-management',
    icon: <StarOutlined className="menu-item-icon" />,
    label: <span className="menu-item-text">场景管理</span>,
  },
  {
    key: 'organizer-guide',
    icon: <FileTextOutlined className="menu-item-icon" />,
    label: <span className="menu-item-text">组织者手册</span>,
  },
  
  // 工具与检测
  {
    key: 'tools-group',
    label: <span className="menu-group-title">工具与检测</span>,
    type: 'group'
  },
  {
    key: 'ai-assistant',
    icon: <EditOutlined className="menu-item-icon" />,
    label: <span className="menu-item-text">AI创作助手</span>,
  },
  {
    key: 'conflict-detection',
    icon: <AlertOutlined className="menu-item-icon" />,
    label: <span className="menu-item-text">冲突检测</span>,
  },
  {
    key: 'test-simulation',
    icon: <PlayCircleOutlined className="menu-item-icon" />,
    label: <span className="menu-item-text">测试模拟</span>,
  },
];

// 用户菜单配置
const userMenuItems: MenuProps['items'] = [
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: '设置'
  },
  {
    key: 'logout',
    icon: <LogoutOutlined />,
    label: '退出登录'
  }
];

interface LayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const location = useLocation();

  // 确定当前选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    return path.substring(1) || 'projects';
  };

  // 处理菜单点击事件
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key && menuItems.some(item => item && item.key === key && typeof item.key === 'string')) {
      window.location.href = `/${key}`;
    }
  };

  // 处理用户菜单点击事件
  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    setUserMenuVisible(false);
    // 这里可以添加用户菜单的点击处理逻辑
    console.log('User menu clicked:', key);
  };

  // 处理折叠按钮点击
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  // 处理用户区域点击
  const toggleUserMenu = () => {
    setUserMenuVisible(!userMenuVisible);
  };

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClickOutside = () => {
      setUserMenuVisible(false);
    };

    if (userMenuVisible) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [userMenuVisible]);

  return (
    <Layout className="app-layout">
      <Header className="header">
        <div className="header-content">
          <div className="header-left">
            <Button
              type="text"
              className="menu-toggle"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapse}
            />
            <Title level={4} className="header-title">剧本杀写作助手</Title>
          </div>
          <div className="user-info" onClick={toggleUserMenu}>
            <Avatar className="user-avatar">U</Avatar>
            <span className="user-name">用户名</span>
            {userMenuVisible && (
              <div className="user-dropdown-menu" style={{
                position: 'absolute',
                top: '100%',
                right: '24px',
                marginTop: '8px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                zIndex: 1001,
                minWidth: '160px'
              }}>
                <Menu
                  items={userMenuItems}
                  onClick={handleUserMenuClick}
                  style={{ borderRadius: '8px', border: 'none', boxShadow: 'none' }}
                />
              </div>
            )}
          </div>
        </div>
      </Header>

      <Layout>
        <Sider
          width={256}
          theme="light"
          collapsible
          collapsed={collapsed}
          collapsedWidth={80}
          trigger={null}
          className="sidebar-container"
        >
          <div className="sidebar-content">
            <Menu
              mode="inline"
              selectedKeys={[getSelectedKey()]}
              items={menuItems}
              onClick={handleMenuClick}
              className="sidebar-menu"
              style={{ height: '100%', borderRight: 0 }}
            />
          </div>
        </Sider>
        <Content className="content-wrapper">
          <div className="page-transition">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;