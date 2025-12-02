import { defineStore } from 'pinia';

export type CardKind =
  | 'wallUpgrade'
  | 'cityProduction'
  | 'cityRevenueUpgrade'
  | 'countrysideProduction';
export type ZoneName = 'wall' | 'city' | 'countryside';
export type BattleType = 'countryside' | 'wall' | null;

export interface DiceRoll {
  playerRoll: number;
  playerDieSize: number;
  playerBaseRoll: number;
  playerBonus: number;
  enemyRoll: number;
  enemyDieSize: number;
  winner: 'player' | 'enemy' | 'tie';
  playerUnitId: string;
  enemyUnitId: string;
}

export interface InfrastructureCard {
  id: string;
  name: string;
  kind: CardKind;
  revenue: number; // Gold income per turn
  zone: ZoneName;
  cost: number; // Purchase cost
  damaged?: boolean; // For countryside damage
}

export interface ZoneSlot {
  cardId: string | null;
}

export interface ArmyUnit {
  id: string;
  type: string; // e.g., "Soldier"
  rank: number; // 1-5, determines die size
  strength: number; // Current hit points
  maxStrength: number; // Maximum hit points
}

export interface EnemyUnit {
  id: string;
  type: string;
  rank: number;
  strength: number;
  maxStrength: number;
}

export interface BattleState {
  isActive: boolean;
  battleType: BattleType;
  enemyForce: EnemyUnit[];
  roundNumber: number;
  currentRoundLog: string[];
  battleLog: string[];
  lastDiceRoll: DiceRoll | null;
  isRolling: boolean;
  battleResult: 'victory' | 'defeat' | null;
}

interface PompeiiState {
  // Card registry - all available infrastructure cards
  cardRegistry: InfrastructureCard[];
  // Zones with slots - each zone has an array of slots that can contain a card
  zones: {
    wall: ZoneSlot[];
    city: ZoneSlot[];
    countryside: ZoneSlot[];
  };
  // Army system
  army: ArmyUnit[];
  // Turn tracking
  turnCounter: number;
  // Gold economy
  gold: number;
  // Battle state
  currentBattle: BattleState | null;
  // Game state
  gameOver: boolean;
  gameOverReason: string | null;
  // Shop available cards
  availableUpgrades: InfrastructureCard[];
  // Divine favour system
  divineFavour: {
    wall: number;
    city: number;
    countryside: number;
  };
  // Eruption year
  eruptionYear: number;
}

// Test card definitions (placed cards)
const testCards: InfrastructureCard[] = [
  // Wall upgrades
  {
    id: 'wall-1',
    name: 'Stone Reinforcement',
    kind: 'wallUpgrade',
    revenue: 0,
    zone: 'wall',
    cost: 25,
  },
  {
    id: 'wall-2',
    name: 'Watchtower',
    kind: 'wallUpgrade',
    revenue: 0,
    zone: 'wall',
    cost: 25,
  },
  {
    id: 'wall-3',
    name: 'Fortified Gate',
    kind: 'wallUpgrade',
    revenue: 0,
    zone: 'wall',
    cost: 25,
  },
  // City production centers
  {
    id: 'city-prod-1',
    name: 'Market',
    kind: 'cityProduction',
    revenue: 3,
    zone: 'city',
    cost: 15,
  },
  {
    id: 'city-prod-2',
    name: 'Workshop',
    kind: 'cityProduction',
    revenue: 4,
    zone: 'city',
    cost: 20,
  },
  {
    id: 'city-prod-3',
    name: 'Small Shop',
    kind: 'cityProduction',
    revenue: 2,
    zone: 'city',
    cost: 10,
  },
  {
    id: 'city-prod-4',
    name: 'Bakery',
    kind: 'cityProduction',
    revenue: 3,
    zone: 'city',
    cost: 15,
  },
  // City revenue upgrades
  {
    id: 'city-upgrade-1',
    name: 'Tax Office',
    kind: 'cityRevenueUpgrade',
    revenue: 3,
    zone: 'city',
    cost: 30,
  },
  {
    id: 'city-upgrade-2',
    name: 'Guild Hall',
    kind: 'cityRevenueUpgrade',
    revenue: 3,
    zone: 'city',
    cost: 30,
  },
];

