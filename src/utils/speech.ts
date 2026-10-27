/**
 * Web Speech API wrappers for Text-to-Speech (TTS) and Speech-to-Text (STT)
 * Supported languages: English (en-US), Tamil (ta-IN), Hindi (hi-IN), Telugu (te-IN)
 */

import { SupportedLanguage } from '../i18n';

const BCP47_MAP: Record<SupportedLanguage, string> = {
  en: 'en-US',
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN',
};

// --- Text To Speech (TTS) ---

export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function speakText(
  text: string,
  lang: SupportedLanguage = 'en',
  onEnd?: () => void,
  onError?: (err: any) => void
): () => void {
  if (!isSpeechSynthesisAvailable()) {
    console.warn('Speech synthesis not supported in this browser.');
    onEnd?.();
    return () => {};
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = BCP47_MAP[lang] || 'en-US';
  utterance.rate = 0.95; // slightly slower for maximum frontline clarity
  utterance.pitch = 1.0;

  // Try to pick a native voice matching the language code if loaded
  const voices = window.speechSynthesis.getVoices();
  const matchingVoice = voices.find(v => v.lang.startsWith(lang) || v.lang.replace('_', '-').startsWith(BCP47_MAP[lang]));
  if (matchingVoice) {
    utterance.voice = matchingVoice;
  }

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = (e) => {
    console.warn('Speech synthesis error:', e);
    onError?.(e);
  };

  window.speechSynthesis.speak(utterance);

  // Return cancel function
  return () => {
    window.speechSynthesis.cancel();
  };
}

export function stopSpeech(): void {
  if (isSpeechSynthesisAvailable()) {
    window.speechSynthesis.cancel();
  }
}

// --- Speech To Text (STT) ---

export function isSpeechRecognitionAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

export interface SpeechRecognitionHandlers {
  onStart?: () => void;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export function startSpeechRecognition(
  lang: SupportedLanguage,
  handlers: SpeechRecognitionHandlers
): { stop: () => void } {
  if (!isSpeechRecognitionAvailable()) {
    handlers.onError?.('Speech recognition is not supported in this browser. Please type your message.');
    return { stop: () => {} };
  }

  // @ts-ignore
  const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognitionConstructor();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = BCP47_MAP[lang] || 'en-US';

  recognition.onstart = () => {
    handlers.onStart?.();
  };

  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    const transcript = finalTranscript || interimTranscript;
    handlers.onResult(transcript, !!finalTranscript);
  };

  recognition.onerror = (event: any) => {
    handlers.onError?.(event.error || 'Speech recognition error');
  };

  recognition.onend = () => {
    handlers.onEnd?.();
  };

  try {
    recognition.start();
  } catch (err: any) {
    handlers.onError?.(err.message || 'Could not start recognition');
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch (e) {
        // ignore
      }
    },
  };
}
