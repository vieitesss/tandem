import { useEffect, useMemo, useRef, useState } from "react";

import { formatCurrency, formatMonthLabel } from "../shared/format";
import Tooltip from "../shared/Tooltip";

// Helper for compact currency display on chart
const formatCompact = (value) => {
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(1)}k`;
  }
  return `€${Math.round(value)}`;
};

const formatMonthYear = (value) => {
  const [year, month] = value.split("-");
  if (!year || !month) {
    return value;
  }
  return `${month}/${year.slice(2)}`;
};

const timelineLayout = {
  fallbackWidth: 600,
  padding: { horizontal: 16 },
  desktop: { monthThreshold: 9 },
  mobile: { monthThreshold: 6, minBarWidth: 28 },
};

const getBaseWidth = (containerWidth) =>
  Math.max(
    (containerWidth || timelineLayout.fallbackWidth) -
      timelineLayout.padding.horizontal,
    0
  );

const buildTimelineLayout = ({ monthCount, baseWidth, isMobile }) => {
  if (monthCount === 0) {
    return { chartWidth: 0, barWidth: 0, dataWidth: 0 };
  }

  if (isMobile) {
    const fillBarWidth = baseWidth / monthCount;
    const canFill =
      monthCount <= timelineLayout.mobile.monthThreshold &&
      fillBarWidth >= timelineLayout.mobile.minBarWidth;

    if (canFill) {
      return {
        chartWidth: baseWidth,
        barWidth: fillBarWidth,
        dataWidth: baseWidth,
      };
    }

    const barWidth = Math.max(
      baseWidth / timelineLayout.mobile.monthThreshold,
      timelineLayout.mobile.minBarWidth
    );
    const dataWidth = monthCount * barWidth;
    return { chartWidth: dataWidth, barWidth, dataWidth };
  }

  if (monthCount <= timelineLayout.desktop.monthThreshold) {
    const chartWidth = baseWidth;
    return {
      chartWidth,
      barWidth: chartWidth / monthCount,
      dataWidth: chartWidth,
    };
  }

  const barWidth = baseWidth / timelineLayout.desktop.monthThreshold;
  const dataWidth = monthCount * barWidth;
  return { chartWidth: dataWidth, barWidth, dataWidth };
};

export default function TimelineViz({ monthlyData }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return undefined;
    }

    const updateWidth = () => {
      setContainerWidth(element.getBoundingClientRect().width);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleChange = (event) => setIsMobile(event.matches);

    handleChange(mediaQuery);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const monthCount = Array.isArray(monthlyData) ? monthlyData.length : 0;
  const baseWidth = getBaseWidth(containerWidth);

  const { chartWidth, barWidth, dataWidth } = useMemo(
    () => buildTimelineLayout({ monthCount, baseWidth, isMobile }),
    [baseWidth, isMobile, monthCount]
  );

  if (monthCount === 0) {
    return null;
  }

  const maxAmount = Math.max(...monthlyData.map((entry) => Number(entry.total_spent || 0)), 1);
  const chartHeight = 248;
  const topPadding = 20;
  const bottomPadding = 22;
  const maxPlotHeight = chartHeight - topPadding - bottomPadding;
  const points = monthlyData.map((data, index) => {
    const x = index * barWidth + barWidth / 2;
    const ratio = Number(data.total_spent || 0) / maxAmount;
    const y = chartHeight - bottomPadding - ratio * maxPlotHeight;
    return {
      month: data.month,
      value: Number(data.total_spent || 0),
      transaction_count: data.transaction_count,
      x,
      y,
    };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const horizontalGuides = [0.25, 0.5, 0.75].map((value) => {
    return chartHeight - bottomPadding - value * maxPlotHeight;
  });

  return (
    <div className="w-full overflow-x-auto pb-4" ref={containerRef}>
      <div className="px-2">
        <div className="relative h-64" style={{ width: `${chartWidth}px` }}>
          <svg
            className="h-full w-full"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            {horizontalGuides.map((y) => (
              <line
                key={`guide-${y}`}
                x1="0"
                y1={y}
                x2={dataWidth}
                y2={y}
                stroke="rgba(71, 84, 103, 0.16)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
            ))}
            <path
              d={linePath}
              fill="none"
              stroke="rgba(46, 78, 115, 0.9)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((point) => {
              return (
                <circle
                  key={`${point.month}-dot`}
                  cx={point.x}
                  cy={point.y}
                  r="3.2"
                  fill="rgba(46, 78, 115, 1)"
                />
              );
            })}
            <line
              x1="0"
              y1={chartHeight - bottomPadding}
              x2={dataWidth}
              y2={chartHeight - bottomPadding}
              stroke="rgba(71, 84, 103, 0.26)"
              strokeWidth="1"
            />
          </svg>
          {points.map((point) => {
            const xStart = point.x - barWidth / 2;
            const labelTop = Math.max(point.y - 6, 0);
            return (
              <div
                key={point.month}
                className="group absolute bottom-0"
                style={{ left: `${xStart}px`, width: `${barWidth}px`, height: "100%" }}
              >
                <span
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-full text-[10px] font-semibold text-cream-300 transition-all duration-200 group-hover:text-cream-100"
                  style={{ top: `${labelTop}px` }}
                >
                  {formatCompact(point.value)}
                </span>
                <Tooltip
                  label={`${formatMonthLabel(point.month)}: ${formatCurrency(point.value)} (${point.transaction_count} txns)`}
                  className="absolute inset-0 h-full w-full [&>span:nth-child(2)]:hidden"
                >
                  <span className="absolute inset-0" />
                </Tooltip>
              </div>
            );
          })}
        </div>
        <div
          className="grid pt-3"
          style={{
            width: `${dataWidth}px`,
            gridTemplateColumns: `repeat(${monthlyData.length}, minmax(0, 1fr))`,
          }}
        >
          {monthlyData.map((data) => (
            <div
              key={data.month}
              className="truncate text-center text-[10px] font-medium uppercase tracking-wider text-cream-300/70"
            >
              {formatMonthYear(data.month)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
