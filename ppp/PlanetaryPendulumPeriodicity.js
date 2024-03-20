import { CustomCost, ExponentialCost, LinearCost } from "../../api/Costs";
import { Localization } from "../../api/Localization";
import { BigNumber } from "../../api/BigNumber";
import { theory } from "../../api/Theory";
import { Utils, log } from "../../api/Utils";

var id = "Planetary Pendulum Periodicity";
var name = "Planetary Pendulum Periodicity";
var description = "This theory explores the changing of the frequency of a pendulum upon increasing the gravity it is subjected to by throwing lots of mass together.";
var authors = "Warzen User";
var version = '0.3.0';

var currency, currency2;
var c1, L;
let unlockedAchievements = {
    'SO': false,
    'mu': false,
};
let stage = 1;
let p1;
let muUpg;
var c1Exp;
var lastc1lvl;
let planet, constG;
let r = 'r_{\\odot}';
let M = 'M_{\\odot}';
let G = 'G';

var achievement1, achievement2, achievement3, achievement4;
let tutorial, chapter1, chapter2, chapter3, chapter4, chapter5, chapter6, chapter7;

const constants = [
    {
        name: 'Asteroid XI',
        mass: 1.53 * Math.pow(10, 1),
        density: 10,
    },
    {
        name: 'Oumuamua',
        mass: 4 * Math.pow(10, 4),
        density: 4200,
    },
    {
        name: 'Moon',
        mass: 3.3 * Math.pow(10, 10),
        density: 5429,
    },
    {
        name: 'Earth',
        mass: 5.972 * Math.pow(10, 24),
        density: 5515,
    },
    {
        name: 'Uranus',
        mass: 8.681 * Math.pow(10, 25),
        density: 1318,
    },
    {
        name: 'Neptune',
        mass: 10.243 * Math.pow(10, 25),
        density: 1638,
    },
    {
        name: 'Saturn',
        mass: 56.846 * Math.pow(10, 25),
        density: 687,
    },
    {
        name: 'Jupiter',
        mass: 18.986 * Math.pow(10, 26),
        density: 1326,
    },
];

