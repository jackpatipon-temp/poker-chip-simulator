import { Player as IPlayer, PlayerStatus } from '@/types/poker';

/**
 * OOP Domain Model: Player
 * Encapsulates player stack, betting state, table position, and gameplay actions.
 * Protects invariants via private state with validated mutator methods.
 */
export class Player {
  private readonly _id: string;
  private readonly _name: string;
  private _avatarUrl: string;
  private readonly _email?: string;
  private _chips: number;
  private _currentBet: number;
  private _totalRoundBet: number;
  private _lastBetAmount?: number;
  private _prevStreetBet?: number;
  private _hasSmallBlindActed: boolean;
  private _status: PlayerStatus;
  private _seatIndex: number;
  private _isDealer: boolean;
  private _isSmallBlind: boolean;
  private _isBigBlind: boolean;
  private _isTurn: boolean;
  private _lastAction?: 'check' | 'call' | 'raise' | 'bet' | 'fold' | 'all-in';
  private _isHost: boolean;
  private _isApproved: boolean;
  private _hasActedThisRound: boolean;

  constructor(
    id: string,
    name: string,
    avatarUrl: string,
    chips: number = 1000,
    seatIndex: number = 0,
    isHost: boolean = false,
    email?: string
  ) {
    this._id = id;
    this._name = name;
    this._avatarUrl = avatarUrl;
    this._email = email;
    this._chips = Math.max(0, chips);
    this._currentBet = 0;
    this._totalRoundBet = 0;
    this._lastBetAmount = undefined;
    this._prevStreetBet = undefined;
    this._hasSmallBlindActed = false;
    this._status = 'active';
    this._seatIndex = seatIndex;
    this._isDealer = false;
    this._isSmallBlind = false;
    this._isBigBlind = false;
    this._isTurn = false;
    this._isHost = isHost;
    this._isApproved = true;
    this._hasActedThisRound = false;
  }

  // --- Getters (Encapsulation) ---
  public get id(): string { return this._id; }
  public get name(): string { return this._name; }
  public get avatarUrl(): string { return this._avatarUrl; }
  public get email(): string | undefined { return this._email; }
  public get chips(): number { return this._chips; }
  public get currentBet(): number { return this._currentBet; }
  public get totalRoundBet(): number { return this._totalRoundBet; }
  public get lastBetAmount(): number | undefined { return this._lastBetAmount; }
  public get prevStreetBet(): number | undefined { return this._prevStreetBet; }
  public get status(): PlayerStatus { return this._status; }
  public get seatIndex(): number { return this._seatIndex; }
  public get isDealer(): boolean { return this._isDealer; }
  public get isSmallBlind(): boolean { return this._isSmallBlind; }
  public get isBigBlind(): boolean { return this._isBigBlind; }
  public get isTurn(): boolean { return this._isTurn; }
  public get lastAction(): 'check' | 'call' | 'raise' | 'bet' | 'fold' | 'all-in' | undefined { return this._lastAction; }
  public get isHost(): boolean { return this._isHost; }
  public get isApproved(): boolean { return this._isApproved; }
  public get hasActedThisRound(): boolean { return this._hasActedThisRound; }

  // --- Business Mutators ---
  public setSeatIndex(index: number): void {
    this._seatIndex = index;
  }

  public setDealer(isDealer: boolean): void {
    this._isDealer = isDealer;
  }

  public setBlinds(isSmallBlind: boolean, isBigBlind: boolean): void {
    this._isSmallBlind = isSmallBlind;
    this._isBigBlind = isBigBlind;
  }

  public setTurn(isTurn: boolean): void {
    this._isTurn = isTurn;
  }

  public setHost(isHost: boolean): void {
    this._isHost = isHost;
  }

  public setAvatar(avatarUrl: string): void {
    if (avatarUrl) this._avatarUrl = avatarUrl;
  }

  public setStatus(status: PlayerStatus): void {
    this._status = status;
  }

  public toggleSittingOut(): PlayerStatus {
    this._status = this._status === 'sitting-out' ? 'active' : 'sitting-out';
    return this._status;
  }

  /**
   * Places a wager, deducting chips and tracking round bet amounts.
   */
  public placeBet(amount: number): number {
    const actualDeduction = Math.min(amount, this._chips);
    this._chips -= actualDeduction;
    this._currentBet += actualDeduction;
    this._totalRoundBet += actualDeduction;

    // Small blind first action in Preflop: add the previously posted blind amount to show the total call/raise
    if (this._isSmallBlind && !this._hasSmallBlindActed) {
      this._lastBetAmount = this._currentBet;
      this._hasSmallBlindActed = true;
    } else {
      this._lastBetAmount = actualDeduction;
    }
    this._prevStreetBet = undefined;

    if (this._chips === 0) {
      this._status = 'all-in';
      this._lastAction = 'all-in';
    }

    this._hasActedThisRound = true;
    this._isTurn = false;
    return actualDeduction;
  }

