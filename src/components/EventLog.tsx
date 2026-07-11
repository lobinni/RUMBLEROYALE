import type { RoundEvent } from "../engine/gameEngine";

interface EventLogProps {
  events: RoundEvent[];
  animated?: boolean;
}

function parseDescription(desc: string) {
  const parts = desc.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} className="font-bold text-white">
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function getEventStyle(highlight: RoundEvent["highlight"]) {
  switch (highlight) {
    case "kill":
      return "border-red-500/30 bg-red-500/5";
    case "buff":
      return "border-green-500/30 bg-green-500/5";
    case "danger":
      return "border-orange-500/30 bg-orange-500/5";
    case "special":
      return "border-purple-500/30 bg-purple-500/5";
    default:
      return "border-gray-700/30 bg-gray-800/30";
  }
}

function getEventTextColor(highlight: RoundEvent["highlight"]) {
  switch (highlight) {
    case "kill":
      return "text-red-300";
    case "buff":
      return "text-green-300";
    case "danger":
      return "text-orange-300";
    case "special":
      return "text-purple-300";
    default:
      return "text-gray-300";
  }
}

export default function EventLog({ events, animated = false }: EventLogProps) {
  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <div
          key={event.id}
          className={`px-4 py-3 rounded-xl border ${getEventStyle(event.highlight)} transition-all duration-300 ${
            animated ? "animate-slideIn" : ""
          }`}
          style={animated ? { animationDelay: `${index * 150}ms` } : undefined}
        >
          <div className={`text-sm leading-relaxed ${getEventTextColor(event.highlight)}`}>
            <span className="mr-2 text-base">{event.icon}</span>
            {parseDescription(event.description)}
          </div>
          {event.killed.length > 0 && (
            <div className="mt-1 text-xs text-red-400/70 font-medium">
              ☠️ {event.killed.length} eliminated
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
