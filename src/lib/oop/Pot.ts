import { SidePot, PotWinnerDetail } from '@/types/poker';
import { Player } from './Player';

/**
 * OOP Class: Pot
 * Encapsulates poker pot accounting logic, including:
 * - Dynamic Main Pot & Side Pots calculation based on All-In bet levels
 * - Isolation of side pots for capped all-in players
 * - Fair distribution of chips to winners with odd-chip rule
 */
export class Pot {
  private _mainPot: number;
  private _sidePots: SidePot[];

  constructor(initialAmount: number = 0) {
    this._mainPot = Math.max(0, initialAmount);
    this._sidePots = [];
  }

  public get amount(): number {
    return this._mainPot;
  }

  public get sidePots(): SidePot[] {
    return [...this._sidePots];
  }

  public addChips(amount: number): void {
    if (amount > 0) {
      this._mainPot += amount;
    }
  }

  public setSidePots(pots: SidePot[]): void {
    this._sidePots = [...pots];
  }

  public reset(): void {
    this._mainPot = 0;
    this._sidePots = [];
  }

  /**
   * Recalculates Main Pot and Side Pots dynamically based on players' totalRoundBet
   * and All-In statuses.
   */
  public recalculatePots(players: Player[]): SidePot[] {
    const contributingPlayers = players.filter(p => p.totalRoundBet > 0);
    if (contributingPlayers.length === 0) {
      this._sidePots = [];
      return [];
    }

    // Check if any player who contributed is All-In
    const hasAllIn = contributingPlayers.some(p => p.status === 'all-in');
    const nonFolded = contributingPlayers.filter(p => p.status !== 'folded');

    // If no one is all-in or only 1 active player remains, everything is in 1 Main Pot
    if (!hasAllIn || nonFolded.length <= 1) {
      const singlePot: SidePot = {
        id: 'main',
        name: 'Main Pot (กองหลัก)',
        amount: this._mainPot,
        eligiblePlayerIds: nonFolded.map(p => p.id),
      };
      this._sidePots = [singlePot];
      return this._sidePots;
    }

    // Sort distinct wager levels ascending
    const wagerLevels = Array.from(
      new Set(contributingPlayers.map(p => p.totalRoundBet))
    ).sort((a, b) => a - b);

    const rawPots: { amount: number; eligiblePlayerIds: string[] }[] = [];
    let prevLevel = 0;

    for (const level of wagerLevels) {
      const step = level - prevLevel;
      if (step <= 0) continue;

      let potAmount = 0;
      const eligibleIds: string[] = [];

      for (const p of contributingPlayers) {
        if (p.totalRoundBet >= level) {
          potAmount += step;
        } else if (p.totalRoundBet > prevLevel) {
          potAmount += (p.totalRoundBet - prevLevel);
        }

        if (p.totalRoundBet >= level && p.status !== 'folded') {
          eligibleIds.push(p.id);
        }
      }

      if (potAmount > 0) {
        rawPots.push({
          amount: potAmount,
          eligiblePlayerIds: eligibleIds,
        });
      }
      prevLevel = level;
    }

    // Merge adjacent pots that have the exact same eligible players
    const mergedPots: SidePot[] = [];
    for (const raw of rawPots) {
      if (raw.eligiblePlayerIds.length === 0) {
        // Dead money: fold it into previous pot if available
        if (mergedPots.length > 0) {
          mergedPots[mergedPots.length - 1].amount += raw.amount;
        }
        continue;
      }

      const prev = mergedPots[mergedPots.length - 1];
      const sameEligible =
        prev &&
        prev.eligiblePlayerIds.length === raw.eligiblePlayerIds.length &&
        prev.eligiblePlayerIds.every(id => raw.eligiblePlayerIds.includes(id));

      if (sameEligible) {
        prev.amount += raw.amount;
      } else {
        const index = mergedPots.length;
        mergedPots.push({
          id: index === 0 ? 'main' : `side_${index}`,
          name: index === 0 ? 'Main Pot (กองหลัก)' : `Side Pot ${index} (กองข้างเคียง ${index})`,
          amount: raw.amount,
          eligiblePlayerIds: raw.eligiblePlayerIds,
        });
      }
    }

    // Reconcile total with this._mainPot if any rounding difference
    const totalPots = mergedPots.reduce((sum, p) => sum + p.amount, 0);
    if (this._mainPot > totalPots && mergedPots.length > 0) {
      mergedPots[0].amount += (this._mainPot - totalPots);
    }

    this._sidePots = mergedPots;
    return this._sidePots;
  }

