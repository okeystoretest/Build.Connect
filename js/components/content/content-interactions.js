import { createClickHandler } from './interactions/content-clicks.js';
import { createInputHandler } from './interactions/content-inputs.js';
import { createChangeHandler } from './interactions/content-changes.js';

export function bindContentInteractions(rootElement, viewState, dependencies) {
  const sector = viewState.selectedItem;

  clearContentInteractionListeners(rootElement);

  if (!viewState.shouldRenderCards || !sector?.id) {
    return;
  }

  const clickHandler = createClickHandler(rootElement, viewState, dependencies);
  const inputHandler = createInputHandler(rootElement, sector, dependencies);
  const changeHandler = createChangeHandler(rootElement, sector, dependencies);

  rootElement.__buildConnectContentClickHandler = clickHandler;
  rootElement.__buildConnectContentInputHandler = inputHandler;
  rootElement.__buildConnectContentChangeHandler = changeHandler;
  rootElement.addEventListener('click', clickHandler);
  rootElement.addEventListener('input', inputHandler);
  rootElement.addEventListener('change', changeHandler);
}

function clearContentInteractionListeners(rootElement) {
  if (rootElement.__buildConnectContentClickHandler) {
    rootElement.removeEventListener('click', rootElement.__buildConnectContentClickHandler);
    delete rootElement.__buildConnectContentClickHandler;
  }

  if (rootElement.__buildConnectContentInputHandler) {
    rootElement.removeEventListener('input', rootElement.__buildConnectContentInputHandler);
    delete rootElement.__buildConnectContentInputHandler;
  }

  if (rootElement.__buildConnectContentChangeHandler) {
    rootElement.removeEventListener('change', rootElement.__buildConnectContentChangeHandler);
    delete rootElement.__buildConnectContentChangeHandler;
  }
}
