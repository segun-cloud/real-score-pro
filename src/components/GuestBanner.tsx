import { Button } from "@/components/ui/button";
import { LogIn, Star } from "lucide-react";

interface GuestBannerProps {
  onLogin: () => void;
  onSignup: () => void;
}

export const GuestBanner = ({ onLogin, onSignup }: GuestBannerProps) => {
  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
          <Star className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">Unlock Full Features</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Sign up to save favorites, get goal notifications, join competitions, and more!
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={onSignup} className="flex-1">
              Sign Up Free
            </Button>
            <Button size="sm" variant="outline" onClick={onLogin} className="flex-1">
              <LogIn className="h-4 w-4 mr-1" />
              Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
