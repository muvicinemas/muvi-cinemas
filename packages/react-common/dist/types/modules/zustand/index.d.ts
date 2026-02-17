import { AnyObject, StateCreator } from './types';
import { StateStorage } from 'zustand/middleware';
import { UseBoundStore } from 'zustand';
import { Draft } from 'immer';
export type CreateStoreOptions = {
    persist?: false;
    devtools?: false;
} | {
    persist: true;
    devtools?: false;
    name: string;
    getStorage?: () => StateStorage;
} | {
    persist?: false;
    devtools: true;
    name: string;
} | {
    persist: true;
    devtools: true;
    name: string;
    getStorage?: () => StateStorage;
};
/**
 * function that create zustand store.
 * @param options create store options.
 * @returns function that create the real store.
 */
export declare const createStore: (options?: CreateStoreOptions) => <TState extends AnyObject, TActions extends AnyObject>(initialState: TState, actions: StateCreator<TState, TActions, (fn: (draft: Draft<TState>) => void) => void>) => UseBoundStore<TState & TActions>;
//# sourceMappingURL=index.d.ts.map