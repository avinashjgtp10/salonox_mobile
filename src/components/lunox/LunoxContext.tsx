import { createContext, useContext } from "react";

/** Opens the Lunox sheet from anywhere under the owner tabs. `seed` starts the chat with that Lunox message. */
export type LunoxOpener = (options?: { seed?: string }) => void;

export const LunoxContext = createContext<LunoxOpener | null>(null);

export const useOpenLunox = () => useContext(LunoxContext);
