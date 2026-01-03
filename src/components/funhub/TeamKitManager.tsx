import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Check, Coins, Shirt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SportType } from "@/types/funhub";
import { SPORT_CONFIG } from "@/types/funhub";
import { KitCustomizer } from "./KitCustomizer";

interface TeamKitManagerProps {
  teamId: string;
  userId: string;
  userCoins: number;
  onBack: () => void;
  onCoinsUpdate: () => void;
}

interface PresetKit {
  id: number;
  name: string;
  primary_color: string;
  secondary_color: string;
  pattern: string;
  unlock_cost: number;
}

interface CustomKit {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  tertiary_color: string;
  pattern: string;
}

interface TeamData {
  id: string;
  team_name: string;
  sport: string;
  kit_id: number | null;
  custom_kit_id: string | null;
}

export const TeamKitManager = ({ teamId, userId, userCoins, onBack, onCoinsUpdate }: TeamKitManagerProps) => {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [presetKits, setPresetKits] = useState<PresetKit[]>([]);
  const [customKits, setCustomKits] = useState<CustomKit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    loadData();
  }, [teamId]);

  const loadData = async () => {
    try {
      const { data: teamData } = await supabase
        .from('user_teams')
        .select('*')
        .eq('id', teamId)
        .single();

      setTeam(teamData);

      if (teamData) {
        // Load preset kits for this sport
        const { data: presetsData } = await supabase
          .from('team_kits')
          .select('*')
          .eq('sport', teamData.sport)
          .order('unlock_cost');

        setPresetKits(presetsData || []);

        // Load user's custom kits for this sport
        const { data: customData } = await supabase
          .from('custom_kits')
          .select('*')
          .eq('user_id', userId)
          .eq('sport', teamData.sport);

        setCustomKits(customData || []);
      }
    } catch (error) {
      console.error('Error loading kits:', error);
      toast.error('Failed to load kits');
    } finally {
      setIsLoading(false);
    }
  };

  const renderKitPreview = (kit: PresetKit | CustomKit, isCustom = false) => {
    const pattern = kit.pattern;
    const primaryColor = kit.primary_color;
    const secondaryColor = kit.secondary_color;
    const tertiaryColor = isCustom ? (kit as CustomKit).tertiary_color : '#000000';

    let patternStyle: React.CSSProperties = {
      backgroundColor: primaryColor,
    };

    switch (pattern) {
      case 'vertical-stripes':
        patternStyle = {
          background: `repeating-linear-gradient(90deg, ${primaryColor} 0px, ${primaryColor} 10px, ${secondaryColor} 10px, ${secondaryColor} 20px)`
        };
        break;
      case 'horizontal-stripes':
        patternStyle = {
          background: `repeating-linear-gradient(0deg, ${primaryColor} 0px, ${primaryColor} 8px, ${secondaryColor} 8px, ${secondaryColor} 16px)`
        };
        break;
      case 'diagonal-stripes':
        patternStyle = {
          background: `repeating-linear-gradient(45deg, ${primaryColor} 0px, ${primaryColor} 10px, ${secondaryColor} 10px, ${secondaryColor} 20px)`
        };
        break;
      case 'gradient':
        patternStyle = {
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
        };
        break;
      default:
        patternStyle = { backgroundColor: primaryColor };
    }

    return (
      <div className="relative w-16 h-20">
        <div className="absolute inset-0 rounded-t-xl" style={patternStyle} />
        <div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 w-4 h-2 rounded-t"
          style={{ backgroundColor: tertiaryColor }}
        />
        <div 
          className="absolute top-2 -left-3 w-5 h-6 rounded-l-full"
          style={{ backgroundColor: secondaryColor }}
        />
        <div 
          className="absolute top-2 -right-3 w-5 h-6 rounded-r-full"
          style={{ backgroundColor: secondaryColor }}
        />
      </div>
    );
  };

  const handleApplyPreset = async (kit: PresetKit) => {
    if (kit.unlock_cost > 0 && userCoins < kit.unlock_cost) {
      toast.error(`Insufficient coins. You need ${kit.unlock_cost} coins.`);
      return;
    }

    setIsApplying(true);
    try {
      // Update team with new kit
      const { error: teamError } = await supabase
        .from('user_teams')
        .update({ kit_id: kit.id, custom_kit_id: null })
        .eq('id', teamId);

      if (teamError) throw teamError;

      // Deduct coins if needed
      if (kit.unlock_cost > 0) {
        const { error: coinsError } = await supabase
          .from('user_profiles')
          .update({ coins: userCoins - kit.unlock_cost })
          .eq('id', userId);

        if (coinsError) throw coinsError;
        onCoinsUpdate();
      }

      toast.success(`Applied ${kit.name} kit!`);
      await loadData();
    } catch (error) {
      console.error('Error applying kit:', error);
      toast.error('Failed to apply kit');
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyCustom = async (kit: CustomKit) => {
    setIsApplying(true);
    try {
      const { error } = await supabase
        .from('user_teams')
        .update({ kit_id: null, custom_kit_id: kit.id })
        .eq('id', teamId);

      if (error) throw error;

      toast.success(`Applied ${kit.name} kit!`);
      await loadData();
    } catch (error) {
      console.error('Error applying kit:', error);
      toast.error('Failed to apply kit');
    } finally {
      setIsApplying(false);
    }
  };

  const handleCustomKitSave = async (kitId: number | null, customKitId: string | null, cost: number) => {
    // Deduct coins for custom kit
    if (cost > 0) {
      const { error } = await supabase
        .from('user_profiles')
        .update({ coins: userCoins - cost })
        .eq('id', userId);

      if (error) {
        console.error('Error deducting coins:', error);
        return;
      }
    }

    // Apply the custom kit to the team
    if (customKitId) {
      await supabase
        .from('user_teams')
        .update({ kit_id: null, custom_kit_id: customKitId })
        .eq('id', teamId);
    }

    onCoinsUpdate();
    setShowCustomizer(false);
    await loadData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (showCustomizer && team) {
    return (
      <KitCustomizer
        sport={team.sport as SportType}
        userId={userId}
        userCoins={userCoins}
        onSave={handleCustomKitSave}
        onCancel={() => setShowCustomizer(false)}
      />
    );
  }

  const sportConfig = team ? SPORT_CONFIG[team.sport as SportType] : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <Shirt className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Kit Manager</h2>
            <p className="text-sm text-muted-foreground">{team?.team_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
          <Coins className="h-4 w-4 text-primary" />
          <span className="font-bold">{userCoins}</span>
        </div>
      </div>

      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="presets" className="flex-1">Preset Kits</TabsTrigger>
          <TabsTrigger value="custom" className="flex-1">My Custom Kits</TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {presetKits.map((kit) => {
              const isCurrentKit = team?.kit_id === kit.id;
              
              return (
                <Card 
                  key={kit.id} 
                  className={`relative ${isCurrentKit ? 'ring-2 ring-primary' : ''}`}
                >
                  <CardContent className="p-4 flex flex-col items-center">
                    {isCurrentKit && (
                      <Badge className="absolute top-2 right-2 bg-primary">
                        <Check className="h-3 w-3 mr-1" /> Current
                      </Badge>
                    )}
                    <div className="py-4">
                      {renderKitPreview(kit)}
                    </div>
                    <p className="font-medium text-sm text-center">{kit.name}</p>
                    {kit.unlock_cost > 0 ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Coins className="h-3 w-3" /> {kit.unlock_cost}
                      </p>
                    ) : (
                      <p className="text-xs text-green-500">Free</p>
                    )}
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      variant={isCurrentKit ? "secondary" : "default"}
                      onClick={() => handleApplyPreset(kit)}
                      disabled={isApplying || isCurrentKit}
                    >
                      {isCurrentKit ? 'Equipped' : 'Apply'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Button onClick={() => setShowCustomizer(true)} className="w-full">
            + Create New Custom Kit (300 coins)
          </Button>

          {customKits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              You haven't created any custom kits yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {customKits.map((kit) => {
                const isCurrentKit = team?.custom_kit_id === kit.id;
                
                return (
                  <Card 
                    key={kit.id} 
                    className={`relative ${isCurrentKit ? 'ring-2 ring-primary' : ''}`}
                  >
                    <CardContent className="p-4 flex flex-col items-center">
                      {isCurrentKit && (
                        <Badge className="absolute top-2 right-2 bg-primary">
                          <Check className="h-3 w-3 mr-1" /> Current
                        </Badge>
                      )}
                      <div className="py-4">
                        {renderKitPreview(kit, true)}
                      </div>
                      <p className="font-medium text-sm text-center">{kit.name}</p>
                      <p className="text-xs text-muted-foreground">Custom</p>
                      <Button
                        size="sm"
                        className="mt-2 w-full"
                        variant={isCurrentKit ? "secondary" : "default"}
                        onClick={() => handleApplyCustom(kit)}
                        disabled={isApplying || isCurrentKit}
                      >
                        {isCurrentKit ? 'Equipped' : 'Apply'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
