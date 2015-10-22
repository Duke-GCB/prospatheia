var effortGroups = angular.module('ReportCardEffortGroupModule', []).service('EffortGroupService', function() {
  var informaticsCategories = [
      { csvHeader: "pctResDev",
        shortLabel: "R&D",
        longLabel: "Research & Development",
        summary: "Self-directed work, work initiated in Informatics, and professional development" },
      { csvHeader: "pctAdmin",
        shortLabel: "Admin",
        longLabel: "Administrative",
        summary: "Staff meetings, emails, administrative work, and HR-required training" },
      { csvHeader: "pctCollabRes",
        shortLabel: "Collab. Research",
        longLabel: "Collaborative Projects",
        summary: "Collaborative projects (even if they originated from tickets); typically includes intellectual contribution of some kind, in contrast to troubleshooting or fulfilling service requests" },
      { csvHeader: "pctInfra",
        shortLabel: "Infrastructure",
        longLabel: "Infrastructure Projects",
        summary: "Physical or virtual work that affects multiple users (in contrast to an individual requestor on a ticket)"},
      { csvHeader: "pctTicket",
        shortLabel: "Tickets",
        longLabel: "Ticket-based Work",
        summary: "Work responding to requests or reports sent to IT, in contrast to initiated in IT; includes such work even if not recorded in a ticket; should not include collaborative or infrastructure projects (which sometimes start as a ticket)" },
      ];

  this.groups = [
      { group : 'informatics',
        members : ['dansomers','dleehr','hlapp','netscruff','rosedaniels'],
        categories : informaticsCategories }
    ];

  this.categoriesForUser = function(user) {
    var categories = [];
    var groups = this.groupsForUser(user);
    var categories = groups.map(function(group) { return group.categories; }).reduce(function(a,b) { return a.concat(b)});
    return categories;
  }
  this.groupsForUser = function(user) {
    return this.groups.filter(function(group) { return group.members.indexOf(user) != -1; });
  }
});
