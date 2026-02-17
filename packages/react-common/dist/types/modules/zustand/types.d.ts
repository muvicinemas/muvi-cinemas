import { GetState, SetState, StoreApi } from 'zustand';
export type AnyObject<T = unknown> = Record<string, T>;
export type StateCreator<TState extends AnyObject, TActions extends AnyObject = TState, TSetState = SetState<TState>, TGetState = GetState<TState & TActions>, TStoreApi = StoreApi<TState & TActions>> = (set: TSetState, get: TGetState, api: TStoreApi) => TActions;
//# sourceMappingURL=types.d.ts.map