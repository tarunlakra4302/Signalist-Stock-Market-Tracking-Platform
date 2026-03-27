'use client';

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  scriptUrl: string;
  config: any;
  className?: string;
  height?: number | string;
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  scriptUrl,
  config,
  className = '',
  height = 400,
}) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    // Clear previous children
    container.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify(config);

    container.current.appendChild(script);

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [scriptUrl, config]);

  return (
    <div
      className={`tradingview-widget-container ${className}`}
      ref={container}
      style={{ height, width: '100%' }}
    >
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
};

export default memo(TradingViewWidget);
