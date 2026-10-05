export const splitFullName = (fullName: string) => {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  return {
    first_name: firstName,
    last_name: lastName,
  };
};

export const formatStaffDisplayName = (name?: string | null): string => {
  if (typeof name !== "string") {
    return "";
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const firstName = parts[0];
  const lastNameInitial = parts[parts.length - 1]?.[0]?.toUpperCase();

  return lastNameInitial ? `${firstName} ${lastNameInitial}` : firstName;
};
