import { RoomState, Street, GameHistoryEntry, JoinRequest, Vote } from '@/types/poker';
import { Player, HostPlayer } from './Player';
import { Pot } from './Pot';
import { GameAction } from './actions/GameAction';

/**
 * OOP Class: PokerRoom
 * Root Aggregate entity for the poker game simulator.
 * Encapsulates table lifecycle, player coordination, pot management,
 * blind schedules, street progression, and command execution.
 */
export class PokerRoom {
  private _roomId: string;
  private _roomName: string;
  private _hostId: string;
  private _isHostPlaying: boolean;
  private _smallBlind: number;
  private _bigBlind: number;
  private _ante: number;
  private _street: Street;
  private _currentHighestBet: number;
  private _minRaise: number;
  private _dealerIndex: number;
  private _activePlayerIndex: number;
  private _players: Player[];
  private _pot: Pot;
  private _history: GameHistoryEntry[];
  private _pendingRequests: JoinRequest[];
  private _activeVote: Vote | null;
  private _winnerIds: string[];
  private _isFirstHandStarted: boolean;

  constructor(
    roomId: string,
    hostPlayer: Player,
    smallBlind: number = 5,
    bigBlind: number = 10,
    roomName: string = 'Poker Party Room'
  ) {
    this._roomId = roomId;
    this._roomName = roomName;
    this._hostId = hostPlayer.id;
    this._isHostPlaying = true;
    this._smallBlind = smallBlind;
    this._bigBlind = bigBlind;
    this._ante = 0;
    this._street = 'preflop';
    this._currentHighestBet = bigBlind;
    this._minRaise = bigBlind;
    this._dealerIndex = 0;
    this._activePlayerIndex = 0;
    this._players = [hostPlayer];
    this._pot = new Pot(0);
    this._history = [];
    this._pendingRequests = [];
    this._activeVote = null;
    this._winnerIds = [];
    this._isFirstHandStarted = false;
  }

  // --- Getters ---
  public get roomId(): string { return this._roomId; }
  public get roomName(): string { return this._roomName; }
  public get hostId(): string { return this._hostId; }
  public get isHostPlaying(): boolean { return this._isHostPlaying; }
  public get smallBlind(): number { return this._smallBlind; }
  public get bigBlind(): number { return this._bigBlind; }
  public get ante(): number { return this._ante; }
  public get street(): Street { return this._street; }
  public get currentHighestBet(): number { return this._currentHighestBet; }
  public get minRaise(): number { return this._minRaise; }
  public get dealerIndex(): number { return this._dealerIndex; }
  public get activePlayerIndex(): number { return this._activePlayerIndex; }
  public get players(): Player[] { return [...this._players]; }
  public get pot(): Pot { return this._pot; }
  public get history(): GameHistoryEntry[] { return [...this._history]; }
  public get pendingRequests(): JoinRequest[] { return [...this._pendingRequests]; }
  public get activeVote(): Vote | null { return this._activeVote; }
  public get winnerIds(): string[] { return [...this._winnerIds]; }
  public get isFirstHandStarted(): boolean { return this._isFirstHandStarted; }

  // --- Mutators ---
  public setStreet(street: Street): void {
    this._street = street;
  }

  public setCurrentHighestBet(amount: number): void {
    this._currentHighestBet = Math.max(0, amount);
  }

  public setMinRaise(amount: number): void {
    this._minRaise = Math.max(this._bigBlind, amount);
  }

  public setBlinds(sb: number, bb: number): void {
    if (sb > 0 && bb > sb) {
      this._smallBlind = sb;
      this._bigBlind = bb;
      this._minRaise = bb;
    }
  }

  public setHostPlaying(isPlaying: boolean): void {
    this._isHostPlaying = isPlaying;
  }

  public getPlayerById(id: string): Player | undefined {
    return this._players.find(p => p.id === id);
  }

  public getActiveActor(): Player | undefined {
    return this._players[this._activePlayerIndex];
  }

  public getPlayersInHand(): Player[] {
    return this._players.filter(
      p => p.isApproved && p.status !== 'folded' && p.status !== 'sitting-out'
    );
  }

  public getApprovedPlayersWithChips(): Player[] {
    return this._players.filter(
      p => p.isApproved && p.status !== 'sitting-out' && p.chips > 0
    );
  }

  public addPlayer(player: Player): void {
    player.setSeatIndex(this._players.length);
    this._players.push(player);
  }

  public removePlayer(playerId: string): void {
    this._players = this._players.filter(p => p.id !== playerId);
    // Re-index seats
    this._players.forEach((p, idx) => p.setSeatIndex(idx));

    // Transfer host if needed
    if (this._players.length > 0 && !this._players.some(p => p.id === this._hostId)) {
      this._hostId = this._players[0].id;
      this._players[0].setHost(true);
    }
  }

  public reopenBettingForOthers(actingPlayerId: string): void {
    this._players.forEach(p => {
      if (p.id !== actingPlayerId && p.status === 'active') {
        p.resetStreetBet();
      }
    });
  }

