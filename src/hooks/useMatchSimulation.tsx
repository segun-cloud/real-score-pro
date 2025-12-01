import { useState, useCallback, useRef } from 'react';

interface SimulationEvent {
  minute: number;
  type: 'goal' | 'basket' | 'point' | 'run' | 'punch';
  team: 'home' | 'away';
  ballPosition?: { x: number; y: number };
}

interface UseMatchSimulationProps {
  homeTeam: string;
  awayTeam: string;
  homeStrength?: number;
  awayStrength?: number;
  sport: string;
}

export const useMatchSimulation = ({ homeTeam, awayTeam, homeStrength = 50, awayStrength = 50, sport }: UseMatchSimulationProps) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
  const [currentEvent, setCurrentEvent] = useState<SimulationEvent | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventsRef = useRef<SimulationEvent[]>([]);

  const generateEvents = useCallback((sport: string, homeStr: number, awayStr: number): SimulationEvent[] => {
    const events: SimulationEvent[] = [];
    const totalStrength = homeStr + awayStr;
    const homeAdvantage = 1.1; // Home team gets 10% boost
    const adjustedHomeStr = homeStr * homeAdvantage;
    
    switch (sport) {
      case 'football': {
        // Football: 0-5 goals per team
        const totalGoals = Math.floor(Math.random() * 4) + 1; // 1-4 goals
        for (let i = 0; i < totalGoals; i++) {
          const minute = Math.floor(Math.random() * 90) + 1;
          const isHomeGoal = Math.random() * (adjustedHomeStr + awayStr) < adjustedHomeStr;
          events.push({
            minute,
            type: 'goal',
            team: isHomeGoal ? 'home' : 'away',
            ballPosition: { x: isHomeGoal ? 85 : 15, y: 50 }
          });
        }
        break;
      }
      
      case 'basketball': {
        // Basketball: 60-120 points per team
        const homePoints = Math.floor(Math.random() * 40) + 60 + (adjustedHomeStr / totalStrength) * 20;
        const awayPoints = Math.floor(Math.random() * 40) + 60 + (awayStr / totalStrength) * 20;
        const totalBaskets = Math.floor((homePoints + awayPoints) / 2.5); // Average 2.5 points per basket
        
        for (let i = 0; i < totalBaskets; i++) {
          const minute = Math.floor(Math.random() * 48) + 1;
          const isHomeBasket = Math.random() * (adjustedHomeStr + awayStr) < adjustedHomeStr;
          events.push({
            minute,
            type: 'basket',
            team: isHomeBasket ? 'home' : 'away',
            ballPosition: { x: isHomeBasket ? 80 : 20, y: 50 }
          });
        }
        break;
      }
      
      case 'tennis': {
        // Tennis: 0-3 sets
        const sets = Math.floor(Math.random() * 3) + 2; // 2-4 sets
        for (let i = 1; i <= sets; i++) {
          const minute = i * 20; // 20 minutes per set simulation
          const isHomeSet = Math.random() * (adjustedHomeStr + awayStr) < adjustedHomeStr;
          events.push({
            minute,
            type: 'point',
            team: isHomeSet ? 'home' : 'away',
            ballPosition: { x: isHomeSet ? 60 : 40, y: 50 }
          });
        }
        break;
      }
      
      case 'baseball': {
        // Baseball: 0-8 runs
        const totalRuns = Math.floor(Math.random() * 6) + 2; // 2-7 runs
        for (let i = 0; i < totalRuns; i++) {
          const minute = Math.floor(Math.random() * 90) + 1;
          const isHomeRun = Math.random() * (adjustedHomeStr + awayStr) < adjustedHomeStr;
          events.push({
            minute,
            type: 'run',
            team: isHomeRun ? 'home' : 'away',
            ballPosition: { x: 50, y: 50 }
          });
        }
        break;
      }
      
      case 'boxing': {
        // Boxing: Points/rounds
        const rounds = 12;
        for (let i = 1; i <= rounds; i++) {
          const minute = i * 3;
          const isHomePunch = Math.random() * (adjustedHomeStr + awayStr) < adjustedHomeStr;
          events.push({
            minute,
            type: 'punch',
            team: isHomePunch ? 'home' : 'away',
            ballPosition: { x: 50, y: 50 }
          });
        }
        break;
      }
    }
    
    return events.sort((a, b) => a.minute - b.minute);
  }, []);

  const getMaxMinute = (sport: string) => {
    switch (sport) {
      case 'football': return 90;
      case 'basketball': return 48;
      case 'tennis': return 100;
      case 'baseball': return 90;
      case 'boxing': return 36;
      default: return 90;
    }
  };

  const startSimulation = useCallback(() => {
    setIsSimulating(true);
    setCurrentMinute(0);
    setHomeScore(0);
    setAwayScore(0);
    setCurrentEvent(null);
    
    // Generate all events upfront
    const events = generateEvents(sport, homeStrength, awayStrength);
    eventsRef.current = events;
    
    const maxMinute = getMaxMinute(sport);
    const simulationDuration = 30000; // 30 seconds
    const intervalTime = simulationDuration / maxMinute;
    let minute = 0;
    let eventIndex = 0;

    intervalRef.current = setInterval(() => {
      minute++;
      setCurrentMinute(minute);
      
      // Random ball movement
      setBallPosition({
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10
      });
      
      // Check if any events occur at this minute
      while (eventIndex < events.length && events[eventIndex].minute <= minute) {
        const event = events[eventIndex];
        setCurrentEvent(event);
        
        if (event.ballPosition) {
          setBallPosition(event.ballPosition);
        }
        
        // Update scores based on event type
        if (event.type === 'goal' || event.type === 'run') {
          if (event.team === 'home') {
            setHomeScore(prev => prev + 1);
          } else {
            setAwayScore(prev => prev + 1);
          }
        } else if (event.type === 'basket') {
          const points = Math.random() > 0.7 ? 3 : 2;
          if (event.team === 'home') {
            setHomeScore(prev => prev + points);
          } else {
            setAwayScore(prev => prev + points);
          }
        } else if (event.type === 'point') {
          if (event.team === 'home') {
            setHomeScore(prev => prev + 1);
          } else {
            setAwayScore(prev => prev + 1);
          }
        } else if (event.type === 'punch') {
          const points = Math.floor(Math.random() * 3) + 1;
          if (event.team === 'home') {
            setHomeScore(prev => prev + points);
          } else {
            setAwayScore(prev => prev + points);
          }
        }
        
        // Clear event after 1 second
        setTimeout(() => setCurrentEvent(null), 1000);
        eventIndex++;
      }
      
      if (minute >= maxMinute) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setIsSimulating(false);
      }
    }, intervalTime);
  }, [sport, homeStrength, awayStrength, generateEvents]);

  const stopSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsSimulating(false);
  }, []);

  return {
    isSimulating,
    currentMinute,
    homeScore,
    awayScore,
    ballPosition,
    currentEvent,
    startSimulation,
    stopSimulation,
    maxMinute: getMaxMinute(sport)
  };
};
