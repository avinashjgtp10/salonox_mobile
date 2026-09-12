import { memo } from "react";
import { InfiniteScrollLoader } from "@/components/ui/InfiniteScrollLoader";

type PaginationControlsProps = {
  currentPage: number;
  disabled?: boolean;
  hasNextPage: boolean;
  hasPreviousPage?: boolean;
  loading?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  totalItems?: number;
  totalPages?: number;
  visibleItems?: number;
};

export const PaginationControls = memo(function PaginationControls({
  loading = false,
}: PaginationControlsProps) {
  return <InfiniteScrollLoader loading={loading} />;
});
