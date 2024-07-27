import { CustomCost, ExponentialCost, FirstFreeCost, FreeCost, LinearCost } from "../../api/Costs";
import { Localization } from "../../api/Localization";
import { BigNumber } from "../../api/BigNumber";
import { theory } from "../../api/Theory";
import { Utils, log } from "../../api/Utils";

var id = "Planetary Pendulum Periodicity";
var name = "Planetary Pendulum Periodicity";
var description = "This theory explores the changing of the frequency of a pendulum upon increasing the gravity it is subjected to by throwing lots of mass together. Furthermore, it explores the relationship between an ever-increasing mass, and one of the most physics-breaking objects, black holes.";
var authors = "Warzen User";
var version = '0.4.1';

var currency, currency2, currency3;
var c1, L, w;
let unlockedAchievements = {
    'SO': false,
    'mu': false,
    'blackHoles': false,
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
let grav = '';
let ghostB = n = 0, k = 0;
let radiiCompared = false;
let permup3, permup4, permup5, rebirth;
let Z = 0;

var achievement1, achievement2, achievement3, achievement4, achievement5, achievement6;
let tutorial, chapter1, chapter2, chapter3, chapter4, chapter5, chapter6, chapter7;

////// custom cost
class LimitlessCustomCost {
    cost(level) {
        return customC1costFn(level);
    }
    cumulative_cost(level, amount) {
        let result = BigNumber.ZERO
        for (let i = 0; i < amount; i++) result += this.cost(level + i)
        return result
    }
    max(level, currency) {
        let cumulative = BigNumber.ZERO
        let current_level = level
        while (cumulative < currency) {
            cumulative += this.cost(current_level)
            current_level++
        }
        return Math.round(current_level - level - 1)
    }
    get functions() {
        return [
            level => this.cost(level),
            (level, amount) => this.cumulative_cost(level, amount),
            (level, currency) => this.max(level, currency)
        ]
    }
    get cost_model() {
        return new CustomCost(...this.functions)
    }
}
////

const constants = [
    {
        name: 'Asteroid XI',
        mass: 0,
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
const c = 299_792_458; // m/s
const c1expval = .035;
const c1MaxLvl = 3;
const dtexpval = .6;
const dtMaxLvl = 3;
const muupgval = .8;
const muupgMaxLvl = 2;
const SOMaxLvl = constants.length - 1;

// https://www.angstromsciences.com/density-elements-chart
const materials = (lvl, type) => {
    lvl--;
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
        {'name': '\\text{fluoride}', 'value': 1.696, 'form': 'F'},
        {'name': '\\text{neon}', 'value': .9, 'form': 'Ne'},
        {'name': '\\text{sodium}', 'value': .971, 'form': 'Na'},
        {'name': '\\text{magnesium}', 'value': 1.738, 'form': 'Mg'},
        {'name': '\\text{aluminum}', 'value': 2.702, 'form': 'Al'},
        {'name': '\\text{silicon}', 'value': 2.33, 'form': 'Si'},
        {'name': '\\text{phosphor}', 'value': 1.82, 'form': 'P'},
        {'name': '\\text{sulfur}', 'value': 2.07, 'form': 'S'},
        {'name': '\\text{chloride}', 'value': 3.214, 'form': 'Cl'},
        {'name': '\\text{argon}', 'value': 1.7824, 'form': 'Ar'},
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
const customC1costFn = (level, s=15) => Utils.getStepwisePowerSum(level, 1.5 + Math.pow(level, 1/(Math.log(1/(level+1))+level+1)), s, 0);
var init = () => {
    currency = theory.createCurrency(symbol = 'µ', latexSymbol='\\mu');
    currency2 = theory.createCurrency(symbol = 'ν', latexSymbol='\\nu');
    currency3 = theory.createCurrency(symbol = 'β', latexSymbol='\\beta');
    currency3.isAvailable = false;

    ///////////////////
    // Regular Upgrades
    
    // c1
    {
        let newcustomcostlol = new LimitlessCustomCost();
        let getDesc = (level) => "c_1 = " + getC1(level).toString(4) + '\\, kg';
        c1 = theory.createUpgrade(0, currency2, newcustomcostlol.cost_model);
        c1.getDescription = (_) => Utils.getMath(getDesc(c1.level));
        c1.getInfo = (amount) => Utils.getMathTo(getDesc(c1.level), getDesc(c1.level + amount));
        lastc1lvl = c1.level;
    }
    
    // L
    {
        let getDesc = (level) => "L = " + getL(level).toString(0) + '\\, m';
        L = theory.createUpgrade(1, currency, new ExponentialCost(1, Math.pow(10, .8)));
        L.getDescription = (_) => Utils.getMath(getDesc(L.level));
        L.getInfo = (amount) => Utils.getMathTo(getDesc(L.level), getDesc(L.level + amount));
    }
    
    // density
    {
        p1 = theory.createUpgrade(2, currency, new ExponentialCost(10/(Math.pow(2, 6.125)), 6.125));
        let getDesc = (level) => `${getMaterialName(level)}=` + getP1(p1.level).toString(4) + '\\, \\frac{{kg}}{m^3}';
        let getInfo = (level) => `${getMaterialName(level, false)}=` + getP1(level).toString(4) + '\\, \\frac{{kg}}{m^3}';
        p1.getDescription = (_) => Utils.getMath(getDesc(p1.level));
        p1.getInfo = (amount) => Utils.getMathTo(getInfo(p1.level), getInfo(p1.level + amount));
        p1.maxLevel = 118;
        p1.level = 1;
    }

    // c2
    {
        let getDesc = (level) => "c_2 = " + getC2(level).toString(4);
        c2 = theory.createUpgrade(3, currency3, new ExponentialCost(BigNumber.TWO, 1));
        c2.maxLevel = 2000;
        c2.getDescription = (_) => Utils.getMath(getDesc(c2.level));
        c2.getInfo = (amount) => Utils.getMathTo(getDesc(c2.level), getDesc(c2.level + amount));
        c2.isAvailable = false;
    }

    // w
    {
        let getDesc = (level) => "w = " + getw(level).toString(2);
        w = theory.createUpgrade(4, currency3, new ExponentialCost(137, .707));
        w.getDescription = (_) => Utils.getMath(getDesc(w.level));
        w.getInfo = (amount) => Utils.getMathTo(getDesc(w.level), getDesc(w.level + amount));
        w.isAvailable = false;
    }

    /////////////////////
    // Permanent Upgrades
    theory.createPublicationUpgrade(0, currency, 1e3);
    theory.createBuyAllUpgrade(1, currency, 1e3);
    theory.createAutoBuyerUpgrade(2, currency2, 1e15);
    permup3 = theory.createPermanentUpgrade(3, currency3, new FreeCost());
    permup3.getDescription = () => `Collects \\Delta${currency3.symbol} for a price.`;
    permup3.getInfo = () => `Collects \\Delta${currency3.symbol} but resets all other currencies and regular upgrades and gradually lowers bonus theory multiplier.`;
    permup3.boughtOrRefunded = (level) => postPublish();
    permup4 = theory.createPermanentUpgrade(4, currency3, new ExponentialCost(50, 6));
    permup4.getDescription = (level) => `Get better \\zeta \\;\\; equation from ${currency3.symbol}.`;
    permup4.getInfo = () => `Get better \\zeta \\;\\; equation from ${currency3.symbol}.`;
    permup4.maxLevel = 2;
    permup5 = theory.createPermanentUpgrade(5, currency3, new LinearCost(500, 2));
    permup5.getDescription = (level) => `Unlock c 2.`;
    permup5.getInfo = () => `Unlock c 2.`;
    permup5.maxLevel = 1;
    c2.isAvailable = permup5.level == 1;
    rebirth = theory.createPermanentUpgrade(6, currency, new FreeCost());
    rebirth.getDescription = () => `Retire, and hand over the project to your \\qquad\\qquad\\qquad\\qquad successor.`;
    rebirth.isAvailable = false;
    rebirth.bought = (level) => postBirth();

    ///////////////////////
    //// Milestone Upgrades
    theory.setMilestoneCost(new LinearCost(2, 2.11803399));

    // SO starting mass
    {
        SO = theory.createMilestoneUpgrade(0, SOMaxLvl);
        planet = constants[SO.level];
        SO.description = `Changes to a new celestial body.\\qquad \\qquad \\qquad \\qquad Current: ${constants[SO.level].name}`;
        SO.info = `The starting mass and volume are greatly increased to your advantage. WARNING: BUYING OR REFUNDING RESETS PROGRESS!`;
        SO.boughtOrRefunded = (_) => {
            postPublish(false);
            currency3.value = 0;
            updateAvailability();
            theory.invalidatePrimaryEquation();
            theory.invalidateSecondaryEquation();
            theory.invalidateTertiaryEquation();
        };
        constG = 6.6743 * Math.pow(10, -11);
    }

    // c1 exponent
    {
        c1Exp = theory.createMilestoneUpgrade(1, c1MaxLvl);
        c1Exp.description = Localization.getUpgradeIncCustomExpDesc("c_1", c1expval);
        c1Exp.info = Localization.getUpgradeIncCustomExpInfo("c_1", c1expval);
        c1Exp.boughtOrRefunded = (_) => {
            theory.invalidatePrimaryEquation();
            updateAvailability();
        };
    }

    // dt exponent upgrade
    {
        dtExp = theory.createMilestoneUpgrade(2, dtMaxLvl);
        dtExp.description = Localization.getUpgradeIncCustomExpDesc(`${currency2.symbol} \\;\\; bonus`, dtexpval);
        dtExp.info = Localization.getUpgradeIncCustomExpInfo(`${currency2.symbol} \\;\\; bonus`, dtexpval);
        dtExp.boughtOrRefunded = (_) => {
            updateAvailability();
        };
    }

    // L exponent upgrade
    {
        muUpg = theory.createMilestoneUpgrade(3, muupgMaxLvl);
        muUpg.description = `Make \\mu\\,\\, more efficient`;
        muUpg.info = Localization.getUpgradeIncCustomExpInfo('L', muupgval) + ' in \\mu';
        muUpg.boughtOrRefunded = (_) => {
            updateAvailability();
            theory.invalidateTertiaryEquation();
        }
    }
    
    /////////////////
    //// Achievements
    achievement1 = theory.createAchievement(0, "Like a swing", "Start the clock", () => c1.level > 0);
    achievement2 = theory.createSecretAchievement(1, "Time Dilation", "Going back and forth takes longer", "Make your pendulum taller?", () => L.level > 1);
    achievement3 = theory.createAchievement(2, "Early days", "Explore other celestial bodies", () => SO.level > 0);
    achievement4 = theory.createAchievement(3, "Chemist or Physicist?", "Gather heavier atoms", () => p1.level > 1);
    achievement5 = theory.createSecretAchievement(4, "They grow up so fast :')", "Enter the black hole era.", "Make it heavy!", () => radiiCompared);
    achievement6 = theory.createSecretAchievement(5, "+.1 in the Kardashev Scale", "Resetting to get more black holes.", "The Next Generation", () => rebirth.isAvailable);

    ///////////////////
    //// Tutorial
    tutorial = theory.createStoryChapter(0, "Tutorial",
        `Your goal is to get as much µ as possible.\nWhich is obtained by getting the frequency ƒ and length L of the pendulum to larger values.\n\n\nThe formulae can be found in the first panel in order from top to bottom, left to right (currencies aside). In the second panel are the given values for the variables at any given moment t in their respective order.\n\n\nThe values that you as the player can modify are amount of mass gained, length of pendulum, density (or element) of added volume, cheaty percentile of extra currency, and (SPOILER) starting point celestial object (via publishing), etc.\n\n\nNote that this theory is very slow and you will likely not see much progress often.`,
        () => true);
    //// Story chapters
    chapter1 = theory.createStoryChapter(1, "Do not go gentle into that good night", 
        `You begin working on a different branch of science.\nExciting as it may sound, this is no easy task.\n\nYou were always passionate on the complexities of space and physics. And have finally found an excuse to study large objects yourself.\nYou begin collecting mass, small quantities of Hydrogen atoms...\nwith highly precise instruments you begin to notice, that they produce an effect of some sort on your recently bought pendulum at the end of your desk.`,
        () => true);
    chapter2 = theory.createStoryChapter(2, "Take flight", 
    `The amount of mass you have gathered has begun to get in the way.\nIn fact, you can't keep it inside your office anymore,...\n\nYou need some,\nspace`,
    () => mass > BigNumber.TEN.pow(4));
    chapter3 = theory.createStoryChapter(3, 'Reminiscing ("That felt like forever")', 
        `What is that?\nIt's some sort of thing that is being...\n produced.\n\nYou can't quite name it, so you slap a label on it: ${currency.symbol}`,
        () => L.level > 0);
    chapter4 = theory.createStoryChapter(4, 'Battling giants', 
        `You've gathered enough knowledge and a deep understanding of this project.\nYou decide to embark on a new trial to reach new heights.\n\nYou approach ${constants[SO.level + 1].name}.`,
        () => SO.level > 0);
    chapter5 = theory.createStoryChapter(5, 'Where did you find that?', 
        `While it was understandable at first, to all of your students.\nNobody knows how you've acquired a pendulum of that length.`,
        () => L.level >= 5);
    chapter6 = theory.createStoryChapter(6, 'Much more than a blurry photo', 
        `You have accidentally taken humanity a step further.\nMany gather to see your lectures as you get some recognition.\nAnd many are willing to help you on your endeavors.\n\nThe extra set of hands gets to work collecting black holes, which further stretches your pendulum from the added gravitational pull.`,
        () => radiiCompared);
    chapter7 = theory.createStoryChapter(7, 'Impossible year', 
        `After all you have done, you realize that only a year has passed for the pendulum, but you aged greatly. You retire and hand over the project to your most dedicated student.`,
        () => rebirth.level > 0);
    
    updateAvailability();
}

var updateAvailability = () => {
    c1Exp.isAvailable = SO.level == SOMaxLvl;
    dtExp.isAvailable = c1Exp.level == c1MaxLvl;
    muUpg.isAvailable = dtExp.level == dtMaxLvl;
    permup3.isAvailable = unlockedAchievements['blackHoles'] && radiiCompared;
    permup4.isAvailable = unlockedAchievements['blackHoles'];
    permup5.isAvailable = unlockedAchievements['blackHoles'];
    c2.isAvailable = permup5.level == 1;
}

var isCurrencyVisible = (index) => [0,1].includes(index) || (index == 2 && unlockedAchievements['blackHoles']);
const nicerD = 100000; // nicer digits for smooth display and calculation
var tick = (elapsedTime, multiplier) => {
    SO.description = `Changes to a new celestial body.\\qquad \\qquad \\qquad \\qquad Current: ${constants[SO.level].name}`;
    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
    if (needsRebirth()) {
        rebirth.isAvailable = true;
        return;
    } else rebirth.isAvailable = false;
    w.isAvailable = rebirth.isAvailable || w.isAvailable;

    if (c1.level == 0) return;
    schwarzsR = Schw(mass);
    radiiCompared = radiiComparison();
    if (radiiCompared) unlockedAchievements['blackHoles'] = true;
    
    let dt = BigNumber.from(elapsedTime * multiplier);
    let bonus = theory.publicationMultiplier;
    let c = getC1(c1.level).pow(1 + c1Exp.level * c1expval) * (permup5.level == 1 ? getC2(c2.level) : BigNumber.ONE);
    mass += BigNumber.from(dt * c * nicerD) / nicerD;
    V = BigNumber.from((c / getP1(p1.level)) * nicerD) / nicerD;
    vol += BigNumber.from((dt * V) * nicerD) / nicerD;
    if (lastc1lvl < c1.level) {
        let cost = customC1costFn(c1.level) - customC1costFn(lastc1lvl)
        lastc1lvl = c1.level;
        let val = currency2.value - cost;
        currency2.value = BigNumber.ZERO < val ? val : BigNumber.ZERO;
    }
    currency2.value += vol * bonus.pow(dtExp.level * dtexpval + 1) * dt;

    radius = BigNumber.from(R(vol) * nicerD) / nicerD;

    gravity = BigNumber.from(Grav(mass, radius) * nicerD) / nicerD;
    grav = Grav(mass, radius, 'string');

    T = BigNumber.from(Peri(gravity) * nicerD) / nicerD;
    
    f = Frec(gravity);
    currency.value += dt * BigNumber.from(f * Math.pow(getL(L.level) + BigNumber.from(Z * unlockedAchievements['blackHoles'] ?? 0), 2 + muUpg.level * muupgval)) * bonus;
    
    k = calcK().toFixed(8);
    n = calcN();
    ghostB = currency3.value;
    if (n >= 1) permup5.isAvailable = permup4.isAvailable = true; // this makes sense, not a joke.
    permup3.isAvailable = n >= 1;
    Z = Zeta(currency3.value);
}

theory.primaryEquationHeight = 180;
theory.secondaryEquationHeight = 80;

let stage4Funcs = (v) => [
    `(2e-\\pi)log(${v}+1)`,
    `ln(${v}+1)^{\\frac{{ln(${v}+1)}}{ln(${v}+2)}}`,
    `(8e-6\\pi)log(${v}+1)`,
];
var getPrimaryEquation = () => {
    if (stage == 0) {
        return `
            \\begin{matrix}
            f = \\frac{{1}}{T} \\;, \\quad T = 2\\pi \\sqrt{\\frac{{${unlockedAchievements['blackHoles'] ? `L + \\zeta` : 'L'}}}{g}} \\;, \\quad g = ${G}\\frac{{${M}}}{${r}^2}
            \\\\\\\\
            \\\\\\\\
            {${r}} = \\frac{{3V}}{4\\pi}\\; ^ {\\frac{{1}}{3}} \\;, \\quad V = V_0 + \\sum_{n=${getMaterialForm(1)}}^{${getMaterialForm(p1.level)}} V_{n} \\;, \\quad \\dot{${M}} = c_1 \\, ^{${c1Exp.level > 0 ? 1 + c1Exp.level*c1expval : ''}}${permup5.level == 1 ? 'c_2' : ''}
            \\\\\\\\
            \\\\\\\\
            ${G} = 6.67430e-11 \\frac{{m^3}}{kg \\cdot s^{2}}
            \\end{matrix}
        `;
    } else if (stage == 1) {
        return `
            \\begin{matrix}
            {f} = ${Frec(gravity, 'string') || '0.00'}Hz \\;, \\quad T = ${Peri(gravity, 'string') || '0.00'}\\,s \\;, \\quad g = ${grav || '0.00'}\\,\\frac{{m}}{s^2}
            \\\\\\\\
            \\\\\\\\
            ${r} = ${radius.toString(radius < 100_000 ? 6 : 3)}\\,m \\;, \\quad ${M} = ${mass.toString(3)}\\,kg
            \\\\\\\\
            \\\\\\\\
            V = ${vol.toString(3)} \\,\\frac{{kg}}{m^{3}} \\;, \\quad \\dot{V}_{${getMaterialForm(p1.level)}} = \\frac{{c_1 \\, ^{${c1Exp.level > 0 ? 1 + c1Exp.level*c1expval : ''}}${permup5.level == 1 ? 'c_2' : ''}}}{${getMaterialName(p1.level,false)}} = ${V.toString(4)}\\, m^{3}
            \\end{matrix}
        `;
    } else if (stage == 2) {
        return `
            \\begin{matrix}
            r_{s} = \\frac{{2${G}${M}}}{c^{2}}
            \\\\\\\\
            \\\\\\\\
            r_{s} = ${Schw(mass, 'string')}\\,m
            \\end{matrix}
        `;
    } else if (stage == 3) {
        return `
            \\begin{matrix}
            k \\, \\epsilon \\, \\mathbb{R} \\;, \\quad n \\, \\epsilon \\, \\mathbb{W}
            \\\\\\\\
            \\\\\\\\
            ${r} = \\sqrt[k ${w.isAvailable ? 'w' : ''}]{r_{s}} \\;, \\quad \\Delta ${currency3.symbol} = {\\lfloor{ k ${w.isAvailable ? 'w' : ''} }\\rfloor} = n
            \\end{matrix}
        `;
    } else if (stage == 4) {
        return `
            \\begin{matrix}
            \\\\\\\\
            \\\\\\\\
            \\zeta = ${stage4Funcs(currency3.symbol)[permup4.level]}
            \\end{matrix}
        `;
    } else if (stage == 5) {
        return `
            \\begin{matrix}
            \\\\\\\\
            \\text{Gravity to reach next }n:
            \\\\\\\\
            g_{n+1} = \\lim_{n=${n}\\to${n+1}} \\, (\\frac{{c^{2}}}{2}(G${M})^{\\frac{{n}}{2} - 1})^{\\frac{{2}}{n}} = \\, {${nextG(mass, n+1, 'string')}}
            \\end{matrix}
        `;
    }
    return '';
}

var getSecondaryEquation = () => {
    if (stage == 2) {
        theory.primaryEquationHeight = 100;
        return `
            \\begin{matrix}
            {${r}}${n > 1 ? `^{${n}}` : ''} \\le r_{s} : \\text{${radiiCompared}}
            \\end{matrix}
        `;
    } else if (stage == 5) {
        theory.primaryEquationHeight = 100;
        return `
            \\begin{matrix}
            g_{n} = ${grav}   
            \\end{matrix}
        `;
    }
    theory.primaryEquationHeight = 180;
    return '';
}

var getTertiaryEquation = () => {
    if (stage < 2) {
        return `
            \\begin{matrix}
            ${theory.latexSymbol} = \\max(${currency.symbol}) \\;, \\quad ${currency.symbol} = {${unlockedAchievements['blackHoles'] ? `(L + \\zeta)` : 'L'}}^{${2 + muUpg.level * muupgval}} \\cdot \\int_{0}^{t} f \\cdot dt \\;, \\quad ${currency2.symbol} = \\int_{0}^{t} V \\cdot dt
            \\\\\\\\
            \\end{matrix}
        `;
    } else if (stage == 2) {
        return `
            \\begin{matrix}
            \\text{Schwarzschild Radius}
            \\\\\\\\
            \\end{matrix}
        `;
    } else if (stage == 3) {
        return `
            \\begin{matrix}
            k = ${k} \\;, \\quad ${w.isAvailable ? `kw = ${(k * getw(w.level)).toFixed(8)} \\;, \\quad ` : ''} n = ${n}
            \\\\\\\\
            \\end{matrix}
        `;
    } else if (stage == 4) {
        return `
            \\begin{matrix}
            \\zeta = ${Z}
            \\\\\\\\
            \\end{matrix} 
        `;
    } else if (stage == 5) {
        return `
            \\begin{matrix}
            n = ${n}
            \\\\\\\\
            \\end{matrix} 
        `;
    }
    return '';
}

var postPublish = (beta=true) => {
    currency3.value = (beta ? n : 0) + ghostB;
    ghostB = 0;
    permup3.isAvailable = false;
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
    lastc1lvl = 0;
    L.level = 0;
    p1.level = 1;
    n = 0;
    k = 0;
    theory.clearGraph();
}

var getInternalState = () => `${mass} ${gravity} ${T} ${V} ${vol} ${radius} ${f} ${schwarzsR}^${JSON.stringify(unlockedAchievements)}`;

var setInternalState = (stateString) => {
    let values = stateString.split('^');
    let variables = values[0].split(' ');
    let other = values[1];
    [mass, gravity, T, V, vol, radius, f, schwarzsR] = variables.map(val => BigNumber.from(val));
    try {
        unlockedAchievements = JSON.parse(other);
    } catch {
        unlockedAchievements = {
            'SO': false,
            'mu': false,
            'blackHoles': false,
        };
    };
}

var taupow = .088 * BigNumber.E;
var getPublicationMultiplier = (tau) => tau.pow(taupow / (1 + .01 * Math.log(1 + permup3.level)));
var getPublicationMultiplierFormula = (symbol) => `${symbol}^{${taupow / (1 + .01 * Math.log(1 + permup3.level))}}`;
var getTau = () => currency.value;
var get2DGraphValue = () => {
    return currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();
}
var getMaterialName = (level, unit = false) => `\\rho_{${materials(level, 'name')}}` + (unit ? '\\;\\frac{{kg}}{m^3}': '');
var getMaterialValue = (level) => materials(level, 'value');
var getMaterialForm = (level) => materials(level, 'form');

var getL = (level) => BigNumber.from(level + 1);
var getC1 = (level) => Utils.getStepwisePowerSum(level, 2.61803399, 18, 0)/10_000;
var getP1 = (level) => BigNumber.from(getMaterialValue(level));
var getC2 = (level) => BigNumber.from(1.005).pow(level);
var getw = (level) => BigNumber.from(1 + level * .25);
var getLExponent = (level) => BigNumber.from(1 + 0.05 * level);
var getC1Exponent = (level) => BigNumber.from(1 + c1expval * level);
var getDtExp = (level) => BigNumber.ONE + level;
var getP1Exponent = (level) => BigNumber.from(1 + 0.05 * level);

var maxStages = 5;
var canGoToPreviousStage = () => stage > 0;
var canGoToNextStage = () => stage == 0 || (unlockedAchievements['blackHoles'] && stage != maxStages);
var goToPreviousStage = () => {stage = Math.max(stage-1, 0);}
var goToNextStage = () => {stage = Math.min(stage+1, maxStages);}

init();

const expMantissa = (val) => {
    const exp = Math.log10(val);
    const expClean = Math.floor(exp);
    if ([Infinity, -Infinity].includes(expClean)) return { mts: 0, exp: 0};
    const mantissa = Math.pow(10, exp - expClean);
    return { mts: mantissa, exp: expClean };
}

const R = (v) => BigNumber.from(v.toString(4)/((BigNumber.FOUR/BigNumber.THREE) * BigNumber.PI)).pow(BigNumber.ONE/BigNumber.THREE);
const Grav = (mass, rad, type='number') => {
    if (rad == 0) return type == 'number' ? 0 : '0.00';
    try {
        const { mts: radmts, exp: radexp } = expMantissa(rad.toString(4));
        const { mts: massmts, exp: massexp } = expMantissa(mass.toString(4));
        const { mts: Gmts, exp: Gexp } = expMantissa(constG);
        const operation = Gmts * massmts / (radmts * radmts);
        const { mts: opmts, exp: opexp } = expMantissa(operation);
        const expo = (Gexp + massexp - (2 * radexp)) + opexp;
        if ([opmts, opexp].includes(NaN)) {
            return BigNumber.ZERO.toString(2);
        }
        if (type == 'number') {
            return opmts * Math.pow(10, expo);
        } else if (type == 'string') {
            if (-3 < expo && expo < 3) return (opmts * Math.pow(10, expo)).toFixed(3);
            return `${opmts.toFixed(2)}e${expo.toFixed(0)}`;
        };
    } catch {
        return BigNumber.from(constG * BigNumber.from(mass / BigNumber.from(rad * rad)));
    }
};
const Peri = (gravity, type='number') => {
    if (!(gravity > Number.MIN_VALUE)) return type == 'number' ? 0 : '0.00';
    try {
        const { mts: constantsmts, exp: constantsexp } = expMantissa(2 * Math.PI);
        const { mts: Lmts, exp: Lexp } = expMantissa(Math.pow(getL(L.level), .5));
        const { mts: gravitymts, exp: gravityexp } = expMantissa(Math.pow(gravity * 10e20, .5));
        const operation = constantsmts * Lmts / gravitymts;
        const { mts: opmts, exp: opexp } = expMantissa(operation);
        const expo = (constantsexp + (Lexp - (gravityexp - 10))) + opexp;
        if ([opmts, opexp].includes(NaN)) {
            return BigNumber.ZERO.toString(2);
        }
        if (type == 'number') {
            return opmts * Math.pow(10, expo);
        } else if (type == 'string') {
            if (-3 < expo && expo < 3) return (opmts * Math.pow(10, expo)).toFixed(3);
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
        const { mts: gravitymts, exp: gravityexp } = expMantissa(Math.pow(gravity * 10e20, .5));
        const operation = gravitymts / (constantsmts * Lmts);
        const { mts: opmts, exp: opexp } = expMantissa(operation);
        const expo = ((gravityexp - 10) - (Lexp + constantsexp)) + opexp;
        if ([opmts, opexp].includes(NaN)) {
            return BigNumber.ZERO.toString(2);
        }
        if (type == 'number') {
            return opmts * Math.pow(10, expo);
        } else if (type == 'string') {
            if (-3 < expo && expo < 3) return (opmts * Math.pow(10, expo)).toFixed(3);
            return `${opmts.toFixed(2)}e${expo.toFixed(0)}`;
        };
    } catch {
        return BigNumber.from((Math.pow(gravity, .5) / (BigNumber.TWO * BigNumber.PI * Math.pow(getL(L.level), .5))));
    }
}
const Schw = (mass, type='number') => {
    if (mass.toString(50) == 0) return type == 'number' ? 0 : '0.00';
    try {
        const { mts: constantsmts, exp: constantsexp } = expMantissa(2 / (c * c));
        const { mts: massmts, exp: massexp } = expMantissa(mass);
        if (massmts == NaN) return type == 'number' ? 0 : '0.00';
        const { mts: Gmts, exp: Gexp } = expMantissa(constG);
        const operation = Gmts * massmts * constantsmts;
        const { mts: opmts, exp: opexp } = expMantissa(operation);
        const expo = (Gexp + massexp + constantsexp) + opexp;
        if ([opmts, opexp].includes(NaN)) {
            return BigNumber.ZERO.toString(2);
        }
        if (type == 'number') {
            return opmts * Math.pow(10, expo);
        } else if (type == 'string') {
            if (-3 < expo && expo < 3) return (opmts * Math.pow(10, expo)).toFixed(3);
            return `${opmts.toFixed(2)}e${expo.toFixed(0)}`;
        };
    } catch {
        return BigNumber.from((2 * constG * mass) / (Math.pow(c, 2)));
    }
}
const Zeta = (n) => {
    if (n < 0) return 0;
    if (permup4.level == 0) return ((2 * BigNumber.E - BigNumber.PI) * Math.log10(n + 1)).toString(4);
    let x = Math.log(n + 1);
    if (permup4.level == 1) return BigNumber.from(Math.pow(x, (x / Math.log(n + 2)))).toString(4);
    if (permup4.level == 2) return ((8 * BigNumber.E - 6 * BigNumber.PI) * Math.log10(n + 1)).toString(4);
};

var radiiComparison = () => Math.log10(radius) < Math.log10(schwarzsR)*.99999999;
var calcK = () => {
    let a = Math.log10(schwarzsR), b = Math.log10(radius);
    if (a < 0 && b < 0) return 0;
    let x = a / b;
    return x;
};
var calcN = () => {
    let _w = w.isAvailable ? getw(w.level) : 1;
    if (k * _w < 0) return 0;
    return Math.max(0, Math.floor(k * _w));
};
var nextG = (mass, n, type='number') => {
    if (mass.toString(50) == 0) return type == 'number' ? 0 : '0.00';
    if (n == 2) return (BigNumber.from((c * c) / 2).toString(4));
    let nexp = ((n / 2) - 1);
    try {
        const { mts: opmts, exp: expo } = expMantissa(Math.pow(((c * c) / 2) * Math.pow(constG * mass, nexp), 2/n));
        if ([opmts, expo].includes(NaN)) {
            return BigNumber.ZERO;
        }
        if (type == 'number') {
            return opmts * Math.pow(10, expo);
        } else if (type == 'string') {
            if (-3 < expo && expo < 3) return (opmts * Math.pow(10, expo)).toFixed(3);
            return `${opmts.toFixed(2)}e${expo.toFixed(0)}`;
        };
    } catch {
        return BigNumber.from((c * c / (2 * BigNumber.from(constG * mass).pow(nexp)))).pow(2/n);
    }
}

var needsRebirth = () => Math.abs(Math.max(Math.log10(currency.value + .1), 0)) / 50 > (rebirth.level + 1);

var postBirth = () => {
    postPublish(false);
    w.level = w.level + 1;
    permup3.level = 0;
    currency3.value = 0;
    rebirth.isAvailable = false;
}

let mass = BigNumber.from(planet.mass);
let V = BigNumber.from(mass / planet.density);
let vol = V;
let radius = R(V);
let gravity = Grav(mass, radius);
let T = Peri(gravity);
let f = Frec(gravity);
let schwarzsR = Schw(mass);