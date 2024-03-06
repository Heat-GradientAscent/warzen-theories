import { ExponentialCost, FirstFreeCost, LinearCost } from "../api/Costs";
import { Localization } from "../api/Localization";
import { parseBigNumber, BigNumber } from "../api/BigNumber";
import { theory } from "../api/Theory";
import { Utils } from "../api/Utils";

var id = "Control System";
var name = "Control System";
var description = "This theory explores the beauty of a control system using blocks.";
var authors = "Warzen User";
var version = '0.1.0';


var currency;
var c1;
var c1Exp;

var init = () => {
    currency = theory.createCurrency();

    ///////////////////
    // Regular Upgrades

    // c1
    {
        let getDesc = (level) => "c_1=" + getC1(level).toString(0);
        c1 = theory.createUpgrade(2, currency, new ExponentialCost(15, Math.log2(2)));
        c1.getDescription = (_) => Utils.getMath(getDesc(c1.level));
        c1.getInfo = (amount) => Utils.getMathTo(getDesc(c1.level), getDesc(c1.level + amount));
    }

    /////////////////////
    // Permanent Upgrades
    theory.createPublicationUpgrade(0, currency, 1e10);
    theory.createBuyAllUpgrade(1, currency, 1e13);
    theory.createAutoBuyerUpgrade(2, currency, 1e30);

    ///////////////////////
    //// Milestone Upgrades
    theory.setMilestoneCost(new LinearCost(25, 25));

    {
        c1Exp = theory.createMilestoneUpgrade(0, 3);
        c1Exp.description = Localization.getUpgradeIncCustomExpDesc("c_1", "0.05");
        c1Exp.info = Localization.getUpgradeIncCustomExpInfo("c_1", "0.05");
        c1Exp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }

    updateAvailability();
}

var updateAvailability = () => {
}

var tick = (elapsedTime, multiplier) => {
}

var getInternalState = () => ` `

var setInternalState = (state) => {
    let values = state.split(" ");
}

const equations = [
    {
        'name': 'OLTF',
        'value': `
            \\begin{matrix}
            R(s)\\;\\rightarrow \\oplus\\;\\rightarrow [\\; G_{c}(s) \\;]\\;\\rightarrow Y(s)
            \\\\\\\\
            \\qquad \\qquad \\quad \\downarrow
            \\\\\\\\
            \\quad\\; [\\;H(s)\\;]\\; \\leftarrow
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

const lvlOneEquation = equations[0]['value'];

theory.primaryEquationHeight = 120;
theory.secondaryEquationHeight = 80;
var getPrimaryEquation = () => {
    return lvlOneEquation;
}

var getSecondaryEquation = () => `
    ${'G_{c} = \\frac{{1}}{s}'}
`;
// var getQuaternaryEntries = () => [new QuaternaryEntry("xd_4", null)];

var getPublicationMultiplier = (tau) => tau.pow(0.164) / BigNumber.THREE;
var getPublicationMultiplierFormula = (symbol) => "\\frac{{" + symbol + "}^{0.164}}{3}";
var getTau = () => currency.value;
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

var postPublish = () => {
}

var getC1 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 1);

init();