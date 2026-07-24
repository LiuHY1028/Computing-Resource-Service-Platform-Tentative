import {
  createContext,
  useContext,
  useEffect,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

export type PageHeaderConfig = Readonly<{
  description?: ReactNode;
  context?: ReactNode;
  actions?: ReactNode;
  workspace?: boolean;
}>;

export const PageHeaderContext = createContext<
  Dispatch<SetStateAction<PageHeaderConfig>> | undefined
>(undefined);

export function useConsolePageHeader(config: PageHeaderConfig) {
  const setHeader = useContext(PageHeaderContext);

  useEffect(() => {
    if (!setHeader) return undefined;
    setHeader(config);
    return () => setHeader({});
  }, [config, setHeader]);
}
