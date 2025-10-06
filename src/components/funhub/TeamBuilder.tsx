import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Coins, Users, Shirt, Shield } from "lucide-react";
import { SPORT_CONFIG, type SportType } from "@/types/funhub";
import { toast } from "sonner";

interface TeamBuilderProps {
  sport: SportType;
  userCoins: number;
  onBack: () => void;
  onCreateTeam: (teamName: string, emblemId: number, kitId: number) => Promise<void>;
}

export const TeamBuilder = ({ sport, userCoins, onBack, onCreateTeam }: TeamBuilderProps) => {
  const [teamName, setTeamName] = useState("");
  const [selectedEmblem, setSelectedEmblem] = useState(1);
  const [selectedKit, setSelectedKit] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  const sportConfig = SPORT_CONFIG[sport];
  const baseCost = 50; // Cost per player
  const totalCost = sportConfig.playerCount * baseCost + 50; // Base cost + emblem cost

  const handleCreate = async () => {
    if (!teamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    if (userCoins < totalCost) {
      toast.error("Not enough coins!");
      return;
    }

    setIsCreating(true);
    try {
      await onCreateTeam(teamName, selectedEmblem, selectedKit);
      toast.success("Team created successfully!");
    } catch (error) {
      toast.error("Failed to create team");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          <span className="font-bold">{userCoins}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="text-3xl">{sportConfig.icon}</span>
            Build Your {sportConfig.name} Team
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* Emblem Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Team Emblem
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((id) => (
                <Card
                  key={id}
                  className={`cursor-pointer transition-colors ${
                    selectedEmblem === id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedEmblem(id)}
                >
                  <CardContent className="p-4 text-center">
                    <Shield className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-xs">Emblem {id}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Kit Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shirt className="h-4 w-4" />
              Team Kit
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((id) => (
                <Card
                  key={id}
                  className={`cursor-pointer transition-colors ${
                    selectedKit === id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedKit(id)}
                >
                  <CardContent className="p-4 text-center">
                    <Shirt className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-xs">Kit {id}</p>
                  </CardContent>
                </Card>
              ))}
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
                  <span>{sportConfig.playerCount * baseCost} coins</span>
                </div>
                <div className="flex justify-between">
                  <span>Emblem</span>
                  <span>50 coins</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create Button */}
          <Button
            onClick={handleCreate}
            disabled={isCreating || !teamName.trim() || userCoins < totalCost}
            className="w-full"
            size="lg"
          >
            {isCreating ? "Creating..." : `Create Team (${totalCost} coins)`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
