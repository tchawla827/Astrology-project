import { RouteLoadingState } from "@/components/common/LoadingState";

export default function PanchangLoading() {
  return <RouteLoadingState description="Calculating daily panchang and muhurta windows..." title="Calculating panchang" />;
}
