import { renderContentView } from '../components/content.js';
import { renderLoginView } from '../components/login.js';
import { renderSidebar } from '../components/sidebar.js';
import { SECTOR_IDS } from '../constants/sector.constants.js';
import {
  findItemById,
  isHomeItem,
  shouldRenderDefaultSectorCards,
} from '../services/navigation.service.js';

export function renderApplication({ sidebarRoot, state, handlers, navigationItems, currentTheme }) {
  renderSidebar(sidebarRoot, state, handlers, navigationItems, currentTheme);
}

export function renderCurrentContent({ contentRoot, state, navigationItems, options = {} }) {
  const selectedItem = findItemById(state.activeItemId, navigationItems) ?? findItemById(SECTOR_IDS.home, navigationItems);

  renderContentView(
    contentRoot,
    {
      selectedItem,
      isWelcome: isHomeItem(state.activeItemId),
      shouldRenderCards: shouldRenderDefaultSectorCards(state.activeItemId),
      authenticatedUser: state.authenticatedUser,
    },
    options,
  );
}

export function renderAuthentication({ authRoot, loginState, onSubmit }) {
  renderLoginView(authRoot, loginState, {
    onSubmit,
  });
}