// https://www.angstromsciences.com/density-elements-chart
const materials = (lvl, type) => {
    // returns gram/Liter which is equivalent to kilogram/meter^3
    const all = [
        {'name': '\\text{hydrogen}', 'value': .0899, 'form': 'H'},
        {'name': '\\text{helium}', 'value': .1785, 'form': 'He'},
        {'name': '\\text{lithium}', 'value': .534, 'form': 'Li'},
        {'name': '\\text{beryllium}', 'value': 1.848, 'form': 'Be'},
        {'name': '\\text{boron}', 'value': 2.34, 'form': 'B'},
        {'name': '\\text{carbon}', 'value': 2.26, 'form': 'C'},
        {'name': '\\text{nitrogen}', 'value': 1.2506, 'form': 'N'},
        {'name': '\\text{oxygen}', 'value': 1.429, 'form': 'O'},
    ].sort((a, b) => a.value - b.value);
    const totalAtoms = all.length;
    if (lvl >= totalAtoms) {
        return {
            'name': `\\text{bigatom_{${lvl - totalAtoms + 1}}}`,
            'value': all[totalAtoms - 1]['value'] * Math.pow(lvl/2, 1.01),
            'form': `\\beta_{${lvl - totalAtoms + 1}}`,
        }[type];
    }
    return all[lvl || 0][type];
};
const customC1costFn = (level, s=12) => Utils.getStepwisePowerSum(level, Math.max(1.0005, Math.log(level / BigNumber.PI)/Math.log(1.3)), s, 0);
var init = () => {
    currency = theory.createCurrency(symbol = 'µ', latexSymbol='\\mu');
    currency2 = theory.createCurrency(symbol = 'ν', latexSymbol='\\nu');

    ///////////////////
    // Regular Upgrades
    
    // c1
    {
        let getDesc = (level) => "c_1 = " + getC1(level).toString(6) + '\\, kg';
        c1 = theory.createUpgrade(0, currency2, new FirstFreeCost(new CustomCost(customC1costFn)));
        c1.maxLevel = 25000;
        c1.getDescription = (_) => Utils.getMath(getDesc(c1.level));
        c1.getInfo = (amount) => Utils.getMathTo(getDesc(c1.level), getDesc(c1.level + amount));
        lastc1lvl = c1.level;
    }
    
    // L
    {
        let getDesc = (level) => "L = " + getL(level).toString(0) + '\\, m';
        L = theory.createUpgrade(1, currency, new ExponentialCost(1, 1e1));
        L.getDescription = (_) => Utils.getMath(getDesc(L.level));
        L.getInfo = (amount) => Utils.getMathTo(getDesc(L.level), getDesc(L.level + amount));
    }
    
    // density
    {
        p1 = theory.createUpgrade(2, currency, new ExponentialCost(10, 6.125));
        let getDesc = (level) => `${getMaterialName(level)}=` + getP1(p1.level).toString(4) + '\\, \\frac{{kg}}{m^3}';
        let getInfo = (level) => `${getMaterialName(level, false)}=` + getP1(level).toString(4) + '\\, \\frac{{kg}}{m^3}';
        p1.getDescription = (_) => Utils.getMath(getDesc(p1.level));
        p1.getInfo = (amount) => Utils.getMathTo(getInfo(p1.level), getInfo(p1.level + amount));
    }
    
    // cheating
    {
        c2 = theory.createUpgrade(3, currency, new ExponentialCost(8, 1.125));
        let getDesc = (level) => `+ \\mu \\%  = ${(100 * getC2(level)).toFixed(6)}`;
        let getInfo = (level) => `+ \\mu \\%  = ${(100 * getC2(level)).toFixed(6)}`;
        c2.getDescription = (_) => Utils.getMath(getDesc(c2.level));
        c2.getInfo = (amount) => Utils.getMathTo(getInfo(c2.level), getInfo(c2.level + amount));
        c2.isAvailable = L.level > 7;
    }

    /////////////////////
    // Permanent Upgrades
    theory.createPublicationUpgrade(0, currency2, 1e25);
    theory.createBuyAllUpgrade(1, currency, 1e7);
    theory.createAutoBuyerUpgrade(2, currency2, 1e30);

    ///////////////////////
    //// Milestone Upgrades
    theory.setMilestoneCost(new LinearCost(2, 4));

    {
        c1Exp = theory.createMilestoneUpgrade(0, 4);
        c1Exp.description = Localization.getUpgradeIncCustomExpDesc("c_1", "0.025");
        c1Exp.info = Localization.getUpgradeIncCustomExpInfo("c_1", "0.025");
        c1Exp.boughtOrRefunded = (_) => {
            theory.invalidatePrimaryEquation();
            updateAvailability();
        };
    }

    //dtExp
    {
        dtExp = theory.createMilestoneUpgrade(1, 5);
        dtExp.description = Localization.getUpgradeIncCustomExpDesc(`bonus publish mult for ${currency2.symbol} `, '1');
        dtExp.info = Localization.getUpgradeIncCustomExpInfo(`bonus publish mult for ${currency2.symbol} `, '1');
    }

    {
        muUpg = theory.createMilestoneUpgrade(2, 3);
        muUpg.description = `Make \\mu\\,\\, more efficient`;
        muUpg.info = Localization.getUpgradeIncCustomExpInfo('L', '0.5') + ' in \\mu';
        muUpg.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
    }

    {
        SO = theory.createMilestoneUpgrade(3, constants.length - 1);
        planet = constants[SO.level];
        SO.description = `Changes to a new celestial body.\\qquad \\qquad \\qquad \\qquad Current: ${constants[SO.level].name}`;
        SO.info = `The starting mass and volume are greatly increased to your advantage. WARNING: BUYING OR REFUNDING RESETS PROGRESS!`;
        SO.boughtOrRefunded = (_) => {
            postPublish();
            theory.invalidatePrimaryEquation();
            theory.invalidateSecondaryEquation();
            theory.invalidateTertiaryEquation();
        };
        constG = 6.6743 * Math.pow(10, -11);
    }
    
    /////////////////
    //// Achievements
    achievement1 = theory.createAchievement(0, "Like a swing", "Start the clock", () => c1.level > 1);
    achievement2 = theory.createSecretAchievement(1, "Time Dilation", "Going back and forth takes longer", "Make your pendulum taller?", () => L.level > 1);
    achievement3 = theory.createAchievement(2, "Early days", "Explore other celestial bodies", () => SO.level > 1);
    const PhoenixA = 40.59769;
    achievement4 = theory.createSecretAchievement(3, "When Newton Cried", "Break physics with a massive object", "Phoenix A", () => typeof mass == BigNumber ? mass.log10() >= PhoenixA : typeof mass == Number ? Math.log10(mass) >= PhoenixA : false);

    ///////////////////
    //// Tutorial
    tutorial = theory.createStoryChapter(0, "Tutorial",
        `Your goal is to get as much µ as possible.\nWhich is obtained by getting the frequency ƒ and length L of the pendulum to larger values.\n\n\nThe formulae can be found in the first panel in order from top to bottom, left to right (currencies aside). In the second panel are the given values for the variables at any given moment t in their respective order.\n\n\nThe values that you as the player can modify are amount of mass gained, length of pendulum, density (or element) of added volume, cheaty percentile of extra currency, and (SPOILER) starting point celestial object (via publishing), etc.\n\n\nNote that this theory is very slow and you will likely not see much progress often.`,
        () => true);
    //// Story chapters
    chapter1 = theory.createStoryChapter(1, "Do not go gentle into that good night", 
        `You begin working on a different branch of science.\nExciting as it may sound, this is no easy task.\n\nYou were always passionate on the complexities of space and physics. And have finally found an excuse to study large objects yourself.\nYou begin collecting mass, small quantities of Hydrogen atoms...\nwith highly precise instruments you begin to notice, that they produce an effect of some sort on your recently bought pendulum at the end of your desk.`,
        () => c1.level > 0);
    chapter2 = theory.createStoryChapter(2, "Take flight", 
    `The amount of mass you have gathered has begun to get in the way.\nIn fact, you can't keep it inside your office anymore,...\n\nYou need some,\nspace`,
    () => c1.level > 20);
    chapter3 = theory.createStoryChapter(3, 'Reminiscing ("That felt like forever")', 
        `What is that?\nIt's some sort of thing that is being...\n produced.\n\nYou can't quite name it, so you slap a label on it: ${currency.symbol}`,
        () => L.level > 0);
    chapter4 = theory.createStoryChapter(4, 'Where did you find that?', 
        `While it was understandable at first, to all of your students.\nNobody knows how you've acquired a pendulum of that length.`,
        () => L.level > 5);
    chapter5 = theory.createStoryChapter(5, 'Battling giants', 
        `You've gathered enough knowledge and a deep understanding of this project.\nYou decide to embark on a new trial to reach new heights.\n\nYou approach ${constants[SO.level + 1].name}.`,
        () => SO.level > 0);
    chapter6 = theory.createStoryChapter(6, 'Theory will only take you so far', 
        `You keep pushing, there's no stopping you now.\nBut alas, technology has not advanced enough to take you outside confines of the solar system\n\n\n ...yet.`,
        () => SO.level > constants.length);
    chapter7 = theory.createStoryChapter(7, 'Quantum debris', 
        `Due to the unforeseen nature of the experiment,\na feedback loop in the quantum realm is generating µ out of thin air, but to a tiny extent.\nYou manage to salvage a fraction of it.`,
        () =>  L.level > 7);

    updateAvailability();
}

