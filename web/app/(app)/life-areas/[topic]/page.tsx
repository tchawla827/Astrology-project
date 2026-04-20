import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export default function LifeAreaPage({ params }: { params: { topic: string } }) {
  return <PlaceholderPage description={`Topic placeholder: ${params.topic}.`} title="Life Areas" />;
}
