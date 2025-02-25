import { ExponentialCost, FirstFreeCost, FreeCost, LinearCost } from "../api/Costs";
import { Localization } from "../api/Localization";
import { parseBigNumber, BigNumber } from "../api/BigNumber";
import { theory } from "../api/Theory";
import { Utils } from "../api/Utils";
import { ui } from "../api/ui/UI"
import { Popup } from "../api/ui/Popup";
import { Color } from "../api/ui/properties/Color";
import { ImageSource } from "../api/ui/properties/ImageSource";
import { Thickness } from "../api/ui/properties/Thickness";
import { log } from "../../api/Utils";

var id = "Control System";
var name = "Control System";
var description = "This theory explores the beauty of a control system using blocks.";
var authors = "Warzen User";
var version = '0.1.0';


var currency;
var c;
let s=null, refS = [];
var cExp;
let stage = 0;
let upgrades = {}, secondEquation = '';
let story;
let terteq = '';
let canrecalc = false;
let laplace = []; // stores the iLap term solutions
let t = theoryInitialTime = -10.0;
let anyUpgradeBought = false;
let maxUpgrades = 4;

function print(ob) {
    try {
        log(JSON.stringify(ob));
    } catch (error) {}
} 

class LimitlessCustomCost {
    constructor(model) {
        this.model = model;
    }

    cost(level) {
        return BigNumber.from(this.model(level));
    }
    cumulative_cost(level, amount) {
        let result = BigNumber.ZERO;
        for (let i = 0; i < amount; i++) result += this.cost(level + i);
        return result;
    }
    max(level, currency) {
        let cumulative = BigNumber.ZERO;
        let current_level = level;
        while (cumulative < currency) {
            cumulative += this.cost(current_level);
            current_level++;
        }
        return Math.round(current_level - level - 1);
    }
    get functions() {
        return [
            level => this.cost(level),
            (level, amount) => this.cumulative_cost(level, amount),
            (level, currency) => this.max(level, currency)
        ];
    }
    get cost_model() {
        return new CustomCost(...this.functions);
    }
}

var updateUpgradesList = () => {
    c.isAvailable = false;
    c.isAvailable = true;
    terteq = solver();
}
// upgrade cost model
var upgradeCostModel = (i) => {
    let costfunc =  new LimitlessCustomCost((level) => 100 + BigNumber.TWO.pow(Math.log2(7) * (level + i) + 1));
    return costfunc.cost_model;
}

// recalculates old upgrades
var recalcUpgrades = () => {
    if (!canrecalc) return;
    canrecalc = false;
    log('Recalcing upgrades...');
    Object.keys(upgrades).forEach((upgrade, k) => {
        let u = upgrades[upgrade];
        let i = theory.upgrades.length + 1;
        let s = theory.createUpgrade(i, currency, upgradeCostModel(i));
        const getValue = (level) => BigNumber.from(u.level);
        let desc = (level) => `s_{${k}}=${getValue(u.level).toString(0)}`;
        s.getDescription = (_) => Utils.getMath(desc(s.level));
        s.getInfo = (amount) => Utils.getMathTo(desc(s.level), desc(u.level + amount));
        s.boughtOrRefunded = (_) => {
            upgrades[upgrade].level = s.level;
            upgrades[upgrade].value = s.level;
            anyUpgradeBought = true;
        };
        s.level = u.level
        s.maxLevel = 24;
        refS.push(s);
    });
    log('Finished recalcing upgrades.');
}

function terteqstr() {
    return terteq;
}

// adds new upgrade
var addUpgrade = (name) => {
    let i = theory.upgrades.length + 1;
    let u = upgrades[name];
    let s = theory.createUpgrade(i, currency, upgradeCostModel(i));
    const getValue = (level) => BigNumber.from(u.level);
    let desc = (level) => `${name}=${getValue(u.level).toString(0)}`;
    s.getDescription = (_) => Utils.getMath(desc(s.level));
    s.getInfo = (amount) => Utils.getMathTo(desc(s.level), desc(u.level + amount));
    s.boughtOrRefunded = (_) => {
        upgrades[name].level = s.level;
        upgrades[name].value = s.level;
        secondEquation = calcSecEq();
        anyUpgradeBought = true;
    };
    s.level = 0;
    s.maxLevel = 24;
    theory.upgrades.length -= 1;

    updateUpgradesList();
}

