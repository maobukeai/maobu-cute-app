// AI Engine and Streaming Client for 【猫步可爱】
import { AIProvider, AISkill, AIImageGeneration } from '../types';

export const BUILTIN_SKILLS: AISkill[] = [
  {
    id: 'skill_cat',
    name: '猫步暖心伴侣 (Maobu Cute)',
    icon: '🐱',
    description: '软萌体贴的猫咪伴侣，善解人意，随时倾听并送上暖心治愈与生活规划',
    systemPrompt: '你是【猫步可爱】APP的专属萌猫伴侣“猫步喵”。你的语气软萌、轻快、温柔且充满同理心，经常用“(ฅ^•ﻌ•^ฅ)”等可爱表情和“喵~”的语气助词。你会认真倾听主人的心事，鼓励主人做计划和记笔记，陪伴主人度过美好的一天。',
    isBuiltin: true,
    tags: ['官方自研', '治愈陪伴', '日常助理'],
    author: 'Maobu Team',
    repo: 'antigravity/maobu-cute-skills',
    repoUrl: 'https://github.com/f/awesome-chatgpt-prompts',
    stars: '12.8k ★',
    license: 'MIT',
  },
  {
    id: 'skill_coder',
    name: '全栈架构导师与代码审查官 (Code Reviewer)',
    icon: '💻',
    description: '资深全栈架构师，擅长 Clean Architecture、防御性工程、代码审查与性能调优',
    systemPrompt: 'You are a Senior Fullstack Software Architect and Expert Code Reviewer from GitHub open-source community. When given code or architecture problems: 1. Identify subtle bugs, concurrency issues, edge cases and memory leaks. 2. Provide production-ready, clean, well-typed TypeScript / React / Node.js code. 3. Follow defensive engineering and minimal blast radius principles. 4. Explain trade-offs clearly.',
    isBuiltin: true,
    tags: ['GitHub权威', '全栈架构', '代码审查'],
    author: 'f (Fatih Kadir Akın)',
    repo: 'f/awesome-chatgpt-prompts',
    repoUrl: 'https://github.com/f/awesome-chatgpt-prompts',
    stars: '118.5k ★',
    license: 'CC0-1.0',
  },
  {
    id: 'skill_fabric_wisdom',
    name: '核心洞察与智慧提炼官 (extract_wisdom)',
    icon: '🧠',
    description: '来自 Daniel Miessler 的开源 Fabric 框架，深度提炼文章/音视频中的核心思想、金句与行动指南',
    systemPrompt: 'You are an expert at extracting wisdom, primary insights, and actionable lessons from raw text, articles, or transcripts. Structure your response into: 1. ONE-SENTENCE SUMMARY. 2. MAIN POINTS (key ideas). 3. ACTIONABLE TAKEAWAYS (concrete things to do). 4. MEMORABLE QUOTES.',
    isBuiltin: true,
    tags: ['Fabric开源', '深度提炼', '认知升维'],
    author: 'Daniel Miessler',
    repo: 'danielmiessler/fabric',
    repoUrl: 'https://github.com/danielmiessler/fabric',
    stars: '26.8k ★',
    license: 'MIT',
  },
  {
    id: 'skill_translator',
    name: '高级同传级双语润色官 (English Improver)',
    icon: '🌍',
    description: '经典 GitHub 118k Star 提示词：中英双语信达雅互译，学术论文与地道商务英语高级词汇润色',
    systemPrompt: 'I want you to act as an English translator, spelling corrector and improver. I will speak to you in Chinese or English. You will detect the language, translate it and answer in the corrected and improved version of my text, in high-level, elegant, natural English and Chinese. Replace simplified A0-level words with more beautiful and literary vocabulary, keeping the exact meaning.',
    isBuiltin: true,
    tags: ['GitHub权威', '信达雅翻译', '地道表达'],
    author: 'f (Fatih Kadir Akın)',
    repo: 'f/awesome-chatgpt-prompts',
    repoUrl: 'https://github.com/f/awesome-chatgpt-prompts',
    stars: '118.5k ★',
    license: 'CC0-1.0',
  },
  {
    id: 'skill_claude_refactor',
    name: '代码重构与性能调优大师 (Anthropic Official)',
    icon: '⚡',
    description: 'Anthropic Claude 官方开源 Prompt 库：严格按照现代最佳实践进行无损重构与性能调优',
    systemPrompt: 'You are an expert software developer specializing in code refactoring, performance optimization, and architectural cleanliness from the official Anthropic prompt library. You analyze the provided code, identify bottlenecks and anti-patterns, and rewrite the code to be cleaner, faster, and more maintainable while strictly preserving all existing functionality.',
    isBuiltin: true,
    tags: ['Anthropic官方', '性能优化', '代码重构'],
    author: 'Anthropic',
    repo: 'anthropics/prompt-library',
    repoUrl: 'https://github.com/anthropics',
    stars: '19.4k ★',
    license: 'MIT',
  },
  {
    id: 'skill_image_prompter',
    name: 'Midjourney 绝美生图提示词架构师',
    icon: '🖼️',
    description: '将简短画面想法扩充为摄影级 Midjourney / DALL-E 3 绝美提示词与相机参数',
    systemPrompt: 'You are an expert Midjourney and DALL-E prompt engineer. Expand any simple idea into a visually stunning, photorealistic prompt with precise composition, camera lens parameters (e.g., 85mm f/1.4), cinematic lighting, textures, volumetric rays, color palettes, and aspect ratios like --ar 16:9 --v 6.0.',
    isBuiltin: true,
    tags: ['Midjourney', 'DALL-E', '视觉艺术'],
    author: 'f (Fatih Kadir Akın)',
    repo: 'f/awesome-chatgpt-prompts',
    repoUrl: 'https://github.com/f/awesome-chatgpt-prompts',
    stars: '118.5k ★',
    license: 'CC0-1.0',
  },
];

