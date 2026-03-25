export interface DecorItem {
  id: string;
  name: string;
  cost: number;
  category: 'wall' | 'floor' | 'furniture' | 'decoration';
  color: number;
}

export const DECOR_ITEMS: DecorItem[] = [
  { id: 'wall_neon_1', name: 'Neon Stripes', cost: 3, category: 'wall', color: 0xFF00FF },
  { id: 'wall_cyber_1', name: 'Cyber Grid', cost: 5, category: 'wall', color: 0x00FFFF },
  { id: 'wall_matrix', name: 'Matrix Rain', cost: 8, category: 'wall', color: 0x00FF00 },
  
  { id: 'floor_hex_1', name: 'Hex Pattern', cost: 3, category: 'floor', color: 0x1A1A2E },
  { id: 'floor_grid', name: 'Grid Floor', cost: 5, category: 'floor', color: 0x0066FF },
  { id: 'floor_glitch', name: 'Glitch Floor', cost: 8, category: 'floor', color: 0x9900FF },
  
  { id: 'furniture_desk', name: 'Holo Desk', cost: 5, category: 'furniture', color: 0x333344 },
  { id: 'furniture_chair', name: 'Neon Chair', cost: 3, category: 'furniture', color: 0xFF00FF },
  { id: 'furniture_plant', name: 'Cyber Plant', cost: 4, category: 'furniture', color: 0x00FF66 },
  
  { id: 'deco_holo_1', name: 'Holo Display', cost: 6, category: 'decoration', color: 0x00FFFF },
  { id: 'deco_sign', name: 'Neon Sign', cost: 4, category: 'decoration', color: 0xFFFF00 },
  { id: 'deco_lamp', name: 'RGB Lamp', cost: 3, category: 'decoration', color: 0xFF00FF },
];

export class RoomDecor {
  private ownedItems: Set<string> = new Set();

  constructor(ownedItems: string[] = []) {
    ownedItems.forEach(id => this.ownedItems.add(id));
  }

  getOwnedItems(): DecorItem[] {
    return DECOR_ITEMS.filter(item => this.ownedItems.has(item.id));
  }

  isOwned(itemId: string): boolean {
    return this.ownedItems.has(itemId);
  }

  purchase(itemId: string): boolean {
    const item = DECOR_ITEMS.find(i => i.id === itemId);
    if (item && !this.ownedItems.has(itemId)) {
      this.ownedItems.add(itemId);
      return true;
    }
    return false;
  }

  getItemsByCategory(category: DecorItem['category']): DecorItem[] {
    return DECOR_ITEMS.filter(item => item.category === category);
  }

  getItem(itemId: string): DecorItem | undefined {
    return DECOR_ITEMS.find(i => i.id === itemId);
  }
}
