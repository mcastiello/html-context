import {
  ActionOf,
  EventListener,
  IHTMLContextElement,
  StateOf,
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

export const HTMLContextElementTag = "context";

export class HTMLContextElement<
    Context extends Record<string, unknown> = Record<string, unknown>,
    StoreManager extends Store = Store,
  >
  extends HTMLElement
  implements IHTMLContextElement<Context, StoreManager>
{
  #internalContext: Context | undefined;
  #externalContext: Context | undefined;
  #internalStore: StoreManager | undefined;
  #externalStore: StoreManager | undefined;
  #state: StateOf<StoreManager> | undefined;
  #initialised = false;
  #clearStoreSubscription: (() => void) | undefined;
  #removeStoreListener: (() => void) | undefined;
  #removeContextListener: (() => void) | undefined;
  #monitoredAttributes: Record<string, string | undefined> = {};

  #eventMap: Partial<{
    [Event in WebComponentEvent]: StoredListener<Event, Context, StoreManager>[];
  }> = {};

  static get observedAttributes(): string[] {
    return [];
  }

  constructor() {
    super();
    const attributes: string[] = this.constructor["observedAttributes" as keyof typeof this.constructor] || [];
    attributes.forEach((attribute) => {
      this.#monitoredAttributes[attribute] = undefined;
    });
    this.addEventListener(WebComponentEvents.Render, () => this.render());
  }

  get observedActions(): ActionOf<StoreManager>[] | undefined {
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
        new CustomEvent<WebComponentEventPayload<Context, StoreManager>>(WebComponentEvents.Initialised, {
          detail: {
            target: this,
          },
          bubbles: false,
          cancelable: false,
        }),
      );
    }
    this.dispatchEvent(
      new CustomEvent<WebComponentEventPayload<Context, StoreManager>>(WebComponentEvents.Connected, {
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
      new CustomEvent<WebComponentEventPayload<Context, StoreManager>>(WebComponentEvents.Disconnected, {
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
      new CustomEvent<WebComponentAttributeChangedEventPayload<Context, StoreManager>>(
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
  }: WebComponentEventOf<WebComponentEvents.ContextUpdated, Context, StoreManager>) => {
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
  }: WebComponentEventOf<WebComponentEvents.StoreConnected, Context, StoreManager>) => {
    this.#externalStore = store;
    this.#connectToStore();
  };

  protected get parentStore(): StoreManager | undefined {
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

  protected get contextContainer(): HTMLContextElement<Context, StoreManager> | undefined {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let container: Element | null | undefined = this;
    do {
      container = container instanceof ShadowRoot ? container.host : container?.parentElement;
    } while (container && !(container instanceof HTMLContextElement) && container.tagName.toLowerCase() !== "body");
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
      new CustomEvent<WebComponentContextUpdatedEventPayload<Context, StoreManager>>(
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
      }, this.observedActions);
      this.#clearStoreSubscription = () => {
        clear();
        this.#state = undefined;
        this.#clearStoreSubscription = undefined;

        this.dispatchEvent(
          new CustomEvent<WebComponentEventPayload<Context, StoreManager>>(WebComponentEvents.StoreDisconnected, {
            detail: {
              target: this,
            },
            bubbles: false,
            cancelable: false,
          }),
        );
      };
      this.dispatchEvent(
        new CustomEvent<WebComponentStoreConnectedEventPayload<Context, StoreManager>>(
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

      this.#renderComponent();
    }
  }

  addEventListener<Event extends WebComponentEvent>(
    type: Event,
    listener: EventListener<Event, Context, StoreManager>,
    options?: boolean | AddEventListenerOptions,
  ) {
    const useCapture = typeof options === "boolean" ? options : !!options?.capture;
    const index =
      this.#eventMap[type]?.findIndex(
        (eventListener) => eventListener.listener === listener && eventListener.useCapture === useCapture,
      ) || -1;
    if (index < 0) {
      if (!this.#eventMap[type]) {
        this.#eventMap[type] = [];
      }
      this.#eventMap[type]?.push({ listener, useCapture });
      super.addEventListener(type as string, listener as EventListenerOrEventListenerObject, options);
    }
  }

  removeEventListener<Event extends WebComponentEvent>(
    type: Event,
    listener: EventListener<Event, Context, StoreManager>,
    options?: boolean | EventListenerOptions,
  ) {
    const useCapture = typeof options === "boolean" ? options : !!options?.capture;
    const index =
      this.#eventMap[type]?.findIndex(
        (eventListener) => eventListener.listener === listener && eventListener.useCapture === useCapture,
      ) || -1;
    if (index >= 0) {
      this.#eventMap[type]?.splice(index, 1);
      super.removeEventListener(type as string, listener as EventListenerOrEventListenerObject, options);
    }
  }

  clearEventListeners<Event extends WebComponentEvent>(type?: Event) {
    if (type) {
      const list: StoredListener<Event, Context, StoreManager>[] = this.#eventMap[type] || [];
      list.forEach(({ listener, useCapture }) => this.removeEventListener(type, listener, useCapture));

      delete this.#eventMap[type];
    } else {
      const types = Object.keys(this.#eventMap) as WebComponentEvent[];
      types.forEach((eventType) => this.clearEventListeners(eventType));
    }
  }

  render() {}

  #renderComponent() {
    if (this.#initialised) {
      this.dispatchEvent(
        new CustomEvent<WebComponentRenderEventPayload<Context, StoreManager>>(WebComponentEvents.Render, {
          detail: {
            target: this,
            state: this.#state,
            context: this.context,
            attributes: this.monitoredAttributes,
          },
          bubbles: false,
          cancelable: false,
        }),
      );
    }
  }
}
