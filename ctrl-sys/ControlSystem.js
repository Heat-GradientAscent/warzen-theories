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

class LimitlessCustomCost {
    constructor(model) {
        this.model = model;
    }

    cost(level) {
        return BigNumber.ZERO; //BigNumber.from(this.model(level));
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
}

var recalcUpgrades = () => {
    log('Recalcing upgrades...')
    log(JSON.stringify(upgrades))
    Object.keys(upgrades).forEach((upgrade, k) => {
        let u = upgrades[upgrade];
        let i = theory.upgrades.length + 1;
        let ccostfunc =  new LimitlessCustomCost((level) => level == 0 ? 15 : BigNumber.TWO.pow(Math.log2(2) * level));
        let s = theory.createUpgrade(i, currency, new FirstFreeCost(ccostfunc.cost_model));
        const getValue = (level) => BigNumber.from(u.level);
        let desc = (level) => `s_{${k}}=${getValue(u.level).toString(0)}`;
        s.getDescription = (_) => Utils.getMath(desc(s.level));
        s.getInfo = (amount) => Utils.getMathTo(desc(s.level), desc(u.level + amount));
        s.boughtOrRefunded = (_) => {
            log(JSON.stringify(upgrades[upgrade]));
            upgrades[upgrade].level += 1;
            upgrades[upgrade].value += 1;
        };
        refS.push(s);
    });
}

var addUpgrade = (name) => {
    let i = theory.upgrades.length + 1;
    let u = upgrades[name];
    let ccostfunc =  new LimitlessCustomCost((level) => level == 0 ? 15 : BigNumber.TWO.pow(Math.log2(2) * level));
    s = theory.createUpgrade(i, currency, new FirstFreeCost(ccostfunc.cost_model));
    const getValue = (level) => BigNumber.from(u.level);
    let desc = (level) => `${name}=${getValue(u.level).toString(0)}`;
    s.getDescription = (_) => Utils.getMath(desc(s.level));
    s.getInfo = (amount) => Utils.getMathTo(desc(s.level), desc(u.level + amount));
    s.boughtOrRefunded = (_) => {
        upgrades[name].level += 1;
        upgrades[name].value += 1;
        secondEquation = calcSecEq();
    };
    theory.upgrades.length -= 1;

    updateUpgradesList();

}

let hasLoadaded = false;
var init = () => {
    currency = theory.createCurrency(symbol = 'µ', latexSymbol='\\mu');

    ///////////////////
    // Regular Upgrades

    // c
    {
        let ccostfunc =  new LimitlessCustomCost((level) => level == 0 ? 15 : BigNumber.TWO.pow(Math.log2(2) * level));
        let getDesc = (level) => "c=" + getc(level).toString(0);
        c = theory.createUpgrade(0, currency, new FirstFreeCost(ccostfunc.cost_model));
        c.getDescription = (_) => Utils.getMath(getDesc(c.level));
        c.getInfo = (amount) => Utils.getMathTo(getDesc(c.level), getDesc(c.level + amount));
        c.boughtOrRefunded = (_) => {
            let lvl = Object.keys(upgrades).length;
            log(lvl)
            let name = `s_{${lvl}}`;
            upgrades[name] = {level: 0, value: 0};
            addUpgrade(name);
            lvl = Object.keys(upgrades).length;
            log(lvl)
        }
    }

    log(theory.upgrades.length)

    if (!hasLoadaded) {
        recalcUpgrades();
        log(theory.upgrades.length)
        secondEquation = calcSecEq();
    }
    hasLoadaded = true;
    
    /////////////////////
    // Permanent Upgrades
    theory.createPublicationUpgrade(0, currency, 1e10);
    theory.createBuyAllUpgrade(1, currency, 1e13);
    theory.createAutoBuyerUpgrade(2, currency, 1e30);

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

var tick = (elapsedTime, multiplier) => {
    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();

    let dt = BigNumber.from(elapsedTime * multiplier);
    let bonus = theory.publicationMultiplier;
}

var getInternalState = () => `${JSON.stringify(upgrades)}`;

var setInternalState = (state) => {
    log(state)
    try {
        log('loaded')
        upgrades = JSON.parse(state);
    } catch (e) {
        log('couldnt load')
        upgrades = {};
    }
    recalcUpgrades();
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
    let t = '';
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
            t += 's';
        } else if (v > 0) {
            t += `(s+${v.toString(10)})`;
        } else {
            t += `(s-${v.toString(10)})`;
        }
        if (b > 1) {
            t += `^{${b}}`;
        }
    });
    if (t == '') return 'G(s) = 1';
    return `G_{c} = \\frac{{1}}{${t}}`;
}
var getSecondaryEquation = () => {
    return calcSecEq();
};

var getTertiaryEquation = () => `
    \\tau = 0
`;

// var getQuaternaryEntries = () => [new QuaternaryEntry("xd_4", null)];

var getPublicationMultiplier = (tau) => 1;
var getPublicationMultiplierFormula = (symbol) => `log(${symbol})`;
var getTau = () => 0;
var get2DGraphValue = () => (
    BigNumber.ZERO
).toNumber();

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

init();