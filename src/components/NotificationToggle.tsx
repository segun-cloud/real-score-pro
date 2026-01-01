import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NotificationToggleProps {
  userId: string | undefined;
}

export const NotificationToggle = ({ userId }: NotificationToggleProps) => {
  const { isSupported, isSubscribed, isLoading, permission, toggle } = usePushNotifications(userId);

  if (!isSupported) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" disabled className="opacity-50">
            <BellOff className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Push notifications not supported</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (permission === 'denied') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" disabled className="opacity-50">
            <BellOff className="h-5 w-5 text-destructive" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Notifications blocked. Enable in browser settings.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggle}
          disabled={isLoading || !userId}
        >
          {isSubscribed ? (
            <BellRing className="h-5 w-5 text-primary" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isSubscribed ? 'Goal notifications ON' : 'Enable goal notifications'}</p>
      </TooltipContent>
    </Tooltip>
  );
};
