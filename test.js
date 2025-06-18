const assert = require('assert');
const ScenarioManager = require('./scenarios.js');

global.localStorage = (() => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    clear: () => { store = {}; }
  };
})();

const defaults = [
  { name: 'One', values: { organicGrowth: 10, adBudget: 5, conversionChange: 0, checkChange: 0 } },
  { name: 'Two', values: { organicGrowth: 20, adBudget: 10, conversionChange: 5, checkChange: 2 } }
];

let scenarios = ScenarioManager.initScenarios(defaults);
assert.strictEqual(scenarios.length, 2, 'default scenarios should be created');
ScenarioManager.saveScenario(scenarios, 'Custom', { organicGrowth: 30, adBudget: 15, conversionChange: 10, checkChange: 0 });
assert.strictEqual(scenarios.length, 3, 'scenario should be added');
ScenarioManager.saveScenario(scenarios, 'Custom', { organicGrowth: 40, adBudget: 20, conversionChange: 15, checkChange: 5 });
assert.strictEqual(scenarios.find(s => s.name === 'Custom').values.organicGrowth, 40, 'scenario should be updated');
console.log('All scenario tests passed');
