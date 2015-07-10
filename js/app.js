var gitHubRoot = 'https://api.github.com';

var app = angular.module('reportcard', [ 'nvd3ChartDirectives','ui.bootstrap', 'oauth.io', 'ReportCardUserModule','ReportCardCSVDataModule'])
  .controller('ReportCardCtrl', function(OAuth, UserModelService, CSVDataService, $rootScope) {
    var reportCard = this;
    reportCard.title = 'GCB Effort Reporting';

    // Headers, with display names
    reportCard.csvHeaders = [
      { key: "user", value: "User" },
      { key: "startDate", value: "Start" },
      { key: "endDate", value: "End" },
      { key: "pctResDev", value: "% R&D" },
      { key: "pctAdmin", value: "% Admin" },
      { key: "pctCollabRes", value: "% Collab. Research" },
      { key: "pctInfra", value: "% Infrastructure" },
      { key: "pctTicket", value: "% Tickets" }
    ];

    reportCard.resetEffort = function() {
      reportCard.effort = [
        {key: "R&D",
         y: 20,
         title: "Research & Development",
         summary: "Self-directed work, work initiated in Informatics, and professional development"},
        {key: "Admin",
         y: 20,
         title: "Administrative",
         summary: "Staff meetings, emails, administrative work, and HR-required training"},
        {key: "Collab. Research",
         y:20,
         title: "Collaborative Projects",
         summary: "Collaborative projects (even if they originated from tickets); typically includes intellectual contribution of some kind, in contrast to troubleshooting or fulfilling service requests"},
        {key: "Infrastructure",
         y: 20,
         title: "Infrastructure Projects",
         summary: "Physical or virtual work that affects multiple users (in contrast to an individual requestor on a ticket)"},
        {key: "Tickets",
         y: 20,
         title: "Ticket-based Work",
         summary: "Work responding to requests or reports sent to IT, in contrast to initiated in IT; includes such work even if not recorded in a ticket; should not include collaborative or infrastructure projects (which sometimes start as a ticket)"}
      ];
    }
    reportCard.resetEffort();
    reportCard.efforts = [];

    // Date handling
    // Date is stored internally as Date. We convert to 'YYYY-MM-DD' when saving to CSV

    var convertDate = function(date) {
      return date.toISOString().substring(0,10);
    };

    reportCard.dateModel = [
      {'date':new Date(), 'open':false, 'label':'Start'},
      {'date':new Date(), 'open':false, 'label':'End'}
    ];

    // Date pickers
    reportCard.datePickerOpen = false;
    reportCard.openDatePicker = function($event, dateModel) {
      $event.preventDefault();
      $event.stopPropagation();
      dateModel.open = true;
    };

    // Data-binding is to whole collection, not individual slices
    var changeEffort = function(index, delta) {
      var effort = angular.copy(reportCard.effort)
      effort[index].y = effort[index].y + delta;
      reportCard.effort = effort;
    };
    reportCard.reduceEffort = function(index) {
      changeEffort(index, -5);
    };
    reportCard.increaseEffort = function(index) {
      changeEffort(index, 5);
    };
    reportCard.normalizeEffort = function() {
      var total = reportCard.effort.map(function(each) {
        return Number(each.y);
      }).reduce(function(prev, curr) {
        return prev + curr;
      });
      var factor = total / 100;
      var normalized = angular.copy(reportCard.effort);
      normalized.forEach(function(curr) {
        curr.y = curr.y / factor;
      });
      reportCard.effort = normalized;
    };

    // D3 handling - functions to provide data values for x/y
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

    reportCard.tooltipFunction = function() {
      return function(key, x, y, e, graph) {
        var title = reportCard.effort[y.pointIndex].title;
        var summary = reportCard.effort[y.pointIndex].summary;
        var tooltip = '<div class="report-card-tooltip"><p class="report-card-tooltip title">' + title +'</p><p class="report-card-tooltip summary">' + summary +'</p></div>';
        return tooltip;
      }
    };

    // Private function to make a row object with provided data
    var makeRow = function(user, startDate, endDate, effortArray) {
      var row = {};
      row.user = user;
      row.startDate = startDate;
      row.endDate = endDate;
      // since effortArray is an array, we'll index it
      var keys = reportCard.csvHeaders.map(function(header) { return header.key; });
      keys.forEach(function(key, keyIndex) {
        if(key.indexOf('pct') == 0) {
          row[key] = effortArray[keyIndex - 3].y;
        }
      });
      return row;
    };

    var extractEffortValues = function(row) {
      // Incoming row is an object that maps CSV fields to values
      // This extracts the effort percentages in the same order as the CSV fields.
      var extracted = [];
      var keys = reportCard.csvHeaders.map(function(header) { return header.key; });
      keys.forEach(function(key, keyIndex) {
        if(key.indexOf('pct') == 0) {
          extracted.push(row[key]);
        }
      });
      return extracted;
    }

    // Add this effort to the list
    reportCard.addEffort = function() {
      // make a new object
      var user = reportCard.user;
      var startDate = convertDate(reportCard.dateModel[0].date);
      var endDate = convertDate(reportCard.dateModel[1].date);
      var effort = reportCard.effort;
      var row = makeRow(user, startDate, endDate, effort);
      reportCard.efforts.push(row);
      reportCard.dirty = true;
    }

    // Sets effort in pie chart to the last effort
    reportCard.defaultToLastEffort = function() {
      if(reportCard.efforts.length > 0) {
        // get the CSV-ready row
        var lastEffortRow = reportCard.efforts[reportCard.efforts.length - 1];
        // splice off the user, start, and end date
        var lastEffortValues = extractEffortValues(lastEffortRow);
        var effort = angular.copy(reportCard.effort);
        // now inject the values into the effort array
        lastEffortValues.forEach(function(currentValue, index) {
          effort[index].y = currentValue;
        });
        reportCard.effort = effort;
      }
    };
    reportCard.login = function() {
      OAuth.popup('github');
    };

    reportCard.logout = function() {
      UserModelService.logout();
    };

    // The svg graph is sized based on its parent.
    // Since its div container is initially hidden (ng-show="reportCard.user"),
    // the svg is sized very small. When the container is hidden, the svg doesn't
    // get resized automatically, so we trigger a window event on the next loop
    reportCard.resize = function() {
      setTimeout(function() {
        window.dispatchEvent(new Event('resize'));
      }, 0);
    };

    $rootScope.$on('userChanged', function(event) {
      reportCard.user = UserModelService.getUserName();
      reportCard.loadData();
      reportCard.resize();
    });

    // CSV data to<->from GitHub
    reportCard.status = '';
    reportCard.statusClass = ''
    reportCard.dirty = false;
    reportCard.efforts = [];
    reportCard.loadData = function(successMessage) {
      CSVDataService.readCSV(function(err, rows) {
        if(err) {
          reportCard.status = err;
          reportCard.statusClass = 'alert-danger';
        } else {
          reportCard.status = successMessage || 'Loaded data successfully';
          reportCard.statusClass = 'alert-success';
          reportCard.efforts = rows;
          reportCard.dirty = false;
          reportCard.defaultToLastEffort();
        }
      });
    };

    reportCard.commitData = function() {
      if(!reportCard.dirty) {
        // No changes
          reportCard.status = 'No changes';
          reportCard.statusClass = 'alert-info';
        return;
      }
      CSVDataService.writeCSV(reportCard.efforts, function(err) {
        if(err) {
          reportCard.status = err;
          reportCard.statusClass = 'alert-danger';
        } else {
          var dateString = new Date().toString();
          // Call loadData so that we have the SHA of the data we just saved, and customize message
          reportCard.loadData('Saved for ' + UserModelService.getUserName() + ' on ' + dateString);
        }
      });
    };
});