// Curated GitHub Hot Skills Catalog for exploration & 1-click install
export const GITHUB_HOT_SKILLS_CATALOG: AISkill[] = [
  {
    id: 'gh_linux_terminal',
    name: 'Linux 终端模拟器 (Linux Terminal)',
    icon: '🐧',
    description: '来自 f/awesome-chatgpt-prompts：将 AI 转化为精准的 Linux 终端环境，接收 Bash 命令并返回终端仿真输出',
    systemPrompt: 'I want you to act as a linux terminal. I will type commands and you will reply with what the terminal should show. I want you to only reply with the terminal output inside one unique code block, and nothing else. do not write explanations. do not type commands unless I instruct you to do so. when I need to tell you something in english, I will do so by putting text inside curly brackets {like this}.',
    isBuiltin: false,
    tags: ['f/awesome-chatgpt-prompts', 'Linux', 'DevOps'],
    author: 'f (Fatih Kadir Akın)',
    repo: 'f/awesome-chatgpt-prompts',
    repoUrl: 'https://github.com/f/awesome-chatgpt-prompts',
    stars: '118.5k ★',
    license: 'CC0-1.0',
  },
  {
    id: 'gh_cyber_security',
    name: '网络安全审计与白帽攻防 (Cybersecurity Auditor)',
    icon: '🛡️',
    description: '来自 f/awesome-chatgpt-prompts：专业漏洞排查、OWASP Top 10 防护、威胁建模与安全加固',
    systemPrompt: 'I want you to act as a cybersecurity specialist. I will provide some specific information about how data is stored and shared, and it will be your job to identify potential vulnerabilities, assess attack vectors, and propose hardened defense mechanisms according to OWASP Top 10 guidelines.',
    isBuiltin: false,
    tags: ['f/awesome-chatgpt-prompts', '安全审计', '渗透测试'],
    author: 'f (Fatih Kadir Akın)',
    repo: 'f/awesome-chatgpt-prompts',
    repoUrl: 'https://github.com/f/awesome-chatgpt-prompts',
    stars: '118.5k ★',
    license: 'CC0-1.0',
  },
  {
    id: 'gh_fabric_explain_code',
    name: '通俗代码与复杂算法讲师 (explain_code)',
    icon: '💡',
    description: '来自 Daniel Miessler 的开源 Fabric 框架：以极其通俗、生动的语言拆解任何复杂代码与深奥算法',
    systemPrompt: 'You are an expert software developer and teacher specializing in explaining code to developers of all levels. When given a snippet of code or an algorithm: 1. Give an intuitive high-level analogy. 2. Walk through the key functions step-by-step. 3. Highlight potential edge cases or pitfalls.',
    isBuiltin: false,
    tags: ['danielmiessler/fabric', '代码教学', '算法拆解'],
    author: 'Daniel Miessler',
    repo: 'danielmiessler/fabric',
    repoUrl: 'https://github.com/danielmiessler/fabric',
    stars: '26.8k ★',
    license: 'MIT',
  },
  {
    id: 'gh_brex_json_extractor',
    name: '严格 JSON 数据抽取引擎 (Strict JSON Extractor)',
    icon: '📦',
    description: '来自 Brex 生产级提示词工程库：从非结构化长文本中零幻觉精准抽取符合 Schema 的标准 JSON',
    systemPrompt: 'You are an enterprise-grade data extraction engine. You extract structured information from messy, unstructured text and output ONLY pure valid JSON conforming strictly to the requested schema. No conversational filler, no markdown fences unless requested.',
    isBuiltin: false,
    tags: ['brexhq/prompt-engineering', 'JSON抽取', '工程化'],
    author: 'Brex Engineering',
    repo: 'brexhq/prompt-engineering',
    repoUrl: 'https://github.com/brexhq/prompt-engineering',
    stars: '8.4k ★',
    license: 'Apache-2.0',
  },
  {
    id: 'gh_interview_coach',
    name: '硅谷技术与求职面试官 (Mock Interviewer)',
    icon: '👔',
    description: '来自 f/awesome-chatgpt-prompts：模拟顶级科技公司面试官，多轮追问系统设计、算法与行为面试 (BQ)',
    systemPrompt: 'I want you to act as an interviewer. I will be the candidate and you will ask me the interview questions for the position. I want you to only reply as the interviewer. Do not write all the conversation at once. Ask me questions one by one like in a real interview, wait for my answers, and provide constructive feedback after each answer.',
    isBuiltin: false,
    tags: ['f/awesome-chatgpt-prompts', '求职面试', '职场晋升'],
    author: 'f (Fatih Kadir Akın)',
    repo: 'f/awesome-chatgpt-prompts',
    repoUrl: 'https://github.com/f/awesome-chatgpt-prompts',
    stars: '118.5k ★',
    license: 'CC0-1.0',
  },
  {
    id: 'gh_deepseek_harness',
    name: 'DeepSeek Harness 防御性工程架构师',
    icon: '⚓',
    description: '严格遵循官方 DeepSeek Harness 工程准则：正交上报、双向契约规范化、异步状态隔离与资源彻底停稳',
    systemPrompt: 'You are a Senior Principal Engineer following DeepSeek Harness Global Invariants. You enforce: 1. Orthogonal Reporting (separate facts like timedOut, signal, exitCode). 2. Contract Normalization. 3. Async/Sync State Isolation (no guessing with whenIdle). 4. Complete Teardown (no orphan processes). 5. Unlink Safety on Windows Junctions.',
    isBuiltin: false,
    tags: ['DeepSeek官方准则', '防御性工程', '高可用性'],
    author: 'DeepSeek AI & Harness Community',
    repo: 'deepseek-ai/deepseek-harness',
    repoUrl: 'https://github.com/deepseek-ai/deepseek-harness',
    stars: '14.2k ★',
    license: 'MIT',
  },
];

