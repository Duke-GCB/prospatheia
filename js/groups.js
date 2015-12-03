var effortGroups = angular.module('ProspatheiaEffortGroupModule', []).service('EffortGroupService', function() {
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

  var proteomicsCategories = [
      { csvHeader: "pctAdmin",
        shortLabel: "Admin",
        longLabel: "Administrative",
        summary: "<ul><li>Staff/Lab/Department/Center meetings</li><li>Ordering, general email, time reporting</li><li>SOP development, safety courses</li></ul>" },
      { csvHeader: "pctBillable",
        shortLabel: "Billable",
        longLabel: "Billable",
        summary: "<ul><li>Effort on grants and projects</li><li>Project specific technical troubleshooting</li><li>Email/TC/meetings on active projects</li></ul>" },
      { csvHeader: "pctEducation",
        shortLabel: "Education",
        longLabel: "Education",
        summary: "<ul><li>Presentations for outreach at Duke</li><li>Training and professional development</li><li>Conferences (preparation and attendance)</li><li>Service (manuscript reviews, society participation)</li></ul>" },
      { csvHeader: "pctLabMaintenance",
        shortLabel: "Lab Maint.",
        longLabel: "Lab Maintenance",
        summary: "<ul><li>General lab/equipment maintenance and repair</li></ul>" },
      { csvHeader: "pctProjectDev",
        shortLabel: "Project Dev",
        longLabel: "Project Development",
        summary: "<ul><li>Consultations/correspondence for potential projects</li><li>Proposal preparation, letters of support</li></ul>" },
      { csvHeader: "pctServiceDev",
        shortLabel: "Service Dev",
        longLabel: "Service Development",
        summary: "<ul><li>Non-funded research</li><li>Development of new services</li><li>General protocol testing and optimization</li></ul>" },
      ];
  this.groups = [
      { name : 'informatics',
        members : ['dansomers','dleehr','hlapp','netscruff','rosedaniels'],
        categories : informaticsCategories },
      { name : 'proteomics',
        members: ['trackmytime','Will-Thompson','mamoseley','mwfoster','Mabbett','gmw12','es3064','Stirman02'],
        categories : proteomicsCategories },
    ];

  // Adapted from http://stackoverflow.com/a/1961068 by adding key
  Array.prototype.getUnique = function(key){
     var u = {}, a = [];
     for(var i = 0, l = this.length; i < l; ++i){
        if(u.hasOwnProperty(this[i][key])) {
           continue;
        }
        a.push(this[i]);
        u[this[i][key]] = 1;
     }
     return a;
  }

  this.categoriesForUser = function(user) {
    var categories = [];
    var groups = this.groupsForUser(user);
    var categories = groups.map(function(group) { return group.categories; }).reduce(function(a,b) { return a.concat(b)});
    // Now uniquify them
    categories = categories.getUnique('csvHeader');
    return categories;
  }

  this.groupNamesForUser = function(user) {
    return this.groupsForUser(user).map(function(group) { return group.name; });
  }

  this.groupsForUser = function(user) {
    return this.groups.filter(function(group) { return group.members.indexOf(user) != -1; });
  }
});