let hasLoadaded = false;
var init = () => {
    currency = theory.createCurrency(symbol = 'ρ', latexSymbol='\\rho');

    ///////////////////
    // Regular Upgrades

    // c
    {
        let ccostfunc =  new LimitlessCustomCost((level) => BigNumber.TEN.pow(Math.log2(29) * level));
        let getDesc = (level) => "c=" + getc(level).toString(0);
        c = theory.createUpgrade(0, currency, ccostfunc.cost_model);
        c.maxLevel = maxUpgrades;
        c.getDescription = (_) => Utils.getMath(getDesc(c.level));
        c.getInfo = (amount) => Utils.getMathTo(getDesc(c.level), getDesc(c.level + amount));
        c.boughtOrRefunded = (_) => {
            let lvl = Object.keys(upgrades).length;
            let name = `s_{${lvl}}`;
            upgrades[name] = {level: 0, value: 0, index: lvl};
            addUpgrade(name);
            lvl = Object.keys(upgrades).length;
            anyUpgradeBought = true;
        }
    }

    if (!hasLoadaded) {
        if (canrecalc) {
            recalcUpgrades();
        }
        secondEquation = calcSecEq();
        anyUpgradeBought = true;
    }
    hasLoadaded = true;
    
    /////////////////////
    // Permanent Upgrades
    theory.createPublicationUpgrade(0, currency, 1e10);
    theory.createBuyAllUpgrade(1, currency, 1e10);
    theory.createAutoBuyerUpgrade(2, currency, 1e15);

    ///////////////////////
    //// Milestone Upgrades
    theory.setMilestoneCost(new LinearCost(25, 25));

    {
        cExp = theory.createMilestoneUpgrade(0, 3);
        cExp.description = Localization.getUpgradeIncCustomExpDesc("c", "0.05");
        cExp.info = Localization.getUpgradeIncCustomExpInfo("c", "0.05");
        cExp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }

    updateAvailability();
}

var updateAvailability = () => {
}
let value = 0;
let global_dt = 0;
var tick = (elapsedTime, multiplier) => {
    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
    theory.invalidateQuaternaryValues();

    let dt = BigNumber.from(elapsedTime * multiplier);
    global_dt = dt;
    let bonus = theory.publicationMultiplier;
    if (anyUpgradeBought) {
        terteq = solver();
        anyUpgradeBought = false;
    }

    value = laplace.map((l) => l.evaluate(t, dt)).reduce((total, val) => total + val, 0) * dt;
    if (value == Infinity) {
        currency.value += BigNumber.ONE;
    } else {
        currency.value += value;
    }
    t += dt;
}

const splitr = '|¬|';
var getInternalState = () => `${JSON.stringify(upgrades)}${splitr}${t}`;

var setInternalState = (state) => {
    canrecalc = false;
    try {
        [upgrades, t] = state.split(splitr).map((s) => JSON.parse(s));
        t = BigNumber.from(t);
        canrecalc = true;
        log('loaded');
    } catch (e) {
        log('couldnt load');
        upgrades = {};
        t = BigNumber.from(theoryInitialTime);
    }
    recalcUpgrades();
    anyUpgradeBought = true;
}

const equations = [
    {
        'name': 'OLTF',
        'value': `
            \\begin{matrix}
            R(s)\\;\\rightarrow [\\; G_{c}(s) \\;]\\;\\rightarrow Y(s)
            \\\\\\\\
            \\qquad \\quad \\;\\; \\downarrow
            \\\\\\\\
            \\; H(s) \\; \\leftarrow
            \\end{matrix}`
    },
    {
        'name': 'CLTF',
        'value': `
            \\begin{matrix}
            R(s)\\;\\rightarrow^{+} \\oplus\\;\\rightarrow [\\; G_{c}(s) \\;]\\;\\rightarrow Y(s)
            \\\\\\\\
            \\;\\;\\;\\;\\; \\uparrow^{-} \\qquad \\qquad \\qquad \\quad \\downarrow
            \\\\\\\\
            \\quad\\;\\; \\leftarrow [\\;H(s)\\;]\\; \\leftarrow
            \\end{matrix}`
    },
];