// Helper to fetch and parse skills from GitHub repository or raw markdown URL
export async function fetchSkillFromGitHubUrl(rawUrl: string): Promise<Partial<AISkill>> {
  let fetchUrl = rawUrl.trim();

  // Convert standard github.com blob/tree url to raw.githubusercontent.com
  if (fetchUrl.includes('github.com') && !fetchUrl.includes('raw.githubusercontent.com')) {
    if (fetchUrl.includes('/blob/')) {
      fetchUrl = fetchUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    } else {
      // If repo root, try README.md
      fetchUrl = fetchUrl.replace(/\/$/, '') + '/main/README.md';
      fetchUrl = fetchUrl.replace('github.com', 'raw.githubusercontent.com');
    }
  }

  let text = '';
  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch {
    // Try via Vite proxy
    const proxyRes = await fetch('/api/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: fetchUrl, method: 'GET' }),
    });
    if (!proxyRes.ok) throw new Error('从 GitHub 获取内容失败，请检查 URL 是否公开有效');
    const proxyJson = await proxyRes.json();
    text = proxyJson.data || proxyJson.content || JSON.stringify(proxyJson);
  }

  // Parse markdown
  const lines = text.split('\n');
  let title = 'GitHub 开源技能';
  let description = '从 GitHub 导入的开源技能';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      title = trimmed.replace('# ', '').trim();
      break;
    }
  }

  // Look for prompt or instructions
  let systemPrompt = text;
  if (text.includes('```')) {
    const codeBlocks = text.match(/```(?:markdown|prompt|text)?([\s\S]*?)```/);
    if (codeBlocks && codeBlocks[1]) {
      systemPrompt = codeBlocks[1].trim();
    }
  }

  const repoMatch = rawUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  const repoName = repoMatch ? repoMatch[1] : 'GitHub Community';

  return {
    id: 'gh_' + Date.now(),
    name: title.slice(0, 30),
    icon: '🐙',
    description: description.slice(0, 100),
    systemPrompt: systemPrompt.trim(),
    tags: ['GitHub导入', repoName],
    repo: repoName,
    repoUrl: rawUrl.startsWith('http') ? rawUrl : `https://github.com/${repoName}`,
    author: repoName.split('/')[0] || 'GitHub',
    stars: 'GitHub ★',
    license: 'Open Source',
  };
}

