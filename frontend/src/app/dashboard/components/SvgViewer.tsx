import type { SimulatedObject, Position } from "@/lib/api";

/** SVG canvas dimensions */
const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;

/**
 * Renders a direction indicator line from origin to angle.
 */
function DirectionIndicator({
  position,
  color,
}: {
  position: Position;
  color: string;
}) {
  const length = 15;
  const angleRad = (position.angle * Math.PI) / 180;
  const x2 = position.x + length * Math.cos(angleRad);
  const y2 = position.y - length * Math.sin(angleRad); // SVG y-axis is inverted

  return (
    <line
      x1={position.x}
      y1={position.y}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      opacity={0.7}
    />
  );
}

/**
 * Renders a single simulated object as SVG.
 */
export function ShapeRenderer({
  obj,
  index,
}: {
  obj: SimulatedObject;
  index: number;
}) {
  const { shape, color, position } = obj;
  const label = `${index + 1}`;

  return (
    <g>
      {shape.type === "circle" ? (
        <circle
          cx={position.x}
          cy={position.y}
          r={shape.radius}
          fill={color}
          fillOpacity={0.6}
          stroke={color}
          strokeWidth={2}
        />
      ) : (
        // Placeholder for future shapes
        <circle
          cx={position.x}
          cy={position.y}
          r={20}
          fill="#9ca3af"
          fillOpacity={0.4}
          stroke="#6b7280"
          strokeWidth={1}
          strokeDasharray="4 2"
        />
      )}
      <DirectionIndicator position={position} color={color} />
      <text
        x={position.x}
        y={position.y + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="#1e293b"
        style={{ pointerEvents: "none" }}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Grid lines for spatial reference.
 */
function Grid() {
  const lines: React.ReactNode[] = [];
  const step = 50;

  for (let x = 0; x <= VIEW_WIDTH; x += step) {
    lines.push(
      <line
        key={`v${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={VIEW_HEIGHT}
        stroke="#e5e7eb"
        strokeWidth={x === 0 ? 1.5 : 0.5}
      />
    );
  }
  for (let y = 0; y <= VIEW_HEIGHT; y += step) {
    lines.push(
      <line
        key={`h${y}`}
        x1={0}
        y1={y}
        x2={VIEW_WIDTH}
        y2={y}
        stroke="#e5e7eb"
        strokeWidth={y === 0 ? 1.5 : 0.5}
      />
    );
  }
  return <g>{lines}</g>;
}

/**
 * SVG viewer for a list of simulated objects.
 */
export function SvgViewer({ objects }: { objects: SimulatedObject[] }) {
  if (objects.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
          borderRadius: "0.375rem",
          border: "1px solid #e5e7eb",
          color: "#9ca3af",
          fontSize: "0.875rem",
        }}
      >
        No objects to render.
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      style={{
        width: "100%",
        height: "auto",
        maxHeight: 600,
        border: "1px solid #e5e7eb",
        borderRadius: "0.375rem",
        background: "#fafbfc",
      }}
      role="img"
      aria-label={`Simulation output: ${objects.length} objects`}
    >
      <Grid />
      {objects.map((obj, i) => (
        <ShapeRenderer key={i} obj={obj} index={i} />
      ))}
    </svg>
  );
}
