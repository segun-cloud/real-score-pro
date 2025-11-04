import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Coins, Users, Shirt, Shield, ArrowRight, Check } from "lucide-react";
import { SPORT_CONFIG, type SportType } from "@/types/funhub";
import { toast } from "sonner";
import { EmblemDesigner } from "./EmblemDesigner";
import { KitCustomizer } from "./KitCustomizer";

interface TeamBuilderProps {
  sport: SportType;
  userId: string;
  userCoins: number;
  onBack: () => void;
  onCreateTeam: (
    teamName: string, 
    emblemId: number | null, 
    kitId: number | null,
    customEmblemId: string | null,
    customKitId: string | null,
    totalCost: number
  ) => Promise<void>;
}

export const TeamBuilder = ({ sport, userId, userCoins, onBack, onCreateTeam }: TeamBuilderProps) => {
  const [step, setStep] = useState<'name' | 'emblem' | 'kit' | 'review'>('name');
  const [teamName, setTeamName] = useState("");
  const [emblemId, setEmblemId] = useState<number | null>(null);
  const [customEmblemId, setCustomEmblemId] = useState<string | null>(null);
  const [kitId, setKitId] = useState<number | null>(null);
  const [customKitId, setCustomKitId] = useState<string | null>(null);
  const [emblemCost, setEmblemCost] = useState(0);
  const [kitCost, setKitCost] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const sportConfig = SPORT_CONFIG[sport];
  const baseCost = 20; // Cost per player
  const playersCost = sportConfig.playerCount * baseCost;
  const totalCost = playersCost + emblemCost + kitCost;

  const handleEmblemSave = (eId: number | null, customEId: string | null, cost: number) => {
    setEmblemId(eId);
    setCustomEmblemId(customEId);
    setEmblemCost(cost);
    setStep('kit');
  };

  const handleKitSave = (kId: number | null, customKId: string | null, cost: number) => {
    setKitId(kId);
    setCustomKitId(customKId);
    setKitCost(cost);
    setStep('review');
  };

  const handleCreate = async () => {
    if (userCoins < totalCost) {
      toast.error("Not enough coins!");
      return;
    }

    setIsCreating(true);
    try {
      await onCreateTeam(teamName, emblemId, kitId, customEmblemId, customKitId, totalCost);
      toast.success("Team created successfully!");
    } catch (error) {
      toast.error("Failed to create team");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  // Render different steps
  if (step === 'emblem') {
    const remainingAfterPlayers = userCoins - playersCost;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep('name')}>
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <span className="font-bold">{userCoins}</span>
          </div>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Budget Breakdown:</span>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Your Coins:</span>
                <span className="font-bold">{userCoins}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Players cost:</span>
                <span>-{playersCost}</span>
              </div>
              <div className="flex justify-between font-medium pt-1 border-t">
                <span>Available for Emblem + Kit:</span>
                <span className={remainingAfterPlayers < 0 ? "text-destructive" : "text-primary"}>
                  {remainingAfterPlayers}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <EmblemDesigner
          userId={userId}
          userCoins={userCoins - playersCost}
          onSave={handleEmblemSave}
          onCancel={() => setStep('name')}
        />
        
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => {
            setEmblemId(null);
            setCustomEmblemId(null);
            setEmblemCost(0);
            setStep('kit');
          }}
        >
          Skip Emblem (Use Default)
        </Button>
      </div>
    );
  }

  if (step === 'kit') {
    const remainingAfterPlayers = userCoins - playersCost;
    const remainingAfterEmblem = remainingAfterPlayers - emblemCost;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep('emblem')}>
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <span className="font-bold">{userCoins}</span>
          </div>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Budget Breakdown:</span>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Your Coins:</span>
                <span className="font-bold">{userCoins}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Players cost:</span>
                <span>-{playersCost}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Emblem cost:</span>
                <span>-{emblemCost}</span>
              </div>
              <div className="flex justify-between font-medium pt-1 border-t">
                <span>Available for Kit:</span>
                <span className={remainingAfterEmblem < 0 ? "text-destructive" : "text-primary"}>
                  {remainingAfterEmblem}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <KitCustomizer
          sport={sport}
          userId={userId}
          userCoins={userCoins - playersCost - emblemCost}
          onSave={handleKitSave}
          onCancel={() => setStep('emblem')}
        />
        
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => {
            setKitId(null);
            setCustomKitId(null);
            setKitCost(0);
            setStep('review');
          }}
        >
          Skip Kit (Use Default)
        </Button>
      </div>
    );
  }

  // Step 1: Name or Step 4: Review
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={step === 'review' ? () => setStep('kit') : onBack}>
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          <span className="font-bold">{userCoins}</span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {['Name', 'Emblem', 'Kit', 'Review'].map((label, index) => {
          const stepKeys = ['name', 'emblem', 'kit', 'review'];
          const currentIndex = stepKeys.indexOf(step);
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={label} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                isCompleted ? 'bg-primary border-primary text-primary-foreground' :
                isCurrent ? 'border-primary text-primary' :
                'border-muted text-muted-foreground'
              }`}>
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className={`ml-2 text-sm ${isCurrent ? 'font-bold' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {index < 3 && <ArrowRight className="ml-auto text-muted-foreground h-4 w-4" />}
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="text-3xl">{sportConfig.icon}</span>
            {step === 'name' ? 'Build Your Team' : 'Review Team'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 'name' ? (
            <>
              {/* Team Name */}
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  placeholder="Enter your team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  maxLength={30}
                />
              </div>

              {/* Player Count Info */}
              <Card className="bg-muted">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      <span className="font-medium">Players</span>
                    </div>
                    <Badge variant="secondary">{sportConfig.playerCount}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your team will be generated with {sportConfig.playerCount} random players
                  </p>
                </CardContent>
              </Card>

              <Button
                onClick={() => setStep('emblem')}
                disabled={!teamName.trim()}
                className="w-full"
                size="lg"
              >
                Next: Choose Emblem <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              {/* Review Summary */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Team Name</Label>
                  <p className="text-lg font-bold">{teamName}</p>
                </div>

                <div className="space-y-2">
                  <Label>Emblem</Label>
                  <p className="text-sm text-muted-foreground">
                    {customEmblemId ? 'Custom Emblem' : emblemId ? `Preset Emblem #${emblemId}` : 'Default (Free)'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Kit</Label>
                  <p className="text-sm text-muted-foreground">
                    {customKitId ? 'Custom Kit' : kitId ? `Preset Kit #${kitId}` : 'Default (Free)'}
                  </p>
                </div>
              </div>

              {/* Cost Summary */}
              <Card className="bg-primary/10 border-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Total Cost</span>
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-primary" />
                      <span className="text-xl font-bold">{totalCost}</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>{sportConfig.playerCount} Players</span>
                      <span>{playersCost} coins</span>
                    </div>
                    {emblemCost > 0 && (
                      <div className="flex justify-between">
                        <span>Emblem</span>
                        <span>{emblemCost} coins</span>
                      </div>
                    )}
                    {kitCost > 0 && (
                      <div className="flex justify-between">
                        <span>Kit</span>
                        <span>{kitCost} coins</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Create Button */}
              <Button
                onClick={handleCreate}
                disabled={isCreating || userCoins < totalCost}
                className="w-full"
                size="lg"
              >
                {isCreating ? "Creating..." : `Create Team (${totalCost} coins)`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