var updateAvailability = () => {
    muUpg.isAvailable = c1Exp.level > 1 || unlockedAchievements['mu'];
    SO.isAvailable = L.level > 5 || unlockedAchievements['SO'];
}

var tick = (elapsedTime, multiplier) => {    
    SO.description = `Changes to a new celestial body.\\qquad \\qquad \\qquad \\qquad Current: ${constants[SO.level].name}`;
    if (L.level > 5) {
        unlockedAchievements['SO'] = true;
    } else if (c1Exp.level > 1) {
        unlockedAchievements['mu'] = true;
    }
    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
    if (getC1(c1.level) == 0) return;
    
    let dt = BigNumber.from(elapsedTime * multiplier);
    let bonus = theory.publicationMultiplier;
    let c = getC1(c1.level).pow(1 + c1Exp.level * .025);
    mass += BigNumber.from(dt * c);
    V = c / getP1(p1.level);
    vol += dt * V;
    if (lastc1lvl < c1.level) {
        lastc1lvl = c1.level;
        let val = currency2.value - (vol / V);
        currency2.value = BigNumber.ZERO < val ? val : BigNumber.ZERO;
    }
    currency2.value += dt * vol * bonus.pow(dtExp.level + 1);
    radius = R(vol);
    gravity = Grav(mass, radius);
    if (gravity == 0) return;
    T = Peri(gravity);
    if (T == 0) return;
    
    f = Frec(gravity);
    currency.value += dt * BigNumber.from(f * Math.pow(getL(L.level), 2 + muUpg.level / 2)) + (currency.value * getC2(c2.level) * (c2.isAvailable)) * bonus;
}