  /**
   * Distributes the pot equally among eligible winners.
   * If side pots exist, awards each pot to its eligible winners.
   */
  public awardWinners(
    winners: Player[],
    potWinnerMap?: Record<string, string[]> // potId -> winnerIds
  ): { sharePerWinner: number; remainder: number; potResults: PotWinnerDetail[] } {
    if (this._mainPot === 0) {
      return { sharePerWinner: 0, remainder: 0, potResults: [] };
    }

    const potResults: PotWinnerDetail[] = [];

    // Case 1: Specific Pot-by-Pot winner allocation (Side Pots)
    if (this._sidePots.length > 1 && potWinnerMap) {
      for (let idx = 0; idx < this._sidePots.length; idx++) {
        const pot = this._sidePots[idx];
        const potKeyById = pot.id || '';
        const potKeyByIndex = String(idx);

        // Robust key resolution (by id, by numeric index, by 'main', or by pot name)
        const assignedWinnerIds =
          (potWinnerMap[potKeyById]?.length ? potWinnerMap[potKeyById] : null) ||
          (potWinnerMap[potKeyByIndex]?.length ? potWinnerMap[potKeyByIndex] : null) ||
          (idx === 0 && potWinnerMap['main']?.length ? potWinnerMap['main'] : null) ||
          (pot.name && potWinnerMap[pot.name]?.length ? potWinnerMap[pot.name] : null) ||
          [];

        // Stage 1: Assigned winners who are also eligible for this pot
        let finalWinners = winners.filter(
          w => assignedWinnerIds.includes(w.id) && pot.eligiblePlayerIds.includes(w.id)
        );

        // Stage 2: If none, award to ANY assigned winner selected by Host (Host manual override)
        if (finalWinners.length === 0 && assignedWinnerIds.length > 0) {
          finalWinners = winners.filter(w => assignedWinnerIds.includes(w.id));
        }

        // Stage 3: If still none, fall back to any winner in winners who is eligible
        if (finalWinners.length === 0) {
          finalWinners = winners.filter(w => pot.eligiblePlayerIds.includes(w.id));
        }

        // Stage 4: If still none, fall back to all winners
        if (finalWinners.length === 0 && winners.length > 0) {
          finalWinners = winners;
        }

        // Stage 5: Safety fallback: NEVER drop chips! Award to first eligible player in this pot
        if (finalWinners.length === 0 && pot.eligiblePlayerIds.length > 0) {
          finalWinners = winners.length > 0 ? [winners[0]] : [];
        }

        const potDetail: PotWinnerDetail = {
          potName: pot.name || (idx === 0 ? 'Main Pot (กองหลัก)' : `Side Pot ${idx} (กองข้างเคียง ${idx})`),
          amount: pot.amount,
          winners: [],
        };

        if (finalWinners.length > 0 && pot.amount > 0) {
          const share = Math.floor(pot.amount / finalWinners.length);
          const rem = pot.amount % finalWinners.length;
          finalWinners.forEach((w, wIdx) => {
            const awarded = share + (wIdx === 0 ? rem : 0);
            w.addChips(awarded);
            potDetail.winners.push({
              id: w.id,
              name: w.name,
              avatarUrl: w.avatarUrl,
              prize: awarded,
            });
          });
          pot.amount = 0;
        }
        potResults.push(potDetail);
      }
      this._mainPot = 0;
      this._sidePots = [];
      return { sharePerWinner: 0, remainder: 0, potResults };
    }

    // Case 2: Multi-pot with simple winner selection (award each pot to eligible winners)
    if (this._sidePots.length > 1) {
      for (let idx = 0; idx < this._sidePots.length; idx++) {
        const pot = this._sidePots[idx];
        let eligibleWinners = winners.filter(w => pot.eligiblePlayerIds.includes(w.id));
        if (eligibleWinners.length === 0 && winners.length > 0) {
          eligibleWinners = winners;
        }

        const potDetail: PotWinnerDetail = {
          potName: pot.name || (idx === 0 ? 'Main Pot (กองหลัก)' : `Side Pot ${idx} (กองข้างเคียง ${idx})`),
          amount: pot.amount,
          winners: [],
        };

        if (eligibleWinners.length > 0 && pot.amount > 0) {
          const share = Math.floor(pot.amount / eligibleWinners.length);
          const rem = pot.amount % eligibleWinners.length;
          eligibleWinners.forEach((w, wIdx) => {
            const awarded = share + (wIdx === 0 ? rem : 0);
            w.addChips(awarded);
            potDetail.winners.push({
              id: w.id,
              name: w.name,
              avatarUrl: w.avatarUrl,
              prize: awarded,
            });
          });
          pot.amount = 0;
        }
        potResults.push(potDetail);
      }
      this._mainPot = 0;
      this._sidePots = [];
      return { sharePerWinner: 0, remainder: 0, potResults };
    }

    // Case 3: Classic Single Main Pot
    if (winners.length === 0) return { sharePerWinner: 0, remainder: 0, potResults: [] };

    const count = winners.length;
    const share = Math.floor(this._mainPot / count);
    const remainder = this._mainPot % count;

    const mainDetail: PotWinnerDetail = {
      potName: 'Main Pot (กองหลัก)',
      amount: this._mainPot,
      winners: [],
    };

    winners.forEach((winner, idx) => {
      const awarded = share + (idx === 0 ? remainder : 0);
      winner.addChips(awarded);
      mainDetail.winners.push({
        id: winner.id,
        name: winner.name,
        avatarUrl: winner.avatarUrl,
        prize: awarded,
      });
    });

    potResults.push(mainDetail);

    this._mainPot = 0;
    this._sidePots = [];
    return { sharePerWinner: share, remainder, potResults };
  }

  public toJSON(): { pot: number; sidePots: SidePot[] } {
    return {
      pot: this._mainPot,
      sidePots: [...this._sidePots],
    };
  }

  public static fromJSON(potAmount: number, sidePots: SidePot[] = []): Pot {
    const pot = new Pot(potAmount);
    pot._sidePots = (sidePots || []).map(p => ({
      id: p.id,
      name: p.name,
      amount: p.amount,
      eligiblePlayerIds: Array.isArray(p.eligiblePlayerIds) ? [...p.eligiblePlayerIds] : [],
    }));
    return pot;
  }
}


