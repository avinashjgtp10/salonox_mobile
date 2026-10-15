

export type ConsumableUsageReportRow = {
  actualConsumable: number;
  actualStock: number;
  adjustConsumable: number;
  adjustStock: number;
  categoryName: string;
  consumableDifference: number;
  itemName: string;
  productId: string;
  remark: string;
  stockDifference: number;
  stockValue: number;
  unit: string;
};

export type ConsumableUsageReportResponse = {
  rows: ConsumableUsageReportRow[];
};
