import React, { useState } from 'react';
import {
  AIProvider,
  AISession,
  AISkill,
  AIImageGeneration,
  AccentColor,
} from '../../types';
import { SegmentedControl, SegmentedItem } from '../ui';
import { ChatView } from '../ai/ChatView';
import { ImageStudioView } from '../ai/ImageStudioView';
import { SkillsView } from '../ai/SkillsView';
import { ProvidersView } from '../ai/ProvidersView';

interface AITabProps {
  providers: AIProvider[];
  onUpdateProviders: (providers: AIProvider[]) => void;
  sessions: AISession[];
  onUpdateSessions: React.Dispatch<React.SetStateAction<AISession[]>>;
  skills: AISkill[];
  onUpdateSkills: (skills: AISkill[]) => void;
  images: AIImageGeneration[];
  onUpdateImages: (images: AIImageGeneration[]) => void;
  accentColor: AccentColor;
}

type AISubTab = 'chat' | 'images' | 'skills' | 'providers';

/** Neutral sub-navigation items (no per-tab accent colors). */
const SUB_TABS: SegmentedItem<AISubTab>[] = [
  { id: 'chat', label: '对话' },
  { id: 'images', label: '生图' },
  { id: 'skills', label: '技能' },
  { id: 'providers', label: '配置' },
];

/**
 * AI 伴侣编排器：负责子页签切换与数据透传。
 * 各子视图保持挂载（hidden 切换），以保留输入草稿、流式传输与滚动状态。
 */
export const AITab: React.FC<AITabProps> = ({
  providers,
  onUpdateProviders,
  sessions,
  onUpdateSessions,
  skills,
  onUpdateSkills,
  images,
  onUpdateImages,
}) => {
  const [subTab, setSubTab] = useState<AISubTab>('chat');
  const [currentSessionId, setCurrentSessionId] = useState<string>(
    sessions[0]?.id || 'sess_default'
  );

  const goToProviders = React.useCallback(() => setSubTab('providers'), []);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden cat-bg-canvas transition-colors">
      {/* AI Sub-navigation Segmented Bar */}
      <div className="p-2 bg-surface/85 backdrop-blur-xl border-b border-line shrink-0">
        <SegmentedControl
          items={SUB_TABS}
          value={subTab}
          onChange={setSubTab}
          groupId="ai-subtabs"
          size="sm"
          className="max-w-md mx-auto"
        />
      </div>

      {/* Main View Area — sub views stay mounted to preserve their state */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className={subTab === 'chat' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
          <ChatView
            providers={providers}
            onUpdateProviders={onUpdateProviders}
            sessions={sessions}
            onUpdateSessions={onUpdateSessions}
            skills={skills}
            currentSessionId={currentSessionId}
            onSelectSession={setCurrentSessionId}
            onGoToProviders={goToProviders}
            onGoToSkills={() => setSubTab('skills')}
          />
        </div>

        <div className={subTab === 'images' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
          <ImageStudioView
            providers={providers}
            images={images}
            onUpdateImages={onUpdateImages}
            onGoToProviders={goToProviders}
          />
        </div>

        <div className={subTab === 'skills' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
          <SkillsView
            skills={skills}
            onUpdateSkills={onUpdateSkills}
            sessions={sessions}
            onUpdateSessions={onUpdateSessions}
            currentSessionId={currentSessionId}
            onGoToChat={() => setSubTab('chat')}
          />
        </div>

        <div className={subTab === 'providers' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
          <ProvidersView providers={providers} onUpdateProviders={onUpdateProviders} />
        </div>
      </div>
    </div>
  );
};
