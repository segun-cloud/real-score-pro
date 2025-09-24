import { useState } from "react";
import { 
  Home, 
  Trophy, 
  Dumbbell, 
  Circle,
  Users,
  Settings,
  ChevronRight
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AppSidebarProps {
  selectedSport: string;
  onSportChange: (sport: string) => void;
}

const sports = [
  { id: 'all', name: 'All Sports', icon: Trophy, emoji: '🏆' },
  { id: 'football', name: 'Football', icon: Circle, emoji: '⚽' },
  { id: 'basketball', name: 'Basketball', icon: Circle, emoji: '🏀' },
  { id: 'tennis', name: 'Tennis', icon: Circle, emoji: '🎾' },
  { id: 'baseball', name: 'Baseball', icon: Circle, emoji: '⚾' },
  { id: 'boxing', name: 'Boxing', icon: Dumbbell, emoji: '🥊' },
];

export function AppSidebar({ selectedSport, onSportChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [sportsOpen, setSportsOpen] = useState(true);

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <h2 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
            RealScore
          </h2>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Home className="h-4 w-4" />
                  {!collapsed && <span>Home</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Users className="h-4 w-4" />
                  {!collapsed && <span>Leagues</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings className="h-4 w-4" />
                  {!collapsed && <span>Settings</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sports Filter */}
        <Collapsible open={sportsOpen} onOpenChange={setSportsOpen}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 px-2 py-1 rounded">
                Sports Filter
                {!collapsed && (
                  <ChevronRight className={`h-3 w-3 transition-transform ${sportsOpen ? 'rotate-90' : ''}`} />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sports.map((sport) => (
                    <SidebarMenuItem key={sport.id}>
                      <SidebarMenuButton
                        onClick={() => onSportChange(sport.id)}
                        className={selectedSport === sport.id ? "bg-primary/10 text-primary font-medium" : ""}
                      >
                        <span className="text-base">{sport.emoji}</span>
                        {!collapsed && <span className="text-sm">{sport.name}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
    </Sidebar>
  );
}