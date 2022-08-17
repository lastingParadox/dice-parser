const assoc = {
    '^': "right",
    '*': "left",
    '/': "left",
    '+': "left",
    '-': "left"
}

const prec = {
    '^': 4,
    '*': 3,
    '/': 3,
    '+': 2,
    '-': 2
}

export class Token {

    type;
    value;

    constructor(type, value) {
        this.type = type;
        this.value = value;
    }

    precedence() {
        return prec[this.value];
    }

    associativity() {
        return assoc[this.value];
    }
}