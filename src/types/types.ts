import { WebComponentEvent, WebComponentEventOf } from "./events";

export type GenericState = Record<string, unknown>;
export type GenericAction = string | number | symbol;

export type Store<State extends GenericState = GenericState, Action extends GenericAction = GenericAction> = {
  subscribe: (subscription: (state: State) => void, actions?: Action[]) => () => void;
};

export type EventListener<
  Event extends WebComponentEvent,
  Context extends Record<string, unknown> = Record<string, unknown>,
  State extends GenericState = GenericState,
  Actions extends GenericAction = GenericAction,
> = (
  this: IHTMLContextElement<Context, State, Actions>,
  event: WebComponentEventOf<Event, Context, State, Actions>,
) => unknown;

export type StoredListener<
  Event extends WebComponentEvent,
  Context extends Record<string, unknown> = Record<string, unknown>,
  State extends GenericState = GenericState,
  Actions extends GenericAction = GenericAction,
> = { listener: EventListener<Event, Context, State, Actions>; useCapture: boolean };

export interface IHTMLContextElement<
  Context extends Record<string, unknown> = Record<string, unknown>,
  State extends GenericState = GenericState,
  Actions extends GenericAction = GenericAction,
> extends HTMLElement {
  store: Store<State, Actions> | undefined;
  context: Context | undefined;
  monitoredAttributes: Record<string, string | undefined>;
  readonly isInitialised: boolean;
  readonly observedActions: Actions[] | undefined;
  addEventListener<Event extends WebComponentEvent>(
    type: Event,
    listener: EventListener<Event, Context, State, Actions>,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<Event extends WebComponentEvent>(
    type: Event,
    listener: EventListener<Event, Context, State, Actions>,
    options?: boolean | EventListenerOptions,
  ): void;
  clearEventListeners<Event extends WebComponentEvent>(type?: Event): void;
  render(): void;
}
