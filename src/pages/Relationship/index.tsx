import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const RelationshipPage: React.FC = () => {
  return (
    <Card title="关系图谱" style={{ marginBottom: 24 }}>
      <Title level={4}>关系图谱</Title>
      <Paragraph>
        在这里可视化展示角色之间的关系网络。
      </Paragraph>
      <Paragraph>
        功能正在开发中...
      </Paragraph>
    </Card>
  );
};

export default RelationshipPage;