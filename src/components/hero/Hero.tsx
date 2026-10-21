import { currentMilestone, milestones, profile } from "@/content/profile";
import { HudFrame } from "@/components/hud/HudFrame";
import { TopicLabel } from "@/components/hud/TopicLabel";
import { BootSequence } from "./BootSequence";
import { HeroFallback } from "./HeroFallback";
import { HeroSceneLoader } from "./HeroSceneLoader";
import { StartTourButton } from "./StartTourButton";

export function Hero() {
   const current = currentMilestone();
   const status = current
      ? `milestone ${current.number} of ${milestones.length} ${current.status === "active" ? "in progress" : "up next"}`
      : "all milestones complete";

   return (
      <section
         id="hero"
         aria-labelledby="hero-title"
         className="hero relative overflow-hidden px-gutter"
      >
         <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-content items-center gap-xl py-xl md:grid-cols-[1.05fr_1fr] md:py-2xl">
            {/* Text stays readable from first paint (it is the LCP); only the sensor view boots */}
            <div className="hero-rise flex flex-col gap-m">
               <TopicLabel topic="/unit-7/boot" channel="fused">
                  perception online
               </TopicLabel>
               <div>
                  <h1 id="hero-title" className="text-display font-semibold">
                     {profile.name}
                  </h1>
                  <p className="mt-2xs font-display text-h3 font-medium text-camera">
                     {profile.title}
                  </p>
               </div>
               <p className="max-w-[46ch] text-lead text-muted">{profile.thesis}</p>
               <div className="flex flex-wrap gap-xs">
                  <a href="#robot" className="btn btn-primary">
                     See the robot
                  </a>
                  <StartTourButton />
               </div>
               <p className="border-t border-line pt-s" role="status">
                  <TopicLabel topic="/robot/status" channel="camera">
                     {status}
                  </TopicLabel>
               </p>
            </div>

            <div className="relative aspect-square w-full max-w-[560px] justify-self-center overflow-hidden">
               <div className="hero-reveal absolute inset-0">
                  <HeroFallback />
                  <HeroSceneLoader />
               </div>
               <BootSequence />
               {/* Brackets drawn above the (opaque) canvas */}
               <HudFrame channel="camera" className="pointer-events-none absolute inset-0 z-[1]" />
            </div>
         </div>
      </section>
   );
}
