import { HTMLContextElement, HTMLContextElementTag } from "./html-context";

export { WebComponentEvents, type WebComponentEventOf } from "./types";
export { HTMLContextElement };

if (!customElements.get(HTMLContextElementTag)) {
  customElements.define(HTMLContextElementTag, HTMLContextElement);
}