// Available upgrades for purchase
const availableUpgradeCards: InfrastructureCard[] = [
  // Wall upgrades
  {
    id: 'wall-upgrade-shop',
    name: 'Wall Upgrade',
    kind: 'wallUpgrade',
    revenue: 0,
    zone: 'wall',
    cost: 25,
  },
  // City revenue upgrades
  {
    id: 'town-square',
    name: 'Town Square',
    kind: 'cityRevenueUpgrade',
    revenue: 2,
    zone: 'city',
    cost: 25,
  },
  {
    id: 'market-charter',
    name: 'Market Charter',
    kind: 'cityRevenueUpgrade',
    revenue: 3,
    zone: 'city',
    cost: 35,
  },
  // Countryside production
  {
    id: 'farm',
    name: 'Farm',
    kind: 'countrysideProduction',
    revenue: 2,
    zone: 'countryside',
    cost: 15,
  },
  {
    id: 'winery',
    name: 'Winery',
    kind: 'countrysideProduction',
    revenue: 3,
    zone: 'countryside',
    cost: 20,
  },
  {
    id: 'olive-grove',
    name: 'Olive Grove',
    kind: 'countrysideProduction',
    revenue: 2,
    zone: 'countryside',
    cost: 15,
  },
  {
    id: 'quarry',
    name: 'Quarry',
    kind: 'countrysideProduction',
    revenue: 4,
    zone: 'countryside',
    cost: 30,
  },
];

// Utility function to get die size from rank
function getDieSize(rank: number): number {
  const dieMap: Record<number, number> = {
    1: 4, // d4
    2: 6, // d6
    3: 8, // d8
    4: 10, // d10
    5: 12, // d12
  };
  return dieMap[rank] || 4;
}

// Roll a die
function rollDie(dieSize: number): number {
  return Math.floor(Math.random() * dieSize) + 1;
}