  /**
   * Dealer rotation: clockwise to the next approved player with chips.
   */
  public rotateDealer(): void {
    if (this._isFirstHandStarted) {
      this._dealerIndex = (this._dealerIndex + 1) % this._players.length;
      while (
        !this._players[this._dealerIndex] ||
        !this._players[this._dealerIndex].isApproved ||
        this._players[this._dealerIndex].status === 'sitting-out' ||
        this._players[this._dealerIndex].chips <= 0
      ) {
        this._dealerIndex = (this._dealerIndex + 1) % this._players.length;
      }
    } else {
      this._isFirstHandStarted = true;
      const eligible = this.getApprovedPlayersWithChips();
      if (!this._players[this._dealerIndex] || this._players[this._dealerIndex].chips <= 0) {
        if (eligible.length > 0) {
          this._dealerIndex = eligible[0].seatIndex;
        }
      }
    }
  }

  /**
   * Starts a brand new hand with blinds and Dealer positioning.
   */
  public startHand(): boolean {
    const eligiblePlayers = this.getApprovedPlayersWithChips();
    if (eligiblePlayers.length < 2) return false;

    this.saveHistory('Start New Hand');
    this.rotateDealer();

    // Reset players for hand
    this._players.forEach(p => p.resetHand(this._dealerIndex));

    // Assign Blinds
    let sbIdx: number;
    let bbIdx: number;

    if (eligiblePlayers.length === 2) {
      // Heads-up: Dealer is Small Blind
      sbIdx = this._dealerIndex;
      bbIdx = this.getNextActiveIndex(sbIdx);
    } else {
      sbIdx = this.getNextActiveIndex(this._dealerIndex);
      bbIdx = this.getNextActiveIndex(sbIdx);
    }

    this._players[sbIdx].setBlinds(true, false);
    this._players[bbIdx].setBlinds(false, true);

    // Post Blinds
    const sbAmount = this._players[sbIdx].placeBet(this._smallBlind);
    const bbAmount = this._players[bbIdx].placeBet(this._bigBlind);

    this._pot.reset();
    this._pot.addChips(sbAmount + bbAmount);
    this._currentHighestBet = this._bigBlind;
    this._minRaise = this._bigBlind;
    this._street = 'preflop';
    this._winnerIds = [];

    // Preflop first to act
    const firstToAct = eligiblePlayers.length === 2 ? sbIdx : this.getNextActiveIndex(bbIdx);
    this._activePlayerIndex = firstToAct;
    this._players[firstToAct].setTurn(true);

    return true;
  }

  public startNewHand(): boolean {
    return this.startHand();
  }

  public getNextActiveIndex(startIndex: number): number {
    const total = this._players.length;
    for (let i = 1; i <= total; i++) {
      const idx = (startIndex + i) % total;
      const p = this._players[idx];
      if (p.isApproved && p.status === 'active') {
        return idx;
      }
    }
    return startIndex;
  }

  public isBettingRoundComplete(): boolean {
    const inHand = this.getPlayersInHand();
    if (inHand.length <= 1) return true;

    const activePlayers = inHand.filter(p => p.status === 'active');
    if (activePlayers.length === 0) return true;

    return activePlayers.every(
      p => p.hasActedThisRound && (p.currentBet === this._currentHighestBet || p.chips === 0)
    );
  }

  public progressToNextStreet(): void {
    this.saveHistory(`Progress from ${this._street}`);

    // Reset round bets
    this._players.forEach(p => p.resetStreetBet());
    this._currentHighestBet = 0;
    this._minRaise = this._bigBlind;

    const inHand = this.getPlayersInHand();
    const withChips = inHand.filter(p => p.chips > 0);

    // If 0 or 1 player has chips remaining, runout straight to showdown
    if (withChips.length <= 1 && inHand.length > 1) {
      this._street = 'showdown';
      return;
    }

    if (this._street === 'preflop') {
      this._street = 'flop';
    } else if (this._street === 'flop') {
      this._street = 'turn';
    } else if (this._street === 'turn') {
      this._street = 'river';
    } else if (this._street === 'river') {
      this._street = 'showdown';
      return;
    }

    // First active left of dealer button
    const nextActor = this.getNextActiveIndex(this._dealerIndex);
    this._activePlayerIndex = nextActor;
    this._players[nextActor].setTurn(true);
  }

  /**
   * Executes a polymorphic GameAction command.
   */
  public dispatchAction(action: GameAction): void {
    if (this._players[this._activePlayerIndex]?.id !== action.playerId) {
      return;
    }

    this.saveHistory(`Player Action: ${action.actionName}`);
    action.execute(this);

    if (this._street !== 'showdown') {
      if (this.isBettingRoundComplete()) {
        this.progressToNextStreet();
      } else {
        const nextIdx = this.getNextActiveIndex(this._activePlayerIndex);
        this._activePlayerIndex = nextIdx;
        this._players[nextIdx].setTurn(true);
      }
    }
  }

