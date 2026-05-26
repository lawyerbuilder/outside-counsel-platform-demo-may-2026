"use client";

import { createContext, useContext } from "react";

/**
 * API Key Provider — No-op when using Claude Max CLI.
 *
 * Claude Max handles authentication via the CLI child process.
 * No API key is needed. This provider is kept for interface
 * compatibility but the BYOK modal has been removed.
 */

type ApiKeyContextValue = {
  getHeaders: () => Record<string, string>;
  needsKey: boolean;
  showKeyPrompt: () => void;
};

const ApiKeyContext = createContext<ApiKeyContextValue>({
  getHeaders: () => ({}),
  needsKey: false,
  showKeyPrompt: () => {},
});

export function useApiKey() {
  return useContext(ApiKeyContext);
}

export function ApiKeyProvider({ children }: { children: React.ReactNode }) {
  return (
    <ApiKeyContext.Provider
      value={{
        getHeaders: () => ({}),
        needsKey: false,
        showKeyPrompt: () => {},
      }}
    >
      {children}
    </ApiKeyContext.Provider>
  );
}
