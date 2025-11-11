import React from 'react';
import { Card, Typography } from 'antd';
import { useParams } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const CharacterScriptPage: React.FC = () => {
  const { characterId } = useParams<{ characterId: string }>();

  return (
    <Card title={`角色剧本编辑 - ${characterId || '未知角色'}`} style={{ marginBottom: 24 }}>
      <Title level={4}>角色剧本编辑</Title>
      <Paragraph>
        在这里编辑角色的剧本内容，包括角色背景、对白、动作等。
      </Paragraph>
      <Paragraph>
        角色ID: {characterId || '未指定'}
      </Paragraph>
      <Paragraph>
        功能正在开发中...
      </Paragraph>
    </Card>
  );
};

export default CharacterScriptPage;