// Actually depends on d3
var csvDataService = angular.module('ReportCardCSVDataModule', ['ReportCardGitHubAPIModule','ReportCardUserModule']).service('CSVDataService', function(ReportCardGitHubAPIService, UserModelService) {
  var localThis = this;
  this.sha = ''; // SHA of the last-read file, initialized to empty string
  this.readCSV = function(callback) { // callback args are (err, rows)
    ReportCardGitHubAPIService.loadFile(function(err, data) {
      if(err) {
        callback(err);
      } else {
        localThis.sha = data.sha;
        // Data comes from the service base64-encoded
        var decodedContent = atob(data.content.replace(/\s/g, ''));
        // Convert the csv text data to a JS Array
        var rows = d3.csv.parse(decodedContent);
        callback(null, rows);
      }
    });
  };
  this.writeCSV = function(rows, callback) { // callback args are (err)
    var sha = localThis.sha || '';
    if(sha.length == 0) {
      callback('No SHA for previous file. Has the file been loaded first?');
      return;
    }
    // transform the JS Array back to CSV
    var csv = d3.csv.format(angular.copy(rows)); // Copy to remove $$hashKey which is added by angular
    // Base64-encode it
    var encodedContent = btoa(csv);
    // Construct a commit message
    var message = 'Updates by ' + UserModelService.getUserName();
    // Commit
    ReportCardGitHubAPIService.commitFile(encodedContent, message, sha, function(err) {
      if(err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  };
});

var userModelService = angular.module('ReportCardUserModule', ['ngCookies']).service('UserModelService', function($http, $rootScope, $cookies) {
  // Singleton data model object - stores user and token
  var localThis = this;
  localThis.userModel = {user: null, accessToken: null};
  // User is exposed publicly
  this.getUserName = function() {
    return localThis.userModel.user;
  };

  // Token is also exposed
  this.getAccessToken = function() {
    return localThis.userModel.accessToken;
  };

  // Cookie handling
  this.loadCookies = function() {
    var accessToken = $cookies.get('rcghAccessToken');
    if(accessToken != null) {
      localThis.handleToken(accessToken);
    }
  };

  this.saveCookies = function() {
    if(localThis.userModel.accessToken != null) {
      $cookies.put('rcghAccessToken',localThis.userModel.accessToken);
    }
  };

  this.clearCookies = function () {
    $cookies.remove('rcghAccessToken');
  };

  // GitHub API calls
  this.lookupUser = function(callback) {
    $http.get(gitHubRoot + '/user?' + this.tokenAsParameter())
      .success(function(data) {
        localThis.userModel.user = data.login;
        callback();
      })
      .error(function(data, status, headers, config) {
        callback(data);
      });
  };

  this.logout = function(callback) {
    localThis.clearCookies();
    localThis.userModel = {user: null, accessToken: null};
    localThis.notifyUserChanged();
  }

  this.setAccessToken = function(accessToken) {
    // TODO: store token in a cookie and recheck it later
    localThis.userModel.accessToken = accessToken;
    localThis.saveCookies();
  };
  this.tokenAsParameter = function() {
    return 'access_token=' + localThis.userModel.accessToken;
  }
  this.notifyUserChanged = function() {
    $rootScope.$broadcast('userChanged');
  };
  this.notifyError = function(error) {
    // TODO: implement error
  };
  this.handleToken = function(accessToken) {
    localThis.setAccessToken(accessToken);
    localThis.lookupUser(function(err) {
      if(err) {
        localThis.notifyError(err);
      } else {
        localThis.notifyUserChanged();
      }
    });
  };

  // On startup, load cookies
  this.loadCookies();
});

app.config(['OAuthProvider', function (OAuthProvider) {
  OAuthProvider.setPublicKey('_kdpfaZV5uH9ByiaekYxsbhdS4U');
  OAuthProvider.setHandler('github', function (OAuthData, $http, UserModelService) {
    // Received a token from GitHub, handle this
    UserModelService.handleToken(OAuthData.result.access_token);
  });
}]);

var gitHubAPIService = angular.module('ReportCardGitHubAPIModule', ['ReportCardUserModule']).service('ReportCardGitHubAPIService', function($http, $rootScope, $cookies, UserModelService) {
  // exposes functions loadFile and commitFile
  // https://developer.github.com/v3/repos/contents/#get-contents
  // https://developer.github.com/v3/repos/contents/#update-a-file

  var localThis = this;
  // For testing purposes only - using a test account with no organization memberships, since we need full repo access
  this.owner = 'Duke-GCB';
  this.repo = 'reportcard-data';
  this.buildURL = function() {
    return gitHubRoot + '/repos/' + localThis.owner + '/' + localThis.repo + '/contents/' + UserModelService.getUserName() + '.csv';
  };

  this.buildConfig = function() {
    return { 'headers' : { 'Authorization' :'token ' + UserModelService.getAccessToken() } };
  };

  this.loadFile = function(callback) {
    // GET /repos/:owner/:repo/contents/:path
    $http.get(localThis.buildURL(), localThis.buildConfig())
      .success(function(data) {
        callback(null, data);
      })
      .error(function(data, status, headers, config) {
        callback(data);
      });
  };
  this.commitFile = function(content, message, sha, callback) {
    // PUT /repos/:owner/:repo/contents/:path
    var data = {
      'content': content, // must be base64-encoded
      'message': message,
      'sha': sha
    };
    $http.put(localThis.buildURL(), data, localThis.buildConfig())
      .success(function(data) {
        callback(null, data);
      })
      .error(function(data, status, headers, config) {
        callback(data);
      });
  };
});

