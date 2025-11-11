import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const TimelinePage: React.FC = () => {
  return (
    <Card title="时间线编辑" style={{ marginBottom: 24 }}>
      <Title level={4}>时间线编辑</Title>
      <Paragraph>
        在这里编辑故事的时间线，安排事件的发生顺序和关联。
      </Paragraph>
      <Paragraph>
        功能正在开发中...
      </Paragraph>
    </Card>
  );
};

export default TimelinePage;