theory.primaryEquationHeight = 120;
theory.secondaryEquationHeight = 80;
var getPrimaryEquation = () => equations[stage]['value'];
var calcSecEq = () => {
    let total = '';
    let vals = {};
    Object.keys(upgrades).forEach((k, i) => {
        let v = upgrades[k].value;
        vals[v] = 0;
    });
    Object.keys(upgrades).forEach((k, i) => {
        let v = upgrades[k].value;
        vals[v] += 1;
    });
    Object.keys(vals).forEach((v) => {
        let b = vals[v];
        if (v == 0) {
            total += 's';
        } else if (v > 0) {
            total += `(s+${v.toString(10)})`;
        } else {
            total += `(s-${v.toString(10)})`;
        }
        if (b > 1) {
            total += `^{${b}}`;
        }
    });
    if (total == '') total = '1';
    else total = `\\frac{{1}}{${total}}`;
    return `
        \\begin{matrix}
            G_{c}(s) = ${total}
            \\\\\\\\\\\\\\\\
        \\end{matrix}
    `;
}
var getSecondaryEquation = () => {
    return calcSecEq();
};

getTertiaryEquation = () => {
    return terteq;
};

var getQuaternaryEntries = () => [
    new QuaternaryEntry("t", `${t}s`),
    new QuaternaryEntry(`d\\dot{${currency.symbol}}`, laplace[0].delta ? value : value / (global_dt || 1)),
];

var getPublicationMultiplier = (tau) => 1;
var getPublicationMultiplierFormula = (symbol) => `log(${symbol})`;
var getTau = () => 0;
var get2DGraphValue = () => {
    return currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();
};

var postPublish = () => {
}

var getc = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);

let transferFunctionClosed = false;
let tfButton = ui.createButton({
    text: !transferFunctionClosed ? "Open-Loop Transfer Function" : "Closed-Loop Transfer Function",
    onClicked: () => {
        log('changed transfer function');
        transferFunctionClosed = !transferFunctionClosed;
        tfButton.text = !transferFunctionClosed ? "Closed-Loop Transfer Function" : "Open-Loop Transfer Function";
        updateAvailability();
    },
    row: 0,
    column: 0,
    isVisible: () => true,
    horizontalOptions: LayoutOptions.START,
});


var canGoToPreviousStage = () => stage == 1;
var canGoToNextStage = () => stage == 0;
var goToPreviousStage = () => stage = Math.max(stage-1, 0);
var goToNextStage = () => stage = Math.min(stage+1, 1);


