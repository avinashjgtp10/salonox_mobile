import { InitialsAvatar } from "@/components/ui/InitialsAvatar";

export function ClientAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CL";

  return <InitialsAvatar initials={initials} size={46} />;
}
