/**
 * @86d-app/core/state
 *
 * MobX re-exports for client-side shared state.
 * Separated from the main index to avoid pulling mobx-react-lite
 * into server-side bundles (it requires React hooks at eval time).
 */

export { action, makeAutoObservable, runInAction } from "mobx";
export { observer } from "mobx-react-lite";
