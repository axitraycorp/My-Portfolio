import clsx from "clsx";
import type { Channel } from "@/content/profile";

type TopicLabelProps = {
   /** ROS-style topic, e.g. "/robot/status". */
   topic: string;
   channel?: Channel;
   /** Optional value shown after the topic, like a `ros2 topic echo` line. */
   children?: React.ReactNode;
   className?: string;
};

/** Monospace label styled like a ROS 2 topic. */
export function TopicLabel({ topic, channel = "camera", children, className }: TopicLabelProps) {
   return (
      <span className={clsx("topic-label", className)} data-channel={channel}>
         <span className="topic-label__topic">{topic}</span>
         {children !== undefined && (
            <>
               <span aria-hidden="true">:</span>
               <span className="topic-label__value">{children}</span>
            </>
         )}
      </span>
   );
}
