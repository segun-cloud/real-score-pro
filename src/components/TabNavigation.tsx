import { Button } from "@/components/ui/button";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  vertical?: boolean;
}

export const TabNavigation = ({ tabs, activeTab, onTabChange, vertical = false }: TabNavigationProps) => {
  if (vertical) {
    return (
      <div className="h-full">
        <div className="flex h-full flex-col gap-2 p-1 bg-muted rounded-lg overflow-y-auto">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => onTabChange(tab.id)}
              className={`justify-start w-full text-xs px-3 py-2 ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "hover:bg-secondary"
              }`}
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              <span className="truncate">{tab.label}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full max-w-full">
      <div className="p-1 bg-muted rounded-lg overflow-x-auto w-full">
        <div className="flex gap-1 min-w-max snap-x snap-mandatory">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => onTabChange(tab.id)}
              className={`whitespace-nowrap px-3 ${
                activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground shadow-soft' 
                  : 'hover:bg-secondary'
              } snap-start`}
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              <span className="text-xs sm:text-sm">{tab.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};