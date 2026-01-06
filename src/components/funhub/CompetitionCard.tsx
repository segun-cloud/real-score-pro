import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, Coins, Users, AlertCircle } from "lucide-react";
import { Competition } from "@/types/funhub";
import { SPORT_CONFIG, DIVISION_CONFIG } from "@/types/funhub";
import { formatDistanceToNow, isPast, differenceInHours } from "date-fns";

interface CompetitionCardProps {
  competition: Competition;
  participantCount?: number;
  maxParticipants?: number | null;
  userTeamId?: string;
  isEligible?: boolean;
  isUserParticipating?: boolean;
  onJoinCompetition?: () => void;
  onNavigate?: (screen: string, competitionId?: string) => void;
}

export const CompetitionCard = ({ 
  competition, 
  participantCount = 0,
  maxParticipants = null,
  userTeamId,
  isEligible = true,
  isUserParticipating = false,
  onJoinCompetition,
  onNavigate
}: CompetitionCardProps) => {
  const sportConfig = SPORT_CONFIG[competition.sport];
  const divisionConfig = DIVISION_CONFIG.find(d => d.level === competition.division);
  
  const isFull = maxParticipants ? participantCount >= maxParticipants : false;
  const capacityText = maxParticipants ? `${participantCount}/${maxParticipants}` : `${participantCount} teams`;
  const capacityPercent = maxParticipants ? (participantCount / maxParticipants) * 100 : 0;
  
  // Registration deadline logic
  const registrationDeadline = competition.registration_deadline 
    ? new Date(competition.registration_deadline) 
    : null;
  const isRegistrationClosed = registrationDeadline ? isPast(registrationDeadline) : false;
  const hoursUntilDeadline = registrationDeadline 
    ? differenceInHours(registrationDeadline, new Date()) 
    : null;
  const isDeadlineSoon = hoursUntilDeadline !== null && hoursUntilDeadline > 0 && hoursUntilDeadline <= 24;
  
  // Min participants logic
  const minParticipants = competition.min_participants || 4;
  const teamsNeeded = Math.max(0, minParticipants - participantCount);
  
  // Get registration status
  const getRegistrationStatus = () => {
    if (competition.status !== 'upcoming') return null;
    if (isRegistrationClosed) return { label: 'Registration Closed', variant: 'destructive' as const };
    if (isFull) return { label: 'Full', variant: 'destructive' as const };
    if (isDeadlineSoon) return { label: 'Closing Soon', variant: 'secondary' as const };
    return { label: 'Open', variant: 'default' as const };
  };
  
  const registrationStatus = getRegistrationStatus();
  
  // Can user join?
  const canJoin = competition.status === 'upcoming' 
    && !isUserParticipating 
    && !isFull 
    && isEligible 
    && !isRegistrationClosed;
  
  return (
    <Card className={isUserParticipating ? "border-primary" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{sportConfig.icon}</span>
            <div>
              <CardTitle className="text-lg">{competition.name}</CardTitle>
              <CardDescription>{divisionConfig?.name}</CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={competition.status === 'active' ? 'default' : 'secondary'}>
              {competition.status}
            </Badge>
            {isUserParticipating && (
              <Badge variant="outline" className="text-xs">Joined</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="text-muted-foreground">Prize:</span>
            <span className="font-bold">{competition.prize_coins}</span>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Entry:</span>
            <span className="font-bold">{competition.entry_fee}</span>
          </div>
        </div>
        
        {/* Participant progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Teams:</span>
              <span className="font-bold">{capacityText}</span>
            </div>
            {registrationStatus && (
              <Badge variant={registrationStatus.variant}>{registrationStatus.label}</Badge>
            )}
          </div>
          {maxParticipants && (
            <Progress value={capacityPercent} className="h-2" />
          )}
          {teamsNeeded > 0 && competition.status === 'upcoming' && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {teamsNeeded} more team{teamsNeeded !== 1 ? 's' : ''} needed to start
            </p>
          )}
        </div>
        
        {/* Registration deadline */}
        {competition.status === 'upcoming' && registrationDeadline && !isRegistrationClosed && (
          <div className={`flex items-center gap-2 text-sm ${isDeadlineSoon ? 'text-destructive' : 'text-muted-foreground'}`}>
            <Clock className="h-4 w-4" />
            <span>
              Registration closes {formatDistanceToNow(registrationDeadline, { addSuffix: true })}
            </span>
          </div>
        )}
        
        {competition.status === 'active' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Ends {formatDistanceToNow(new Date(competition.end_date), { addSuffix: true })}</span>
          </div>
        )}
        
        {/* Format badge */}
        {competition.format === 'double_round_robin' && (
          <Badge variant="outline" className="text-xs">Home & Away</Badge>
        )}
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onNavigate?.('competition-details', competition.id)} 
            className="flex-1"
          >
            View Details
          </Button>
          {canJoin && onJoinCompetition && (
            <Button onClick={onJoinCompetition} className="flex-1">
              Join ({competition.entry_fee} coins)
            </Button>
          )}
          {competition.status === 'upcoming' && !isUserParticipating && !canJoin && (
            <Button disabled className="flex-1">
              {isRegistrationClosed ? 'Closed' : !isEligible ? 'Wrong Division' : 'Full'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
