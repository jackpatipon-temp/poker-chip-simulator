import { createServerRoom, requestJoinServerRoom, dispatchServerRoomAction, getServerRoom } from '../src/lib/server-store';

const pin = '9999';
createServerRoom(pin, 'Host', '', 1000, 5, 10);
requestJoinServerRoom(pin, 'Player 2', '', 1000, true);

console.log('--- Start Hand ---');
dispatchServerRoomAction(pin, { type: 'START_HAND' });

let room = getServerRoom(pin)!;
console.log('Active Player:', room.players[room.activePlayerIndex].name);

console.log('\n--- Active Player Folds ---');
const activePlayer = room.players[room.activePlayerIndex];
dispatchServerRoomAction(pin, { type: 'ACTION', playerId: activePlayer.id, action: 'fold' });

room = getServerRoom(pin)!;
console.log('Room after fold:');
console.log('  Street:', room.street);
console.log('  Pot:', room.pot);
console.log('  Winner IDs:', room.winnerIds);
console.log('  Players:', room.players.map(p => `${p.name}: chips=${p.chips}, status=${p.status}`));

console.log('\n--- Showdown Modal Next Hand Clicked ---');
dispatchServerRoomAction(pin, { type: 'SHOWDOWN_WINNERS', winnerIds: [room.players[1].id] });
dispatchServerRoomAction(pin, { type: 'START_HAND' });

room = getServerRoom(pin)!;
console.log('Room after Showdown & Next Hand:');
console.log('  Street:', room.street);
console.log('  Pot:', room.pot);
console.log('  Players:', room.players.map(p => `${p.name}: chips=${p.chips}, status=${p.status}, isDealer=${p.isDealer}`));

