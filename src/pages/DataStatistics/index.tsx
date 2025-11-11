import React from 'react';
import { Card, Typography } from 'antd';
import AppLayout from '../../components/Layout';

const { Title, Text } = Typography;

const DataStatisticsPage: React.FC = () => {
  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Title level={4}>数据分析统计</Title>
        <Card>
          <Text type="secondary">数据分析功能开发中...</Text>
        </Card>
      </div>
    </AppLayout>
  );
};

export default DataStatisticsPage;