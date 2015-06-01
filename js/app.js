angular.module('reportcard', [ 'nvd3ChartDirectives' ])
  .controller('ReportCardCtrl', function() {
    var reportCard = this;
    reportCard.title = 'GCB Effort Reporting';
    reportCard.effort = [
      {key: "R&D", y: 20},
      {key: "Admin", y: 20},
      {key: "Collaborative Research", y:20},
      {key: "Infrastructure", y: 20},
      {key: "Tickets", y: 20}
    ];
    reportCard.reduceEffort = function(effort) { effort.y = effort.y - 5;};
    reportCard.increaseEffort = function(effort) { effort.y = effort.y + 5;};
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
  });
