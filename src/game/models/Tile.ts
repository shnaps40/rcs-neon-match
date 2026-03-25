export enum TileColor {
  CYAN = 0,
  PINK = 1,
  BLUE = 2,
  GREEN = 3,
  YELLOW = 4,
  PURPLE = 5,
  BOOSTER = 100,
}

export enum TileState {
  NORMAL = 'normal',
  SELECTED = 'selected',
  MATCHED = 'matched',
  FALLING = 'falling',
  DESTROYED = 'destroyed',
}

export enum BonusType {
  NONE = 'none',
  ROCKET_H = 'rocket_h',
  ROCKET_V = 'rocket_v',
  CROSS = 'cross',
  BOMB = 'bomb',
  COLOR_BOMB = 'color_bomb',
  SUPER_ROCKET = 'super_rocket',
  SUPER_BOMB = 'super_bomb',
  SUPER_CROSS = 'super_cross',
  MEGA_BOMB = 'mega_bomb',
  HYPER_BOMB = 'hyper_bomb',
  ULTRA_CROSS = 'ultra_cross',
}

export interface Tile {
  id: number;
  color: TileColor;
  state: TileState;
  bonus: BonusType;
  row: number;
  col: number;
}

let tileIdCounter = 0;

export function createTile(color: TileColor, row: number, col: number): Tile {
  return {
    id: tileIdCounter++,
    color,
    state: TileState.NORMAL,
    bonus: BonusType.NONE,
    row,
    col,
  };
}

export function getRandomColor(): TileColor {
  const colors = Object.values(TileColor).filter(
    (v): v is TileColor => typeof v === 'number' && v !== TileColor.BOOSTER
  );
  return colors[Math.floor(Math.random() * colors.length)];
}
