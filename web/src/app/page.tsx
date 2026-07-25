import { Nav } from "@/components/marketing/Nav";
import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { Security } from "@/components/marketing/Security";
import { Pricing } from "@/components/marketing/Pricing";
import { About } from "@/components/marketing/About";
import { Contact } from "@/components/marketing/Contact";
import { Footer } from "@/components/marketing/Footer";

export default function LandingPage() {
  return (
    <div className="bg-surface-light dark:bg-surface-dark">
      <Nav />
      <Hero />
      <Features />
      <Security />
      <Pricing />
      <About />
      <Contact />
      <Footer />
    </div>
  );
}
