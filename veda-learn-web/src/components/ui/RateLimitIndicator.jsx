import { useState, useEffect } from 'react';
import api from '../../lib/api';

export default function RateLimitIndicator({ className = '' }) {
  const [cooldownTime, setCooldownTime] = useState(0);
  const [canAnalyze, setCanAnalyze] = useState(true);

  useEffect(() => {
    const updateStatus = () => {
      const cooldown = api.getCooldownTime();
      const available = api.canAnalyze();
      
      setCooldownTime(cooldown);
      setCanAnalyze(available);
    };

    // Update immediately
    updateStatus();

    // Update every second while in cooldown
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  if (canAnalyze) {
    return (
      <div className={`flex items-center text-green-400 text-xs ${className}`}>
        <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
        Analysis ready
      </div>
    );
  }

  return (
    <div className={`flex items-center text-yellow-400 text-xs ${className}`}>
      <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></div>
      Cooldown: {cooldownTime}s
    </div>
  );
}