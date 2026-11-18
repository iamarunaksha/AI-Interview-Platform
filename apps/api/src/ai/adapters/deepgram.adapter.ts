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
   * Transcribe a pre-recorded audio buffer to text.
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    mimetype = 'audio/wav',
  ): Promise<string> {
    if (!this.isConfigured) {
      return '[Deepgram Mock Transcription]: Candidate explained Redis token bucket implementation.';
    }

    try {
      const response = await fetch(
        'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true',
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${this.apiKey}`,
            'Content-Type': mimetype,
          },
          body: new Uint8Array(audioBuffer),
        },
      );

      if (!response.ok) {
        throw new Error(`Deepgram STT failed with status ${response.status}`);
      }

      const json = await response.json();
      return json.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
    } catch (err) {
      this.logger.error('Deepgram STT failed:', err);
      throw err;
    }
  }

  /**
   * Synthesize text into linear PCM / WAV audio buffer.
   */
  async synthesizeSpeech(
    text: string,
    model = 'aura-asteria-en',
  ): Promise<Buffer> {
    if (!this.isConfigured) {
      return Buffer.from([]);
    }

    try {
      const response = await fetch(
        `https://api.deepgram.com/v1/speak?model=${model}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        },
      );

      if (!response.ok) {
        throw new Error(`Deepgram TTS failed with status ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      this.logger.error('Deepgram TTS failed:', err);
      throw err;
    }
  }
}