  /**
   * Posts forced blind (Small or Big Blind).
   * Unlike placeBet, posting a forced blind does NOT mark hasActedThisRound = true,
   * because the player has not yet had their turn to make a decision in Preflop.
   */
  public postBlind(amount: number): number {
    const actualDeduction = Math.min(amount, this._chips);
    this._chips -= actualDeduction;
    this._currentBet += actualDeduction;
    this._totalRoundBet += actualDeduction;
    this._lastBetAmount = actualDeduction;
    this._hasSmallBlindActed = false;
    this._prevStreetBet = undefined;

    if (this._chips === 0) {
      this._status = 'all-in';
      this._lastAction = 'all-in';
    }

    this._hasActedThisRound = false;
    this._isTurn = false;
    return actualDeduction;
  }

  public recordAction(action: 'check' | 'call' | 'raise' | 'bet' | 'fold' | 'all-in'): void {
    this._lastAction = action;
    this._hasActedThisRound = true;
    this._isTurn = false;
  }

  public fold(): void {
    this._status = 'folded';
    this._lastAction = 'fold';
    this._lastBetAmount = undefined;
    this._prevStreetBet = undefined;
    this._hasActedThisRound = true;
    this._isTurn = false;
  }

  public addChips(amount: number): void {
    if (amount > 0) {
      this._chips += amount;
    }
  }

  public setChips(chips: number): void {
    this._chips = Math.max(0, chips);
  }

  public resetStreetBet(): void {
    // Preserve previous street's bet for subtle display until a new bet is made
    this._prevStreetBet = this._lastBetAmount ?? (this._currentBet > 0 ? this._currentBet : undefined);
    this._currentBet = 0;
    this._lastBetAmount = undefined;
    this._hasSmallBlindActed = true;
    this._hasActedThisRound = false;
    this._lastAction = undefined;
    this._isTurn = false;
  }

  public reopenAction(): void {
    this._hasActedThisRound = false;
  }

  public resetHand(dealerIndex: number): void {
    this._currentBet = 0;
    this._totalRoundBet = 0;
    this._lastBetAmount = undefined;
    this._prevStreetBet = undefined;
    this._hasSmallBlindActed = false;
    this._isDealer = this._seatIndex === dealerIndex;
    this._isSmallBlind = false;
    this._isBigBlind = false;
    this._isTurn = false;
    this._lastAction = undefined;
    this._hasActedThisRound = false;

    if (this._status !== 'sitting-out') {
      this._status = this._chips > 0 ? 'active' : 'folded';
    }
  }

  /**
   * Serializes the OOP instance to a JSON DTO for network transport.
   */
  public toJSON(): IPlayer {
    return {
      id: this._id,
      name: this._name,
      avatarUrl: this._avatarUrl,
      email: this._email,
      chips: this._chips,
      currentBet: this._currentBet,
      totalRoundBet: this._totalRoundBet,
      lastBetAmount: this._lastBetAmount,
      prevStreetBet: this._prevStreetBet,
      status: this._status,
      seatIndex: this._seatIndex,
      isDealer: this._isDealer,
      isSmallBlind: this._isSmallBlind,
      isBigBlind: this._isBigBlind,
      isTurn: this._isTurn,
      lastAction: this._lastAction,
      isHost: this._isHost,
      isApproved: this._isApproved,
      hasActedThisRound: this._hasActedThisRound,
    };
  }

  /**
   * Factory method to construct Player instances from serialized states.
   */
  public static fromJSON(data: IPlayer): Player {
    const p = new Player(
      data.id,
      data.name,
      data.avatarUrl,
      data.chips,
      data.seatIndex,
      data.isHost,
      data.email
    );
    p._currentBet = data.currentBet;
    p._totalRoundBet = data.totalRoundBet;
    p._lastBetAmount = data.lastBetAmount;
    p._prevStreetBet = data.prevStreetBet;
    p._status = data.status;
    p._isDealer = data.isDealer;
    p._isSmallBlind = data.isSmallBlind;
    p._isBigBlind = data.isBigBlind;
    p._isTurn = data.isTurn;
    p._lastAction = data.lastAction;
    p._isApproved = data.isApproved;
    p._hasActedThisRound = data.hasActedThisRound;
    return p;
  }
}

/**
 * OOP Class: HostPlayer (Inheritance Example)
 * Extends the baseline Player class with administrative governance responsibilities.
 */
export class HostPlayer extends Player {
  private _adminPermissions: string[];

  constructor(
    id: string,
    name: string,
    avatarUrl: string,
    chips: number = 1000,
    email?: string
  ) {
    super(id, name, avatarUrl, chips, 0, true, email);
    this._adminPermissions = ['KICK_PLAYER', 'CHANGE_BLINDS', 'TRANSFER_HOST', 'START_HAND', 'UNDO_ACTION'];
  }

  public get adminPermissions(): string[] {
    return [...this._adminPermissions];
  }

  public hasPermission(permission: string): boolean {
    return this._adminPermissions.includes(permission);
  }
}