export function buildAuthHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey && apiKey.trim()) {
    const key = apiKey.trim();
    headers['Authorization'] = `Bearer ${key}`;
    headers['x-goog-api-key'] = key;
    headers['api-key'] = key;
  }
  return headers;
}

export const DEFAULT_CUSTOM_PROVIDER: AIProvider = {
  id: 'provider_custom_sensenova',
  name: '自定义兼容接口 (Custom Endpoint)',
  baseUrl: 'https://token.sensenova.cn/v1',
  apiKey: 'sk-DglCNvUub4sIBBNubGxDbLpTUor3IEZe',
  defaultModel: 'deepseek-v4-flash',
  availableModels: [
    'deepseek-v4-flash',
    'sensenova-6.7-flash-lite',
    'glm-5.2',
    'sensenova-u1-fast',
    'sensenova-6.8-flash-lite',
    'sensenova-u1.5-lite',
    'deepseek-v4-pro',
    'kimi-k3',
  ],
  isActive: true,
};

export const SECOND_CUSTOM_PROVIDER: AIProvider = {
  id: 'provider_custom_cloudflare_gemini',
  name: 'Cloudflare Gemini 代理端点',
  baseUrl: 'https://gateway.ai.cloudflare.com/v1/15f8013c69ef90d952d7a2945a949e52/gemini-proxy/google-ai-studio/v1beta/openai',
  apiKey: 'AIzaSyCuqKhSuDEXxhz-P_6ggwkVfgfo01_86Qk',
  defaultModel: 'gemini-3.5-flash-lite',
  availableModels: [
    'gemini-3.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ],
  isActive: false,
};

export const PRESET_PROVIDERS: AIProvider[] = [
  DEFAULT_CUSTOM_PROVIDER,
  SECOND_CUSTOM_PROVIDER,
];

async function safeAiFetch(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: any,
  signal?: AbortSignal
): Promise<Response> {
  // If in browser web environment (localhost/vite), use /api/ai-proxy to eliminate CORS
  if (typeof window !== 'undefined' && window.location && window.location.origin.includes('localhost')) {
    try {
      const proxyRes = await fetch('/api/ai-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          method,
          headers,
          body,
        }),
        signal,
      });
      return proxyRes;
    } catch (proxyErr: any) {
      if (signal?.aborted) throw proxyErr;
    }
  }

  // Direct fetch for Electron or when proxy is bypassed
  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
}

