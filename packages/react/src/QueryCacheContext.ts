import { createContext, useContext } from 'react';
import type { QueryCache } from './cache/index.js';

export const QueryCacheContext = createContext<QueryCache | null>(null);

export function useQueryCache(): QueryCache {
  const cache = useContext(QueryCacheContext);
  if (!cache) throw new Error('useQueryCache must be used within FunctionSpaceProvider');
  return cache;
}
