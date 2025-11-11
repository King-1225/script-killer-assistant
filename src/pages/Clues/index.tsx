import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const CluesPage: React.FC = () => {
  return (
    <Card title="线索管理" style={{ marginBottom: 24 }}>
      <Title level={4}>线索管理</Title>
      <Paragraph>
        在这里管理故事中的所有线索，设置线索的重要程度和发现条件。
      </Paragraph>
      <Paragraph>
        功能正在开发中...
      </Paragraph>
    </Card>
  );
};

export default CluesPage;