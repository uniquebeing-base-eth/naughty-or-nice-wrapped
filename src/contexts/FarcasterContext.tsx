import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import type { MiniAppContext, UserContext } from '@farcaster/miniapp-core/dist/context';

interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
}

interface FarcasterContextType {
  isSDKLoaded: boolean;
  context: MiniAppContext | null;
  user: FarcasterUser | null;
  isInMiniApp: boolean;
  error: string | null;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isSDKLoaded: false,
  context: null,
  user: null,
  isInMiniApp: false,
  error: null,
});

export const useFarcaster = () => useContext(FarcasterContext);

interface FarcasterProviderProps {
  children: ReactNode;
}

export const FarcasterProvider = ({ children }: FarcasterProviderProps) => {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<MiniAppContext | null>(null);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initSDK = async () => {
      try {
        // Check if we're in a mini app context
        if (sdk) {
          // Get the context which includes user info
          const ctx = await sdk.context;
          
          if (ctx) {
            setContext(ctx);
            setIsInMiniApp(true);
            
            // Extract user from context
            if (ctx.user) {
              setUser({
                fid: ctx.user.fid,
                username: ctx.user.username || `fid:${ctx.user.fid}`,
                displayName: ctx.user.displayName || ctx.user.username || `User ${ctx.user.fid}`,
                pfpUrl: ctx.user.pfpUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ctx.user.fid}`,
              });
            }
          }
          
          // Signal that the app is ready
          await sdk.actions.ready();
          setIsSDKLoaded(true);
        }
      } catch (err) {
        console.log('Farcaster SDK init (not in mini app context):', err);
        setIsSDKLoaded(true);
        setIsInMiniApp(false);
        
        // Set mock user for development/testing outside mini app
        setUser({
          fid: 12345,
          username: 'uniquebeing404',
          displayName: 'uniquebeing404',
          pfpUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=uniquebeing404',
        });
      }
    };

    initSDK();
  }, []);

  return (
    <FarcasterContext.Provider value={{ isSDKLoaded, context, user, isInMiniApp, error }}>
      {children}
    </FarcasterContext.Provider>
  );
};
