import { StateSetter } from '../types';
import { WritableDraft } from 'immer/dist/internal';
/**
 * handle a state like `setState` do.
 * @param set zustand setter function.
 * @param get zustand getter function.
 * @param name property name to handle.
 * @returns function to handle the property
 */
export declare const stateSetterHandler: <TState extends Record<string, any>>(set: (fn: (draft: WritableDraft<TState>) => void) => void) => <TKey extends keyof TState>(name: TKey, cb?: (newValue: TState[TKey]) => unknown) => StateSetter<TState[TKey]>;
//# sourceMappingURL=state-setter-handler.d.ts.map