export const AI_PROVIDERS = {
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    name: 'Gemini',
    keyLabel: 'Google AI API Key',
    keyPlaceholder: 'Google AI API 키 입력',
    keyHelpUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-3-pro-preview'
    ]
  },
  openai: {
    id: 'openai',
    label: 'GPT',
    name: 'OpenAI',
    keyLabel: 'OpenAI API Key',
    keyPlaceholder: 'OpenAI API 키 입력',
    keyHelpUrl: 'https://platform.openai.com/api-keys',
    models: [
      'gpt-4.1',
      'gpt-4o-mini',
      'gpt-4.1-mini'
    ]
  },
  claude: {
    id: 'claude',
    label: 'Claude',
    name: 'Anthropic',
    keyLabel: 'Claude API Key',
    keyPlaceholder: 'Claude API 키 입력',
    keyHelpUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      'claude-3-5-sonnet-latest',
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307'
    ]
  }
};

export const DEFAULT_AI_SETTINGS = {
  provider: 'gemini',
  model: AI_PROVIDERS.gemini.models[0],
  geminiApiKey: '',
  openaiApiKey: '',
  claudeApiKey: ''
};

export const getActiveAiConfig = (settings = DEFAULT_AI_SETTINGS) => {
  const provider = settings.provider || DEFAULT_AI_SETTINGS.provider;
  const selectedProvider = AI_PROVIDERS[provider] ? provider : DEFAULT_AI_SETTINGS.provider;

  const model = settings.model && AI_PROVIDERS[selectedProvider].models.includes(settings.model)
    ? settings.model
    : AI_PROVIDERS[selectedProvider].models[0];

  const apiKey =
    selectedProvider === 'gemini'
      ? settings.geminiApiKey
      : selectedProvider === 'openai'
        ? settings.openaiApiKey
        : settings.claudeApiKey;

  return {
    provider: selectedProvider,
    model,
    apiKey: apiKey || ''
  };
};

const parseAiErrorText = async (response) => {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    const openaiError = data?.error?.message;
    const claudeError = data?.error?.message;
    const geminiError = data?.error?.message;

    return openaiError || claudeError || geminiError || text || 'Unknown AI provider error';
  } catch {
    return text || 'Unknown AI provider error';
  }
};

export const callAiModel = async ({
  provider,
  model,
  apiKey,
  prompt,
  jsonOutput = false
}) => {
  if (!apiKey) {
    throw new Error('AI API key is required.');
  }

  if (!model) {
    throw new Error('AI 모델이 필요합니다.');
  }

  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 2048,
        ...(jsonOutput ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (!response.ok) {
      const errorText = await parseAiErrorText(response);
      throw new Error(`AI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('OpenAI에서 응답을 받지 못했습니다.');
    }
    return text;
  }

  if (provider === 'claude') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: jsonOutput ? 'Respond in JSON only.' : undefined,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorText = await parseAiErrorText(response);
      throw new Error(`AI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const textBlock = data?.content?.find((block) => block.type === 'text');
    const text = textBlock?.text;
    if (!text) {
      throw new Error('Claude에서 응답을 받지 못했습니다.');
    }
    return text;
  }

  if (provider === 'gemini') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: jsonOutput ? { responseMimeType: 'application/json' } : undefined
      })
    });

    if (!response.ok) {
      const errorText = await parseAiErrorText(response);
      throw new Error(`AI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Gemini에서 응답을 받지 못했습니다.');
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini에서 응답 텍스트를 추출하지 못했습니다.');
    }
    return text;
  }

  throw new Error(`지원하지 않는 AI Provider: ${provider}`);
};

export const parseJsonOutput = (rawText) => {
  const text = String(rawText || '').trim();
  const withoutFence = text
    .replace(/^```json\s*/i, '')
    .replace(/```$/, '')
    .trim();

  return JSON.parse(withoutFence);
};
