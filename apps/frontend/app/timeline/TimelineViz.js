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
  const horizontalPadding = 16;
  const fallbackWidth = 600;
  const baseWidth = Math.max(
    (containerWidth || fallbackWidth) - horizontalPadding,
    0
  );
  const desktopMonthThreshold = 9;
  const mobileMonthThreshold = 6;
  const mobileMinBarWidth = 28;

  const { chartWidth, barWidth, dataWidth } = useMemo(() => {
    if (monthCount === 0) {
      return { chartWidth: 0, barWidth: 0, dataWidth: 0 };
    }

    if (isMobile) {
      const fillBarWidth = baseWidth / monthCount;
      const canFill =
        monthCount <= mobileMonthThreshold && fillBarWidth >= mobileMinBarWidth;

      if (canFill) {
        return {
          chartWidth: baseWidth,
          barWidth: fillBarWidth,
          dataWidth: baseWidth,
        };
      }

      const barWidth = Math.max(
        baseWidth / mobileMonthThreshold,
        mobileMinBarWidth
      );
      const dataWidth = monthCount * barWidth;
      return { chartWidth: dataWidth, barWidth, dataWidth };
    }

    if (monthCount <= desktopMonthThreshold) {
      const chartWidth = baseWidth;
      return {
        chartWidth,
        barWidth: chartWidth / monthCount,
        dataWidth: chartWidth,
      };
    }

    const barWidth = baseWidth / desktopMonthThreshold;
    const dataWidth = monthCount * barWidth;
    return { chartWidth: dataWidth, barWidth, dataWidth };
  }, [baseWidth, isMobile, monthCount]);

  if (monthCount === 0) {
    return null;
  }

  // Find the max value to scale the bars
  const maxAmount = Math.max(...monthlyData.map((d) => d.total_spent), 1);
  const chartHeight = 256;
  const topPadding = 18;
  const minBarHeight = 8;
  const transitionSpan = Math.min(barWidth * 0.2, 12);
  const stepInset = Math.min(transitionSpan, barWidth * 0.35);
  const cornerRadius = Math.min(stepInset * 0.8, 8);
  const labelOffset = 4;
  const maxBarHeight = chartHeight - topPadding;
  const heights = monthlyData.map((data) =>
    Math.max((data.total_spent / maxAmount) * maxBarHeight, minBarHeight)
  );
  const yPositions = heights.map((height) => chartHeight - height);

  const areaPath = (() => {
    let path = `M 0 ${chartHeight}`;
    if (yPositions.length === 0) {
      return path;
    }
    path += ` L 0 ${yPositions[0]}`;
    yPositions.forEach((y, index) => {
      const xStart = index * barWidth;
      const xEnd = xStart + barWidth;
      const flatStart = index === 0 ? xStart : xStart + stepInset;
      const flatEnd =
        index === yPositions.length - 1 ? xEnd : xEnd - stepInset;
      path += ` L ${flatStart} ${y}`;
      path += ` L ${flatEnd} ${y}`;
      if (index < yPositions.length - 1) {
        const nextY = yPositions[index + 1];
        const transitionEnd = xEnd + stepInset;
        path += ` C ${flatEnd + cornerRadius} ${y} ${transitionEnd - cornerRadius} ${nextY} ${transitionEnd} ${nextY}`;
      }
    });
    path += ` L ${dataWidth} ${chartHeight} Z`;
    return path;
  })();

  const strokePath = (() => {
    if (yPositions.length === 0) {
      return "";
    }
    let path = `M 0 ${yPositions[0]}`;
    yPositions.forEach((y, index) => {
      const xStart = index * barWidth;
      const xEnd = xStart + barWidth;
      const flatStart = index === 0 ? xStart : xStart + stepInset;
      const flatEnd =
        index === yPositions.length - 1 ? xEnd : xEnd - stepInset;
      path += ` L ${flatStart} ${y}`;
      path += ` L ${flatEnd} ${y}`;
      if (index < yPositions.length - 1) {
        const nextY = yPositions[index + 1];
        const transitionEnd = xEnd + stepInset;
        path += ` C ${flatEnd + cornerRadius} ${y} ${transitionEnd - cornerRadius} ${nextY} ${transitionEnd} ${nextY}`;
      }
    });
    return path;
  })();

  return (
    <div className="w-full overflow-x-auto pb-4" ref={containerRef}>
      <div className="px-2">
        <div className="relative h-64" style={{ width: `${chartWidth}px` }}>
          <svg
            className="h-full w-full"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id="timeline-area"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="rgba(229, 213, 184, 0.55)" />
                <stop offset="100%" stopColor="rgba(229, 213, 184, 0.08)" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#timeline-area)" />
            <path
              d={strokePath}
              fill="none"
              stroke="rgba(244, 236, 210, 0.9)"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {monthlyData.map((data, index) => {
              const x = index * barWidth;
              return (
                <line
                  key={`${data.month}-divider`}
                  x1={x}
                  y1="0"
                  x2={x}
                  y2={chartHeight}
                  stroke="rgba(229, 213, 184, 0.2)"
                  strokeWidth="1"
                />
              );
            })}
            <line
              x1="0"
              y1={chartHeight}
              x2={dataWidth}
              y2={chartHeight}
              stroke="rgba(229, 213, 184, 0.25)"
              strokeWidth="1"
            />
          </svg>
          {monthlyData.map((data, index) => {
            const xStart = index * barWidth;
            const flatStart = index === 0 ? 0 : stepInset;
            const flatEnd =
              index === yPositions.length - 1 ? barWidth : barWidth - stepInset;
            const labelLeft = (flatStart + flatEnd) / 2;
            const labelTop = Math.max(yPositions[index] - labelOffset, 0);
            return (
              <div
                key={data.month}
                className="group absolute bottom-0"
                style={{ left: `${xStart}px`, width: `${barWidth}px`, height: "100%" }}
              >
                <span
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-full text-[10px] font-bold text-cream-100/70 transition-all duration-300 group-hover:-translate-y-[110%] group-hover:text-cream-50"
                  style={{ top: `${labelTop}px`, left: `${labelLeft}px` }}
                >
                  {formatCompact(data.total_spent)}
                </span>
                <Tooltip
                  label={`${formatMonthLabel(data.month)}: ${formatCurrency(data.total_spent)} (${data.transaction_count} txns)`}
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
              className="text-center text-[10px] font-medium uppercase tracking-wider text-cream-100/40 truncate"
            >
              {formatMonthYear(data.month)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