// partial fraction decomposition & polynomial laplace solution
// if you see this, don't ask why i don't name variables better
var solver = () => {
    const copy = (ob) => JSON.parse(JSON.stringify(ob));
    const gcd = (a, b) => !b ? a : gcd(b, a%b);
    const char = (n) => {let str = '', q, r; while (n > 0) {q = (n-1)/26; r = (n-1)%26; n = Math.floor(q); str = String.fromCharCode(65 + r) + str}; return str};
    function gcd(a, b) {
        if (!b) return a;
        return gcd(b, a % b);
    }
    let factors = (s, ok= false) => {
        let result = [];
        if (ok) print (s)
        for (let [k, v] of Object.entries(s)) {
            for (let i = 0; i < v; i++) {
                result.push(k);
            }
        }
        return result;
    };
    function polynomial(facs) {
        let poly = [1];
        maxf = Math.max(maxf, facs.length + 1);
        for (let [i, fac] of facs.entries()) {
            let old_poly = [0, ...poly];
            poly.push(0);
            poly = poly.map((val, idx) => val + old_poly[idx] * fac);
        }
        return poly;
    }
    let T = (A) => {
        return A[0].map((_, c) => A.map(row => row[c]));
    };
    let seq = (l, e) => {
        return l.length > 0 ? l.map((s) => s === 0 ? '(s)' : (s != 0 ? (l.length == 1 && [1, ''].includes(e) ? `s+${s}` : `(s+${s})`) : 's')).join('') : '1';
    };
    let seq2 = (l, e) => {
        let len = l.length;
        return `{${len > 0 ? l.map((s) => s === 0 ? '(s)' : (s != 0 ? (l.length == 1 && [1, ''].includes(e) ? `s+${s}` : `(s+${s})`) : 's'))[0] : '1'}}${len > 1 ? `^{${len}}` : ''}`;
    }
    
    // initialize objects containing zeros and poles
    // setup data structures
    let s = {};
    let slist = [];
    let re_s = {};

    Object.keys(upgrades).forEach((k) => {
        let v = new String(upgrades[k].value);
        slist.push(v);
        s[v] = 0;
        re_s[v] = 0;
    });
    Object.keys(upgrades).forEach((k, i) => {
        let v = new String(upgrades[k].value);
        s[v] += 1;
        re_s[v] += 1;
    });
    // print (s);
    // slist = Object.keys(s).reverse();
    
    let r = {};
    for (const k of Object.keys(s)) {
        r[k] = 0;
    }
    
    let og_sols = {1: 0, };
    let re_sols = copy(og_sols);
    
    for (let f of Object.keys(og_sols)) {
        if (f in s) {
            let x = og_sols[f];
            s[f] -= x;
            og_sols[f] -= x;
        }
        if (f in s && s[f] === 0) {
            delete s[f];
        }
    }
    
    // remove repeated solutions from numerator for analyzing
    // prepare data structure
    let equation = {};
    for (let h = 0; h < Object.values(s).reduce((a, b) => a + b, 0); h++) {
        equation[char(h + 1)] = [copy(s), copy(r)];
    }
    
    // do the actual removal
    let i = 0;
    let last_v = Infinity;
    const facts = factors(s);
    Object.keys(equation).forEach((f, j) => {
        const v = facts[j];
        i = last_v != v ? 0 : i + 1;
        last_v = v;
        equation[f][0][v] -= i + 1;
        equation[f][1][v] += i + 1;
    });
    // print (equation);

    // if anything starts to fail, uncomment this 
    // Object.keys(equation).forEach((f, _i) => {
    //     delete equation[f][0][undefined]
    //     delete equation[f][1][undefined]
    // });

    // actual algorithm
    // initial variables
    let maxf = 0;
    let A = [];

    // calculate denominator polynomial for each fraction    
    let sols = polynomial(factors(og_sols));

    // convert denominator polynomials into matrix
    for (let eq of Object.keys(equation)) {
        let poly = polynomial(factors(equation[eq][0]));
        A.push(poly);
    }
    // print('')
    // print(A)
    A.push(sols);
    // print('start')
    for (let i = 0; i < A.length; i++) {
        A[i] = Array(maxf - A[i].length).fill(0).concat(A[i]);
        // print(A[i]);
    }
    // print('end')
    // print(A)
    // print('')
    
    // transpose matrix for solving using Gauss-Jordan elimination
    A = T(A);
    // print(A)
    
    // gaussian elimination
    for (let j = 0; j < A.length; j++) {
        let index = A[j][j];
        // if (index == 0) return '\\text{No Solution}';
        let row = A[j].map(x => x / (index || 1));
        A[j] = row;
        for (let i = j + 1; i < A.length; i++) {
            let prow = row.map(x => x * A[i][j]);
            let rrow = A[i].map((value, k) => value - prow[k]);
            A[i] = rrow;
        }
    }
    
    // print(A)
    
    // find the gcd type stuff (surprise tool that can help us later)
    let n = A.length - 1;
    let reducer = A[n][n];
    if (reducer == 0) return '\\text{No Solution}';
    A[n] = A[n].map(x => x / reducer);
    let m = A[0].length - 1;
    let redux = 1 / A[n][m];

    // print(redux)

    // reduce row echelon
    // CANNOT READ PROPERTY '0' OF UNDEFINED tied to n amount of 0's with that A.length - n 
    // for (let j = A.length - (slist.length || 2); j >= 0; j--) {      // MAY OR MAY NOT WORK IDEK AT THIS POINT LOL
    for (let j = A.length - 2; j >= 0; j--) {
        const g = A[j].slice(j + 1, -1);
        for (let i = 0; i < g.length; i++) {
            const _g = g[i];
            A[j] = A[j].map((x, index) => {
                return x - A[j + i + 1][index] * _g;
            });
        }
        // A[j] = A[j];
    }
    // print (A);
    // A.forEach(a => print(a));
    // print('')

    // behold, the solution vector
    sols = T(A)[T(A).length - 1];
    // print ([...sols.map((v) => Math.abs(v))])
    let resize = Math.round(1/(Math.min(...sols.map((v) => Math.abs(v))) || 1));
    A.forEach((a) => {
        a[A.length - 1] *= resize;
    });
    sols = sols.map((v) => resize * v);
    // print (resize)
    

    // return the string in the S plane and the inverse-laplace functions in the time domain
    let teq = `G_c(s)=`;
    let meq = 'g_{c}(t)=';
    i = 0;
    // let zip = Object.keys(equation).map((k, i) => [k, sols[i]]);
    let eqkeys = Object.keys(equation);
    let zip = sols.map((s, j) => [eqkeys[j], s]);
    // zip.forEach((p) => {
    //     print (p);
    // });
    // return ''
    if (Object.entries(equation).length == 0) {
        laplace = [new iLap(null, 0, 0, '')];
        return `
        \\begin{matrix}
        ${teq}1
        \\\\\\\\
        ${meq}${laplace[0].show()}
        \\\\\\\\
        \\end{matrix}
        `;
    }
    // print (zip)
    laplace = [];
    zip.forEach((p) => {
        let k = p[0];
        let v = p[1];
        if (v === 0) return;
        
        let w = Math.round(Math.abs(v * redux));
        let e = Math.round(Math.abs(redux));
        if (w >= e) [w, e] = [e, w];
        // print ([resize])
        let div = gcd(w, e);
        
        if (div !== 1) {
            w /= div;
            e /= div;
        }
        if (w === e) {
            w = 1;
            e = '';
        }
        // equation = {'A': [{'0':-1}, {'0': 1}]}
        // let pol = seq2(factors(equation[k][1], true), e);
        let pol = seq2(factors(equation[k][1]), e);
        // print (pol);
        if (w === 0) return;
        let sign = '';
        if (i === 0) {
            if (v < 0) {
                teq += ' - ';
                sign = '-';
            }
            i += 1;
        } else {
            if (v >= 0) {
                teq += ' + ';
                sign = '+';
            } else {
                teq += ' - ';
                sign = '-';
            }
        }
        let m = new iLap(copy(equation[k][1]), w, e, sign);
        laplace.push(m);

        if (e == '1') {
            e = '';
        }
        teq += `\\frac{{${w}}}{${e}${pol}}`;
        meq += m.show();
    });
    // {}_
    return `
        \\begin{matrix}
            ${teq}
            \\\\\\\\
            ${meq}
            \\\\\\\\
        \\end{matrix}
    `;
}

