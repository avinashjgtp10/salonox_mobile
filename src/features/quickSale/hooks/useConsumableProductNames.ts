import { useCallback, useEffect, useRef, useState } from "react";

import type { CartItem } from "@/features/quickSale/types";
import { productService } from "@/services/product.service";

export const useConsumableProductNames = (cartItems: CartItem[]) => {
  const [consumableProductNames, setConsumableProductNames] = useState<Record<string, string>>({});
  const requestedProductIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const missingIds = new Set<string>();

    cartItems.forEach((item) => {
      item.consumables?.forEach((consumable) => {
        if (!requestedProductIdsRef.current.has(consumable.productId)) {
          missingIds.add(consumable.productId);
        }
      });
    });

    if (missingIds.size === 0) {
      return;
    }

    const idsToFetch = Array.from(missingIds);
    idsToFetch.forEach((id) => requestedProductIdsRef.current.add(id));

    let isSubscribed = true;

    void Promise.allSettled(idsToFetch.map((id) => productService.fetchProductById(id))).then((results) => {
      if (!isSubscribed) {
        return;
      }

      setConsumableProductNames((current) => {
        const next = { ...current };
        results.forEach((result, index) => {
          const id = idsToFetch[index];
          next[id] = result.status === "fulfilled" ? result.value.name : id;
        });
        return next;
      });
    });

    return () => {
      isSubscribed = false;
    };
  }, [cartItems]);

  const resetConsumableProductNames = useCallback(() => {
    setConsumableProductNames({});
    requestedProductIdsRef.current = new Set();
  }, []);

  return { consumableProductNames, resetConsumableProductNames };
};
