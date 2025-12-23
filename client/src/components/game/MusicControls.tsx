import { Volume2, VolumeX, Music, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface MusicControlsProps {
  masterVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  onVolumeChange: (volume: number) => void;
  onMusicToggle: (enabled: boolean) => void;
  onSfxToggle: (enabled: boolean) => void;
  accentColor?: string;
}

export function MusicControls({
  masterVolume,
  musicEnabled,
  sfxEnabled,
  onVolumeChange,
  onMusicToggle,
  onSfxToggle,
  accentColor = 'cyan',
}: MusicControlsProps) {
  const colorClasses: Record<string, string> = {
    cyan: 'text-cyan-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
  };
  const textColor = colorClasses[accentColor] || colorClasses.cyan;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 flex items-center gap-2">
          <Volume2 className="w-4 h-4" /> Master Volume
        </span>
        <div className="w-24">
          <Slider
            value={[masterVolume * 100]}
            onValueChange={([v]) => onVolumeChange(v / 100)}
            max={100}
            step={5}
            className="cursor-pointer"
            data-testid="slider-master-volume"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-gray-400 flex items-center gap-2">
          <Music className="w-4 h-4" /> Music
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMusicToggle(!musicEnabled)}
          className={musicEnabled ? textColor : 'text-gray-500'}
          data-testid="button-toggle-music"
        >
          {musicEnabled ? 'ON' : 'OFF'}
        </Button>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-gray-400 flex items-center gap-2">
          <Music2 className="w-4 h-4" /> Sound Effects
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSfxToggle(!sfxEnabled)}
          className={sfxEnabled ? textColor : 'text-gray-500'}
          data-testid="button-toggle-sfx"
        >
          {sfxEnabled ? 'ON' : 'OFF'}
        </Button>
      </div>
    </div>
  );
}
