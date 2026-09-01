// NVIDIA NIM Cloud Vision Intelligence Service
export class NvidiaService {
  constructor() {
    this.storageKey = 'sentinel_nvidia_api_key';
    this.modelStorageKey = 'sentinel_nvidia_model';
    this.apiKey = localStorage.getItem(this.storageKey) || '';
    this.model = localStorage.getItem(this.modelStorageKey) || 'meta/llama-3.2-11b-vision-instruct';
    this.endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
    
    // Supported NVIDIA Vision models
    this.availableModels = [
      { id: 'meta/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B Vision Instruct (Recommended / Fast)' },
      { id: 'meta/llama-3.2-90b-vision-instruct', name: 'Llama 3.2 90B Vision Instruct (Deep Tactical Forensic)' },
      { id: 'nvidia/neva-22b', name: 'NVIDIA NeVA 22B (Multimodal Visual Reasoning)' }
    ];
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().startsWith('nvapi-'));
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    localStorage.setItem(this.storageKey, this.apiKey);
  }

  setModel(modelId) {
    this.model = modelId;
    localStorage.setItem(this.modelStorageKey, this.model);
  }

  clearApiKey() {
    this.apiKey = '';
    localStorage.removeItem(this.storageKey);
  }

  async testConnection(testKey) {
    const key = testKey || this.apiKey;
    if (!key) {
      throw new Error('No NVIDIA API key provided.');
    }

    // Lightweight test call
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: 'Ping: Confirm Tactical AI connection in 5 words.' }],
        max_tokens: 30,
        temperature: 0.1
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.detail || `NVIDIA NIM API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'Connection Verified.';
  }

  async analyzeSubject(imageDataUrl, context = {}) {
    if (!this.isConfigured()) {
      throw new Error('NVIDIA API Key not configured. Click the NVIDIA AI button in the top HUD to enter your API key.');
    }

    const systemPrompt = `You are SENTINEL-AI, an elite military-grade autonomous tactical surveillance and intelligence analyst powered by NVIDIA NIM.
Analyze the provided optical surveillance crop of an unidentified subject.

Contextual Sensor Telemetry:
- Subject ID: ${context.subjectId || 'UNKNOWN'}
- Estimated Stature: ${context.biometrics?.estHeight || 'Unknown'}
- Build Profile: ${context.biometrics?.build || 'Unknown'}
- Detected Attire Colors: ${context.attire?.summary || 'Unknown'}
- Detected Proximity Items: ${context.carriedItems?.map(i => i.class).join(', ') || 'None Detected'}
- Time on Site: ${context.duration || '0m 00s'}

Please produce a concise, professional tactical forensic briefing strictly formatted in the following sections:
1. 🛡️ THREAT LEVEL: [LOW | MODERATE | ELEVATED | CRITICAL] (Provide 1-sentence tactical justification)
2. 👁️ VISUAL & PHYSICAL RECONNAISSANCE: Detailed observations of garments, visible face gear, backpack/pouches, footwear, posture, and concealed item risk.
3. 🧠 BEHAVIORAL INTENT & ANOMALY ANALYSIS: Assessment of suspicious indicators, loitering posture, or movement pattern.
4. ⚡ RECOMMENDED COUNTERMEASURE: Immediate tactical protocol for on-site security personnel.`;

    const payload = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: systemPrompt },
            { type: 'image_url', image_url: { url: imageDataUrl } }
          ]
        }
      ],
      max_tokens: 600,
      temperature: 0.2,
      top_p: 0.8
    };

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `NVIDIA NIM API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No tactical analysis returned.';
  }

  async interrogateScene(imageDataUrl, customPrompt = 'Provide a full tactical perimeter scene assessment, identify all persons, carried bags, and potential security anomalies.') {
    if (!this.isConfigured()) {
      throw new Error('NVIDIA API Key not configured. Configure in NVIDIA AI Settings.');
    }

    const promptText = `You are SENTINEL-AI Tactical Optical Reconnaissance.
Operator Query: "${customPrompt}"

Analyze this full camera sector snapshot and provide a sharp, concise bulleted tactical assessment.`;

    const payload = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: imageDataUrl } }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.2
    };

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `NVIDIA NIM API Error: ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response from NVIDIA NIM.';
  }
}
