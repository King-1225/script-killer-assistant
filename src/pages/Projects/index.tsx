import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const ProjectsPage: React.FC = () => {
  return (
    <Card title="项目概览" style={{ marginBottom: 24 }}>
      <Title level={4}>欢迎使用剧本杀写作助手</Title>
      <Paragraph>
        这里是你的项目管理中心。你可以在这里查看和管理所有的剧本杀项目。
      </Paragraph>
      <Paragraph>
        功能正在开发中...
      </Paragraph>
    </Card>
  );
};

export default ProjectsPage;