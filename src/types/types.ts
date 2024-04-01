import { WebComponentEvent, WebComponentEventOf } from "./events";

export type GenericState = Record<string, unknown>;
export type GenericAction = string | number;

export type Store<State extends GenericState = GenericState, Action extends GenericAction = GenericAction> = {
  subscribe: (subscription: (state: State) => void, actions?: Action[]) => () => void;
};

type StoreProperties<StoreType> = StoreType extends Store<infer State, infer Action> ? [State, Action] : [];
export type StateOf<StoreType> = StoreProperties<StoreType>[0] extends undefined
  ? GenericState
  : StoreProperties<StoreType>[0];
export type ActionOf<StoreType> = StoreProperties<StoreType>[1] extends undefined
  ? GenericAction
  : StoreProperties<StoreType>[1];

export type EventListener<
  Event extends WebComponentEvent,
  Context extends Record<string, unknown> = Record<string, unknown>,
  StoreManager extends Store = Store,
> = (
  this: IHTMLContextElement<Context, StoreManager>,
  event: WebComponentEventOf<Event, Context, StoreManager>,
) => unknown;

export type StoredListener<
  Event extends WebComponentEvent,
  Context extends Record<string, unknown> = Record<string, unknown>,
  StoreManager extends Store = Store,
> = { listener: EventListener<Event, Context, StoreManager>; useCapture: boolean };

export interface IHTMLContextElement<
  Context extends Record<string, unknown> = Record<string, unknown>,
  StoreManager extends Store = Store,
> extends HTMLElement {
  store: StoreManager | undefined;
  context: Context | undefined;
  monitoredAttributes: Record<string, string | undefined>;
  readonly isInitialised: boolean;
  readonly observedActions: ActionOf<StoreManager>[] | undefined;
  addEventListener<Event extends WebComponentEvent>(
    type: Event,
    listener: EventListener<Event, Context, StoreManager>,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<Event extends WebComponentEvent>(
    type: Event,
    listener: EventListener<Event, Context, StoreManager>,
    options?: boolean | EventListenerOptions,
  ): void;
  clearEventListeners<Event extends WebComponentEvent>(type?: Event): void;
  render(): void;
}
