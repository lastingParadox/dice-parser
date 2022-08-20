const Dice = require('./dice.js');
const Token = require('./token.js');

Array.prototype.peek = function() {
    return this.slice(-1)[0];
}

class RollInitializeError extends Error {
    constructor(message) {
        super(message);
        this.name = RollInitializeError;
    }
}

class InfinityError extends Error {
    constructor(message) {
        super(message);
        this.name = InfinityError;
    }
}

class DiceRoller {

    #diceString = "";
    #total = 0;
    #tokenArray = [];
    #postFixArray = [];
    #rollArray = [];
    #rollString = "";

    constructor(diceString) {
        this.diceString = diceString;

        this.#tokenArray = this.#tokenize();
        this.#postFixArray = this.#parse();
        this.#total = this.#evalPostFix();
        this.#rollString = this.#calcRollString();
    }

    static #isDigit(char) {
        return /\d/.test(char);
    }

    static #isD(char) {
        return /[d]/i.test(char);
    }

    static #isOperator(char) {
        return /[+\-*\/^]/.test(char);
    }

    static #isLeftParenthesis(char) {
        return char === "(";
    }

    static #isRightParenthesis(char) {
        return char === ")";
    }

    static #isPoint(char) {
        return char === ".";
    }

    static #validateSyntax(buffer, result) {
        if (buffer.length === 0)
            return;
        if (buffer.includes('d') || buffer.includes('D')) {
            if (buffer.at(-1) === 'd' || buffer.at(-1) === 'D' || buffer.at(-1) === '.')
                throw new RollInitializeError("Invalid dice syntax in roll expression!");
            else {
                result.push(new Token("Dice", buffer.join("")));
            }
        }
        else {
            if (buffer.at(-1) === '.') {
                throw new RollInitializeError("Invalid integer syntax in roll expression!");
            }
            else {
                result.push(new Token("Literal", buffer.join("")));
            }
        }
    }

    #tokenize() {
        let result = [];
        let buffer = [];

        let expression = this.diceString.replace(/\s+/g, "").split("");

        expression.forEach((char) => {
            if (DiceRoller.#isDigit(char) || DiceRoller.#isD(char) || DiceRoller.#isPoint(char)) {
                buffer.push(char);
            }
            else if (DiceRoller.#isOperator(char) || DiceRoller.#isLeftParenthesis(char) || DiceRoller.#isRightParenthesis(char)) {
                DiceRoller.#validateSyntax(buffer, result);

                buffer = [];

                if (DiceRoller.#isOperator(char))
                    result.push(new Token("Operator", char));
                else {
                    if (DiceRoller.#isLeftParenthesis(char)) {
                        result.push(new Token("Operator", '*'));
                        result.push(new Token("Left Parenthesis", char));
                    }
                    else
                        result.push(new Token("Right Parenthesis", char));
                }
            }
            else {
                throw new RollInitializeError("Invalid syntax in roll expression!");
            }
        });

        if (buffer.length !== 0) {
            DiceRoller.#validateSyntax(buffer, result);
        }

        return result;
    }

    #parse() {
        let outQueue = [];
        let opStack = [];

        this.#tokenArray.forEach((token) => {

            let top = opStack.peek();

            if (token.type === "Literal" || token.type === "Dice")
                outQueue.push(token);
            else if (token.type === "Operator") {
                while(top !== undefined && top.type === "Operator" && ((token.associativity() === "left" && token.precedence() <= top.precedence()) || (token.associativity() === "right" && token.precedence() < top.precedence()))) {
                    outQueue.push(opStack.pop());
                    top = opStack.peek();
                }
                opStack.push(token);
            }
            else if (token.type === "Left Parenthesis") {
                opStack.push(token);
            }

            else if (token.type === "Right Parenthesis") {
                while (top !== undefined && top.type !== "Left Parenthesis") {
                    outQueue.push(opStack.pop());
                    top = opStack.peek();
                }
                opStack.pop();
            }
        })

        while(opStack.length > 0) {
            let top = opStack.peek();
            if (top.type === "Operator")
                outQueue.push(opStack.pop());
            else
                opStack.pop();
        }

        return outQueue;
    }

    #evalPostFix() {
        let stack = [];

        this.#postFixArray.forEach((token) => {
            if (isNaN(token.value)) {
                if (token.type === "Dice") {
                    let roll = new Dice(token.value);
                    stack.push(parseFloat(roll.total));
                    this.#rollArray.push(roll.dieRolls);
                }
                else {
                    let x = stack.pop();
                    if (DiceRoller.#isOperator(token.value)) {
                        let y = stack.pop();
                        if (token.value === '+')
                            stack.push(y + x);
                        else if (token.value === '-')
                            stack.push(y - x);
                        else if (token.value === '*')
                            stack.push(y * x);
                        else if (token.value === '/')
                            stack.push(y / x);
                        else if (token.value === '^')
                            stack.push(Math.pow(y, x));
                        this.#rollArray.push(token.value)
                    }
                }
            }
            else {
                stack.push(parseFloat(token.value));
                this.#rollArray.push(parseFloat(token.value));
            }

        });

        let returnValue = null;
        while(stack.length > 0) {
            let element = stack.pop();
            if (!isNaN(element)) {
                returnValue = element;
                if (returnValue === Infinity || returnValue === -Infinity || returnValue === null)
                    throw new InfinityError("Unable to parse expression, value is infinity.");
            }

        }

        return returnValue;
    }

    #rollAddString(value) {
        let string = "[ "
        value.forEach((number, index) => {
            if (index !== (value.length - 1))
                string += number + ", ";
            else
                string += number + " ";
        });
        string += "]";
        return string;
    }

    #calcRollString() {
        let stack = [];
        this.#rollArray.forEach((value, index) => {
            if (!DiceRoller.#isOperator(value)) {
                stack.push(value);
            }
            else {
                let second = stack.pop();
                if (Array.isArray(second))
                    second = this.#rollAddString(second);
                let first = stack.pop();
                if (Array.isArray(first))
                    first = this.#rollAddString(first);
                if (index !== (this.#rollArray.length - 1))
                    stack.push("( " + first + " " + value + " " + second + " )");
                else
                    stack.push(first + " " + value + " " + second);
            }
        });
        return stack.pop();
    }

    getTokens() {
        return this.#tokenArray;
    }

    getPostfix() {
        return this.#postFixArray;
    }

    getSet() {
        return this.#rollArray;
    }

    getExpression() {
        return this.#diceString;
    }

    getTotal() {
        return this.#total;
    }

    getRollString() {
        return this.#rollString;
    }
}

module.exports = {
    DiceRoller,
    RollInitializeError,
    InfinityError
};