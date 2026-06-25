import { USER_ADMIN_SECTOR_OPTIONS } from '../../../constants/sector.constants.js';

export const QUIZ_SECTOR_OPTIONS = USER_ADMIN_SECTOR_OPTIONS.filter((s) => s.id !== 'all');

export const QUIZ_FORM_DEFAULTS = Object.freeze({
  pergunta: '',
  opcao_a:  '',
  opcao_b:  '',
  opcao_c:  '',
  gabarito: '',
});

export const QUIZ_UI_DEFAULTS = Object.freeze({
  mode:               'list',   // 'list' | 'form'
  selectedSectorId:   '',
  videos:             [],
  videosLoading:      false,
  videosError:        false,
  selectedVideoId:    '',
  selectedVideoTitle: '',
  quizzes:            [],
  quizzesLoading:     false,
  editingQuizId:      null,
  form:               { ...QUIZ_FORM_DEFAULTS },
  isSaving:           false,
  isDeleting:         false,
  saveMessage:        '',
  saveError:          false,
});
