import { RouteLoadingState } from "@/components/common/LoadingState";

export default function AskLoading() {
  return <RouteLoadingState description="Opening session history and chart context..." title="Preparing Ask AI" />;
}
