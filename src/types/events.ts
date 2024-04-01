import { GenericAction, GenericState, IHTMLContextElement, Store } from "./types";

export enum WebComponentEvents {
  Initialised = "webcomponentinitialised",
  Connected = "webcomponentconnected",
  Disconnected = "webcomponentdisconnected",
  AttributeChanged = "webcomponentattributechanged",
  ContextUpdated = "webcomponentcontextupdated",
  StoreConnected = "webcomponentstoreconnected",
  StoreDisconnected = "webcomponentstoredisconnected",
  Render = "webcomponentrender",
}

export type WebComponentEventPayload<
  Context extends Record<string, unknown> = Record<string, unknown>,
  State extends GenericState = GenericState,
  Actions extends GenericAction = GenericAction,
> = {
  target: IHTMLContextElement<Context, State, Actions>;
};

export type WebComponentAttributeChangedEventPayload<
  Context extends Record<string, unknown> = Record<string, unknown>,
  State extends GenericState = GenericState,
  Actions extends GenericAction = GenericAction,
> = WebComponentEventPayload<Context, State, Actions> & {
  attributeName: string;
  oldValue: string | null;
  newValue: string | null;
};

export type WebComponentContextUpdatedEventPayload<
  Context extends Record<string, unknown> = Record<string, unknown>,
  State extends GenericState = GenericState,
  Actions extends GenericAction = GenericAction,
> = WebComponentEventPayload<Context, State, Actions> & {
  context: Context | undefined;
};

export type WebComponentStoreConnectedEventPayload<
  Context extends Record<string, unknown> = Record<string, unknown>,
  State extends GenericState = GenericState,
  Actions extends GenericAction = GenericAction,
> = WebComponentEventPayload<Context, State, Actions> & {
  store: Store<State, Actions> | undefined;
};

export type WebComponentRenderEventPayload<
  Context extends Record<string, unknown> = Record<string, unknown>,
  State extends GenericState = GenericState,
  Actions extends GenericAction = GenericAction,
> = WebComponentContextUpdatedEventPayload<Context, State, Actions> & {
  state: State | undefined;
  attributes: Record<string, string | undefined>;
};

export type WebComponentEventMap<
  Context extends Record<string, unknown> = Record<string, unknown>,
  State extends GenericState = GenericState,
  Actions extends GenericAction = GenericAction,
> = {
  [WebComponentEvents.Initialised]: CustomEvent<WebComponentEventPayload<Context, State, Actions>>;
  [WebComponentEvents.Connected]: CustomEvent<WebComponentEventPayload<Context, State, Actions>>;
  [WebComponentEvents.Disconnected]: CustomEvent<WebComponentEventPayload<Context, State, Actions>>;
  [WebComponentEvents.AttributeChanged]: CustomEvent<WebComponentAttributeChangedEventPayload<Context, State, Actions>>;
  [WebComponentEvents.ContextUpdated]: CustomEvent<WebComponentContextUpdatedEventPayload<Context, State, Actions>>;
  [WebComponentEvents.StoreConnected]: CustomEvent<WebComponentStoreConnectedEventPayload<Context, State, Actions>>;
  [WebComponentEvents.StoreDisconnected]: CustomEvent<WebComponentEventPayload<Context, State, Actions>>;
  [WebComponentEvents.Render]: CustomEvent<WebComponentRenderEventPayload<Context, State, Actions>>;
};

export type WebComponentEvent = keyof HTMLElementEventMap | WebComponentEvents;

export type WebComponentEventOf<
  Event extends WebComponentEvent,
  Context extends Record<string, unknown> = Record<string, unknown>,
  State extends GenericState = GenericState,
  Actions extends GenericAction = GenericAction,
> = Event extends keyof HTMLElementEventMap
  ? HTMLElementEventMap[Event]
  : Event extends WebComponentEvents
    ? WebComponentEventMap<Context, State, Actions>[Event]
    : Event;
