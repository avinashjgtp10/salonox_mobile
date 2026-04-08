import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface ClientData {
  profile: any;
  addresses: any[];
  emergency: any;
}

interface ClientWizardContextType {
  clientData: ClientData;
  setClientData: React.Dispatch<React.SetStateAction<ClientData>>;
  resetWizard: () => void;
}

const ClientWizardContext = createContext<ClientWizardContextType | undefined>(
  undefined,
);

export const ClientWizardProvider = ({ children }: { children: ReactNode }) => {
  const [clientData, setClientData] = useState<ClientData>({
    profile: {},
    addresses: [],
    emergency: {},
  });

  const resetWizard = () => {
    setClientData({
      profile: {},
      addresses: [],
      emergency: {},
    });
  };

  return (
    <ClientWizardContext.Provider
      value={{ clientData, setClientData, resetWizard }}
    >
      {children}
    </ClientWizardContext.Provider>
  );
};

export const useClientWizard = () => {
  const context = useContext(ClientWizardContext);
  if (!context) {
    throw new Error(
      "useClientWizard must be used within a ClientWizardProvider",
    );
  }
  return context;
};
