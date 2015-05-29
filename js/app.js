angular.module('reportcard', [ 'n3-pie-chart' ])
  .controller('ReportCardCtrl', function() {
    var reportCard = this;
    reportCard.title = 'GCB Effort Reporting';
    reportCard.options = {thickness: 100, mode: "pie"};
    reportCard.effort = [
      {label: "R&D", value: 20, color: "red"},
      {label: "Admin", value: 20, color: "green"},
      {label: "Collaborative Research", value: 20, color: "blue"},
      {label: "Infrastructure", value: 20, color: "orange"},
      {label: "Tickets", value: 20, color: "purple"}
    ];
    reportCard.reduceEffort = function(effort) { effort.value = effort.value - 5;};
    reportCard.increaseEffort = function(effort) { effort.value = effort.value + 5;};
  });
