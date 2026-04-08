import { createContext, useContext, useState, type ReactNode } from "react";

type LocationType = "physical" | "mobile" | "virtual";
type TeamType = "independent" | "team";
type TeamSize = "2-5" | "6-10" | "11+";

export type OnboardingData = {
  business_name: string;
  website_url: string;
  business_type: string;
  team_type: TeamType | "";
  team_size: TeamSize | "";
  location_type: LocationType | "";
  address: string;
};

type OnboardingContextType = {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
  reset: () => void;
};

const defaultData: OnboardingData = {
  business_name: "",
  website_url: "",
  business_type: "",
  team_type: "",
  team_size: "",
  location_type: "",
  address: "",
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(() => {
    const saved = sessionStorage.getItem("onboarding_draft");
    return saved ? JSON.parse(saved) : defaultData;
  });

  const update = (patch: Partial<OnboardingData>) =>
    setData((prev) => {
      const newData = { ...prev, ...patch };
      sessionStorage.setItem("onboarding_draft", JSON.stringify(newData));
      return newData;
    });

  const reset = () => {
    setData(defaultData);
    sessionStorage.removeItem("onboarding_draft");
  };

  return (
    <OnboardingContext.Provider value={{ data, update, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx)
    throw new Error("useOnboarding must be used inside OnboardingProvider");
  return ctx;
}
