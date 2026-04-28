import { RouteLoadingState } from "@/components/common/LoadingState";

export default function DailyLoading() {
  return <RouteLoadingState description="Calculating transits, panchang context, and prediction text..." title="Predicting this date" />;
}