// Generate unique ID
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const usePompeiiStore = defineStore('pompeii', {
  state: (): PompeiiState => ({
    cardRegistry: [
      // Starting with minimal infrastructure
      {
        id: 'wall-1',
        name: 'Stone Reinforcement',
        kind: 'wallUpgrade',
        revenue: 0,
        zone: 'wall',
        cost: 25,
      },
      {
        id: 'city-prod-1',
        name: 'Market',
        kind: 'cityProduction',
        revenue: 3,
        zone: 'city',
        cost: 15,
      },
      {
        id: 'countryside-1',
        name: 'Farm',
        kind: 'countrysideProduction',
        revenue: 2,
        zone: 'countryside',
        cost: 15,
        damaged: false,
      },
    ],
    zones: {
      wall: [
        { cardId: 'wall-1' },
        { cardId: null },
        { cardId: null },
        { cardId: null },
        { cardId: null },
      ],
      city: [
        { cardId: 'city-prod-1' },
        { cardId: null },
        { cardId: null },
        { cardId: null },
        { cardId: null },
        { cardId: null },
        { cardId: null },
        { cardId: null },
      ],
      countryside: [
        { cardId: 'countryside-1' },
        { cardId: null },
        { cardId: null },
        { cardId: null },
      ],
    },
    army: [],
    turnCounter: 0,
    gold: 30, // Reduced starting gold
    currentBattle: null,
    gameOver: false,
    gameOverReason: null,
    availableUpgrades: availableUpgradeCards,
    divineFavour: {
      wall: 0,
      city: 0,
      countryside: 0,
    },
    eruptionYear: 100,
  }),

  getters: {
    // Get a card definition by ID
    getCardById:
      (state) =>
      (cardId: string): InfrastructureCard | undefined => {
        return state.cardRegistry.find((card) => card.id === cardId);
      },

    // Count wall upgrades
    wallUpgradesCount: (state): number => {
      return state.zones.wall.filter((slot) => {
        if (!slot.cardId) return false;
        const card = state.cardRegistry.find((c) => c.id === slot.cardId);
        return card?.kind === 'wallUpgrade';
      }).length;
    },

    // Count city production centers
    cityProductionCentersCount: (state): number => {
      return state.zones.city.filter((slot) => {
        if (!slot.cardId) return false;
        const card = state.cardRegistry.find((c) => c.id === slot.cardId);
        return card?.kind === 'cityProduction';
      }).length;
    },

    // Count city revenue upgrades
    cityRevenueUpgradesCount: (state): number => {
      return state.zones.city.filter((slot) => {
        if (!slot.cardId) return false;
        const card = state.cardRegistry.find((c) => c.id === slot.cardId);
        return card?.kind === 'cityRevenueUpgrade';
      }).length;
    },

    // Calculate income from city production centers
    cityProductionIncome: (state): number => {
      return state.zones.city.reduce((total, slot) => {
        if (!slot.cardId) return total;
        const card = state.cardRegistry.find((c) => c.id === slot.cardId);
        if (card?.kind === 'cityProduction') {
          return total + card.revenue;
        }
        return total;
      }, 0);
    },

    // Calculate income from city revenue upgrades
    cityUpgradeIncome: (state): number => {
      return state.zones.city.reduce((total, slot) => {
        if (!slot.cardId) return total;
        const card = state.cardRegistry.find((c) => c.id === slot.cardId);
        if (card?.kind === 'cityRevenueUpgrade') {
          return total + card.revenue;
        }
        return total;
      }, 0);
    },

    // Total city income per turn (with divine favour)
    totalCityIncomePerTurn: (state): number => {
      const cityIncome = state.zones.city.reduce((total, slot) => {
        if (!slot.cardId) return total;
        const card = state.cardRegistry.find((c) => c.id === slot.cardId);
        if (card?.kind === 'cityProduction' || card?.kind === 'cityRevenueUpgrade') {
          return total + card.revenue;
        }
        return total;
      }, 0);
      const countrysideIncome = state.zones.countryside.reduce((total, slot) => {
        if (!slot.cardId) return total;
        const card = state.cardRegistry.find((c) => c.id === slot.cardId);
        if (card?.kind === 'countrysideProduction' && !card.damaged) {
          return total + card.revenue;
        }
        return total;
      }, 0);

      // Apply divine favour multipliers
      const cityMultiplier = 1 + 0.25 * state.divineFavour.city;
      const countrysideMultiplier = 1 + 0.25 * state.divineFavour.countryside;

      return (
        Math.floor(cityIncome * cityMultiplier) +
        Math.floor(countrysideIncome * countrysideMultiplier)
      );
    },

    // Base city income (without divine favour)
    baseCityIncome: (state): number => {
      return state.zones.city.reduce((total, slot) => {
        if (!slot.cardId) return total;
        const card = state.cardRegistry.find((c) => c.id === slot.cardId);
        if (card?.kind === 'cityProduction' || card?.kind === 'cityRevenueUpgrade') {
          return total + card.revenue;
        }
        return total;
      }, 0);
    },

    // Base countryside income (without divine favour)
    baseCountrysideIncome: (state): number => {
      return state.zones.countryside.reduce((total, slot) => {
        if (!slot.cardId) return total;
        const card = state.cardRegistry.find((c) => c.id === slot.cardId);
        if (card?.kind === 'countrysideProduction' && !card.damaged) {
          return total + card.revenue;
        }
        return total;
      }, 0);
    },

    // Army getters
    armyCount: (state): number => {
      return state.army.length;
    },

    totalArmyStrength: (state): number => {
      return state.army.reduce((total, unit) => total + unit.strength, 0);
    },

    averageArmyRank: (state): number => {
      if (state.army.length === 0) return 0;
      const sum = state.army.reduce((total, unit) => total + unit.rank, 0);
      return Math.round((sum / state.army.length) * 10) / 10;
    },

    // Wall defense bonus (with divine favour)
    wallDefenseBonus: (state): number => {
      const wallCount = state.zones.wall.filter((slot) => {
        if (!slot.cardId) return false;
        const card = state.cardRegistry.find((c) => c.id === slot.cardId);
        return card?.kind === 'wallUpgrade';
      }).length;
      const baseBonus = wallCount * 2; // +2 per wall upgrade
      const divineMultiplier = 1 + 0.25 * state.divineFavour.wall;
      return Math.floor(baseBonus * divineMultiplier);
    },

    // Raid getters
    isRaidTurn: (state): boolean => {
      return state.turnCounter > 0 && state.turnCounter % 20 === 0;
    },

    nextRaidTurn: (state): number => {
      const currentRaidNumber = Math.floor(state.turnCounter / 20);
      return (currentRaidNumber + 1) * 20;
    },

    raidNumber: (state): number => {
      return Math.floor(state.turnCounter / 20) + 1;
    },

    // Unit upgrade getters
    canUpgradeUnitRank:
      (state) =>
      (unitId: string): boolean => {
        const unit = state.army.find((u) => u.id === unitId);
        if (!unit) return false;
        return unit.rank < 5;
      },

    unitRankUpgradeCost:
      (state) =>
      (unitId: string): number => {
        const unit = state.army.find((u) => u.id === unitId);
        if (!unit) return 0;
        return 20 + unit.rank * 15;
      },

    unitStrengthUpgradeCost:
      (state) =>
      (unitId: string): number => {
        const unit = state.army.find((u) => u.id === unitId);
        if (!unit) return 0;
        return 10 * unit.strength;
      },

    // Countryside income (with divine favour)
    countrysideIncome: (state): number => {
      const baseIncome = state.zones.countryside.reduce((total, slot) => {
        if (!slot.cardId) return total;
        const card = state.cardRegistry.find((c) => c.id === slot.cardId);
        if (card?.kind === 'countrysideProduction' && !card.damaged) {
          return total + card.revenue;
        }
        return total;
      }, 0);
      const multiplier = 1 + 0.25 * state.divineFavour.countryside;
      return Math.floor(baseIncome * multiplier);
    },

    // Years until eruption
    yearsUntilEruption: (state): number => {
      return Math.max(0, state.eruptionYear - state.turnCounter);
    },

    // Total blessing tokens available
    totalBlessingTokens: (): number => {
      return 3;
    },

    // Used blessing tokens
    usedBlessingTokens: (state): number => {
      return state.divineFavour.wall + state.divineFavour.city + state.divineFavour.countryside;
    },

    damagedCountrysideCount: (state): number => {
      return state.zones.countryside.filter((slot) => {
        if (!slot.cardId) return false;
        const card = state.cardRegistry.find((c) => c.id === slot.cardId);
        return card?.damaged === true;
      }).length;
    },
  },

  actions: {
    // Recruit a unit
    recruitUnit(type: string = 'Soldier', cost: number = 10): boolean {
      if (this.gold < cost) {
        return false;
      }
      if (this.gameOver) {
        return false;
      }

      const newUnit: ArmyUnit = {
        id: generateId('unit'),
        type,
        rank: 1, // All start at rank 1
        strength: 2, // Starting strength
        maxStrength: 2,
      };

      this.gold -= cost;
      this.army.push(newUnit);
      return true;
    },

    // Remove a unit (after death)
    removeUnit(unitId: string): void {
      this.army = this.army.filter((unit) => unit.id !== unitId);
      this.checkGameOver();
    },

    // Damage a unit
    damageUnit(unitId: string, damage: number): void {
      const unit = this.army.find((u) => u.id === unitId);
      if (unit) {
        unit.strength = Math.max(0, unit.strength - damage);
        if (unit.strength === 0) {
          this.removeUnit(unitId);
        }
      }
    },

    // Set divine favour
    setDivineFavour(zone: 'wall' | 'city' | 'countryside', tokens: number): void {
      if (tokens < 0 || tokens > 3) return;
      const currentTotal =
        this.divineFavour.wall + this.divineFavour.city + this.divineFavour.countryside;
      const currentZoneTokens = this.divineFavour[zone];
      const newTotal = currentTotal - currentZoneTokens + tokens;
      if (newTotal > 3) return; // Can't exceed 3 total tokens
      this.divineFavour[zone] = tokens;
    },

    // Cycle divine favour (0 -> 1 -> 2 -> 0)
    cycleDivineFavour(zone: 'wall' | 'city' | 'countryside'): void {
      const currentTotal =
        this.divineFavour.wall + this.divineFavour.city + this.divineFavour.countryside;
      const currentZoneTokens = this.divineFavour[zone];

      // Try to increment
      if (currentTotal < 3) {
        this.divineFavour[zone] = Math.min(2, currentZoneTokens + 1);
      } else {
        // If at max, cycle: 0 -> 1 -> 2 -> 0
        this.divineFavour[zone] = (currentZoneTokens + 1) % 3;
      }
    },

    // Reset divine favour for new turn
    resetDivineFavour(): void {
      this.divineFavour = {
        wall: 0,
        city: 0,
        countryside: 0,
      };
    },

    // End turn
    endTurn(): void {
      if (this.gameOver) return;

      // Check for eruption
      if (this.turnCounter >= this.eruptionYear) {
        this.gameOver = true;
        this.gameOverReason = 'Vesuvius erupts!';
        return;
      }

      // Collect income (with divine favour applied)
      this.gold += this.totalCityIncomePerTurn;

      // Increment turn counter
      this.turnCounter += 1;

      // Reset divine favour for next turn
      this.resetDivineFavour();

      // Check for raid
      if (this.isRaidTurn) {
        this.triggerRaid();
      }
    },

    // Generate deterministic raid strength (same year = same strength)
    getRaidStrength(raidNumber: number): number {
      // Deterministic formula: 5 + raidNum * 3
      return 5 + raidNumber * 3;
    },

    // Generate deterministic raid rank (same year = same rank)
    getRaidRank(raidNumber: number): number {
      // Deterministic formula: min(5, floor(raidNum / 2) + 1)
      return Math.min(5, Math.floor(raidNumber / 2) + 1);
    },

    // Get estimated raid strength for upcoming raid
    getEstimatedRaidStrength(raidNumber: number): {
      strength: number;
      rank: number;
      dieSize: number;
    } {
      const strength = this.getRaidStrength(raidNumber);
      const rank = this.getRaidRank(raidNumber);
      const dieSize = getDieSize(rank);
      return { strength, rank, dieSize };
    },

    // Trigger a raid
    triggerRaid(): void {
      // Check if player has no army
      if (this.army.length === 0) {
        this.gameOver = true;
        this.gameOverReason = 'A raid arrived but you have no army to defend!';
        return;
      }

      // Generate enemy force based on raid number (deterministic)
      const raidNum = this.raidNumber;
      const baseStrength = this.getRaidStrength(raidNum);
      const enemyRank = this.getRaidRank(raidNum);

      const enemyUnit: EnemyUnit = {
        id: generateId('enemy'),
        type: 'Raider',
        rank: enemyRank,
        strength: baseStrength,
        maxStrength: baseStrength,
      };

      // Initialize battle state (but don't start battle yet - wait for player choice)
      this.currentBattle = {
        isActive: false,
        battleType: null,
        enemyForce: [enemyUnit],
        roundNumber: 0,
        currentRoundLog: [],
        battleLog: [],
        lastDiceRoll: null,
        isRolling: false,
        battleResult: null,
      };
    },

    // Choose battle location
    chooseBattleLocation(location: 'countryside' | 'wall'): void {
      if (!this.currentBattle) return;

      this.currentBattle.battleType = location;
      this.currentBattle.isActive = true;
      this.currentBattle.roundNumber = 0;
      this.currentBattle.battleLog = [];
      this.currentBattle.lastDiceRoll = null;
      this.currentBattle.isRolling = false;
      this.currentBattle.battleResult = null;
    },

    // Auto-resolve entire battle
    autoResolveBattle(): void {
      if (!this.currentBattle || !this.currentBattle.isActive) return;
      if (this.gameOver) return;

      // Run rounds until battle ends
      let maxRounds = 100; // Safety limit
      while (maxRounds > 0) {
        const hasAlivePlayerUnits = this.army.some((u) => u.strength > 0);
        const hasAliveEnemyUnits = this.currentBattle.enemyForce.some((u) => u.strength > 0);

        if (!hasAlivePlayerUnits || !hasAliveEnemyUnits) {
          break;
        }

        this.executeBattleRound();
        maxRounds--;
      }

      // Resolve final state
      const hasAlivePlayerUnits = this.army.some((u) => u.strength > 0);
      this.resolveBattle(hasAlivePlayerUnits);
    },

    // Execute a battle round
    executeBattleRound(): void {
      if (!this.currentBattle || !this.currentBattle.isActive) return;
      if (this.gameOver) return;

      const battle = this.currentBattle;
      battle.roundNumber += 1;
      battle.isRolling = true;

      // Find first alive player unit
      const playerUnit = this.army.find((u) => u.strength > 0);
      if (!playerUnit) {
        battle.isRolling = false;
        this.resolveBattle(false);
        return;
      }

      // Find first alive enemy unit
      const enemyUnit = battle.enemyForce.find((u) => u.strength > 0);
      if (!enemyUnit) {
        battle.isRolling = false;
        this.resolveBattle(true);
        return;
      }

      // Roll dice
      const playerDieSize = getDieSize(playerUnit.rank);
      const playerBaseRoll = rollDie(playerDieSize);
      const wallBonus = battle.battleType === 'wall' ? this.wallDefenseBonus : 0;
      const playerRoll = playerBaseRoll + wallBonus;

      const enemyDieSize = getDieSize(enemyUnit.rank);
      const enemyRoll = rollDie(enemyDieSize);

      // Determine winner
      let winner: 'player' | 'enemy' | 'tie' = 'tie';
      if (playerRoll > enemyRoll) {
        winner = 'player';
        enemyUnit.strength -= 1;
      } else if (enemyRoll > playerRoll) {
        winner = 'enemy';
        playerUnit.strength -= 1;
        if (playerUnit.strength === 0) {
          this.removeUnit(playerUnit.id);
        }
      }

      // Store dice roll data
      battle.lastDiceRoll = {
        playerRoll,
        playerDieSize,
        playerBaseRoll,
        playerBonus: wallBonus,
        enemyRoll,
        enemyDieSize,
        winner,
        playerUnitId: playerUnit.id,
        enemyUnitId: enemyUnit.id,
      };

      // Simplified log message
      const wallBonusText = wallBonus > 0 ? ` + ${wallBonus} wall` : '';
      let logMessage = '';
      if (winner === 'player') {
        logMessage = `${playerUnit.type} (d${playerDieSize} = ${playerBaseRoll}${wallBonusText}) vs ${enemyUnit.type} (d${enemyDieSize} = ${enemyRoll}) → ${enemyUnit.type} loses 1 strength`;
        if (enemyUnit.strength === 0) {
          logMessage += ` (defeated)`;
        }
      } else if (winner === 'enemy') {
        logMessage = `${playerUnit.type} (d${playerDieSize} = ${playerBaseRoll}${wallBonusText}) vs ${enemyUnit.type} (d${enemyDieSize} = ${enemyRoll}) → ${playerUnit.type} loses 1 strength`;
        if (playerUnit.strength === 0) {
          logMessage += ` (defeated)`;
        }
      } else {
        logMessage = `Tie (${playerBaseRoll + wallBonus} vs ${enemyRoll}) → No damage`;
      }

      battle.battleLog.push(logMessage);
      battle.currentRoundLog = [logMessage];
      battle.isRolling = false;

      // Check if battle should end
      const hasAlivePlayerUnits = this.army.some((u) => u.strength > 0);
      const hasAliveEnemyUnits = battle.enemyForce.some((u) => u.strength > 0);

      if (!hasAlivePlayerUnits) {
        this.resolveBattle(false);
      } else if (!hasAliveEnemyUnits) {
        this.resolveBattle(true);
      }
    },

    // Resolve battle
    resolveBattle(playerWon: boolean): void {
      if (!this.currentBattle) return;

      const battle = this.currentBattle;
      battle.battleResult = playerWon ? 'victory' : 'defeat';

      if (playerWon) {
        battle.battleLog.push('Victory! The enemy has been defeated.');
        if (battle.battleType === 'countryside') {
          battle.battleLog.push('Countryside infrastructure is safe.');
        }
      } else {
        if (battle.battleType === 'countryside') {
          // Damage countryside infrastructure
          this.damageCountrysideInfrastructure(2);
          battle.battleLog.push('Defeat! Countryside infrastructure has been damaged.');
          battle.battleLog.push('Your army retreats with remaining strength.');
        } else if (battle.battleType === 'wall') {
          // Wipe out all surviving army units
          this.army = [];
          battle.battleLog.push('Defeat! All your soldiers died holding the walls.');
          this.checkGameOver();
        }
      }

      // End battle
      battle.isActive = false;
    },

    // Damage countryside infrastructure
    damageCountrysideInfrastructure(damageCount: number): void {
      const countrysideSlots = this.zones.countryside.filter((slot) => slot.cardId !== null);
      const slotsToDamage = Math.min(damageCount, countrysideSlots.length);

      // Mark cards as damaged instead of removing
      for (let i = 0; i < slotsToDamage; i++) {
        const slot = countrysideSlots[i];
        if (slot && slot.cardId) {
          const card = this.cardRegistry.find((c) => c.id === slot.cardId);
          if (card) {
            card.damaged = true;
          }
        }
      }
    },

    // End battle (cleanup)
    endBattle(): void {
      this.currentBattle = null;
    },

    // Check for game over
    checkGameOver(): void {
      if (this.army.length === 0 && !this.gameOver) {
        this.gameOver = true;
        this.gameOverReason = 'Your army has been completely wiped out!';
      }
    },

    // Unit upgrade actions
    upgradeUnitRank(unitId: string): boolean {
      const unit = this.army.find((u) => u.id === unitId);
      if (!unit || unit.rank >= 5) return false;

      const cost = 20 + unit.rank * 15;
      if (this.gold < cost) return false;

      this.gold -= cost;
      unit.rank += 1;
      return true;
    },

    upgradeUnitStrength(unitId: string): boolean {
      const unit = this.army.find((u) => u.id === unitId);
      if (!unit) return false;

      const cost = 10 * unit.strength;
      if (this.gold < cost) return false;

      this.gold -= cost;
      unit.maxStrength += 1;
      unit.strength = unit.maxStrength; // Heal to full
      return true;
    },

    // Infrastructure purchase actions
    purchaseWallUpgrade(): boolean {
      const upgradeCard = this.availableUpgrades.find((c) => c.kind === 'wallUpgrade');
      if (!upgradeCard) return false;
      if (this.gold < upgradeCard.cost) return false;

      // Find empty slot in wall zone
      const emptySlot = this.zones.wall.find((slot) => slot.cardId === null);
      if (!emptySlot) return false; // No empty slots

      this.gold -= upgradeCard.cost;
      const newCard: InfrastructureCard = {
        ...upgradeCard,
        id: generateId('wall'),
      };
      this.cardRegistry.push(newCard);
      emptySlot.cardId = newCard.id;
      return true;
    },

    purchaseCityUpgrade(cardId: string): boolean {
      const upgradeCard = this.availableUpgrades.find((c) => c.id === cardId);
      if (!upgradeCard || upgradeCard.kind !== 'cityRevenueUpgrade') return false;
      if (this.gold < upgradeCard.cost) return false;

      // Find empty slot in city zone
      const emptySlot = this.zones.city.find((slot) => slot.cardId === null);
      if (!emptySlot) return false;

      this.gold -= upgradeCard.cost;
      const newCard: InfrastructureCard = {
        ...upgradeCard,
        id: generateId('city-upgrade'),
      };
      this.cardRegistry.push(newCard);
      emptySlot.cardId = newCard.id;
      return true;
    },

    purchaseCountrysideUpgrade(cardId: string): boolean {
      const upgradeCard = this.availableUpgrades.find((c) => c.id === cardId);
      if (!upgradeCard || upgradeCard.kind !== 'countrysideProduction') return false;
      if (this.gold < upgradeCard.cost) return false;

      // Find empty slot in countryside zone
      const emptySlot = this.zones.countryside.find((slot) => slot.cardId === null);
      if (!emptySlot) return false;

      this.gold -= upgradeCard.cost;
      const newCard: InfrastructureCard = {
        ...upgradeCard,
        id: generateId('countryside'),
        damaged: false,
      };
      this.cardRegistry.push(newCard);
      emptySlot.cardId = newCard.id;
      return true;
    },

    // Reset game
    resetGame(): void {
      // Reset to starting state
      this.cardRegistry = [
        {
          id: 'wall-1',
          name: 'Stone Reinforcement',
          kind: 'wallUpgrade',
          revenue: 0,
          zone: 'wall',
          cost: 25,
        },
        {
          id: 'city-prod-1',
          name: 'Market',
          kind: 'cityProduction',
          revenue: 3,
          zone: 'city',
          cost: 15,
        },
        {
          id: 'countryside-1',
          name: 'Farm',
          kind: 'countrysideProduction',
          revenue: 2,
          zone: 'countryside',
          cost: 15,
          damaged: false,
        },
      ];
      this.zones = {
        wall: [
          { cardId: 'wall-1' },
          { cardId: null },
          { cardId: null },
          { cardId: null },
          { cardId: null },
        ],
        city: [
          { cardId: 'city-prod-1' },
          { cardId: null },
          { cardId: null },
          { cardId: null },
          { cardId: null },
          { cardId: null },
          { cardId: null },
          { cardId: null },
        ],
        countryside: [
          { cardId: 'countryside-1' },
          { cardId: null },
          { cardId: null },
          { cardId: null },
        ],
      };
      this.army = [];
      this.turnCounter = 0;
      this.gold = 30;
      this.currentBattle = null;
      this.gameOver = false;
      this.gameOverReason = null;
      this.resetDivineFavour();
    },
  },
});
