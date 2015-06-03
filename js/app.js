angular.module('reportcard', [ 'nvd3ChartDirectives','ui.bootstrap'])
  .controller('ReportCardCtrl', function() {
    var reportCard = this;
    reportCard.title = 'GCB Effort Reporting';
    reportCard.resetEffort = function() {
      reportCard.effort = [
        {key: "R&D", y: 20},
        {key: "Admin", y: 20},
        {key: "Collaborative Research", y:20},
        {key: "Infrastructure", y: 20},
        {key: "Tickets", y: 20}
      ];
    }
    reportCard.resetEffort();
    reportCard.headers = reportCard.effort.map(function(e) { return e.key; } );
    reportCard.efforts = [];

    // Data-binding is to whole collection, not individual slices
    var changeEffort = function(index, delta) {
      effort = angular.copy(reportCard.effort)
      effort[index].y = effort[index].y + delta;
      reportCard.effort = effort;
    };
    reportCard.reduceEffort = function(index) {
      changeEffort(index, -5);
    };
    reportCard.increaseEffort = function(index) {
      changeEffort(index, 5);
    }
    reportCard.xFunction = function() {
      return function(d) {
        return d.key;
      }
    };
    reportCard.yFunction = function() {
      return function(d) {
        return d.y;
      }
    };
    reportCard.addEffort = function() {
      reportCard.efforts.push(angular.copy(reportCard.effort));
    }
  });
