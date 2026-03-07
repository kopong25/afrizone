import { useState } from "react";

export function StarDisplay({ rating = 0, size = 16, showNumber = false, count = null }) {
  const filled = Math.floor(rating);
  const half = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} width={size} height={size} viewBox="0 0 20 20"
            className={i <= filled ? "text-yellow-400" : i === filled + 1 && half ? "text-yellow-400" : "text-gray-200"}>
            {i <= filled ? (
              <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7"
                fill="currentColor" />
            ) : i === filled + 1 && half ? (
              <>
                <defs>
                  <linearGradient id={`half-${i}`}>
                    <stop offset="50%" stopColor="#facc15" />
                    <stop offset="50%" stopColor="#e5e7eb" />
                  </linearGradient>
                </defs>
                <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7"
                  fill={`url(#half-${i})`} />
              </>
            ) : (
              <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7"
                fill="currentColor" />
            )}
          </svg>
        ))}
      </div>
      {showNumber && <span className="text-sm font-semibold text-gray-700">{Number(rating).toFixed(1)}</span>}
      {count !== null && <span className="text-sm text-gray-400">({count})</span>}
    </div>
  );
}

export function StarPicker({ value = 0, onChange, size = 28 }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button"
            onClick={() => onChange(i)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 focus:outline-none">
            <svg width={size} height={size} viewBox="0 0 20 20"
              className={i <= display ? "text-yellow-400" : "text-gray-200"}>
              <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7"
                fill="currentColor" />
            </svg>
          </button>
        ))}
      </div>
      {display > 0 && (
        <p className="text-sm font-semibold text-yellow-600">{labels[display]}</p>
      )}
    </div>
  );
}