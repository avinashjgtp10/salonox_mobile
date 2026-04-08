import { useState, useCallback } from "react";
import type { Service, Category } from "../types/catalog.types";

export const useServices = () => {
  const [services] = useState<Service[]>([
    {
      id: "1",
      name: "Women's Haircut",
      categoryId: "hair",
      categoryName: "Hair",
      duration: 45,
      price: 65,
      onlineBookingEnabled: true,
      active: true,
    },
    {
      id: "2",
      name: "Men's Haircut",
      categoryId: "hair",
      categoryName: "Hair",
      duration: 30,
      price: 35,
      onlineBookingEnabled: true,
      active: true,
    },
  ]);

  const [categories] = useState<Category[]>([
    { id: "hair", name: "Hair", serviceCount: 2 },
    { id: "nails", name: "Nails", serviceCount: 0 },
  ]);

  const loading = false;
  const error = null;
  const fetchServices = useCallback(() => {}, []);

  return { services, categories, loading, error, fetchServices };
};
