import { currentMilestone, milestones, profile } from "@/content/profile";
import { TopicLabel } from "@/components/hud/TopicLabel";

export default function Footer() {
   const current = currentMilestone();
   return (
      <footer className="border-t border-line px-gutter py-l">
         <div className="mx-auto flex max-w-content flex-col gap-s text-small text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
               © {new Date().getFullYear()} {profile.name}. Built with Next.js, ROS 2 on the robot.
            </p>
            {current && (
               <TopicLabel topic="/robot/status" channel="camera">
                  milestone {current.number} of {milestones.length}{" "}
                  {current.status === "active" ? "in progress" : "next"}
               </TopicLabel>
            )}
         </div>
      </footer>
   );
}
