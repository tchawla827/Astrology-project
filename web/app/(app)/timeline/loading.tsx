import { RouteLoadingState } from "@/components/common/LoadingState";

export default function Loading() {
  return <RouteLoadingState description="Calculating yearly timing, monthly factors, and daily drilldown..." title="Loading timing graph" />;
}
