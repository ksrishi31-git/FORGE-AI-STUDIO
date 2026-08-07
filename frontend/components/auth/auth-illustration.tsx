import { cn } from "@/lib/utils";

/**
 * Abstract agent-pipeline illustration for the authentication shell.
 * Flat stroke-based SVG using design tokens only — no gradients, no art.
 */
export function AuthIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 260"
      fill="none"
      aria-hidden="true"
      className={cn("h-auto w-full text-primary", className)}
    >
      {/* Edges */}
      <path d="M116 130 H 148" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <path d="M 196 112 C 226 84, 258 68, 296 68" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <path
        d="M 196 148 C 226 176, 258 192, 296 192"
        stroke="hsl(var(--border))"
        strokeWidth="1.5"
      />
      <path d="M 396 68 V 104" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <path
        d="M 396 192 C 418 178, 432 160, 446 154"
        stroke="hsl(var(--border))"
        strokeWidth="1.5"
      />

      {/* Nodes */}
      <g>
        <rect
          x="16"
          y="104"
          width="100"
          height="52"
          rx="8"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
        />
        <text
          x="66"
          y="128"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="hsl(var(--foreground))"
        >
          Requirement
        </text>
        <circle cx="34" cy="122" r="3" fill="hsl(var(--success))" />
      </g>

      <g>
        <rect
          x="148"
          y="104"
          width="100"
          height="52"
          rx="8"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
        />
        <text
          x="198"
          y="128"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="hsl(var(--foreground))"
        >
          Planning
        </text>
        <circle cx="166" cy="122" r="3" fill="hsl(var(--success))" />
      </g>

      <g>
        <rect
          x="296"
          y="44"
          width="100"
          height="48"
          rx="8"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
        />
        <text
          x="346"
          y="68"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="hsl(var(--foreground))"
        >
          Build
        </text>
        <circle cx="314" cy="62" r="3" fill="hsl(var(--success))" />
      </g>

      <g>
        <rect
          x="296"
          y="168"
          width="100"
          height="48"
          rx="8"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
        />
        <text
          x="346"
          y="192"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="hsl(var(--foreground))"
        >
          Validate
        </text>
        <circle cx="314" cy="186" r="3" fill="hsl(var(--success))" />
      </g>

      {/* Active node */}
      <g>
        <rect
          x="396"
          y="104"
          width="100"
          height="52"
          rx="8"
          fill="hsl(var(--accent))"
          stroke="hsl(var(--primary))"
        />
        <text
          x="446"
          y="128"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="hsl(var(--accent-foreground))"
        >
          Deliver
        </text>
        <circle cx="414" cy="122" r="3" fill="hsl(var(--primary))" />
      </g>
    </svg>
  );
}
