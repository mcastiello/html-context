# HTML Context
An HTML WebComponent capable of propagating a context across the DOM tree.

### Install
`yarn add @mcastiello/html-context`

`npm install @mcastiello/html-context`

## Propagate context
The component is able to propagate a context across the DOM tree by passing it between children on the same branch.

It also allows you to pass a store element which, whenever the state is updated, it will trigger the render function
```ts
import { ActionDefinition, createStore, Reducer } from "@mcastiello/simple-store";
import { HTMLContextElement, WebComponentEvents } from "@mcastiello/html-context";

enum Action {
  Update,
}

type Definitions = {
  [Action.Update]: ActionDefinition<Action.Update, string>;
};

type State = {
  value?: string;
};

type Context = {
  emptyValue: string;
};

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
      span.textContent = this.state?.value || this.context?.emptyValue || null;
    }
  }
}
customElements.define("ctx-component", ContextComponent);
```

Once you created your component, you can simply add it to the DOM and let the context element propagate the data.

```ts
import { createStore, Reducer } from "@mcastiello/simple-store";

document.body.innerHTML = `
  <html-context class="context">
    <div class="container">
      <ctx-component class="component"></ctx-component>
    </div>
  </html-context>
`;

const container = document.body.querySelector(".context") as HTMLContextElement<Context, State, Action>;

const reducer: Reducer<State, Definitions> = (state = {}, action) => {
  switch (action.type) {
    case Action.Update:
      return {...state, value: action.payload};
  }
};
const store = createStore(reducer);

container.context = {
  emptyString: "-",
};
container.store = store;

console.log(document.body.querySelector(".component span").textContent); // "-";

store.dispatch(Action.Update, "test");

console.log(document.body.querySelector(".component span").textContent); // "test";
```
