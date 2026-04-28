import { RouteLoadingState } from "@/components/common/LoadingState";

export default function AppLoading() {
  return <RouteLoadingState description="Loading chart data and cached calculations..." title="Preparing your observatory" />;
}
