import { createInitialRoomState, startNewHand, handlePlayerAction } from '../src/lib/poker-engine';
import { Player } from '../src/types/poker';

const host: Player = {
  id: 'user_host',
  name: 'Host',
  avatarUrl: '',
  chips: 1000,
  currentBet: 0,
  totalRoundBet: 0,
  status: 'active',
  seatIndex: 0,
  isDealer: true,
  isSmallBlind: false,
  isBigBlind: false,
  isTurn: false,
  isHost: true,
  isApproved: true,
  hasActedThisRound: false,
};

const p2: Player = {
  id: 'user_p2',
  name: 'Player 2',
  avatarUrl: '',
  chips: 1000,
  currentBet: 0,
  totalRoundBet: 0,
  status: 'active',
  seatIndex: 1,
  isDealer: false,
  isSmallBlind: false,
  isBigBlind: false,
  isTurn: false,
  isHost: false,
  isApproved: true,
  hasActedThisRound: false,
};

const p3: Player = {
  id: 'user_p3',
  name: 'Player 3',
  avatarUrl: '',
  chips: 1000,
  currentBet: 0,
  totalRoundBet: 0,
  status: 'active',
  seatIndex: 2,
  isDealer: false,
  isSmallBlind: false,
  isBigBlind: false,
  isTurn: false,
  isHost: false,
  isApproved: true,
  hasActedThisRound: false,
};

let room = createInitialRoomState('1234', host);
room.players.push(p2);
room.players.push(p3);

console.log('\n--- Start Hand (3 Players) ---');
room = startNewHand(room);
console.log('Street:', room.street);
console.log('Active Player Index:', room.activePlayerIndex);
console.log('Active Player:', room.players[room.activePlayerIndex].name);

const activeId = room.players[room.activePlayerIndex].id;
console.log(`\n--- Active Player (${room.players[room.activePlayerIndex].name}) Folds ---`);
room = handlePlayerAction(room, activeId, 'fold');

console.log('Street after fold:', room.street);
console.log('Pot after fold:', room.pot);
console.log('Active Player Index after fold:', room.activePlayerIndex);
console.log('Active Player after fold:', room.players[room.activePlayerIndex].name, 'isTurn:', room.players[room.activePlayerIndex].isTurn);
console.log('Players:');
room.players.forEach(p => console.log(`  ${p.name}: chips=${p.chips}, status=${p.status}, isTurn=${p.isTurn}, hasActed=${p.hasActedThisRound}`));

