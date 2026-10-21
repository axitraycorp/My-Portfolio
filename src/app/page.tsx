import { Hero } from "@/components/hero/Hero";
import { AtAGlance } from "@/components/sections/AtAGlance";
import { RobotSection } from "@/components/sections/RobotSection";
import { BuildLog } from "@/components/sections/BuildLog";
import { Results } from "@/components/sections/Results";
import { OtherProjects } from "@/components/sections/OtherProjects";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
   return (
      <>
         <Hero />
         <AtAGlance />
         <RobotSection />
         <BuildLog />
         <Results />
         <OtherProjects />
         <About />
         <Contact />
      </>
   );
}
