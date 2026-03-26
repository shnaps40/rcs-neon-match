import { Tile, TileColor, TileState, BonusType, createTile, getRandomColor } from './Tile';

export interface MatchInfo {
  tiles: Tile[];
  type: 'horizontal' | 'vertical' | 'l_shape' | 't_shape' | 'line_5' | 'square';
  bonus: BonusType;
  spawnRow: number;
  spawnCol: number;
}

export interface FallInfo {
  fallingTiles: { tile: Tile; fromRow: number; toRow: number; toCol: number }[];
  newTiles: { row: number; col: number }[];
}

export class Board {
  readonly rows: number;
  readonly cols: number;
  private tiles: Tile[][] = [];
  private tileIdCounter = 0;

  constructor(rows: number = 8, cols: number = 8) {
    this.rows = rows;
    this.cols = cols;
    this.init();
  }

  private init(): void {
    this.tiles = [];
    for (let row = 0; row < this.rows; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < this.cols; col++) {
        this.tiles[row][col] = this.createTileInternal(getRandomColor(), row, col);
      }
    }
    this.resolveInitialMatches();
  }

  private createTileInternal(color: TileColor, row: number, col: number): Tile {
    return {
      id: this.tileIdCounter++,
      color,
      state: TileState.NORMAL,
      bonus: BonusType.NONE,
      row,
      col,
    };
  }

  private resolveInitialMatches(): void {
    let hasMatches = true;
    let iterations = 0;
    const maxIterations = 100;

    while (hasMatches && iterations < maxIterations) {
      hasMatches = false;
      iterations++;

      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          if (this.hasMatchAt(row, col)) {
            this.tiles[row][col].color = getRandomColor();
            hasMatches = true;
          }
        }
      }
    }
  }

  private hasMatchAt(row: number, col: number): boolean {
    const color = this.tiles[row][col].color;
    
    if (col >= 2 && 
        this.tiles[row][col-1].color === color && 
        this.tiles[row][col-2].color === color) {
      return true;
    }
    
    if (row >= 2 && 
        this.tiles[row-1][col].color === color && 
        this.tiles[row-2][col].color === color) {
      return true;
    }
    
    return false;
  }

  getTile(row: number, col: number): Tile | null {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return null;
    }
    return this.tiles[row][col];
  }

  getTileUnsafe(row: number, col: number): Tile {
    return this.tiles[row][col];
  }

  swapTiles(row1: number, col1: number, row2: number, col2: number): void {
    const tile1 = this.tiles[row1][col1];
    const tile2 = this.tiles[row2][col2];

    this.tiles[row1][col1] = tile2;
    this.tiles[row2][col2] = tile1;

    tile1.row = row2;
    tile1.col = col2;
    tile2.row = row1;
    tile2.col = col1;
  }

  findMatches(): MatchInfo[] {
    const matches: MatchInfo[] = [];
    const processed = new Set<string>();
    const visited = new Set<string>();

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const key = `${row},${col}`;
        if (visited.has(key)) continue;

        const group = this.findConnectedGroup(row, col);
        if (group.length < 3) continue;

        group.forEach(t => visited.add(`${t.row},${t.col}`));

        const matchInfo = this.analyzeGroup(group, row, col);
        if (matchInfo && matchInfo.tiles.length >= 3) {
          const isDuplicate = processed.has(`${matchInfo.spawnRow},${matchInfo.spawnCol}`);
          if (!isDuplicate) {
            matches.push(matchInfo);
            matchInfo.tiles.forEach(t => processed.add(`${t.row},${t.col}`));
          }
        }
      }
    }

    return matches;
  }

  private findConnectedGroup(startRow: number, startCol: number): Tile[] {
    const tile = this.getTile(startRow, startCol);
    if (!tile) return [];

    if (tile.color === TileColor.BOOSTER) return [];

    const color = tile.color;
    const group: Tile[] = [];
    const queue: Tile[] = [tile];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.row},${current.col}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (current.color === TileColor.BOOSTER || current.color !== color) continue;
      group.push(current);

      const neighbors = this.getNeighbors(current.row, current.col);
      for (const neighbor of neighbors) {
        if (!visited.has(`${neighbor.row},${neighbor.col}`)) {
          queue.push(neighbor);
        }
      }
    }

    return group;
  }

  private getNeighbors(row: number, col: number): Tile[] {
    const neighbors: Tile[] = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of directions) {
      const tile = this.getTile(row + dr, col + dc);
      if (tile) neighbors.push(tile);
    }

    return neighbors;
  }

  private analyzeGroup(group: Tile[], spawnRow: number, spawnCol: number): MatchInfo | null {
    const hasSquare = this.checkForSquare(group);
    if (hasSquare) {
      return this.createMatchInfo('square', group, spawnRow, spawnCol);
    }

    const { horizontal, vertical } = this.getLineCounts(group);

    if (horizontal >= 5 || vertical >= 5) {
      return this.createMatchInfo('line_5', group, spawnRow, spawnCol);
    }

    if (horizontal >= 4) {
      return this.createMatchInfo('horizontal', group, spawnRow, spawnCol);
    }

    if (vertical >= 4) {
      return this.createMatchInfo('vertical', group, spawnRow, spawnCol);
    }

    if (horizontal >= 3 && vertical >= 3) {
      // Distinguish T-shape (tiles span 3+ rows OR 3+ cols) from L-shape (corner)
      const rowSet = new Set(group.map(t => t.row));
      const colSet = new Set(group.map(t => t.col));
      if (rowSet.size >= 3 || colSet.size >= 3) {
        return this.createMatchInfo('t_shape', group, spawnRow, spawnCol);
      }
      return this.createMatchInfo('l_shape', group, spawnRow, spawnCol);
    }

    if (horizontal >= 3) {
      return this.createMatchInfo('horizontal', group, spawnRow, spawnCol);
    }

    if (vertical >= 3) {
      return this.createMatchInfo('vertical', group, spawnRow, spawnCol);
    }

    return null;
  }

  private checkForSquare(group: Tile[]): boolean {
    if (group.length < 4) return false;

    const positions = new Set(group.map(t => `${t.row},${t.col}`));

    for (const tile of group) {
      const r = tile.row;
      const c = tile.col;

      const hasTopLeft = positions.has(`${r},${c}`);
      const hasTopRight = positions.has(`${r},${c + 1}`);
      const hasBottomLeft = positions.has(`${r + 1},${c}`);
      const hasBottomRight = positions.has(`${r + 1},${c + 1}`);

      if (hasTopLeft && hasTopRight && hasBottomLeft && hasBottomRight) {
        return true;
      }
    }

    return false;
  }

  private getLineCounts(group: Tile[]): { horizontal: number; vertical: number } {
    const rowCounts = new Map<number, number>();
    const colCounts = new Map<number, number>();

    for (const tile of group) {
      rowCounts.set(tile.row, (rowCounts.get(tile.row) || 0) + 1);
      colCounts.set(tile.col, (colCounts.get(tile.col) || 0) + 1);
    }

    let horizontal = 0;
    let vertical = 0;

    for (const count of rowCounts.values()) {
      if (count > horizontal) horizontal = count;
    }

    for (const count of colCounts.values()) {
      if (count > vertical) vertical = count;
    }

    return { horizontal, vertical };
  }

  private createMatchInfo(
    type: MatchInfo['type'], 
    tiles: Tile[], 
    row: number, 
    col: number
  ): MatchInfo {
    let bonus: BonusType = BonusType.NONE;
    let spawnRow = row;
    let spawnCol = col;

    switch (type) {
      case 'square':
        bonus = BonusType.CROSS;
        break;
      case 'line_5':
        bonus = BonusType.COLOR_BOMB;
        break;
      case 'l_shape':
      case 't_shape':
        bonus = BonusType.BOMB;
        break;
      case 'horizontal':
        if (tiles.length >= 4) {
          bonus = BonusType.ROCKET_H;
        }
        break;
      case 'vertical':
        if (tiles.length >= 4) {
          bonus = BonusType.ROCKET_V;
        }
        break;
    }

    return { tiles, type, bonus, spawnRow, spawnCol };
  }

  applyMatches(matches: MatchInfo[]): void {
    const tilesToConvert: { tile: Tile; bonus: BonusType }[] = [];
    const tilesToRemove: Tile[] = [];

    for (const match of matches) {
      if (match.bonus !== BonusType.NONE) {
        const spawnTile = match.tiles.find(t => 
          t.row === match.spawnRow && t.col === match.spawnCol
        );
        if (spawnTile) {
          tilesToConvert.push({ tile: spawnTile, bonus: match.bonus });
        }
      }

      for (const tile of match.tiles) {
        const isBonusTile = tilesToConvert.some(t => t.tile === tile);
        if (!isBonusTile && !tilesToRemove.includes(tile)) {
          tilesToRemove.push(tile);
        }
      }
    }

    for (const { tile, bonus } of tilesToConvert) {
      tile.bonus = bonus;
      tile.color = TileColor.BOOSTER;
      tile.state = TileState.NORMAL;
    }

    for (const tile of tilesToRemove) {
      tile.state = TileState.DESTROYED;
    }
  }

  removeDestroyedTiles(): FallInfo {
    const fallInfo: FallInfo = {
      fallingTiles: [],
      newTiles: [],
    };

    for (let col = 0; col < this.cols; col++) {
      let writeRow = this.rows - 1;

      // First pass: move existing tiles down
      for (let row = this.rows - 1; row >= 0; row--) {
        const tile = this.tiles[row][col];
        if (tile.state !== TileState.DESTROYED) {
          if (row !== writeRow) {
            fallInfo.fallingTiles.push({
              tile,
              fromRow: row,
              toRow: writeRow,
              toCol: col,
            });
            this.tiles[writeRow][col] = tile;
            this.tiles[row][col] = null as any;
            tile.row = writeRow;
          }
          writeRow--;
        }
      }

      // Second pass: create new tiles at top
      for (let row = writeRow; row >= 0; row--) {
        const newTile = this.createTileInternal(getRandomColor(), row, col);
        this.tiles[row][col] = newTile;
        fallInfo.newTiles.push({ row, col });
      }
    }

    return fallInfo;
  }

  hasPossibleMoves(): boolean {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (col < this.cols - 1) {
          this.swapTiles(row, col, row, col + 1);
          const hasMatch = this.findMatches().length > 0;
          this.swapTiles(row, col, row, col + 1);
          if (hasMatch) return true;
        }

        if (row < this.rows - 1) {
          this.swapTiles(row, col, row + 1, col);
          const hasMatch = this.findMatches().length > 0;
          this.swapTiles(row, col, row + 1, col);
          if (hasMatch) return true;
        }
      }
    }
    return false;
  }

  reshuffle(): void {
    const allTiles: TileColor[] = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        allTiles.push(this.tiles[row][col].color);
      }
    }

    for (let i = allTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allTiles[i], allTiles[j]] = [allTiles[j], allTiles[i]];
    }

    let idx = 0;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.tiles[row][col].color = allTiles[idx++];
        this.tiles[row][col].bonus = BonusType.NONE;
      }
    }
  }

  getAllTiles(): Tile[][] {
    return this.tiles;
  }

  activateBonus(bonus: BonusType, row: number, col: number, visited: Set<string> = new Set()): Tile[] {
    const affected: Tile[] = [];
    const centerTile = this.getTile(row, col);
    const key = `${row},${col},${bonus}`;
    
    if (visited.has(key)) return affected;
    visited.add(key);

    switch (bonus) {
      case BonusType.ROCKET_H:
        for (let c = 0; c < this.cols; c++) {
          const tile = this.getTile(row, c);
          if (tile) affected.push(tile);
        }
        break;

      case BonusType.ROCKET_V:
        for (let r = 0; r < this.rows; r++) {
          const tile = this.getTile(r, col);
          if (tile) affected.push(tile);
        }
        break;

      case BonusType.BOMB:
        for (let r = row - 1; r <= row + 1; r++) {
          for (let c = col - 1; c <= col + 1; c++) {
            const tile = this.getTile(r, c);
            if (tile) affected.push(tile);
          }
        }
        break;

      case BonusType.CROSS:
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
          const tile = this.getTile(row + dr, col + dc);
          if (tile) affected.push(tile);
        }
        const allTiles: Tile[] = [];
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            const t = this.getTile(r, c);
            if (t && !affected.includes(t)) allTiles.push(t);
          }
        }
        if (allTiles.length > 0) {
          const randomIdx = Math.floor(Math.random() * allTiles.length);
          affected.push(allTiles[randomIdx]);
        }
        break;

      case BonusType.COLOR_BOMB: {
        // Find a neighbouring non-booster tile to determine target color.
        // If swapped with another tile the swap partner's color is used;
        // here we pick the first adjacent non-booster as fallback.
        let targetColor: TileColor | null = null;
        const adjacent = [
          this.getTile(row - 1, col),
          this.getTile(row + 1, col),
          this.getTile(row, col - 1),
          this.getTile(row, col + 1),
        ];
        for (const adj of adjacent) {
          if (adj && adj.color !== TileColor.BOOSTER) {
            targetColor = adj.color;
            break;
          }
        }
        if (targetColor !== null) {
          for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
              const tile = this.getTile(r, c);
              if (tile && tile.color === targetColor) {
                affected.push(tile);
              }
            }
          }
        }
        break;
      }

      case BonusType.SUPER_ROCKET:
        for (let c = 0; c < this.cols; c++) {
          const tile = this.getTile(row, c);
          if (tile) affected.push(tile);
        }
        for (let r = 0; r < this.rows; r++) {
          const tile = this.getTile(r, col);
          if (tile && !affected.includes(tile)) affected.push(tile);
        }
        break;

      case BonusType.SUPER_BOMB:
      case BonusType.HYPER_BOMB:
        for (let r = row - 2; r <= row + 2; r++) {
          for (let c = col - 2; c <= col + 2; c++) {
            const tile = this.getTile(r, c);
            if (tile) affected.push(tile);
          }
        }
        break;

      case BonusType.MEGA_BOMB:
        for (let r = row - 2; r <= row + 2; r++) {
          for (let c = col - 2; c <= col + 2; c++) {
            const tile = this.getTile(r, c);
            if (tile) affected.push(tile);
          }
        }
        break;

      case BonusType.SUPER_CROSS:
      case BonusType.ULTRA_CROSS:
        for (let c = 0; c < this.cols; c++) {
          const tile = this.getTile(row, c);
          if (tile) affected.push(tile);
        }
        for (let r = 0; r < this.rows; r++) {
          const tile = this.getTile(r, col);
          if (tile && !affected.includes(tile)) affected.push(tile);
        }
        for (let r = row - 1; r <= row + 1; r++) {
          for (let c = col - 1; c <= col + 1; c++) {
            const tile = this.getTile(r, c);
            if (tile && !affected.includes(tile)) affected.push(tile);
          }
        }
        break;
    }

    if (centerTile && !affected.includes(centerTile)) {
      affected.push(centerTile);
    }

    const boostersToActivate: { row: number; col: number; bonus: BonusType }[] = [];

    for (const tile of affected) {
      if (tile.state !== TileState.DESTROYED) {
        tile.state = TileState.DESTROYED;
        if (tile.bonus !== BonusType.NONE) {
          boostersToActivate.push({ row: tile.row, col: tile.col, bonus: tile.bonus });
        }
        tile.bonus = BonusType.NONE;
      }
    }

    for (const booster of boostersToActivate) {
      const chainAffected = this.activateBonus(booster.bonus, booster.row, booster.col, visited);
      for (const t of chainAffected) {
        if (!affected.includes(t)) {
          affected.push(t);
        }
      }
    }

    return affected;
  }

  checkBoosterBeforeSwap(row1: number, col1: number, row2: number, col2: number): { hasBooster: boolean; boosterPos: { row: number; col: number; bonus: BonusType } | null } {
    const tile1 = this.getTile(row1, col1);
    const tile2 = this.getTile(row2, col2);

    if (!tile1 || !tile2) {
      return { hasBooster: false, boosterPos: null };
    }

    if (tile1.bonus !== BonusType.NONE && tile2.bonus !== BonusType.NONE) {
      return { hasBooster: true, boosterPos: { row: row1, col: col1, bonus: tile1.bonus } };
    }

    if (tile1.bonus !== BonusType.NONE) {
      return { hasBooster: true, boosterPos: { row: row1, col: col1, bonus: tile1.bonus } };
    }

    if (tile2.bonus !== BonusType.NONE) {
      return { hasBooster: true, boosterPos: { row: row2, col: col2, bonus: tile2.bonus } };
    }

    return { hasBooster: false, boosterPos: null };
  }

  checkBoosterAfterSwap(row1: number, col1: number, row2: number, col2: number): { hasBooster: boolean; boosterPos: { row: number; col: number; bonus: BonusType } | null } {
    const tile1 = this.getTile(row1, col1);
    const tile2 = this.getTile(row2, col2);

    if (!tile1 || !tile2) {
      return { hasBooster: false, boosterPos: null };
    }

    if (tile1.bonus !== BonusType.NONE && tile2.bonus !== BonusType.NONE) {
      return { hasBooster: true, boosterPos: { row: row1, col: col1, bonus: tile1.bonus } };
    }

    if (tile1.bonus !== BonusType.NONE) {
      return { hasBooster: true, boosterPos: { row: row1, col: col1, bonus: tile1.bonus } };
    }

    if (tile2.bonus !== BonusType.NONE) {
      return { hasBooster: true, boosterPos: { row: row2, col: col2, bonus: tile2.bonus } };
    }

    return { hasBooster: false, boosterPos: null };
  }

  checkComboBeforeSwap(row1: number, col1: number, row2: number, col2: number): { isCombo: boolean; bonus1: BonusType; bonus2: BonusType; row: number; col: number } | null {
    const tile1 = this.getTile(row1, col1);
    const tile2 = this.getTile(row2, col2);

    if (!tile1 || !tile2) return null;

    if (tile1.bonus !== BonusType.NONE && tile2.bonus !== BonusType.NONE) {
      return {
        isCombo: true,
        bonus1: tile1.bonus,
        bonus2: tile2.bonus,
        row: row2,
        col: col2
      };
    }

    return null;
  }

  checkComboAfterSwap(row1: number, col1: number, row2: number, col2: number): { isCombo: boolean; bonus1: BonusType; bonus2: BonusType; row: number; col: number } | null {
    const tile1 = this.getTile(row1, col1);
    const tile2 = this.getTile(row2, col2);

    if (!tile1 || !tile2) return null;

    if (tile1.bonus !== BonusType.NONE && tile2.bonus !== BonusType.NONE) {
      return {
        isCombo: true,
        bonus1: tile1.bonus,
        bonus2: tile2.bonus,
        row: row2,
        col: col2
      };
    }

    return null;
  }

  createSuperBooster(row1: number, col1: number, row2: number, col2: number): { created: boolean; newBonus: BonusType | null; row: number; col: number } {
    const tile1 = this.getTile(row1, col1);
    const tile2 = this.getTile(row2, col2);

    if (!tile1 || !tile2) return { created: false, newBonus: null, row: -1, col: -1 };

    if (tile1.bonus === BonusType.NONE || tile2.bonus === BonusType.NONE) {
      return { created: false, newBonus: null, row: -1, col: -1 };
    }

    const b1 = tile1.bonus;
    const b2 = tile2.bonus;

    let superBonus: BonusType | null = null;

    if ((b1 === BonusType.ROCKET_H || b1 === BonusType.ROCKET_V) && (b2 === BonusType.ROCKET_H || b2 === BonusType.ROCKET_V)) {
      superBonus = BonusType.SUPER_ROCKET;
    } else if ((b1 === BonusType.ROCKET_H || b1 === BonusType.ROCKET_V) && b2 === BonusType.BOMB) {
      superBonus = BonusType.SUPER_BOMB;
    } else if ((b1 === BonusType.ROCKET_H || b1 === BonusType.ROCKET_V) && b2 === BonusType.CROSS) {
      superBonus = BonusType.SUPER_CROSS;
    } else if (b1 === BonusType.BOMB && (b2 === BonusType.ROCKET_H || b2 === BonusType.ROCKET_V)) {
      superBonus = BonusType.SUPER_BOMB;
    } else if (b1 === BonusType.CROSS && (b2 === BonusType.ROCKET_H || b2 === BonusType.ROCKET_V)) {
      superBonus = BonusType.SUPER_CROSS;
    } else if (b1 === BonusType.BOMB && b2 === BonusType.BOMB) {
      superBonus = BonusType.MEGA_BOMB;
    } else if (b1 === BonusType.BOMB && b2 === BonusType.CROSS) {
      superBonus = BonusType.HYPER_BOMB;
    } else if (b1 === BonusType.CROSS && b2 === BonusType.BOMB) {
      superBonus = BonusType.HYPER_BOMB;
    } else if (b1 === BonusType.CROSS && b2 === BonusType.CROSS) {
      superBonus = BonusType.ULTRA_CROSS;
    }

    if (superBonus) {
      tile2.bonus = superBonus;
      tile2.color = TileColor.BOOSTER;
      tile1.bonus = BonusType.NONE;
      tile1.color = TileColor.BOOSTER;
      return { created: true, newBonus: superBonus, row: row2, col: col2 };
    }

    return { created: false, newBonus: null, row: -1, col: -1 };
  }

  activateCombo(b1: BonusType, b2: BonusType, row: number, col: number): Tile[] {
    const affected: Tile[] = [];

    if (b1 === BonusType.COLOR_BOMB || b2 === BonusType.COLOR_BOMB) {
      const other = b1 === BonusType.COLOR_BOMB ? b2 : b1;
      const centerTile = this.getTile(row, col);
      
      if (centerTile) {
        const targetColor = centerTile.color;
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            const tile = this.getTile(r, c);
            if (tile && tile.color === targetColor) {
              affected.push(tile);
            }
          }
        }
      }
      
      if (other === BonusType.ROCKET_H || other === BonusType.ROCKET_V) {
        for (let c = 0; c < this.cols; c++) {
          const tile = this.getTile(row, c);
          if (tile && !affected.includes(tile)) affected.push(tile);
        }
        for (let r = 0; r < this.rows; r++) {
          const tile = this.getTile(r, col);
          if (tile && !affected.includes(tile)) affected.push(tile);
        }
      } else if (other === BonusType.BOMB) {
        for (let r = row - 2; r <= row + 2; r++) {
          for (let c = col - 2; c <= col + 2; c++) {
            const tile = this.getTile(r, c);
            if (tile && !affected.includes(tile)) affected.push(tile);
          }
        }
      } else if (other === BonusType.CROSS) {
        for (let c = 0; c < this.cols; c++) {
          const tile = this.getTile(row, c);
          if (tile && !affected.includes(tile)) affected.push(tile);
        }
        for (let r = 0; r < this.rows; r++) {
          const tile = this.getTile(r, col);
          if (tile && !affected.includes(tile)) affected.push(tile);
        }
      }
      return affected;
    }

    if ((b1 === BonusType.ROCKET_H || b1 === BonusType.ROCKET_V) && 
        (b2 === BonusType.ROCKET_H || b2 === BonusType.ROCKET_V)) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.getTile(row, c);
        if (tile) affected.push(tile);
      }
      for (let r = 0; r < this.rows; r++) {
        const tile = this.getTile(r, col);
        if (tile && !affected.includes(tile)) affected.push(tile);
      }
      return affected;
    }

    if (b1 === BonusType.BOMB || b2 === BonusType.BOMB) {
      const rocket = b1 === BonusType.BOMB ? b2 : b1;
      for (let r = row - 2; r <= row + 2; r++) {
        for (let c = col - 2; c <= col + 2; c++) {
          const tile = this.getTile(r, c);
          if (tile) affected.push(tile);
        }
      }
      if (rocket === BonusType.ROCKET_H) {
        for (let c = 0; c < this.cols; c++) {
          const tile = this.getTile(row, c);
          if (tile && !affected.includes(tile)) affected.push(tile);
        }
      } else if (rocket === BonusType.ROCKET_V) {
        for (let r = 0; r < this.rows; r++) {
          const tile = this.getTile(r, col);
          if (tile && !affected.includes(tile)) affected.push(tile);
        }
      }
      return affected;
    }

    if (b1 === BonusType.CROSS || b2 === BonusType.CROSS) {
      const other = b1 === BonusType.CROSS ? b2 : b1;
      for (let c = 0; c < this.cols; c++) {
        const tile = this.getTile(row, c);
        if (tile) affected.push(tile);
      }
      for (let r = 0; r < this.rows; r++) {
        const tile = this.getTile(r, col);
        if (tile && !affected.includes(tile)) affected.push(tile);
      }
      const otherType = other as BonusType;
      if (otherType === BonusType.ROCKET_H) {
        for (let c = 0; c < this.cols; c++) {
          const tile = this.getTile(row, c);
          if (tile && !affected.includes(tile)) affected.push(tile);
        }
      } else if (otherType === BonusType.ROCKET_V) {
        for (let r = 0; r < this.rows; r++) {
          const tile = this.getTile(r, col);
          if (tile && !affected.includes(tile)) affected.push(tile);
        }
      } else if (otherType === BonusType.BOMB) {
        for (let r = row - 2; r <= row + 2; r++) {
          for (let c = col - 2; c <= col + 2; c++) {
            const tile = this.getTile(r, c);
            if (tile && !affected.includes(tile)) affected.push(tile);
          }
        }
      } else if (otherType === BonusType.COLOR_BOMB) {
        const centerTile = this.getTile(row, col);
        if (centerTile) {
          const targetColor = centerTile.color;
          for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
              const tile = this.getTile(r, c);
              if (tile && tile.color === targetColor && !affected.includes(tile)) {
                affected.push(tile);
              }
            }
          }
        }
      }
      for (const tile of affected) {
        tile.state = TileState.DESTROYED;
        tile.bonus = BonusType.NONE;
      }
      return affected;
    }

    for (const tile of affected) {
      tile.state = TileState.DESTROYED;
      tile.bonus = BonusType.NONE;
    }
    return affected;
  }

  hasMatchAfterSwap(row1: number, col1: number, row2: number, col2: number): boolean {
    const matches = this.findMatches();
    return matches.length > 0;
  }

  activateAbility(type: string): { tiles: Tile[]; bonusTiles?: Tile[] } {
    switch (type) {
      case 'color_change':
        return this.activateColorChangeAbility();
      case 'odd_remove':
        return this.activateOddRemoveAbility();
      case 'add_boosters':
        return this.activateAddBoostersAbility();
      default:
        return { tiles: [] };
    }
  }

  private activateColorChangeAbility(): { tiles: Tile[]; bonusTiles?: Tile[] } {
    const allTiles: Tile[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.getTile(r, c);
        if (tile && tile.bonus === BonusType.NONE) {
          allTiles.push(tile);
        }
      }
    }

    const shuffled = allTiles.sort(() => Math.random() - 0.5);
    const toChange = shuffled.slice(0, 10);

    for (const tile of toChange) {
      const newColor = getRandomColor();
      tile.color = newColor;
      tile.state = TileState.NORMAL;
      tile.bonus = BonusType.NONE;
    }

    return { tiles: toChange };
  }

  private activateOddRemoveAbility(): { tiles: Tile[] } {
    const toRemove: Tile[] = [];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if ((r + c) % 2 === 1) {
          const tile = this.getTile(r, c);
          if (tile) {
            toRemove.push(tile);
          }
        }
      }
    }

    for (const tile of toRemove) {
      tile.state = TileState.DESTROYED;
    }

    return { tiles: toRemove };
  }

  private activateAddBoostersAbility(): { tiles: Tile[]; bonusTiles: Tile[] } {
    const emptyTiles: Tile[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.getTile(r, c);
        if (tile && tile.bonus === BonusType.NONE && tile.color !== TileColor.BOOSTER) {
          emptyTiles.push(tile);
        }
      }
    }

    const shuffled = emptyTiles.sort(() => Math.random() - 0.5);
    const toUpgrade = shuffled.slice(0, 3);
    const bonusTiles: Tile[] = [];

    const bonusTypes = [BonusType.ROCKET_H, BonusType.ROCKET_V, BonusType.BOMB, BonusType.CROSS, BonusType.COLOR_BOMB];

    for (const tile of toUpgrade) {
      tile.color = TileColor.BOOSTER;
      tile.bonus = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
      bonusTiles.push(tile);
    }

    return { tiles: [], bonusTiles };
  }
}