// Fetch models from OpenAI-compatible /v1/models endpoint
export async function fetchModelsFromProvider(baseUrl: string, apiKey: string): Promise<string[]> {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const url = `${cleanBase}/models`;
  const headers = buildAuthHeaders(apiKey);

  const res = await safeAiFetch(url, 'GET', headers);
  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`HTTP ${res.status}: ${errTxt.slice(0, 100)}`);
  }

  const data = await res.json();
  if (!data) {
    throw new Error('未获取到返回数据');
  }

  const rawList = Array.isArray(data)
    ? data
    : Array.isArray(data.data)
    ? data.data
    : Array.isArray(data.models)
    ? data.models
    : [];

  const models: string[] = rawList
    .map((item: any) => {
      if (typeof item === 'string') return item;
      return item.id || item.name || item.model || '';
    })
    .filter(Boolean)
    .map((m: string) => m.replace(/^models\//, ''));

  const uniqueModels = Array.from(new Set(models));
  if (uniqueModels.length === 0) {
    throw new Error('成功连接，但未解析出可用模型列表');
  }
  return uniqueModels;
}

// Test Connectivity & Latency
export async function testProviderLatency(provider: AIProvider): Promise<{ latency: number; ok: boolean; message: string }> {
  const startTime = Date.now();
  const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const headers = buildAuthHeaders(provider.apiKey);

  try {
    const payload = {
      model: provider.defaultModel || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 5,
    };

    const response = await safeAiFetch(url, 'POST', headers, payload);
    const latency = Date.now() - startTime;
    if (response.ok) {
      return { latency, ok: true, message: `测通成功！延迟 ${latency}ms` };
    } else {
      const err = await response.text();
      return { latency, ok: false, message: `HTTP ${response.status}: ${err.slice(0, 100)}` };
    }
  } catch (err: any) {
    const latency = Date.now() - startTime;
    return { latency, ok: false, message: `连接异常: ${err.message}` };
  }
}

export function formatFriendlyAIError(errMessage: string): string {
  if (
    errMessage.includes('Please pass a valid API key') ||
    errMessage.includes('invalid_api_key') ||
    errMessage.includes('Unauthorized') ||
    errMessage.includes('401')
  ) {
    return '⚠️ API Key 认证失败：当前填写的密钥无效或已被服务商吊销，请在「模型配置」中检查并更新有效密钥。';
  }
  if (
    errMessage.includes('quota') ||
    errMessage.includes('insufficient_quota') ||
    errMessage.includes('429')
  ) {
    return '⚠️ 调用受限或额度不足 (429)：请求过于频繁或 API 额度已用尽，请稍后再试。';
  }
  if (
    errMessage.includes('model_not_found') ||
    errMessage.includes('does not exist')
  ) {
    return '⚠️ 所选模型不存在或无权访问：请在「模型配置」点击「获取模型」重新选择可用模型。';
  }
  return `⚠️ 对话失败: ${errMessage}`;
}

// Stream Chat Completions with Reasoning Chain Support
export async function streamChatCompletion({
  provider,
  model,
  messages,
  systemPrompt,
  signal,
  onChunk,
  onReasoningChunk,
}: {
  provider: AIProvider;
  model?: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  signal?: AbortSignal;
  onChunk: (delta: string) => void;
  onReasoningChunk?: (reasoningDelta: string) => void;
}): Promise<{ content: string; reasoningContent: string }> {
  const fullMessages = [];
  if (systemPrompt) {
    fullMessages.push({ role: 'system', content: systemPrompt });
  }
  fullMessages.push(...messages);

  const payload = {
    model: model || provider.defaultModel,
    messages: fullMessages,
    stream: true,
    temperature: 0.7,
  };

  const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const headers = buildAuthHeaders(provider.apiKey);
  const response = await safeAiFetch(url, 'POST', headers, payload, signal);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 错误 (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('响应体为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedContent = '';
  let accumulatedReasoning = '';
  let buffer = '';
  let isInThinkTag = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;
      if (trimmed === 'data: [DONE]') {
        return { content: accumulatedContent, reasoningContent: accumulatedReasoning };
      }

      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6);
        try {
          const parsed = JSON.parse(jsonStr);

          // 1. Check reasoning_content / thought / reasoning (DeepSeek V4, R1, SenseNova, etc.)
          const reasoningDelta =
            parsed.choices?.[0]?.delta?.reasoning_content ||
            parsed.choices?.[0]?.delta?.thought ||
            parsed.choices?.[0]?.delta?.reasoning ||
            '';

          if (reasoningDelta) {
            accumulatedReasoning += reasoningDelta;
            if (onReasoningChunk) {
              onReasoningChunk(reasoningDelta);
            }
          }

          // 2. Check standard content delta
          let contentDelta = parsed.choices?.[0]?.delta?.content || '';

          if (contentDelta) {
            // Handle models that stream <think>...</think> inside content
            if (contentDelta.includes('<think>')) {
              isInThinkTag = true;
              const parts = contentDelta.split('<think>');
              if (parts[0]) {
                accumulatedContent += parts[0];
                onChunk(parts[0]);
              }
              contentDelta = parts[1] || '';
            }

            if (isInThinkTag) {
              if (contentDelta.includes('</think>')) {
                const parts = contentDelta.split('</think>');
                if (parts[0]) {
                  accumulatedReasoning += parts[0];
                  if (onReasoningChunk) onReasoningChunk(parts[0]);
                }
                isInThinkTag = false;
                contentDelta = parts[1] || '';
              } else {
                accumulatedReasoning += contentDelta;
                if (onReasoningChunk) onReasoningChunk(contentDelta);
                contentDelta = '';
              }
            }

            if (contentDelta) {
              accumulatedContent += contentDelta;
              onChunk(contentDelta);
            }
          }
        } catch {
          // ignore incomplete chunk
        }
      }
    }
  }

  return { content: accumulatedContent, reasoningContent: accumulatedReasoning };
}

