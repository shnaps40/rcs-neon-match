export interface GameSaveData {
  coins: number;
  stars: number;
  energy: number;
  maxEnergy: number;
  energyRefillTime: number;
  currentLevel: number;
  completedLevels: number[];
  roomDecor: string[];
  selectedCharacterId: string;
  comboCount: number;
  abilityActive: boolean;
  hammers: number;
}

const STORAGE_KEY = 'neon_match_save';

export class SaveSystem {
  private data: GameSaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): GameSaveData {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load save:', e);
    }

    return this.getDefaultData();
  }

  private getDefaultData(): GameSaveData {
    return {
      coins: 100,
      stars: 0,
      energy: 30,
      maxEnergy: 30,
      energyRefillTime: Date.now(),
      currentLevel: 1,
      completedLevels: [],
      roomDecor: [],
      selectedCharacterId: 'rcs_000',
      comboCount: 0,
      abilityActive: false,
      hammers: 100,
    };
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save:', e);
    }
  }

  getCoins(): number {
    return this.data.coins;
  }

  addCoins(amount: number): void {
    this.data.coins += amount;
    this.save();
  }

  spendCoins(amount: number): boolean {
    if (this.data.coins >= amount) {
      this.data.coins -= amount;
      this.save();
      return true;
    }
    return false;
  }

  getStars(): number {
    return this.data.stars;
  }

  addStars(amount: number): void {
    this.data.stars += amount;
    this.save();
  }

  spendStars(amount: number): boolean {
    if (this.data.stars >= amount) {
      this.data.stars -= amount;
      this.save();
      return true;
    }
    return false;
  }

  getEnergy(): number {
    this.updateEnergy();
    return this.data.energy;
  }

  setEnergy(amount: number): void {
    this.data.energy = Math.min(amount, this.data.maxEnergy);
    this.save();
  }

  useEnergy(amount: number = 1): boolean {
    this.updateEnergy();
    if (this.data.energy >= amount) {
      this.data.energy -= amount;
      this.save();
      return true;
    }
    return false;
  }

  private updateEnergy(): void {
    const now = Date.now();
    const elapsed = now - this.data.energyRefillTime;
    const refillInterval = 5 * 60 * 1000;
    const toRefill = Math.floor(elapsed / refillInterval);

    if (toRefill > 0) {
      this.data.energy = Math.min(this.data.energy + toRefill, this.data.maxEnergy);
      this.data.energyRefillTime = now - (elapsed % refillInterval);
      this.save();
    }
  }

  getEnergyRefillProgress(): number {
    const now = Date.now();
    const elapsed = now - this.data.energyRefillTime;
    const refillInterval = 5 * 60 * 1000;
    return Math.min(elapsed / refillInterval, 1);
  }

  getCurrentLevel(): number {
    return this.data.currentLevel;
  }

  setCurrentLevel(level: number): void {
    this.data.currentLevel = level;
    this.save();
  }

  completeLevel(level: number, earnedCoins: number, earnedStars: number): void {
    if (!this.data.completedLevels.includes(level)) {
      this.data.completedLevels.push(level);
    }
    this.addCoins(earnedCoins);
    this.addStars(earnedStars);
    this.save();
  }

  isLevelCompleted(level: number): boolean {
    return this.data.completedLevels.includes(level);
  }

  getRoomDecor(): string[] {
    return [...this.data.roomDecor];
  }

  addRoomDecor(itemId: string): void {
    if (!this.data.roomDecor.includes(itemId)) {
      this.data.roomDecor.push(itemId);
      this.save();
    }
  }

  hasRoomDecor(itemId: string): boolean {
    return this.data.roomDecor.includes(itemId);
  }

  getSelectedCharacterId(): string {
    return this.data.selectedCharacterId;
  }

  setSelectedCharacter(characterId: string): void {
    this.data.selectedCharacterId = characterId;
    this.save();
  }

  getComboCount(): number {
    return this.data.comboCount;
  }

  incrementComboCount(): void {
    if (this.data.comboCount < 3) {
      this.data.comboCount++;
      if (this.data.comboCount >= 3) {
        this.data.abilityActive = true;
      }
      this.save();
    }
  }

  isAbilityActive(): boolean {
    return this.data.abilityActive;
  }

  setComboCount(count: number): void {
    this.data.comboCount = count;
    this.save();
  }

  setAbilityActive(active: boolean): void {
    this.data.abilityActive = active;
    this.save();
  }

  useAbility(): boolean {
    if (this.data.abilityActive) {
      this.data.abilityActive = false;
      this.data.comboCount = 0;
      this.save();
      return true;
    }
    return false;
  }

  getHammers(): number {
    return this.data.hammers ?? 100;
  }

  addHammer(): void {
    this.data.hammers++;
    this.save();
  }

  useHammer(): boolean {
    // Для тестирования: всегда возвращаем true и сбрасываем на 100 если было 0
    const currentHammers = this.data.hammers ?? 100;
    if (currentHammers > 0) {
      this.data.hammers = currentHammers - 1;
    } else {
      this.data.hammers = 100; // Сброс для бесконечного тестирования
    }
    this.save();
    return true;
  }

  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.data = this.getDefaultData();
    this.save();
  }
}
