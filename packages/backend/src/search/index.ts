/**
 * Search module exports
 * Requirements: 61 - Advanced search and filtering
 */

export { searchRouter } from './search.routes';
export {
  searchProjects,
  saveSearch,
  getSavedSearches,
  getSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  executeSavedSearch,
  SearchError,
} from './search.service';
export type {
  SearchQuery,
  SearchFilters,
  SearchResults,
  SearchResultItem,
  SearchHighlight,
  SavedSearch,
  SavedSearchInput,
  UpdateSavedSearchInput,
  SavedSearchesResponse,
  DateRange,
  NumberRange,
} from './types';