let facmemoized = [1, 1];
var factorial = (a) => {
    if (a < facmemoized.length) {
        return facmemoized[a];
    } else {
        let newest = a * factorial(a - 1);
        facmemoized[a] = newest;
        return newest;
    }
};

class iLap {
    constructor(solution, numerator, denominator, sign) {
        this.delta = solution == null;
        if (this.delta) return;
        this.sol = solution;
        Object.keys(this.sol).forEach((k) => {
            if (this.sol[k] == 0) delete this.sol[k];
            else this.k = k;
        });
        this.num = numerator;
        let fac = factorial(this.sol[this.k] - 1);
        if (fac > 1) {
            if (denominator == '') {
                this.den = fac;
            } else {
                this.den = denominator * fac;
            }
        } else {
            this.den = denominator;
        }
        this.sign = sign;
    }

    show() {
        if (!this.delta) {
            let frac = this.num == '1' && this.den == '' ? '' : `\\frac{{${this.num}}}{${this.den || 1}}`;
            if (this.den == '1') frac = this.num;
            if (this.den == '1' && this.num == '1') frac = '';
            let expsign = this.k >= 0 ? '-' : '';
            let exp = this.k != 0 ? `${expsign}${this.k}` : '';
            if (exp == '-1') exp = '-';
            let exponent = this.k != 0 ? `e^{${exp}t}` : '';
            let t;
            if (this.sol[this.k] - 1 == 0) {
                if (exponent == '' && frac == '') {
                    t = '1';
                } else {
                    t = '';
                }
            } else {
                let n = this.sol[this.k] - 1;
                n = n > 1 ? n : '';
                t = this.sol[this.k] > 0 ? `t^{${n}}` : ''; 
            }
            return `${this.sign}${frac}${exponent}${t}`;
        } else {
            return `\\delta(t)`;
        }
    }

    evaluate(time, dt=0) {
        if (!this.delta) {
            let frac = this.num == '1' && this.den == '' ? '' : `\\frac{{${this.num}}}{${this.den || 1}}`;
            if (this.den == '1') frac = this.num;
            if (this.den == '1' && this.num == '1') frac = '';
            if (frac == '') frac = 1;
            let totalValue = frac;
            
            let exp = 1 * this.k;
            totalValue *= Math.pow(2.71828182845, exp);
            
            let n = this.sol[this.k] - 1;
            totalValue *= Math.pow(time, n);
            
            return totalValue;
        } else {
            if ([BigNumber.ZERO].includes(BigNumber.from(time))) {
                return Infinity;
            } else {
                return 0;
            }
        }
    }
}

init();