  public awardPotToWinners(winnerIds: string[]): void {
    if (winnerIds.length === 0 || this._pot.amount === 0) return;
    this.saveHistory(`Award pot to ${winnerIds.length} winner(s)`);

    const winners = this._players.filter(p => winnerIds.includes(p.id));
    this._pot.awardWinners(winners);
    this._winnerIds = winnerIds;
  }

  public setDealer(playerId: string): void {
    const idx = this._players.findIndex(p => p.id === playerId);
    if (idx !== -1) {
      this._dealerIndex = idx;
      this._players.forEach((p, i) => p.setDealer(i === idx));
      this._isFirstHandStarted = false;
    }
  }

  public randomizeDealer(): void {
    const eligible = this.getApprovedPlayersWithChips();
    if (eligible.length > 0) {
      const picked = eligible[Math.floor(Math.random() * eligible.length)];
      this.setDealer(picked.id);
    }
  }

  public swapSeats(player1Id: string, player2Id: string): void {
    const idx1 = this._players.findIndex(p => p.id === player1Id);
    const idx2 = this._players.findIndex(p => p.id === player2Id);
    if (idx1 === -1 || idx2 === -1 || idx1 === idx2) return;

    const temp = this._players[idx1];
    this._players[idx1] = this._players[idx2];
    this._players[idx2] = temp;

    this._players.forEach((p, idx) => p.setSeatIndex(idx));
    const dIdx = this._players.findIndex(p => p.isDealer);
    if (dIdx !== -1) this._dealerIndex = dIdx;
  }

  public moveSeat(playerId: string, direction: 'up' | 'down'): void {
    const idx = this._players.findIndex(p => p.id === playerId);
    if (idx === -1 || this._players.length < 2) return;
    const targetIdx = direction === 'up'
      ? (idx - 1 + this._players.length) % this._players.length
      : (idx + 1) % this._players.length;

    this.swapSeats(playerId, this._players[targetIdx].id);
  }

  public saveHistory(description: string): void {
    const entry: GameHistoryEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      description,
      snapshot: JSON.stringify(this.toJSON()),
    };
    this._history = [...this._history.slice(-15), entry];
  }

  public undo(): boolean {
    if (this._history.length === 0) return false;
    const historyCopy = [...this._history];
    const lastEntry = historyCopy.pop();
    if (!lastEntry) return false;

    try {
      const parsed: RoomState = JSON.parse(lastEntry.snapshot);
      this._street = parsed.street;
      this._currentHighestBet = parsed.currentHighestBet;
      this._minRaise = parsed.minRaise;
      this._dealerIndex = parsed.dealerIndex;
      this._activePlayerIndex = parsed.activePlayerIndex;
      this._players = parsed.players.map(p => Player.fromJSON(p));
      this._pot = Pot.fromJSON(parsed.pot, parsed.sidePots);
      this._winnerIds = parsed.winnerIds || [];
      this._history = historyCopy;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Serializes the aggregate entity into the RoomState DTO.
   */
  public toJSON(): RoomState {
    return {
      roomId: this._roomId,
      roomName: this._roomName,
      hostId: this._hostId,
      isHostPlaying: this._isHostPlaying,
      smallBlind: this._smallBlind,
      bigBlind: this._bigBlind,
      ante: this._ante,
      street: this._street,
      pot: this._pot.amount,
      currentHighestBet: this._currentHighestBet,
      minRaise: this._minRaise,
      dealerIndex: this._dealerIndex,
      activePlayerIndex: this._activePlayerIndex,
      players: this._players.map(p => p.toJSON()),
      sidePots: this._pot.sidePots,
      history: this._history,
      pendingRequests: this._pendingRequests,
      activeVote: this._activeVote,
      winnerIds: this._winnerIds,
      isFirstHandStarted: this._isFirstHandStarted,
    };
  }

  /**
   * Factory method to instantiate PokerRoom from an existing state.
   */
  public static fromState(state: RoomState): PokerRoom {
    const hostData = state.players.find(p => p.id === state.hostId) || state.players[0];
    const hostPlayer = hostData ? Player.fromJSON(hostData) : new Player(state.hostId, 'Host', '', 1000, 0, true);

    const room = new PokerRoom(
      state.roomId,
      hostPlayer,
      state.smallBlind,
      state.bigBlind,
      state.roomName
    );

    room._isHostPlaying = state.isHostPlaying;
    room._ante = state.ante;
    room._street = state.street;
    room._currentHighestBet = state.currentHighestBet;
    room._minRaise = state.minRaise;
    room._dealerIndex = state.dealerIndex;
    room._activePlayerIndex = state.activePlayerIndex;
    room._players = state.players.map(p => Player.fromJSON(p));
    room._pot = Pot.fromJSON(state.pot, state.sidePots);
    room._history = state.history || [];
    room._pendingRequests = state.pendingRequests || [];
    room._activeVote = state.activeVote || null;
    room._winnerIds = state.winnerIds || [];
    room._isFirstHandStarted = !!state.isFirstHandStarted;

    return room;
  }
}
