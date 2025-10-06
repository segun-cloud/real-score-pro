import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Circle, Star, Hexagon, Award, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmblemDesignerProps {
  userId: string;
  userCoins: number;
  onSave: (emblemId: number | null, customEmblemId: string | null, cost: number) => void;
  onCancel: () => void;
}

const SHAPES = [
  { id: 'shield', name: 'Shield', icon: Shield },
  { id: 'circle', name: 'Circle', icon: Circle },
  { id: 'star', name: 'Star', icon: Star },
  { id: 'hexagon', name: 'Hexagon', icon: Hexagon },
  { id: 'badge', name: 'Badge', icon: Award },
  { id: 'crown', name: 'Crown', icon: Crown },
];

const ICONS = [
  { id: 'lion', emoji: '🦁', name: 'Lion' },
  { id: 'eagle', emoji: '🦅', name: 'Eagle' },
  { id: 'dragon', emoji: '🐉', name: 'Dragon' },
  { id: 'phoenix', emoji: '🔥', name: 'Phoenix' },
  { id: 'wolf', emoji: '🐺', name: 'Wolf' },
  { id: 'bull', emoji: '🐂', name: 'Bull' },
  { id: 'tiger', emoji: '🐯', name: 'Tiger' },
  { id: 'shark', emoji: '🦈', name: 'Shark' },
  { id: 'lightning', emoji: '⚡', name: 'Lightning' },
  { id: 'sword', emoji: '⚔️', name: 'Sword' },
  { id: 'trophy', emoji: '🏆', name: 'Trophy' },
  { id: 'crown-icon', emoji: '👑', name: 'Crown' },
];

const PRESET_COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#FFFFFF' },
];

export const EmblemDesigner = ({ userId, userCoins, onSave, onCancel }: EmblemDesignerProps) => {
  const [presetEmblems, setPresetEmblems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom emblem state
  const [emblemName, setEmblemName] = useState('');
  const [selectedShape, setSelectedShape] = useState('shield');
  const [selectedIcon, setSelectedIcon] = useState('lion');
  const [bgColor, setBgColor] = useState('#3B82F6');
  const [iconColor, setIconColor] = useState('#FFFFFF');

  const CUSTOM_EMBLEM_COST = 200;

  const handleSelectPreset = (emblemId: number, cost: number) => {
    if (userCoins < cost) {
      toast.error('Insufficient coins');
      return;
    }
    onSave(emblemId, null, cost);
  };

  const handleSaveCustom = async () => {
    if (!emblemName.trim()) {
      toast.error('Please enter an emblem name');
      return;
    }

    if (userCoins < CUSTOM_EMBLEM_COST) {
      toast.error(`Insufficient coins. You need ${CUSTOM_EMBLEM_COST} coins.`);
      return;
    }

    setIsLoading(true);
    try {
      const { data: customEmblem, error } = await supabase
        .from('custom_emblems')
        .insert({
          user_id: userId,
          name: emblemName,
          shape: selectedShape,
          icon: selectedIcon,
          bg_color: bgColor,
          icon_color: iconColor
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Custom emblem created!');
      onSave(null, customEmblem.id, CUSTOM_EMBLEM_COST);
    } catch (error) {
      console.error('Error creating custom emblem:', error);
      toast.error('Failed to create custom emblem');
    } finally {
      setIsLoading(false);
    }
  };

  const ShapeIcon = SHAPES.find(s => s.id === selectedShape)?.icon || Shield;
  const selectedIconEmoji = ICONS.find(i => i.id === selectedIcon)?.emoji || '🦁';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Select Emblem</h2>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      <Tabs defaultValue="custom" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="custom" className="flex-1">Create Custom</TabsTrigger>
          <TabsTrigger value="presets" className="flex-1">Use Preset</TabsTrigger>
        </TabsList>

        <TabsContent value="custom" className="space-y-4">
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div 
                className="w-32 h-32 rounded-lg flex items-center justify-center relative"
                style={{ backgroundColor: bgColor }}
              >
                <ShapeIcon className="absolute inset-0 w-full h-full p-4 opacity-20" style={{ color: iconColor }} />
                <span className="text-5xl z-10" style={{ color: iconColor }}>{selectedIconEmoji}</span>
              </div>
            </CardContent>
          </Card>

          {/* Name */}
          <div className="space-y-2">
            <Label>Emblem Name</Label>
            <Input 
              placeholder="My Awesome Emblem" 
              value={emblemName}
              onChange={(e) => setEmblemName(e.target.value)}
            />
          </div>

          {/* Shape Selector */}
          <div className="space-y-2">
            <Label>Shape</Label>
            <div className="grid grid-cols-3 gap-2">
              {SHAPES.map((shape) => {
                const Icon = shape.icon;
                return (
                  <Button
                    key={shape.id}
                    variant={selectedShape === shape.id ? "default" : "outline"}
                    className="h-20 flex flex-col gap-1"
                    onClick={() => setSelectedShape(shape.id)}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs">{shape.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Icon Selector */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-4 gap-2">
              {ICONS.map((icon) => (
                <Button
                  key={icon.id}
                  variant={selectedIcon === icon.id ? "default" : "outline"}
                  className="h-16 flex flex-col gap-1"
                  onClick={() => setSelectedIcon(icon.id)}
                >
                  <span className="text-2xl">{icon.emoji}</span>
                  <span className="text-xs">{icon.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    className={`w-10 h-10 rounded-full border-2 ${
                      bgColor === color.value ? 'border-primary scale-110' : 'border-border'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setBgColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Icon Color</Label>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    className={`w-10 h-10 rounded-full border-2 ${
                      iconColor === color.value ? 'border-primary scale-110' : 'border-border'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setIconColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSaveCustom}
            disabled={isLoading || !emblemName.trim()}
          >
            Create Custom Emblem ({CUSTOM_EMBLEM_COST} coins)
          </Button>
        </TabsContent>

        <TabsContent value="presets" className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Preset emblems coming soon! For now, create your custom emblem.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
};
