import { IContextElement, StateOf, Store } from "./types";

export enum WebComponentEvents {
  Initialised = "webcomponentinitialised",
  Connected = "webcomponentconnected",
  Disconnected = "webcomponentdisconnected",
  Adopted = "webcomponentadopted",
  AttributeChanged = "webcomponentattributechanged",
  ContextUpdated = "webcomponentcontextupdated",
  StoreConnected = "webcomponentstoreconnected",
  StoreDisconnected = "webcomponentstoredisconnected",
  Render = "webcomponentrender",
}

export type WebComponentEventPayload<
  Context extends Record<string, unknown> = Record<string, unknown>,
  StoreManager extends Store = Store,
> = {
  target: IContextElement<Context, StoreManager>;
};

export type WebComponentAttributeChangedEventPayload<
  Context extends Record<string, unknown> = Record<string, unknown>,
  StoreManager extends Store = Store,
> = WebComponentEventPayload<Context, StoreManager> & {
  attributeName: string;
  oldValue: string | null;
  newValue: string | null;
};

export type WebComponentContextUpdatedEventPayload<
  Context extends Record<string, unknown> = Record<string, unknown>,
  StoreManager extends Store = Store,
> = WebComponentEventPayload<Context, StoreManager> & {
  context: Context | undefined;
};

export type WebComponentStoreConnectedEventPayload<
  Context extends Record<string, unknown> = Record<string, unknown>,
  StoreManager extends Store = Store,
> = WebComponentEventPayload<Context, StoreManager> & {
  store: StoreManager | undefined;
};

export type WebComponentRenderEventPayload<
  Context extends Record<string, unknown> = Record<string, unknown>,
  StoreManager extends Store = Store,
> = WebComponentContextUpdatedEventPayload<Context, StoreManager> & {
  state: StateOf<StoreManager> | undefined;
  attributes: Record<string, string | undefined>;
};

export type WebComponentEventMap<
  Context extends Record<string, unknown> = Record<string, unknown>,
  StoreManager extends Store = Store,
> = {
  [WebComponentEvents.Initialised]: CustomEvent<WebComponentEventPayload<Context, StoreManager>>;
  [WebComponentEvents.Connected]: CustomEvent<WebComponentEventPayload<Context, StoreManager>>;
  [WebComponentEvents.Disconnected]: CustomEvent<WebComponentEventPayload<Context, StoreManager>>;
  [WebComponentEvents.Adopted]: CustomEvent<WebComponentEventPayload<Context, StoreManager>>;
  [WebComponentEvents.AttributeChanged]: CustomEvent<WebComponentAttributeChangedEventPayload<Context, StoreManager>>;
  [WebComponentEvents.ContextUpdated]: CustomEvent<WebComponentContextUpdatedEventPayload<Context, StoreManager>>;
  [WebComponentEvents.StoreConnected]: CustomEvent<WebComponentStoreConnectedEventPayload<Context, StoreManager>>;
  [WebComponentEvents.StoreDisconnected]: CustomEvent<WebComponentEventPayload<Context, StoreManager>>;
  [WebComponentEvents.Render]: CustomEvent<WebComponentRenderEventPayload<Context, StoreManager>>;
};

export type WebComponentEvent = keyof HTMLElementEventMap | WebComponentEvents;

export type WebComponentEventOf<
  Event extends WebComponentEvent,
  Context extends Record<string, unknown> = Record<string, unknown>,
  StoreManager extends Store = Store,
> = Event extends keyof HTMLElementEventMap
  ? HTMLElementEventMap[Event]
  : Event extends WebComponentEvents
    ? WebComponentEventMap<Context, StoreManager>[Event]
    : Event;
