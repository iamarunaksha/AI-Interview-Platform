import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * DeepgramAdapter — fallback provider for standalone STT (Nova-2) and TTS (Aura).
 *
 * Configured as Architecture B fallback when native multimodal speech-to-speech
 * is not utilized or when distinct transcription/synthesis verification is needed.
 */
@Injectable()
export class DeepgramAdapter {
  private readonly logger = new Logger(DeepgramAdapter.name);
  readonly name = 'deepgram';
  readonly isConfigured: boolean;
  private readonly apiKey: string;

  constructor(configService: ConfigService) {
    this.apiKey = configService.get<string>('DEEPGRAM_API_KEY', '').trim();
    this.isConfigured = !!this.apiKey;

    if (this.isConfigured) {
      this.logger.log('✅ Deepgram fallback provider configured');
    } else {
      this.logger.debug(
        'Deepgram API key not provided (optional fallback provider).',
      );
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) return false;
    try {
      const res = await fetch('https://api.deepgram.com/v1/projects', {
        headers: { Authorization: `Token ${this.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Strip Markdown formatting so Deepgram Aura TTS speaks natural conversational text
   * without pronouncing asterisks, backticks, headers, or code fences.
   */
  static stripMarkdownForSpeech(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/#+\s*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^[-*•]\s+/gm, '')
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private static readonly SUPPORTED_STT_LANGUAGES = new Set([
    'en-IN',
    'en-US',
    'en-GB',
    'en',
  ]);

  private static readonly TECHNICAL_KEYWORDS = [
    'LRU:2',
    'HashMap:2',
    'BFS:2',
    'DFS:2',
    'Kahn:2',
    'Dijkstra:2',
    'deque:2',
    'in-degree:2',
    'trie:1.5',
    'heap:1.5',
    'sentinel:1.5',
    'doubly:1.5',
    'monotonic:1.5',
    'ACDOCA:2',
    'ABAP:2',
    'BDEF:2',
    'BTP:2',
  ];

  /**
   * Transcribe a pre-recorded audio buffer to text.
   * Supports raw 16kHz linear16 PCM and standard audio containers (WAV, WebM),
   * calibrated by candidate accent locale and technical keyword boosting.
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    mimetype = 'audio/raw',
    options?: { language?: string },
  ): Promise<string> {
    if (!this.isConfigured || audioBuffer.length === 0) {
      return '';
    }

    try {
      const isRawPcm =
        mimetype === 'audio/raw' ||
        mimetype === 'audio/pcm' ||
        mimetype === 'audio/l16';

      const requestedLang = options?.language?.trim() || 'en-IN';
      const language = DeepgramAdapter.SUPPORTED_STT_LANGUAGES.has(requestedLang)
        ? requestedLang
        : 'en-IN';

      const params = new URLSearchParams({
        model: 'nova-2',
        smart_format: 'true',
        language,
      });

      if (isRawPcm) {
        params.set('encoding', 'linear16');
        params.set('sample_rate', '16000');
        params.set('channels', '1');
      }

      for (const kw of DeepgramAdapter.TECHNICAL_KEYWORDS) {
        params.append('keywords', kw);
      }

      const url = `https://api.deepgram.com/v1/listen?${params.toString()}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': isRawPcm ? 'audio/raw' : mimetype,
        },
        body: new Uint8Array(audioBuffer),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.warn(`Deepgram STT notice (${response.status}): ${errText}`);
        return '';
      }

      const json = await response.json();
      return json.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
    } catch (err) {
      this.logger.error('Deepgram STT failed:', err);
      return '';
    }
  }

  /**
   * Synthesize text into linear PCM / WAV audio buffer.
   * Automatically strips Markdown syntax before synthesis.
   */
  async synthesizeSpeech(
    text: string,
    model = 'aura-asteria-en',
  ): Promise<Buffer> {
    const cleanSpeechText = DeepgramAdapter.stripMarkdownForSpeech(text);
    if (!this.isConfigured || !cleanSpeechText) {
      return Buffer.from([]);
    }

    try {
      const response = await fetch(
        `https://api.deepgram.com/v1/speak?model=${model}&encoding=linear16&sample_rate=24000`,
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: cleanSpeechText }),
        },
      );

      if (!response.ok) {
        throw new Error(`Deepgram TTS failed with status ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      this.logger.error('Deepgram TTS failed:', err);
      return Buffer.from([]);
    }
  }
}
