import { SidePot } from '@/types/poker';
import { Player } from './Player';

/**
 * OOP Class: Pot
 * Encapsulates the poker pot accounting logic, including main pot accumulation,
 * side pot isolation for all-in scenarios, and distribution to showdown winners.
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

  public reset(): void {
    this._mainPot = 0;
    this._sidePots = [];
  }

  /**
   * Distributes the pot equally among eligible winners.
   * Odd chip remainder is awarded to the first winner (standard poker rule).
   */
  public awardWinners(winners: Player[]): { sharePerWinner: number; remainder: number } {
    if (winners.length === 0 || this._mainPot === 0) {
      return { sharePerWinner: 0, remainder: 0 };
    }

    const count = winners.length;
    const share = Math.floor(this._mainPot / count);
    const remainder = this._mainPot % count;

    winners.forEach((winner, idx) => {
      const awarded = share + (idx === 0 ? remainder : 0);
      winner.addChips(awarded);
    });

    this._mainPot = 0;
    return { sharePerWinner: share, remainder };
  }

  public toJSON(): { pot: number; sidePots: SidePot[] } {
    return {
      pot: this._mainPot,
      sidePots: [...this._sidePots],
    };
  }

  public static fromJSON(potAmount: number, sidePots: SidePot[] = []): Pot {
    const pot = new Pot(potAmount);
    pot._sidePots = [...sidePots];
    return pot;
  }
}

