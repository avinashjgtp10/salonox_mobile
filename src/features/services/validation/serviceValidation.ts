export type ServiceFormValues = {
  category?: string;
  durationMinutes: string;
  name: string;
  price: string;
};

export type ServiceFormErrors = {
  durationMinutes?: string;
  name?: string;
  price?: string;
};

export function validateServiceForm(values: ServiceFormValues): ServiceFormErrors {
  const errors: ServiceFormErrors = {};

  const trimmedName = values.name.trim();
  if (!trimmedName) {
    errors.name = "Service name is required.";
  }

  const trimmedPrice = values.price.trim();
  if (!trimmedPrice) {
    errors.price = "Price is required.";
  } else {
    const parsedPrice = Number(trimmedPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      errors.price = "Enter a valid price.";
    }
  }

  const trimmedDuration = values.durationMinutes.trim();
  if (!trimmedDuration) {
    errors.durationMinutes = "Duration is required.";
  } else {
    const parsedDuration = Number(trimmedDuration);
    if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
      errors.durationMinutes = "Enter a valid duration in minutes.";
    }
  }

  return errors;
}

export function validateServiceField(
  field: keyof ServiceFormValues,
  value: string,
): string | undefined {
  const trimmed = value.trim();

  if (field === "name") {
    if (!trimmed) {
      return "Service name is required.";
    }
  } else if (field === "price") {
    if (!trimmed) {
      return "Price is required.";
    }
    const parsedPrice = Number(trimmed);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return "Enter a valid price.";
    }
  } else if (field === "durationMinutes") {
    if (!trimmed) {
      return "Duration is required.";
    }
    const parsedDuration = Number(trimmed);
    if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
      return "Enter a valid duration in minutes.";
    }
  }

  return undefined;
}
