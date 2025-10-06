import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SportType } from "@/types/funhub";

interface KitCustomizerProps {
  sport: SportType;
  userId: string;
  userCoins: number;
  onSave: (kitId: number | null, customKitId: string | null, cost: number) => void;
  onCancel: () => void;
}

const PATTERNS = [
  { id: 'solid', name: 'Solid' },
  { id: 'vertical-stripes', name: 'Vertical Stripes' },
  { id: 'horizontal-stripes', name: 'Horizontal Stripes' },
  { id: 'gradient', name: 'Gradient' },
  { id: 'hoops', name: 'Hoops' },
  { id: 'diagonal', name: 'Diagonal' },
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
  { name: 'Navy', value: '#1E3A8A' },
  { name: 'Maroon', value: '#7C2D12' },
];

export const KitCustomizer = ({ sport, userId, userCoins, onSave, onCancel }: KitCustomizerProps) => {
  const [kitName, setKitName] = useState('');
  const [selectedPattern, setSelectedPattern] = useState('solid');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');
  const [tertiaryColor, setTertiaryColor] = useState('#000000');
  const [isLoading, setIsLoading] = useState(false);

  const CUSTOM_KIT_COST = 300;

  const handleSaveCustom = async () => {
    if (!kitName.trim()) {
      toast.error('Please enter a kit name');
      return;
    }

    if (userCoins < CUSTOM_KIT_COST) {
      toast.error(`Insufficient coins. You need ${CUSTOM_KIT_COST} coins.`);
      return;
    }

    setIsLoading(true);
    try {
      const { data: customKit, error } = await supabase
        .from('custom_kits')
        .insert({
          user_id: userId,
          sport,
          name: kitName,
          pattern: selectedPattern,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          tertiary_color: tertiaryColor
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Custom kit created!');
      onSave(null, customKit.id, CUSTOM_KIT_COST);
    } catch (error) {
      console.error('Error creating custom kit:', error);
      toast.error('Failed to create custom kit');
    } finally {
      setIsLoading(false);
    }
  };

  const renderKitPreview = () => {
    let patternStyle: React.CSSProperties = {
      backgroundColor: primaryColor,
    };

    switch (selectedPattern) {
      case 'vertical-stripes':
        patternStyle = {
          background: `repeating-linear-gradient(
            90deg,
            ${primaryColor} 0px,
            ${primaryColor} 20px,
            ${secondaryColor} 20px,
            ${secondaryColor} 40px
          )`
        };
        break;
      case 'horizontal-stripes':
        patternStyle = {
          background: `repeating-linear-gradient(
            0deg,
            ${primaryColor} 0px,
            ${primaryColor} 15px,
            ${secondaryColor} 15px,
            ${secondaryColor} 30px
          )`
        };
        break;
      case 'gradient':
        patternStyle = {
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
        };
        break;
      case 'hoops':
        patternStyle = {
          background: `repeating-linear-gradient(
            0deg,
            ${primaryColor} 0px,
            ${primaryColor} 25px,
            ${secondaryColor} 25px,
            ${secondaryColor} 50px
          )`
        };
        break;
      case 'diagonal':
        patternStyle = {
          background: `repeating-linear-gradient(
            45deg,
            ${primaryColor} 0px,
            ${primaryColor} 20px,
            ${secondaryColor} 20px,
            ${secondaryColor} 40px
          )`
        };
        break;
    }

    return (
      <div className="relative w-32 h-40">
        {/* Jersey body */}
        <div 
          className="absolute inset-0 rounded-t-3xl"
          style={patternStyle}
        />
        {/* Collar */}
        <div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-4 rounded-t-lg"
          style={{ backgroundColor: tertiaryColor }}
        />
        {/* Sleeves */}
        <div 
          className="absolute top-4 -left-6 w-10 h-12 rounded-l-full"
          style={{ backgroundColor: secondaryColor }}
        />
        <div 
          className="absolute top-4 -right-6 w-10 h-12 rounded-r-full"
          style={{ backgroundColor: secondaryColor }}
        />
        {/* Number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            className="text-4xl font-bold"
            style={{ 
              color: tertiaryColor,
              WebkitTextStroke: '1px white'
            }}
          >
            10
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Customize Kit</h2>
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
            <CardContent className="flex justify-center py-8">
              {renderKitPreview()}
            </CardContent>
          </Card>

          {/* Name */}
          <div className="space-y-2">
            <Label>Kit Name</Label>
            <Input 
              placeholder="Home Kit 2025" 
              value={kitName}
              onChange={(e) => setKitName(e.target.value)}
            />
          </div>

          {/* Pattern Selector */}
          <div className="space-y-2">
            <Label>Pattern</Label>
            <div className="grid grid-cols-3 gap-2">
              {PATTERNS.map((pattern) => (
                <Button
                  key={pattern.id}
                  variant={selectedPattern === pattern.id ? "default" : "outline"}
                  onClick={() => setSelectedPattern(pattern.id)}
                  className="h-16"
                >
                  {pattern.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={`primary-${color.value}`}
                    className={`w-10 h-10 rounded-full border-2 ${
                      primaryColor === color.value ? 'border-primary scale-110' : 'border-border'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setPrimaryColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={`secondary-${color.value}`}
                    className={`w-10 h-10 rounded-full border-2 ${
                      secondaryColor === color.value ? 'border-primary scale-110' : 'border-border'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setSecondaryColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Accent Color (Collar/Trim)</Label>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={`tertiary-${color.value}`}
                    className={`w-10 h-10 rounded-full border-2 ${
                      tertiaryColor === color.value ? 'border-primary scale-110' : 'border-border'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setTertiaryColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSaveCustom}
            disabled={isLoading || !kitName.trim()}
          >
            Create Custom Kit ({CUSTOM_KIT_COST} coins)
          </Button>
        </TabsContent>

        <TabsContent value="presets" className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Preset kits coming soon! For now, create your custom kit.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
};
