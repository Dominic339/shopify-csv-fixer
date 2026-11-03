import { HowItWorksView, howItWorksMetadata } from "@/views/howItWorks";

export function generateMetadata() {
  return howItWorksMetadata();
}

export default function HowItWorksPage() {
  return <HowItWorksView />;
}