theory.primaryEquationHeight = 180;

var getPrimaryEquation = () => {
    if (stage == 0) {
        return `
            \\begin{matrix}
            f = \\frac{{1}}{T} \\;, \\quad T = 2\\pi \\sqrt{\\frac{{L}}{g}} \\;, \\quad g = ${G}\\frac{{${M}}}{${r}^2}
            \\\\\\\\
            \\\\\\\\
            {${r}} = \\frac{{3V}}{4\\pi}\\; ^ {\\frac{{1}}{3}} \\;, \\quad V = V_0 + \\sum_{n=${getMaterialForm(0)}}^{${getMaterialForm(p1.level)}} V_{n} \\;, \\quad \\dot{${M}} = c_1 \\, ^{${c1Exp.level > 0 ? 1 + c1Exp.level*.025 : ''}}
            \\\\\\\\
            \\\\\\\\
            ${G} = 6.67430e-11 \\frac{{m^3}}{kg \\cdot s^{2}}
            \\end{matrix}
        `;
    } else if (stage == 1) {
        return Localization.format(`
            \\begin{matrix}
            {f} = ${Frec(gravity, 'string')}Hz \\;, \\quad T = ${Peri(gravity, 'string')}\\,s \\;, \\quad g = ${Grav(mass, radius, 'string')}\\,\\frac{{m}}{s^2}
            \\\\\\\\
            \\\\\\\\
            ${r} = ${radius}\\,m \\;, \\quad ${M} = ${mass}\\,kg
            \\\\\\\\
            \\\\\\\\
            V = ${vol} \\,\\frac{{kg}}{m^{3}} \\;, \\quad \\dot{V}_{${getMaterialForm(p1.level)}} = \\frac{{c_1 \\, ^{${c1Exp.level > 0 ? 1 + c1Exp.level*.025 : ''}}}}{${getMaterialName(p1.level,false)}} = ${V}\\, m^{3}
            \\end{matrix}
        `);
    } else return '';
}

var getTertiaryEquation = () => {
    return Localization.format(`
        \\begin{matrix}
        ${theory.latexSymbol} = \\max(${currency.symbol}) \\;, \\quad ${currency.symbol} = L^{${2 + muUpg.level / 2}} \\cdot \\int_{0}^{t} f \\cdot dt \\;, \\quad ${currency2.symbol} = \\int_{0}^{t} V \\cdot dt
        \\end{matrix}
    `);
}

var postPublish = () => {
    planet = constants[SO.level];
    mass = BigNumber.from(planet.mass);
    V = BigNumber.from(mass / planet.density);
    vol = V;
    radius = R(V);
    gravity = Grav(mass, radius);
    T = Peri(gravity);
    f = Frec(gravity);
    currency.value = 0;
    currency2.value = 0;    
    c1.level = 0;
    L.level = 0;
    p1.level = 0;
    c2.level = 0;
}

var getInternalState = () => `${mass} ${gravity} ${T} ${V} ${vol} ${radius} ${f}^${JSON.stringify(unlockedAchievements)}`;

var setInternalState = (stateString) => {
    let values = stateString.split('^');
    let variables = values[0].split(' ');
    let other = values[1];
    [mass, gravity, T, V, vol, radius, f] = variables.map(val => BigNumber.from(val));
    unlockedAchievements = JSON.parse(other) ?? {
        'SO': false,
        'mu': false,
    };
}

var taupow = .068;
var getPublicationMultiplier = (tau) => tau.pow(taupow);
var getPublicationMultiplierFormula = (symbol) => `${symbol}^{${taupow}}`;
var getTau = () => currency.value;
var get2DGraphValue = () => {
    return currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();
}
var getMaterialName = (level, unit = false) => `\\rho_{${materials(level, 'name')}}` + (unit ? '\\;\\frac{{kg}}{m^3}': '');
var getMaterialValue = (level) => materials(level, 'value');
var getMaterialForm = (level) => materials(level, 'form');

var getL = (level) => BigNumber.from(level + 1);
var getC1 = (level) => BigNumber.from(level) * customC1costFn(
    level, s=15
) / 10000;
var getP1 = (level) => BigNumber.from(getMaterialValue(level));
var getC2 = (level) => level / 800_000;
var getLExponent = (level) => BigNumber.from(1 + 0.05 * level);
var getC1Exponent = (level) => BigNumber.from(1 + 0.05 * level);
var getDtExp = (level) => BigNumber.ONE + level;
var getP1Exponent = (level) => BigNumber.from(1 + 0.05 * level);

