export enum AbilityType {
  COLOR_CHANGE = 'color_change',
  ODD_REMOVE = 'odd_remove',
  ADD_BOOSTERS = 'add_boosters',
}

export interface CharacterAbility {
  name: string;
  description: string;
  type: AbilityType;
}

export interface Character {
  id: string;
  name: string;
  shortName: string;
  image: string;
  description: string;
  ability: CharacterAbility;
}

export const CHARACTERS: Character[] = [
  {
    id: 'rcs_000',
    name: 'RCS#000 The First',
    shortName: 'The First',
    image: 'The First',
    description: 'Основатель Эфириона. Одна из самых загадочных и ключевых фигур в истории.',
    ability: {
      name: 'Основание',
      description: 'Меняет 10 случайных плиток на новые',
      type: AbilityType.COLOR_CHANGE,
    },
  },
  {
    id: 'rcs_404',
    name: 'RCS#404 AI E.L.S.A.',
    shortName: 'E.L.S.A.',
    image: 'AIELSA',
    description: 'Легендарный ИИ Материнской Башни, копия разума матери Первого.',
    ability: {
      name: 'Перегрузка',
      description: 'Удаляет с поля каждую нечётную плитку',
      type: AbilityType.ODD_REMOVE,
    },
  },
  {
    id: 'rcs_777',
    name: 'RCS#777 Ashley Sparks',
    shortName: 'Ashley',
    image: 'Ashley Sparks',
    description: 'Легендарный персонаж Эфириона, незаменимый бармен в баре "Нано".',
    ability: {
      name: 'Ещё бокал',
      description: 'Добавляет 3 бустера на поле',
      type: AbilityType.ADD_BOOSTERS,
    },
  },
];

export function getCharacterById(id: string): Character | undefined {
  return CHARACTERS.find(c => c.id === id);
}

export function getAllCharacters(): Character[] {
  return CHARACTERS;
}
