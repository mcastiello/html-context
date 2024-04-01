import { ActionDefinition, createStore, Reducer } from "@mcastiello/simple-store";
import { HTMLContextElement, WebComponentEvents } from "./index";
import { HTMLContextElementTag } from "./html-context";

enum Action {
  Initialise,
  Update,
  Destroy,
}

type Definitions = {
  [Action.Initialise]: ActionDefinition<Action.Initialise, boolean>;
  [Action.Update]: ActionDefinition<Action.Update, string>;
  [Action.Destroy]: ActionDefinition<Action.Destroy, undefined>;
};

type State = {
  init?: boolean;
  value?: string;
};

type Context = {
  flag?: boolean;
  value?: string;
};

describe("HTML Context Element", () => {
  const reducer = jest.fn<ReturnType<Reducer<State, Definitions>>, Parameters<Reducer<State, Definitions>>>(
    (state = {}, action) => {
      switch (action.type) {
        case Action.Initialise:
          return { ...state, init: action.payload };
        case Action.Update:
          return { ...state, value: action.payload };
        case Action.Destroy:
          return {};
      }
    },
  );

  beforeEach(() => {
    reducer.mockClear();
  });

  test("The state propagates across the DOM tree", () => {
    const callback = jest.fn();
    const store = createStore(reducer);

    const parent = document.createElement(HTMLContextElementTag) as HTMLContextElement<Context, State, Action>;

    const container = document.createElement("div");

    const child = document.createElement(HTMLContextElementTag) as HTMLContextElement<Context, State, Action>;

    child.addEventListener(WebComponentEvents.Render, callback);

    container.append(child);

    parent.append(container);

    document.body.append(parent);

    parent.store = store;

    store.dispatch(Action.Initialise, true);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ state: { init: true } }) }),
    );

    callback.mockClear();

    container.removeChild(child);

    store.dispatch(Action.Update, "test");

    expect(callback).not.toHaveBeenCalled();

    container.append(child);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ state: { init: true, value: "test" } }) }),
    );
    document.body.removeChild(parent);
  });

  test("The rendering is only triggered by observed actions", () => {
    const callback = jest.fn();
    const store = createStore(reducer);

    class ChildContext extends HTMLContextElement<Context, State, Action> {
      get observedActions(): Action[] | undefined {
        return [Action.Update];
      }
    }
    customElements.define("child-store-context", ChildContext);

    const parent = document.createElement(HTMLContextElementTag) as HTMLContextElement<Context, State, Action>;

    const container = document.createElement("div");

    const child = document.createElement("child-store-context") as HTMLContextElement<Context, State, Action>;

    container.append(child);

    parent.append(container);

    document.body.append(parent);

    child.addEventListener(WebComponentEvents.Render, callback);

    parent.store = store;

    callback.mockClear();

    store.dispatch(Action.Initialise, true);

    expect(callback).not.toHaveBeenCalled();

    callback.mockClear();

    store.dispatch(Action.Update, "test");

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ state: { init: true, value: "test" } }) }),
    );
    document.body.removeChild(parent);
  });

  test("The context propagates across the DOM tree", () => {
    const callback = jest.fn();
    const parent = document.createElement(HTMLContextElementTag) as HTMLContextElement<Context, State, Action>;

    const container = document.createElement("div");

    const child = document.createElement(HTMLContextElementTag) as HTMLContextElement<Context, State, Action>;

    child.addEventListener(WebComponentEvents.Render, callback);

    container.append(child);

    parent.append(container);

    document.body.append(parent);

    parent.context = { flag: true };

    expect(child.context?.flag).toEqual(true);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ context: { flag: true } }) }),
    );

    if (child.context) {
      child.context.flag = false;
    }

    expect(parent.context?.flag).toEqual(false);

    document.body.removeChild(parent);
  });

  test("The closest element is always the one providing the context", () => {
    const callback = jest.fn();
    const parent = document.createElement(HTMLContextElementTag) as HTMLContextElement<Context, State, Action>;

    const container = document.createElement(HTMLContextElementTag) as HTMLContextElement<Context, State, Action>;

    const child = document.createElement(HTMLContextElementTag) as HTMLContextElement<Context, State, Action>;

    child.addEventListener(WebComponentEvents.Render, callback);

    container.append(child);

    parent.append(container);

    document.body.append(parent);

    parent.context = { flag: true };

    expect(child.context?.flag).toEqual(true);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ context: { flag: true } }) }),
    );

    if (child.context) {
      child.context.flag = false;
    }

    expect(parent.context?.flag).toEqual(false);

    // Assign a completely different object to an element in the middle
    container.context = { value: "test" };

    expect(child.context?.value).toEqual("test");

    expect(parent.context).toEqual({ flag: false });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ context: { value: "test" } }) }),
    );

    document.body.removeChild(parent);
  });

  test("The rendering is triggered by updating observed attributes", () => {
    const callback = jest.fn();

    class AttributeContext extends HTMLContextElement<Context, State, Action> {
      static get observedAttributes() {
        return ["test", "flag"];
      }
    }
    customElements.define("child-attribute-context", AttributeContext);

    const context = document.createElement("child-attribute-context") as HTMLContextElement<Context, State, Action>;

    context.setAttribute("test", "value");

    document.body.append(context);

    context.addEventListener(WebComponentEvents.Render, callback);

    callback.mockClear();

    expect(context.monitoredAttributes).toEqual({ test: "value", flag: undefined });

    context.setAttribute("test", "update");

    expect(context.monitoredAttributes).toEqual({ test: "update", flag: undefined });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ attributes: { test: "update" } }) }),
    );

    context.setAttribute("flag", "true");

    expect(context.monitoredAttributes).toEqual({ test: "update", flag: "true" });

    context.removeAttribute("flag");

    expect(context.monitoredAttributes).toEqual({ test: "update", flag: undefined });

    document.body.removeChild(context);
  });

  test("Can remove all listeners in one go", () => {
    const callback = jest.fn();
    const parent = document.createElement(HTMLContextElementTag) as HTMLContextElement<Context, State, Action>;

    const container = document.createElement("div");

    const child = document.createElement(HTMLContextElementTag) as HTMLContextElement<Context, State, Action>;

    child.addEventListener(WebComponentEvents.Render, callback);

    container.append(child);

    parent.append(container);

    parent.context = { flag: true };

    document.body.append(parent);

    expect(callback).toHaveBeenCalled();

    callback.mockClear();

    child.clearEventListeners();

    expect(callback).not.toHaveBeenCalled();

    child.addEventListener(WebComponentEvents.Render, callback, true);

    parent.context = { value: "test" };

    expect(callback).toHaveBeenCalled();

    document.body.removeChild(parent);
  });

  test("Context can propagate through the Shadow DOM", () => {
    const callback = jest.fn();

    class ShadowContext extends HTMLContextElement<Context, State, Action> {
      constructor() {
        super();
        this.addEventListener(WebComponentEvents.Initialised, () => {
          this.attachShadow({ mode: "open" });
        });
      }
    }
    customElements.define("shadow-context", ShadowContext);

    const parent = document.createElement(HTMLContextElementTag) as HTMLContextElement<Context, State, Action>;

    const shadow = document.createElement("shadow-context") as ShadowContext;

    const container = document.createElement("div");

    const child = document.createElement(HTMLContextElementTag) as HTMLContextElement<Context, State, Action>;

    child.addEventListener(WebComponentEvents.Render, callback);

    container.append(child);

    parent.append(shadow);

    document.body.append(parent);

    shadow.shadowRoot?.append(container);

    parent.context = { flag: true };

    expect(child.context?.flag).toEqual(true);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ context: { flag: true } }) }),
    );

    document.body.removeChild(parent);
  });

  test("Make sure the DOM elements are updated", () => {
    class ContextComponent extends HTMLContextElement<Context, State, Action> {
      constructor() {
        super();
        this.addEventListener(WebComponentEvents.Initialised, () => {
          this.innerHTML = "<span></span>";
        });
      }

      render() {
        const span = this.querySelector("span");
        if (span) {
          span.textContent = this.state?.value || this.context?.value || null;
        }
      }
    }
    customElements.define("ctx-component", ContextComponent);

    document.body.innerHTML = `
      <html-context class="context">
        <div class="container">
          <ctx-component class="component"></ctx-component>
        </div>
      </html-context>
    `;

    const store = createStore(reducer);
    const container = document.body.querySelector(".context") as HTMLContextElement<Context, State, Action>;
    container.context = {
      value: "-",
    };
    container.store = store;

    expect(document.body.querySelector(".component span")?.textContent).toEqual("-");

    store.dispatch(Action.Update, "test");

    expect(document.body.querySelector(".component span")?.textContent).toEqual("test");
  });
});
