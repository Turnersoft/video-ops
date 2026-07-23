import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const SCRIPT_STRIP_COLLAPSED_KEY = "remotion-script-strip-collapsed";

function readCollapsedPreference(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const stored = window.sessionStorage.getItem(SCRIPT_STRIP_COLLAPSED_KEY);
    if (stored === null) {
      return true;
    }
    return stored === "1";
  } catch {
    return true;
  }
}

function writeCollapsedPreference(collapsed: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(
      SCRIPT_STRIP_COLLAPSED_KEY,
      collapsed ? "1" : "0",
    );
  } catch {
    // ignore
  }
}

type ScriptStripUiValue = {
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const ScriptStripUiContext = createContext<ScriptStripUiValue>({
  collapsed: false,
  toggleCollapsed: () => undefined,
});

type ScriptStripUiProviderProps = {
  children: ReactNode;
};

export function ScriptStripUiProvider({ children }: ScriptStripUiProviderProps) {
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);

  useEffect(() => {
    writeCollapsedPreference(collapsed);
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => !value);
  }, []);

  return (
    <ScriptStripUiContext.Provider value={{ collapsed, toggleCollapsed }}>
      {children}
    </ScriptStripUiContext.Provider>
  );
}

export function useScriptStripUi(): ScriptStripUiValue {
  return useContext(ScriptStripUiContext);
}

export function useScriptStripCollapsed(): boolean {
  return useContext(ScriptStripUiContext).collapsed;
}
