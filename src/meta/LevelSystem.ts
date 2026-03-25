import { TileColor } from '../game/models/Tile';

export enum LevelGoalType {
  SCORE = 'score',
  COLLECT_COLOR = 'collect_color',
  COLLECT_BONUS = 'collect_bonus',
}

export interface LevelConfig {
  level: number;
  moves: number;
  goalType: LevelGoalType;
  goalValue: number;
  targetColor?: TileColor;
  gridSize: number;
}

export function generateLevel(level: number): LevelConfig {
  const baseMoves = 20;
  const difficulty = Math.floor((level - 1) / 5);
  
  const goalTypes = [LevelGoalType.SCORE, LevelGoalType.COLLECT_COLOR];
  const goalType = goalTypes[level % goalTypes.length];
  
  let goalValue: number;
  let targetColor: TileColor | undefined;
  
  switch (goalType) {
    case LevelGoalType.SCORE:
      goalValue = 1000 + level * 500 + difficulty * 300;
      break;
    case LevelGoalType.COLLECT_COLOR:
      targetColor = Object.values(TileColor).filter(v => typeof v === 'number')[Math.floor(Math.random() * 6)] as TileColor;
      goalValue = 10 + Math.floor(level / 3) * 5;
      break;
    default:
      goalValue = 1000 + level * 500;
  }

  const gridSize = level >= 10 ? 9 : 8;
  const moves = Math.max(baseMoves - difficulty * 2, 10);

  return {
    level,
    moves,
    goalType,
    goalValue,
    targetColor,
    gridSize,
  };
}