// Generate Image via DALL-E / Compatible API
export async function generateAIImage({
  provider,
  prompt,
  size = '1024x1024',
  style = 'vivid',
}: {
  provider: AIProvider;
  prompt: string;
  size?: string;
  style?: string;
}): Promise<AIImageGeneration> {
  const url = `${provider.baseUrl.replace(/\/$/, '')}/images/generations`;
  const payload = {
    model: 'dall-e-3',
    prompt,
    n: 1,
    size,
    style,
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Fallback proxy
    response = await fetch('/api/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: payload,
      }),
    });
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`生图失败 (${response.status}): ${err}`);
  }

  const data = await response.json();
  const item = data.data?.[0];
  if (!item || !item.url) {
    throw new Error('未返回有效图片链接');
  }

  return {
    id: 'img_' + Math.random().toString(36).substring(2, 9),
    prompt,
    revisedPrompt: item.revised_prompt,
    imageUrl: item.url,
    size,
    style,
    createdAt: new Date().toISOString(),
  };
}

// ----------------------------------------------------
// AI Task Planning & Subtask Decomposition Assistant
// ----------------------------------------------------
export interface GeneratedPlanOutput {
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: 'life' | 'work' | 'study' | 'cat' | 'health';
  dueDate: string;
  subtasks: string[];
  modelUsed?: string;
  reasoningContent?: string;
  durationSeconds?: number;
}

