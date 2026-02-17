import { useCallback, useEffect, useMemo } from 'react';
/**
 * @param value the value to be memoized (usually a dependency list)
 * @returns a memoized version of the value as long as it remains deeply equal
 */
export declare const useDeepCompareDeps: <T>(value: T) => T;
export declare const useDeepEffect: typeof useEffect;
export declare const useDeepMemo: typeof useMemo;
export declare const useDeepCallback: typeof useCallback;
//# sourceMappingURL=index.d.ts.map