var canGoToPreviousStage = () => stage == 1;
var canGoToNextStage = () => stage == 0;
var goToPreviousStage = () => stage = Math.max(stage-1, 0);
var goToNextStage = () => stage = Math.min(stage+1, 1);

init();

const expMantissa = (val) => {
    const exp = Math.log10(val);
    const expClean = Math.floor(exp);
    const mantissa = Math.pow(10, exp - expClean);
    return { mts: mantissa, exp: expClean };
}

const R = (v) => (v/((BigNumber.FOUR/BigNumber.THREE) * BigNumber.PI)).pow(BigNumber.ONE/BigNumber.THREE);
const Grav = (mass, rad, type='number') => {
    if (rad == 0) return type == 'number' ? 0 : '0.00';
    try {
        const { mts: radmts, exp: radexp } = expMantissa(rad);
        const { mts: massmts, exp: massexp } = expMantissa(mass);
        const { mts: Gmts, exp: Gexp } = expMantissa(constG);
        const operation = Gmts * massmts / (radmts * radmts);
        const { mts: opmts, exp: opexp } = expMantissa(operation);
        const expo = (Gexp + massexp - (2 * radexp)) + opexp;
        if (type == 'number') {
            if (-2 < expo && expo < 2) return opmts.toFixed(2);
            return opmts * Math.pow(10, expo);
        } else if (type == 'string') {
            if (-2 < expo && expo < 2) return opmts.toFixed(2);
            return `${opmts.toFixed(2)}e${expo.toFixed(0)}`;
        };
    } catch {
        return BigNumber.from(constG * BigNumber.from(mass / BigNumber.from(rad * rad)));
    }
};
const Peri = (gravity, type='number') => {
    if (gravity == 0) return type == 'number' ? 0 : '0.00';
    try {
        const { mts: constantsmts, exp: constantsexp } = expMantissa(2 * Math.PI);
        const { mts: Lmts, exp: Lexp } = expMantissa(Math.pow(getL(L.level), .5));
        const { mts: gravitymts, exp: gravityexp } = expMantissa(Math.pow(gravity, .5));
        const operation = constantsmts * Lmts / gravitymts;
        const { mts: opmts, exp: opexp } = expMantissa(operation);
        const expo = (constantsexp + (Lexp - gravityexp)) + opexp;
        if (type == 'number') {
            if (-2 < expo && expo < 2) return opmts.toFixed(2);
            return opmts * Math.pow(10, expo);
        } else if (type == 'string') {
            if (-2 < expo && expo < 2) return opmts.toFixed(2);
            return `${opmts.toFixed(2)}e${expo.toFixed(0)}`;
        };
    } catch {
        return BigNumber.TWO * BigNumber.PI * Math.pow(getL(L.level) / gravity, .5);
    }
}
const Frec = (gravity, type='number') => {
    if (!(gravity > Number.MIN_VALUE)) return type == 'number' ? 0 : '0.00';
    try {
        const { mts: constantsmts, exp: constantsexp } = expMantissa(2 * Math.PI);
        const { mts: Lmts, exp: Lexp } = expMantissa(Math.pow(getL(L.level), .5));
        const { mts: gravitymts, exp: gravityexp } = expMantissa(Math.pow(gravity, .5));
        const operation = gravitymts / (constantsmts * Lmts);
        const { mts: opmts, exp: opexp } = expMantissa(operation);
        const expo = (gravityexp - (Lexp + constantsexp)) + opexp;
        if (type == 'number') {
            if (-2 < expo && expo < 2) return opmts.toFixed(2);
            return opmts * Math.pow(10, expo);
        } else if (type == 'string') {
            if (-2 < expo && expo < 2) return opmts.toFixed(2);
            return `${opmts.toFixed(2)}e${expo.toFixed(0)}`;
        };
    } catch {
        return BigNumber.from((Math.pow(gravity, .5) / (BigNumber.TWO * BigNumber.PI * Math.pow(getL(L.level), .5))));
    }
}
let mass = BigNumber.from(planet.mass);
let V = BigNumber.from(mass / planet.density);
let vol = V;
let radius = R(V);
let gravity = Grav(mass, radius);
let T = Peri(gravity);
let f = Frec(gravity);
