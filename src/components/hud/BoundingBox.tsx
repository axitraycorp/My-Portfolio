import clsx from "clsx";
import type { Channel } from "@/content/profile";

type BoundingBoxProps = {
   /** Class label, e.g. "cup". */
   label?: string;
   /** 0–1 confidence shown after the label. */
   confidence?: number;
   channel?: Channel;
   /** Play the lock-on animation when mounted. */
   animate?: boolean;
   className?: string;
   style?: React.CSSProperties;
};

/**
 * Detection-style bounding box. Absolutely positioned: place it inside a
 * `position: relative` element (it fills it) or give it explicit coordinates.
 */
export function BoundingBox({
   label,
   confidence,
   channel = "camera",
   animate = true,
   className,
   style,
}: BoundingBoxProps) {
   const text = [label, confidence !== undefined ? confidence.toFixed(2) : undefined]
      .filter(Boolean)
      .join(" ");
   return (
      <span
         className={clsx("bbox", className)}
         data-channel={channel}
         data-animate={animate ? "" : undefined}
         style={style}
         aria-hidden="true"
      >
         {text && <span className="bbox__label">{text}</span>}
      </span>
   );
}
