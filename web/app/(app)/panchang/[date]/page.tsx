import { PanchangPageContent } from "@/app/(app)/panchang/panchang-page";

export default function PanchangDatePage({
  params,
  searchParams,
}: {
  params: { date: string };
  searchParams: { lat?: string; lon?: string; tz?: string; loc?: string };
}) {
  return <PanchangPageContent date={params.date} searchParams={searchParams} />;
}
