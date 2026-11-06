import { RoomState, Street, GameHistoryEntry, JoinRequest, Vote, ShowdownResult, PlayerLedgerRecord, RoomLogEntry } from '@/types/poker';
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
  private _nextSmallBlind?: number;
  private _nextBigBlind?: number;
  private _ante: number;
  private _raiseRule: 'standard' | 'casual';
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
  private _lastShowdownResult?: ShowdownResult | null;
  private _isFirstHandStarted: boolean;
  private _isAwaitingNextStreet: boolean;
  private _playerLedger: PlayerLedgerRecord[];
  private _roomLogs: RoomLogEntry[];

  constructor(
    roomId: string,
    hostPlayer: Player,
    smallBlind: number = 5,
    bigBlind: number = 10,
    roomName: string = 'Poker Party Room',
    raiseRule: 'standard' | 'casual' = 'standard'
  ) {
    this._roomId = roomId;
    this._roomName = roomName;
    this._hostId = hostPlayer.id;
    this._isHostPlaying = true;
    this._smallBlind = smallBlind;
    this._bigBlind = bigBlind;
    this._nextSmallBlind = undefined;
    this._nextBigBlind = undefined;
    this._ante = 0;
    this._raiseRule = raiseRule;
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
    this._lastShowdownResult = null;
    this._isFirstHandStarted = false;
    this._isAwaitingNextStreet = false;
    this._playerLedger = [
      {
        playerId: hostPlayer.id,
        playerName: hostPlayer.name,
        playerAvatar: hostPlayer.avatarUrl,
        totalBuyIn: hostPlayer.chips,
        currentChips: hostPlayer.chips,
        status: 'active',
      },
    ];
    this._roomLogs = [
      {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        type: 'system',
        message: `สร้างห้อง PIN: ${roomId} โดย ${hostPlayer.name} (ชิปเริ่มต้น: ${hostPlayer.chips.toLocaleString()})`,
      },
    ];
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
  public get lastShowdownResult(): ShowdownResult | null | undefined { return this._lastShowdownResult; }
  public get isFirstHandStarted(): boolean { return this._isFirstHandStarted; }
  public get raiseRule(): 'standard' | 'casual' { return this._raiseRule; }
  public get nextSmallBlind(): number | undefined { return this._nextSmallBlind; }
  public get nextBigBlind(): number | undefined { return this._nextBigBlind; }
  public get isAwaitingNextStreet(): boolean { return this._isAwaitingNextStreet; }
  public get playerLedger(): PlayerLedgerRecord[] { return [...this._playerLedger]; }
  public get roomLogs(): RoomLogEntry[] { return [...this._roomLogs]; }

  // --- Mutators ---
  public setAwaitingNextStreet(val: boolean): void {
    this._isAwaitingNextStreet = val;
  }
  public setRaiseRule(rule: 'standard' | 'casual'): void {
    this._raiseRule = rule;
  }

  public setNextBlinds(sb: number, bb: number): void {
    if (sb > 0 && bb > sb) {
      this._nextSmallBlind = sb;
      this._nextBigBlind = bb;
    }
  }

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

  public addRoomLog(type: RoomLogEntry['type'], message: string): void {
    const entry: RoomLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      type,
      message,
    };
    this._roomLogs = [entry, ...this._roomLogs].slice(0, 100);
  }

  public addPlayer(player: Player): void {
    player.setSeatIndex(this._players.length);
    this._players.push(player);

    const existing = this._playerLedger.find(l => l.playerId === player.id);
    if (existing) {
      existing.status = 'active';
      existing.currentChips = player.chips;
      existing.leftAt = undefined;
    } else {
      this._playerLedger.push({
        playerId: player.id,
        playerName: player.name,
        playerAvatar: player.avatarUrl,
        totalBuyIn: player.chips,
        currentChips: player.chips,
        status: 'active',
      });
    }
  }

  public removePlayer(playerId: string, newHostId?: string): void {
    const leavingPlayer = this._players.find(p => p.id === playerId);
    if (!leavingPlayer) return;

    const chipsWagered = (leavingPlayer.totalRoundBet || leavingPlayer.currentBet || 0);
    const remainingChips = leavingPlayer.chips;

    // Update player ledger so Host always knows exactly how much chips this player left with!
    const ledger = this._playerLedger.find(l => l.playerId === playerId);
    if (ledger) {
      ledger.status = 'left';
      ledger.currentChips = remainingChips;
      ledger.leftAt = Date.now();
      ledger.lastLeftBetInPot = chipsWagered;
    } else {
      this._playerLedger.push({
        playerId: leavingPlayer.id,
        playerName: leavingPlayer.name,
        playerAvatar: leavingPlayer.avatarUrl,
        totalBuyIn: remainingChips + chipsWagered,
        currentChips: remainingChips,
        status: 'left',
        leftAt: Date.now(),
        lastLeftBetInPot: chipsWagered,
      });
    }

    this.addRoomLog(
      'leave',
      `${leavingPlayer.name} ออกจากห้อง (ชิปคงเหลือติดตัว: ${remainingChips.toLocaleString()} ชิป${chipsWagered > 0 ? `, เสียชิปที่ลงใน Pot: ${chipsWagered.toLocaleString()} ชิป` : ''})`
    );

    // If leaving player was host and a new host was designated
    if (playerId === this._hostId && newHostId) {
      const designatedHost = this._players.find(p => p.id === newHostId);
      if (designatedHost) {
        this._hostId = designatedHost.id;
        designatedHost.setHost(true);
      }
    }

    const wasTurn = leavingPlayer.isTurn;
    this._players = this._players.filter(p => p.id !== playerId);
    this._players.forEach((p, idx) => p.setSeatIndex(idx));

    // Fallback: transfer host if host left without designated new host
    if (this._players.length > 0 && !this._players.some(p => p.id === this._hostId)) {
      this._hostId = this._players[0].id;
      this._players[0].setHost(true);
    }

    if (this._players.length === 0) {
      this._dealerIndex = 0;
      this._activePlayerIndex = 0;
      return;
    }

    this._dealerIndex = this._dealerIndex % this._players.length;

    // Handle active hand scenario: chips wagered already in pot remain in pot!
    if (this._street !== 'showdown' && this._isFirstHandStarted) {
      const inHand = this.getPlayersInHand();
      if (inHand.length === 1) {
        const soleSurvivor = inHand[0];
        this.awardPotToWinners([soleSurvivor.id]);
        this._street = 'showdown';
        this._isAwaitingNextStreet = false;
        this.addRoomLog('pot_win', `${soleSurvivor.name} ชนะกองกลาง ${this._pot.amount.toLocaleString()} ชิป (ผู้เล่นคนอื่นออกจากห้อง/หมอบหมด)`);
      } else if (inHand.length > 1) {
        if (this.isBettingRoundComplete()) {
          this._isAwaitingNextStreet = true;
          this._players.forEach(p => p.setTurn(false));
        } else if (wasTurn) {
          const nextIdx = this.getNextActiveIndex(this._dealerIndex);
          this.setActiveTurnIndex(nextIdx);
        }
      }
    } else {
      this._activePlayerIndex = this._activePlayerIndex % this._players.length;
    }
  }

  public requestRebuy(playerId: string, chips: number): boolean {
    const player = this._players.find(p => p.id === playerId);
    if (!player || chips <= 0) return false;

    const existing = this._pendingRequests.find(r => r.userId === playerId && r.type === 'rebuy');
    if (existing) return false;

    const req: JoinRequest = {
      id: `rebuy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: player.id,
      userName: player.name,
      userAvatar: player.avatarUrl,
      requestedChips: chips,
      createdAt: Date.now(),
      type: 'rebuy',
    };
    this._pendingRequests.push(req);
    this.addRoomLog('rebuy', `${player.name} ขอเพิ่มชิป +${chips.toLocaleString()} ชิป (รอ Host อนุมัติ)`);
    return true;
  }

  public approveRequest(requestId: string, overrideChips?: number): boolean {
    const reqIndex = this._pendingRequests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return false;

    const req = this._pendingRequests[reqIndex];
    this._pendingRequests.splice(reqIndex, 1);
    const approvedChips = overrideChips || req.requestedChips || 1000;

    const existingPlayer = this._players.find(p => p.id === req.userId);
    if (existingPlayer) {
      // Rebuy for existing player
      existingPlayer.setChips(existingPlayer.chips + approvedChips);
      if (existingPlayer.status === 'sitting-out' && existingPlayer.chips > 0) {
        existingPlayer.setStatus('active');
      }

      // Update Ledger
      const ledger = this._playerLedger.find(l => l.playerId === existingPlayer.id);
      if (ledger) {
        ledger.totalBuyIn += approvedChips;
        ledger.currentChips = existingPlayer.chips;
        ledger.status = existingPlayer.status as any;
      }

      this.addRoomLog(
        'rebuy',
        `Host อนุมัติเพิ่มชิปให้ ${existingPlayer.name} +${approvedChips.toLocaleString()} ชิป (ยอดชิปปัจจุบัน: ${existingPlayer.chips.toLocaleString()})`
      );
    } else {
      // New player join
      const newPlayer = new Player(
        req.userId,
        req.userName,
        req.userAvatar,
        approvedChips,
        this._players.length,
        false
      );
      this.addPlayer(newPlayer);

      this.addRoomLog(
        'join',
        `${req.userName} เข้าสู่ห้อง (ชิปเริ่มต้น: ${approvedChips.toLocaleString()})`
      );
    }
    return true;
  }

  public rejectRequest(requestId: string): boolean {
    const reqIndex = this._pendingRequests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return false;

    const req = this._pendingRequests[reqIndex];
    this._pendingRequests.splice(reqIndex, 1);
    this.addRoomLog(
      'system',
      `Host ปฏิเสธคำขอของ ${req.userName} (${req.type === 'rebuy' ? 'ขอเพิ่มชิป' : 'ขอเข้าห้อง'})`
    );
    return true;
  }

  public reopenBettingForOthers(actingPlayerId: string): void {
    this._players.forEach(p => {
      if (p.id !== actingPlayerId && p.status === 'active') {
        p.reopenAction();
      }
    });
  }

  /**
   * Dealer rotation: clockwise to the next approved player with chips.
   */
  public rotateDealer(): void {
    const total = this._players.length;
    if (total === 0) return;

    if (this._isFirstHandStarted) {
      let nextD = (this._dealerIndex + 1) % total;
      let attempts = 0;
      while (attempts < total) {
        const p = this._players[nextD];
        if (p && p.isApproved && p.status !== 'sitting-out' && p.chips > 0) {
          break;
        }
        nextD = (nextD + 1) % total;
        attempts++;
      }
      this._dealerIndex = nextD;
    } else {
      this._isFirstHandStarted = true;
      const eligible = this.getApprovedPlayersWithChips();
      if (!this._players[this._dealerIndex] || this._players[this._dealerIndex].chips <= 0) {
        if (eligible.length > 0) {
          const eligibleIdx = this._players.indexOf(eligible[0]);
          this._dealerIndex = eligibleIdx >= 0 ? eligibleIdx : 0;
        } else {
          this._dealerIndex = 0;
        }
      }
    }
  }

  /**
   * Strictly enforces that ONLY ONE player has isTurn = true at any moment.
   * All other players are forced to false to prevent turn desync.
   */
  public setActiveTurnIndex(index: number): void {
    const total = this._players.length;
    if (total === 0) {
      this._activePlayerIndex = 0;
      return;
    }
    const validIndex = ((index % total) + total) % total;
    this._activePlayerIndex = validIndex;

    const isShowdown = this._street === 'showdown';
    this._players.forEach((p, idx) => {
      p.setTurn(!isShowdown && idx === validIndex && p.status === 'active');
    });
  }

  /**
   * Starts a brand new hand with blinds and Dealer positioning.
   */
  public startHand(): boolean {
    const eligiblePlayers = this.getApprovedPlayersWithChips();
    if (eligiblePlayers.length < 2) return false;

    // Apply next scheduled blinds if set
    if (this._nextSmallBlind && this._nextBigBlind) {
      this._smallBlind = this._nextSmallBlind;
      this._bigBlind = this._nextBigBlind;
      this._minRaise = this._raiseRule === 'casual' ? 1 : this._bigBlind;
      this._nextSmallBlind = undefined;
      this._nextBigBlind = undefined;
    }

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

    // Post Blinds (forced bets: hasActedThisRound remains false)
    const sbAmount = this._players[sbIdx].postBlind(this._smallBlind);
    const bbAmount = this._players[bbIdx].postBlind(this._bigBlind);

    this._pot.reset();
    this._pot.addChips(sbAmount + bbAmount);
    this._pot.recalculatePots(this._players);
    this._currentHighestBet = this._bigBlind;
    this._minRaise = this._raiseRule === 'casual' ? 1 : this._bigBlind;
    this._street = 'preflop';
    this._winnerIds = [];
    this._isAwaitingNextStreet = false;

    // Preflop first to act
    const firstToAct = eligiblePlayers.length === 2 ? sbIdx : this.getNextActiveIndex(bbIdx);
    this.setActiveTurnIndex(firstToAct);

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
    if (this._street === 'showdown') return;
    this.saveHistory(`Progress from ${this._street}`);

    // Reset round bets
    this._players.forEach(p => p.resetStreetBet());
    this._currentHighestBet = 0;
    this._minRaise = this._raiseRule === 'casual' ? 1 : this._bigBlind;
    this._pot.recalculatePots(this._players);

    if (this._street === 'preflop') {
      this._street = 'flop';
    } else if (this._street === 'flop') {
      this._street = 'turn';
    } else if (this._street === 'turn') {
      this._street = 'river';
    } else if (this._street === 'river') {
      this._street = 'showdown';
      this._isAwaitingNextStreet = false;
      this._players.forEach(p => p.setTurn(false));
      return;
    }

    const inHand = this.getPlayersInHand();
    const withChips = inHand.filter(p => p.chips > 0);

    // If 0 or 1 player has chips remaining (all-in runout), stay in awaiting next street mode
    // so the dealer can deal each physical card step-by-step
    if (withChips.length <= 1 && inHand.length > 1) {
      this._isAwaitingNextStreet = true;
      this._players.forEach(p => p.setTurn(false));
      return;
    }

    this._isAwaitingNextStreet = false;
    // First active left of dealer button
    const nextActor = this.getNextActiveIndex(this._dealerIndex);
    this.setActiveTurnIndex(nextActor);
  }

  /**
   * Executes a polymorphic GameAction command.
   */
  public dispatchAction(action: GameAction): void {
    const activePlayer = this._players[this._activePlayerIndex];
    if (!activePlayer || activePlayer.id !== action.playerId) {
      return;
    }

    this.saveHistory(`Player Action: ${action.actionName}`);
    action.execute(this);

    // Keep side pots updated with every player action
    this._pot.recalculatePots(this._players);

    if (this._street !== 'showdown') {
      if (this.isBettingRoundComplete()) {
        // Betting round is complete!
        // Lock player actions and pause for "ไพ่ต่อไป" button to deal the physical card
        this._isAwaitingNextStreet = true;
        this._players.forEach(p => p.setTurn(false));
      } else {
        this._isAwaitingNextStreet = false;
        const nextIdx = this.getNextActiveIndex(this._activePlayerIndex);
        this.setActiveTurnIndex(nextIdx);
      }
    } else {
      this._isAwaitingNextStreet = false;
      this._players.forEach(p => p.setTurn(false));
    }
  }

  public awardPotToWinners(winnerIds: string[], potWinnerMap?: Record<string, string[]>): void {
    let resolvedWinnerIds = [...winnerIds];
    if (resolvedWinnerIds.length === 0 && potWinnerMap) {
      resolvedWinnerIds = Array.from(new Set(Object.values(potWinnerMap).flat()));
    }
    if (resolvedWinnerIds.length === 0 || this._pot.amount === 0) return;
    this.saveHistory(`Award pot to ${resolvedWinnerIds.length} winner(s)`);

    const totalPotBeforeAward = this._pot.amount;
    const inHand = this.getPlayersInHand();
    const isFoldWin = inHand.length === 1;
    const winners = this._players.filter(p => resolvedWinnerIds.includes(p.id));

    const { potResults } = this._pot.awardWinners(winners, potWinnerMap);
    this._winnerIds = resolvedWinnerIds;

    // Sync player ledger with updated chips
    this._players.forEach(p => {
      const ledger = this._playerLedger.find(l => l.playerId === p.id);
      if (ledger) {
        ledger.currentChips = p.chips;
        ledger.status = p.status as any;
      }
    });

    const winnerNames = winners.map(w => w.name).join(', ') || 'ผู้ชนะ';
    this.addRoomLog(
      'pot_win',
      `จบ Showdown: แจกเงินกองกลาง ${totalPotBeforeAward.toLocaleString()} ชิป ให้ ${winnerNames}`
    );

    this._lastShowdownResult = {
      id: `sd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      totalPot: totalPotBeforeAward,
      isFoldWin,
      soleWinnerName: isFoldWin && winners.length === 1 ? winners[0].name : undefined,
      soleWinnerAvatar: isFoldWin && winners.length === 1 ? winners[0].avatarUrl : undefined,
      potResults,
    };
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
    this._history = [...this._history.slice(-2), entry];
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
      nextSmallBlind: this._nextSmallBlind,
      nextBigBlind: this._nextBigBlind,
      ante: this._ante,
      raiseRule: this._raiseRule,
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
      lastShowdownResult: this._lastShowdownResult,
      isFirstHandStarted: this._isFirstHandStarted,
      isAwaitingNextStreet: this._isAwaitingNextStreet,
      playerLedger: this._playerLedger,
      roomLogs: this._roomLogs,
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
      state.roomName,
      state.raiseRule || 'standard'
    );

    room._isHostPlaying = state.isHostPlaying;
    room._nextSmallBlind = state.nextSmallBlind;
    room._nextBigBlind = state.nextBigBlind;
    room._ante = state.ante;
    room._street = state.street;
    room._currentHighestBet = state.currentHighestBet;
    room._minRaise = state.minRaise;
    room._dealerIndex = state.dealerIndex;
    room._activePlayerIndex = state.activePlayerIndex;
    room._players = (state.players || []).map(p => Player.fromJSON(p));
    room._pot = Pot.fromJSON(state.pot, state.sidePots);
    room._history = (state.history || []).map(h => ({ ...h }));
    room._pendingRequests = (state.pendingRequests || []).map(r => ({ ...r }));
    room._activeVote = state.activeVote ? { ...state.activeVote } : null;
    room._winnerIds = Array.isArray(state.winnerIds) ? [...state.winnerIds] : [];
    room._lastShowdownResult = state.lastShowdownResult
      ? JSON.parse(JSON.stringify(state.lastShowdownResult))
      : null;
    room._isFirstHandStarted = !!state.isFirstHandStarted;
    room._isAwaitingNextStreet = Boolean(state.isAwaitingNextStreet);
    room._playerLedger = Array.isArray(state.playerLedger) ? state.playerLedger.map(l => ({ ...l })) : room._playerLedger;
    room._roomLogs = Array.isArray(state.roomLogs) ? state.roomLogs.map(lg => ({ ...lg })) : room._roomLogs;

    return room;
  }
}
