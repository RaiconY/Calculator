(function(global){
  function getScenarios(){
    const stored = global.localStorage.getItem('scenarios');
    return stored ? JSON.parse(stored) : null;
  }

  function saveScenarios(list){
    global.localStorage.setItem('scenarios', JSON.stringify(list));
  }

  function initScenarios(defaults){
    let scenarios = getScenarios();
    if(!scenarios){
      scenarios = defaults;
      saveScenarios(scenarios);
    }
    return scenarios;
  }

  function saveScenario(list, name, values){
    const existing = list.find(s => s.name === name);
    if(existing){
      existing.values = values;
    } else {
      list.push({name, values});
    }
    saveScenarios(list);
  }

  const api = {getScenarios, saveScenarios, initScenarios, saveScenario};
  if(typeof module === 'object' && module.exports){
    module.exports = api;
  } else {
    global.ScenarioManager = api;
  }
})(typeof window !== 'undefined' ? window : global);
