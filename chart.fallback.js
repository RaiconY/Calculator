(function(){
  if (window.Chart) return;
  function Chart(ctx, config) {
    this.ctx = ctx;
    this.config = config || {};
  }
  Chart.prototype.destroy = function() {};
  window.Chart = Chart;
})();
