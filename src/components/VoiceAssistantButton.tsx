import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { SupportedLanguage } from '../i18n';
import { speakText, stopSpeech } from '../utils/speech';

interface VoiceAssistantButtonProps {
  textToRead: string;
  language: SupportedLanguage;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const VoiceAssistantButton: React.FC<VoiceAssistantButtonProps> = ({
  textToRead,
  language,
  label = 'Listen Aloud',
  className = '',
  size = 'md',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleToggle = () => {
    if (isPlaying) {
      stopSpeech();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speakText(
        textToRead,
        language,
        () => setIsPlaying(false),
        () => setIsPlaying(false)
      );
    }
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-4 py-2.5 text-base gap-2.5 font-bold',
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-all border shadow-xs select-none active:scale-95 ${
        isPlaying
          ? 'bg-amber-500 text-white border-amber-600 animate-pulse ring-2 ring-amber-300'
          : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100 hover:border-teal-300'
      } ${sizeClasses[size]} ${className}`}
      aria-label={isPlaying ? 'Stop voice reading' : `Listen: ${label}`}
    >
      {isPlaying ? (
        <>
          <VolumeX className="w-4 h-4 shrink-0 text-white" />
          <span>Stop Voice</span>
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4 shrink-0 text-teal-700" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
