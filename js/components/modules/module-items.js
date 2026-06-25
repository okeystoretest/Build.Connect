import { DEFAULT_LOCALE, MODULE_ITEM_TYPES, MODULE_SORT_ORDER } from '../../constants/module.constants.js';

export function prepareModuleItems(items, moduleUi, itemType) {
  const query = String(moduleUi?.query || '').trim().toLowerCase();
  const toolFilter = String(moduleUi?.selectedToolFilter || '').trim();
  const prepared = [...items]
    .filter((item) => {
      // Tool filter: match #TOOL at end of title/name
      if (toolFilter) {
        const title = String(itemType === MODULE_ITEM_TYPES.video ? item.title || '' : item.name || '');
        const match = title.match(/#([\w\-\u00C0-\u024F. ]+)\s*$/);
        if (!match || match[1].trim().toUpperCase() !== toolFilter.toUpperCase()) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const haystack = itemType === MODULE_ITEM_TYPES.video
        ? `${item.title || ''} ${item.durationLabel || ''}`
        : `${item.name || ''} ${item.extension || ''} ${item.sizeLabel || ''}`;

      return haystack.toLowerCase().includes(query);
    })
    .sort((itemA, itemB) => {
      const valueA = String(itemType === MODULE_ITEM_TYPES.video ? itemA.title || '' : itemA.name || '').toLocaleLowerCase(DEFAULT_LOCALE);
      const valueB = String(itemType === MODULE_ITEM_TYPES.video ? itemB.title || '' : itemB.name || '').toLocaleLowerCase(DEFAULT_LOCALE);
      return moduleUi?.sort === MODULE_SORT_ORDER.descending ? valueB.localeCompare(valueA, DEFAULT_LOCALE) : valueA.localeCompare(valueB, DEFAULT_LOCALE);
    });

  return prepared;
}
