import {
  EventListener,
  GenericAction,
  GenericState,
  IHTMLContextElement,
  Store,
  StoredListener,
  WebComponentAttributeChangedEventPayload,
  WebComponentContextUpdatedEventPayload,
  WebComponentEvent,
  WebComponentEventOf,
  WebComponentEventPayload,
  WebComponentEvents,
  WebComponentRenderEventPayload,
  WebComponentStoreConnectedEventPayload,
} from "./types";

export const HTMLContextElementTag: string = "html-context";

export class HTMLContextElement<
    Context extends Record<string, unknown> = Record<string, unknown>,
    State extends GenericState = GenericState,
    Actions extends GenericAction = GenericAction,
  >
  extends HTMLElement
  implements IHTMLContextElement<Context, State, Actions>
{
  #internalContext: Context | undefined;
  #externalContext: Context | undefined;
  #internalStore: Store<State, Actions> | undefined;
  #externalStore: Store<State, Actions> | undefined;
  #state: State | undefined;
  #initialised = false;
  #clearStoreSubscription: (() => void) | undefined;
  #removeStoreListener: (() => void) | undefined;
  #removeContextListener: (() => void) | undefined;
  #monitoredAttributes: Record<string, string | undefined> = {};

  #eventMap: Partial<{
    [Event in WebComponentEvent]: StoredListener<Event, Context, State, Actions>[];
  }> = {};

  static get observedAttributes(): string[] {
    return [];
  }

  constructor() {
    super();
    const attributes: string[] = this.constructor["observedAttributes" as keyof typeof this.constructor];
    attributes?.forEach((attribute) => {
      this.#monitoredAttributes[attribute] = undefined;
    });
  }

  get observedActions(): Actions[] | undefined {
    return undefined;
  }

  get isInitialised() {
    return this.#initialised;
  }

  get monitoredAttributes() {
    return this.#monitoredAttributes;
  }

  protected get state() {
    return this.#state;
  }

  connectedCallback() {
    if (!this.#initialised) {
      this.#initialised = true;

      this.dispatchEvent(
        new CustomEvent<WebComponentEventPayload<Context, State, Actions>>(WebComponentEvents.Initialised, {
          detail: {
            target: this,
          },
          bubbles: false,
          cancelable: false,
        }),
      );
    }
    this.dispatchEvent(
      new CustomEvent<WebComponentEventPayload<Context, State, Actions>>(WebComponentEvents.Connected, {
        detail: {
          target: this,
        },
        bubbles: false,
        cancelable: false,
      }),
    );

    Object.keys(this.#monitoredAttributes).forEach((attribute) => {
      this.#monitoredAttributes[attribute] = this.getAttribute(attribute) || undefined;
    });

    this.#connectToStore();
  }

  disconnectedCallback() {
    this.dispatchEvent(
      new CustomEvent<WebComponentEventPayload<Context, State, Actions>>(WebComponentEvents.Disconnected, {
        detail: {
          target: this,
        },
        bubbles: false,
        cancelable: false,
      }),
    );
    this.#clearStoreSubscription?.();
    this.#removeContextListener?.();
    this.#removeStoreListener?.();
  }

  attributeChangedCallback(attributeName: string, oldValue: string | null, newValue: string | null) {
    this.dispatchEvent(
      new CustomEvent<WebComponentAttributeChangedEventPayload<Context, State, Actions>>(
        WebComponentEvents.AttributeChanged,
        {
          detail: {
            target: this,
            attributeName,
            oldValue,
            newValue,
          },
          bubbles: false,
          cancelable: false,
        },
      ),
    );

    this.#monitoredAttributes[attributeName] = newValue || undefined;

    this.#renderComponent();
  }

  #onExternalContextUpdate = ({
    detail: { context },
  }: WebComponentEventOf<WebComponentEvents.ContextUpdated, Context, State, Actions>) => {
    this.#externalContext = context;
    this.#notifyContextUpdate();
  };

  protected get parentContext(): Context | undefined {
    if (!this.#externalContext) {
      const container = this.contextContainer;
      if (container) {
        this.#externalContext = container.context;
        container.addEventListener(WebComponentEvents.ContextUpdated, this.#onExternalContextUpdate);
        this.#removeContextListener = () => {
          this.#externalContext = undefined;
          this.#removeContextListener = undefined;
          this.contextContainer?.removeEventListener(WebComponentEvents.ContextUpdated, this.#onExternalContextUpdate);
        };
        if (this.#externalContext) {
          this.#notifyContextUpdate();
        }
      }
    }
    return this.#externalContext;
  }

  #onExternalStoreUpdate = ({
    detail: { store },
  }: WebComponentEventOf<WebComponentEvents.StoreConnected, Context, State, Actions>) => {
    this.#externalStore = store;
    this.#connectToStore();
  };

  protected get parentStore(): Store<State, Actions> | undefined {
    if (!this.#externalStore) {
      const container = this.contextContainer;
      if (container) {
        this.#externalStore = container.store;
        container.addEventListener(WebComponentEvents.StoreConnected, this.#onExternalStoreUpdate);
        this.#removeStoreListener = () => {
          this.#externalStore = undefined;
          this.#removeStoreListener = undefined;
          this.contextContainer?.removeEventListener(WebComponentEvents.StoreConnected, this.#onExternalStoreUpdate);
        };
        if (this.#externalStore) {
          this.#connectToStore();
        }
      }
    }
    return this.#externalStore;
  }

  protected get contextContainer(): HTMLContextElement<Context, State, Actions> | undefined {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let container: Element | null | undefined = this;
    do {
      container = container instanceof ShadowRoot ? container.host : (container?.parentNode as Element);
    } while (container && !(container instanceof HTMLContextElement) && container.tagName?.toLowerCase() !== "body");
    return container instanceof HTMLContextElement ? container : undefined;
  }

  get context() {
    return this.#internalContext || this.parentContext;
  }

  set context(value) {
    if (value) {
      this.#removeContextListener?.();
    }
    this.#internalContext = value;

    this.#notifyContextUpdate();
  }

  #notifyContextUpdate() {
    this.dispatchEvent(
      new CustomEvent<WebComponentContextUpdatedEventPayload<Context, State, Actions>>(
        WebComponentEvents.ContextUpdated,
        {
          detail: {
            target: this,
            context: this.context,
          },
          bubbles: false,
          cancelable: false,
        },
      ),
    );

    this.#renderComponent();
  }

  get store() {
    return this.#internalStore || this.parentStore;
  }

  set store(value) {
    if (value) {
      this.#removeStoreListener?.();
    }
    this.#internalStore = value;

    this.#connectToStore();
  }

  #connectToStore() {
    this.#clearStoreSubscription?.();

    const store = this.store;

    if (store) {
      const clear = store.subscribe((state) => {
        this.#state = state;
        this.#renderComponent();
      }, this.observedActions);
      this.#clearStoreSubscription = () => {
        clear();
        this.#state = undefined;
        this.#clearStoreSubscription = undefined;

        this.dispatchEvent(
          new CustomEvent<WebComponentEventPayload<Context, State, Actions>>(WebComponentEvents.StoreDisconnected, {
            detail: {
              target: this,
            },
            bubbles: false,
            cancelable: false,
          }),
        );
      };
      this.dispatchEvent(
        new CustomEvent<WebComponentStoreConnectedEventPayload<Context, State, Actions>>(
          WebComponentEvents.StoreConnected,
          {
            detail: {
              target: this,
              store,
            },
            bubbles: false,
            cancelable: false,
          },
        ),
      );
    }

    this.#renderComponent();
  }

  addEventListener<Event extends WebComponentEvent>(
    type: Event,
    listener: EventListener<Event, Context, State, Actions>,
    options?: boolean | AddEventListenerOptions,
  ) {
    const useCapture = typeof options === "boolean" ? options : !!options?.capture;
    const index = this.#eventMap[type]?.findIndex(
      (eventListener) => eventListener.listener === listener && eventListener.useCapture === useCapture,
    );
    if (index === undefined || index < 0) {
      if (!this.#eventMap[type]) {
        this.#eventMap[type] = [];
      }
      this.#eventMap[type]?.push({ listener, useCapture });
      super.addEventListener(type as string, listener as EventListenerOrEventListenerObject, options);
    }
  }

  removeEventListener<Event extends WebComponentEvent>(
    type: Event,
    listener: EventListener<Event, Context, State, Actions>,
    options?: boolean | EventListenerOptions,
  ) {
    const useCapture = typeof options === "boolean" ? options : !!options?.capture;
    const index = this.#eventMap[type]?.findIndex(
      (eventListener) => eventListener.listener === listener && eventListener.useCapture === useCapture,
    );
    if (index !== undefined && index >= 0) {
      this.#eventMap[type]?.splice(index, 1);
      super.removeEventListener(type as string, listener as EventListenerOrEventListenerObject, options);
    }
  }

  clearEventListeners<Event extends WebComponentEvent>(type?: Event) {
    if (type) {
      const list: StoredListener<Event, Context, State, Actions>[] | undefined = this.#eventMap[type];
      list?.forEach(({ listener, useCapture }) => this.removeEventListener(type, listener, useCapture));

      delete this.#eventMap[type];
    } else {
      const types = Object.keys(this.#eventMap) as WebComponentEvent[];
      types.forEach((eventType) => this.clearEventListeners(eventType));
    }
  }

  render() {}

  #renderComponent() {
    if (this.isInitialised) {
      this.dispatchEvent(
        new CustomEvent<WebComponentRenderEventPayload<Context, State, Actions>>(WebComponentEvents.Render, {
          detail: {
            target: this,
            state: this.state,
            context: this.context,
            attributes: this.monitoredAttributes,
          },
          bubbles: false,
          cancelable: false,
        }),
      );
      this.render();
    }
  }
}
