import {DiceRoller} from "./diceRoller.js";

Array.prototype.peek = function() {
    return this.slice(-1)[0];
}

let roller = new DiceRoller("2d4 + 3d5*5 + 5.0 + d4");
let tokens = roller.getTokens();

tokens.forEach((token, index) => {
    console.log(index + "=> " + token.type + "(" + token.value + ")");
});

console.log(roller.getPostfix());

console.log(roller.getTotal());
console.log(roller.getSet());
console.log(roller.getRollString())

