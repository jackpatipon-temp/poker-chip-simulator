import type { PokerRoom } from '../PokerRoom';

/**
 * OOP Abstract Class: GameAction
 * Foundation for the Command Pattern and Polymorphism in the poker simulation.
 * Subclasses override the abstract execute() method to perform concrete gameplay logic.
 */
export abstract class GameAction {
  protected readonly _playerId: string;
  protected readonly _actionName: string;

  constructor(playerId: string, actionName: string) {
    this._playerId = playerId;
    this._actionName = actionName;
  }

  public get playerId(): string {
    return this._playerId;
  }

  public get actionName(): string {
    return this._actionName;
  }

  /**
   * Polymorphic method implemented by each concrete action.
   */
  public abstract execute(room: PokerRoom): void;
}

/**
 * Concrete Action: FoldAction
 * Implements player surrender logic and sole survivor detection.
 */
export class FoldAction extends GameAction {
  constructor(playerId: string) {
    super(playerId, 'fold');
  }

  public execute(room: PokerRoom): void {
    const player = room.getPlayerById(this._playerId);
    if (!player) return;

    player.fold();

    // Check if only 1 player remains in the hand
    const remainingInHand = room.getPlayersInHand();
    if (remainingInHand.length === 1) {
      const soleSurvivor = remainingInHand[0];
      room.awardPotToWinners([soleSurvivor.id]);
      room.setStreet('showdown');
    }
  }
}

/**
 * Concrete Action: CheckAction
 * Allows a player to pass when they have matched the highest bet.
 */
export class CheckAction extends GameAction {
  constructor(playerId: string) {
    super(playerId, 'check');
  }

  public execute(room: PokerRoom): void {
    const player = room.getPlayerById(this._playerId);
    if (!player) return;

    player.recordAction('check');
  }
}

/**
 * Concrete Action: CallAction
 * Matches the current highest table wager.
 */
export class CallAction extends GameAction {
  constructor(playerId: string) {
    super(playerId, 'call');
  }

  public execute(room: PokerRoom): void {
    const player = room.getPlayerById(this._playerId);
    if (!player) return;

    const toCall = room.currentHighestBet - player.currentBet;
    const callCost = Math.min(toCall, player.chips);
    const actualWager = player.placeBet(callCost);

    room.pot.addChips(actualWager);
    player.recordAction(player.chips === 0 ? 'all-in' : 'call');
  }
}

/**
 * Concrete Action: RaiseAction
 * Increases the active table wager with strict poker rule validation.
 */
export class RaiseAction extends GameAction {
  private readonly _requestedTotal: number;

  constructor(playerId: string, requestedTotal: number) {
    super(playerId, 'raise');
    this._requestedTotal = requestedTotal;
  }

  public get requestedTotal(): number {
    return this._requestedTotal;
  }

  public execute(room: PokerRoom): void {
    const player = room.getPlayerById(this._playerId);
    if (!player) return;

    const currentHighest = room.currentHighestBet;
    const playerMaxPossible = player.chips + player.currentBet;
    const minLegalTotal = currentHighest === 0 ? room.bigBlind : currentHighest + room.minRaise;

    let targetTotal: number;
    if (playerMaxPossible <= minLegalTotal) {
      // Player lacks chips for a full raise -> All-in
      targetTotal = playerMaxPossible;
    } else {
      // Clamp to legal minimum raise bounds
      targetTotal = Math.max(minLegalTotal, Math.min(playerMaxPossible, this._requestedTotal));
    }

    const additionalCost = targetTotal - player.currentBet;
    const actualWager = player.placeBet(additionalCost);
    room.pot.addChips(actualWager);

    const raiseDiff = targetTotal - currentHighest;
    if (raiseDiff > room.minRaise) {
      room.setMinRaise(raiseDiff);
    }
    if (targetTotal > currentHighest) {
      room.setCurrentHighestBet(targetTotal);
    }

    player.recordAction(player.chips === 0 ? 'all-in' : 'raise');

    // Reopen action for all other active players in hand
    room.reopenBettingForOthers(this._playerId);
  }
}
