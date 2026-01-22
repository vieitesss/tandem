import { formatCurrency, formatMonthLabel } from "../shared/format";
import Tooltip from "../shared/Tooltip";

// Helper for compact currency display on chart
const formatCompact = (value) => {
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(1)}k`;
  }
  return `€${Math.round(value)}`;
};

export default function TimelineViz({ monthlyData }) {
  if (!monthlyData || monthlyData.length === 0) {
    return null;
  }

  // Find the max value to scale the bars
  const maxAmount = Math.max(...monthlyData.map((d) => d.total_spent), 1);

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[600px] px-2">
        <div className="flex h-64 items-end gap-3 border-b border-cream-500/15 pb-2">
          {monthlyData.map((data) => {
            const heightPercent = Math.max(
              (data.total_spent / maxAmount) * 100,
              4
            );
            
            return (
              <div
                key={data.month}
                className="group relative flex flex-1 flex-col justify-end gap-2"
              >
                {/* Value Label */}
                <div 
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 text-[10px] font-bold text-cream-100/70 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-cream-50"
                >
                  {formatCompact(data.total_spent)}
                </div>

                <Tooltip 
                  label={`${formatMonthLabel(data.month)}: ${formatCurrency(data.total_spent)} (${data.transaction_count} txns)`}
                  position="top"
                >
                  <div
                    className="w-full rounded-t-sm bg-cream-500/40 transition-all duration-500 ease-out hover:bg-cream-500/80 group-hover:scale-y-[1.02] group-hover:shadow-[0_0_15px_rgba(229,213,184,0.3)]"
                    style={{ height: `${heightPercent}%` }}
                  >
                    {/* Inner glowing bar */}
                    <div className="absolute inset-x-0 bottom-0 h-full w-full bg-gradient-to-t from-cream-500/30 to-transparent opacity-60" />
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-cream-100/30" />
                  </div>
                </Tooltip>
              </div>
            );
          })}
        </div>
        {/* X-Axis Labels */}
        <div className="flex gap-3 pt-2">
          {monthlyData.map((data) => (
            <div
              key={data.month}
              className="flex-1 text-center text-[10px] font-medium uppercase tracking-wider text-cream-100/40 truncate"
            >
              {data.month.slice(5)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
