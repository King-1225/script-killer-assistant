import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const CharactersPage: React.FC = () => {
  return (
    <Card title="角色管理" style={{ marginBottom: 24 }}>
      <Title level={4}>角色管理</Title>
      <Paragraph>
        在这里管理你的剧本杀角色，包括创建、编辑和删除角色信息。
      </Paragraph>
      <Paragraph>
        功能正在开发中...
      </Paragraph>
    </Card>
  );
};

export default CharactersPage;