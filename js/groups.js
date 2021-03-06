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

  var microbiomeCategories = [
      { csvHeader: "pctGrants",
        shortLabel: "Grants",
        longLabel: "Effort on grants",
        summary: "<ul><li>R24 grant support</li><li>R25 grant support</li><li>BARDA grant support</li><li>AHA grant support</li></ul>" },
      { csvHeader: "pctEducation",
        shortLabel: "Education",
        longLabel: "Education, training, and outreach",
        summary: "<ul><li>GCB Academy</li><li>Class Lectures</li><li>Seminars</li><li>Workshops</li></ul>" },
      { csvHeader: "pctConsultation",
        shortLabel: "Consultation",
        longLabel: "Consultation",
        summary: "<ul><li>Communication with client about experimental design and progress of submissions</li><li>Contribution to grant/paper content</li><li>Letters of support</li></ul>" },
      { csvHeader: "pctLabServices",
        shortLabel: "Lab Services",
        longLabel: "Lab Services",
        summary: "<ul><li>Processing samples for the various Microbiome Shared Resource services</li></ul>" },
      { csvHeader: "pctProfServ",
        shortLabel: "Prof. services",
        longLabel: "Professional services",
        summary: "<ul><li>Present class lectures</li><li>Grant and paper reviewer</li><li>Committee service</li></ul>" },
      { csvHeader: "pctSPSampleReceipt",
        shortLabel: "SGT/PaM Sample Rcpt",
        longLabel: "SGT/PaM Sample Receipt",
        summary: "<ul><li>Time spent on receiving and preparing Sequencing and Genomic Technologies and Proteomics and Metabolomics samples for delivery</li></ul>" },
      { csvHeader: "pctGCBAdmin",
        shortLabel: "GCB Admin",
        longLabel: "GCB Administration Support",
        summary: "<ul><li>GCB Administration Support</li></ul>" },
      { csvHeader: "pctLabAdmin",
        shortLabel: "Lab Admin",
        longLabel: "Lab maintenance & administration",
        summary: "<ul><li>Ordering and tracking supplies</li><li>Lab Safety maintenance</li><li>Revision to standard operating procedures</li></ul>" },
      { csvHeader: "pctDataAnalysis",
        shortLabel: "Data Analysis",
        longLabel: "Data Analysis",
        summary: "<ul><li>Updating scripts</li><li>GAAB services</li><li>QIIME Analysis</li></ul>" }
      ];

  var sequencingCategories = [
      { csvHeader: "pctLabAdmin",
        shortLabel: "Lab Admin",
        longLabel: "Lab maintenance & administration",
        summary: "<ul><li>Administration (ordering,sales rep etc.); </li><li>Lab maintenance (inventory, SOP, safety, washes etc…); </li><li>Computer maintenance.</li></ul>" },
      { csvHeader: "pctStaffAdmin",
        shortLabel: "Staff Admin",
        longLabel: "Staff administration",
        summary: "<ul><li>Administration (reporting, time tracking etc…); </li><li>Staff Management; </li><li>Staff meeting (lab meeting, center meeting etc…).</li></ul>" },
      { csvHeader: "pctProjects",
        shortLabel: "Projects",
        longLabel: "Projects",
        summary: "<ul><li>Lab efforts associated with projects (sample handling, QC, lib preps, sequencing, data distribution etc..). </li><li>Project troubleshooting; </li><li>Client communication during a project; </li><li>Primary and secondary bioinformatics analyses associated to a project; </li><li>Programming efforts devoted to a project.</li></ul>" },
      { csvHeader: "pctEducation",
        shortLabel: "Education",
        longLabel: "Education & Outreach",
        summary: "<ul><li>Outreach (performing presentations, going to vendor show etc…); </li><li>Education (offering lectures, workshops, 1:1 training, facility tours, etc. </li><li>Receiving training and professional development; </li><li>Going to conferences; </li><li>Continuing education (reading literature, watching webcasts, etc…).</li></ul>" },
      { csvHeader: "pctConsultation",
        shortLabel: "Consultation",
        longLabel: "Consultation",
        summary: "<ul><li>Meeting/corresponding with clients before starting a project; </li><li>Preaward support.</li></ul>" },
      { csvHeader: "pctResDev",
        shortLabel: "Development",
        longLabel: "Development, Research, and Services",
        summary: "<ul><li>Product development (Protocol testing, optimization, and customization); </li><li>Non-funded research; </li><li>Services (proposal and manuscript review not associated with clients, society participation, committees etc…).</li></ul>" },
      { csvHeader: "pctGrants",
        shortLabel: "Grants",
        longLabel: "Effort on grants",
        summary: "<ul><li>Efforts devoted to a funded project with salary support.</li></ul>" },
      ];

  this.groups = [
      { name : 'informatics',
        members : ['dansomers','dleehr','hlapp','johnbradley','netscruff','rosedaniels','gsteffen1921'],
        categories : informaticsCategories },
      { name : 'proteomics',
        members: ['trackmytime','Will-Thompson','mamoseley','mwfoster','mabbett','gmw12','es3064','Stirman02'],
        categories : proteomicsCategories },
      { name : 'microbiome',
        members: ['hhemric','novemberboys','rowle001','zzzwei'],
        categories : microbiomeCategories },
      { name : 'sequencing',
        members: [ 'fy13duke', 'gca2', 'KaiaQ', 'nicholashoang', 'nicolasdevos1478', 'ofedrigo', 'wendyparris', 'lkhong1'],
        categories : sequencingCategories },
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
