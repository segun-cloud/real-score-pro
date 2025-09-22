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
  return (
    <div className={`${vertical ? 'flex flex-col space-y-1' : 'flex space-x-1'} p-1 bg-muted rounded-lg`}>
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={activeTab === tab.id ? "default" : "ghost"}
          onClick={() => onTabChange(tab.id)}
          className={`${vertical ? 'justify-start' : 'flex-1'} ${
            activeTab === tab.id 
              ? 'bg-primary text-primary-foreground shadow-soft' 
              : 'hover:bg-secondary'
          }`}
        >
          {tab.icon && <span className="mr-2">{tab.icon}</span>}
          <span className={vertical ? '' : 'text-xs sm:text-sm'}>{tab.label}</span>
        </Button>
      ))}
    </div>
  );
};