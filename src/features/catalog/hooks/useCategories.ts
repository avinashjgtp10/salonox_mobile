import { useState } from "react";

export const useCategories = () => {
  const [categories, setCategories] = useState([
    { id: "hair", name: "Hair", serviceCount: 12 },
    { id: "nails", name: "Nails", serviceCount: 5 },
  ]);

  const loading = false;
  const error = null;

  const createCategory = async (cat: { name: string; description?: string; color?: string }) => {
    setCategories([
      ...categories,
      { id: Date.now().toString(), name: cat.name, serviceCount: 0 },
    ]);
  };

  const deleteCategory = async (id: string) => {
    setCategories(categories.filter((c) => c.id !== id));
  };

  return { categories, loading, error, createCategory, deleteCategory };
};
