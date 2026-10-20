import clsx from "clsx";
import type { Channel } from "@/content/profile";

type HudFrameProps = React.HTMLAttributes<HTMLElement> & {
   as?: "div" | "section" | "article" | "figure" | "aside";
   channel?: Channel;
   /** Fill with the surface colour. */
   surface?: boolean;
};

/** Corner-bracket frame around any content. Pure CSS (see .hud-frame). */
export function HudFrame({
   as: Tag = "div",
   channel,
   surface,
   className,
   children,
   ...rest
}: HudFrameProps) {
   return (
      <Tag
         className={clsx("hud-frame", className)}
         data-channel={channel === "neutral" ? undefined : channel}
         data-surface={surface ? "" : undefined}
         {...rest}
      >
         {children}
      </Tag>
   );
}