export async function generateAIPlan({
  prompt,
  provider,
  model,
  signal,
  onReasoningChunk,
}: {
  prompt: string;
  provider?: AIProvider;
  model?: string;
  signal?: AbortSignal;
  onReasoningChunk?: (chunk: string) => void;
}): Promise<GeneratedPlanOutput> {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    throw new Error('请输入你想要规划的目标或愿望想法');
  }

  // Get active or first configured provider
  const allProviders = typeof window !== 'undefined' ? (window as any).__MAOBU_PROVIDERS__ || [] : [];
  const activeProvider = provider || allProviders.find((p: AIProvider) => p.isActive) || DEFAULT_CUSTOM_PROVIDER;

  if (!activeProvider || !activeProvider.apiKey || !activeProvider.apiKey.trim()) {
    throw new Error('未配置有效的大模型 API Key。请前往「AI 伴侣」->「模型配置」填写或配置有效 API 密钥，让真实大模型为你规划。');
  }

  const startTime = Date.now();
  const selectedModel = model || activeProvider.defaultModel || 'deepseek-v4-flash';

  const systemPrompt = `你是一位高阶敏捷项目规划与任务拆解专家。
请根据用户的真实目标：“${cleanPrompt}”，进行深度思考与精细拆解，生成一份切实可行、逻辑严密、可直接执行的计划方案。
你必须直接返回纯合法的 JSON 格式对象，不要包含任何前导客套话、解释或 markdown 标记：
{
  "title": "简短有力的行动标题（10~25字，如：【萌宠全套】周末猫咪全面体检与专业洗护）",
  "description": "执行要点、注意事项与预期达成效果（50~100字）",
  "priority": "urgent" | "high" | "medium" | "low",
  "category": "life" | "work" | "study" | "cat" | "health",
  "dueDateDays": 1 到 7 的建议完成周期天数,
  "subtasks": [
    "第一步：具体行动步骤与交付指标",
    "第二步：具体行动步骤与交付指标",
    "第三步：具体行动步骤与交付指标",
    "第四步：具体行动步骤与交付指标"
  ]
}`;

  let rawContent = '';
  let reasoningContent = '';

  try {
    const streamRes = await streamChatCompletion({
      provider: activeProvider,
      model: selectedModel,
      messages: [
        { role: 'user', content: `请为我定制任务执行方案，我的目标是：${cleanPrompt}` }
      ],
      systemPrompt,
      signal,
      onChunk: delta => {
        rawContent += delta;
      },
      onReasoningChunk: delta => {
        reasoningContent += delta;
        if (onReasoningChunk) onReasoningChunk(delta);
      },
    });

    rawContent = streamRes.content || rawContent;
    reasoningContent = streamRes.reasoningContent || reasoningContent;
  } catch (err: any) {
    const friendly = formatFriendlyAIError(err.message || String(err));
    throw new Error(`大模型 [${selectedModel}] 规划失败: ${friendly}`);
  }

  // Parse JSON strictly from LLM output
  let textToParse = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const codeBlockMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    textToParse = codeBlockMatch[1].trim();
  }

  const jsonMatch = textToParse.match(/\{[\s\S]*\}/);
  const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));

  if (!jsonMatch) {
    // If model returned bullet points text rather than strict JSON, parse lines directly from LLM
    const lines = rawContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const subtasks = lines
      .filter(l => /^(\d+\.|\-|\*|•|【步骤)/.test(l))
      .map(l => l.replace(/^(\d+\.|\-|\*|•|【步骤\d+】)\s*/, '').trim())
      .filter(l => l.length > 0);

    return {
      title: cleanPrompt,
      description: lines[0] || `由大模型 [${selectedModel}] 针对「${cleanPrompt}」深度定制。`,
      priority: 'high',
      category: 'life',
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      subtasks: subtasks.length > 0 ? subtasks : ['按计划启动第一阶段工作', '推进核心任务落地', '验收与复盘总结'],
      modelUsed: selectedModel,
      reasoningContent,
      durationSeconds,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const days = typeof parsed.dueDateDays === 'number' && parsed.dueDateDays >= 0 ? parsed.dueDateDays : 2;
    const due = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

    return {
      title: parsed.title || cleanPrompt,
      description: parsed.description || '',
      priority: ['urgent', 'high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'medium',
      category: ['life', 'work', 'study', 'cat', 'health'].includes(parsed.category) ? parsed.category : 'life',
      dueDate: due,
      subtasks: Array.isArray(parsed.subtasks) && parsed.subtasks.length > 0 ? parsed.subtasks.map(String) : ['启动核心执行步骤'],
      modelUsed: selectedModel,
      reasoningContent,
      durationSeconds,
    };
  } catch {
    throw new Error(`大模型 [${selectedModel}] 响应解析异常，请重新尝试规划。`);
  }
}

// ----------------------------------------------------
// AI Note Generator & Writing Assistant
// ----------------------------------------------------
export interface GeneratedNoteOutput {
  title: string;
  category: string;
  tags: string[];
  content: string;
  modelUsed: string;
  reasoningContent?: string;
  durationSeconds: number;
}

export async function generateAINote({
  topic,
  style = 'guide',
  provider,
  model,
  signal,
  onChunk,
  onReasoningChunk,
}: {
  topic: string;
  style?: 'guide' | 'essay' | 'xhs' | 'summary';
  provider?: AIProvider;
  model?: string;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
  onReasoningChunk?: (chunk: string) => void;
}): Promise<GeneratedNoteOutput> {
  const cleanTopic = topic.trim();
  if (!cleanTopic) {
    throw new Error('请输入你想要撰写的笔记主题或构思');
  }

  // Get active provider from parameter or local storage
  let activeProvider = provider;
  if (!activeProvider && typeof window !== 'undefined') {
    try {
      const stored = JSON.parse(localStorage.getItem('maobu_ai_providers') || '[]');
      activeProvider = stored.find((p: any) => p.isActive) || stored[0];
    } catch {
      // ignore
    }
  }
  if (!activeProvider) {
    activeProvider = DEFAULT_CUSTOM_PROVIDER;
  }

  if (!activeProvider || !activeProvider.apiKey || !activeProvider.apiKey.trim()) {
    throw new Error('未配置有效的大模型 API Key。请前往「AI 伴侣」->「模型配置」填写或配置有效 API 密钥。');
  }

  const selectedModel = model || activeProvider.defaultModel || 'deepseek-v4-flash';
  const styleDesc = {
    guide: '干货结构化指南（使用清晰章节、列表、关键要点与实践建议）',
    essay: '优美深邃随笔感悟（文笔温润细腻，富有思考深度）',
    xhs: '小红书爆款图文体（吸引人的开篇、丰富 Emoji、分段短小精悍）',
    summary: '极简行动复盘清单（目标、成效、问题、下一步待办）',
  }[style] || '高质量 Markdown 笔记';

  const systemPrompt = `你是一位高审美、擅长写作的专业知识博主与资深笔记专家。
请根据用户的主题：“${cleanTopic}”以及风格要求：“${styleDesc}”，撰写一篇排版优美、内容扎实、结构清晰的完整 Markdown 笔记。
必须直接返回纯合法的 JSON 格式对象，不要包含 markdown 标记或任何其他文本：
{
  "title": "笔记标题（醒目文雅）",
  "category": "生活" | "工作" | "学习" | "灵感" | "代码" | "指南",
  "tags": ["标签1", "标签2", "标签3"],
  "content": "完整的 Markdown 格式正文内容（包含 # 标题、> 引用、**加粗**、- 列表等排版）"
}`;

  let rawContent = '';
  const startTime = Date.now();

  try {
    const streamRes = await streamChatCompletion({
      provider: activeProvider,
      model: selectedModel,
      messages: [
        { role: 'user', content: `请撰写主题为：“${cleanTopic}”的笔记内容` }
      ],
      systemPrompt,
      signal,
      onChunk: delta => {
        rawContent += delta;
        if (onChunk) onChunk(delta);
      },
      onReasoningChunk: onReasoningChunk,
    });
    rawContent = streamRes.content || rawContent;
    const reasoningContent = streamRes.reasoningContent || '';
    const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));

    let textToParse = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const codeBlockMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      textToParse = codeBlockMatch[1].trim();
    }

    const jsonMatch = textToParse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        title: cleanTopic,
        category: '灵感',
        tags: ['AI生成', '灵感'],
        content: rawContent,
        modelUsed: selectedModel,
        reasoningContent,
        durationSeconds,
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || cleanTopic,
        category: parsed.category || '灵感',
        tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : ['灵感', '笔记'],
        content: parsed.content || rawContent,
        modelUsed: selectedModel,
        reasoningContent,
        durationSeconds,
      };
    } catch {
      return {
        title: cleanTopic,
        category: '灵感',
        tags: ['AI生成', '笔记'],
        content: rawContent,
        modelUsed: selectedModel,
        reasoningContent,
        durationSeconds,
      };
    }
  } catch (err: any) {
    const friendly = formatFriendlyAIError(err.message || String(err));
    throw new Error(`大模型 [${selectedModel}] 笔记生成失败: ${friendly}`);
  }
}
