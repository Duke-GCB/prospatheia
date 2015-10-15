var gitHubRoot = 'https://api.github.com';

var app = angular.module('reportcard', [ 'nvd3ChartDirectives','ui.bootstrap', 'oauth.io', 'ReportCardUserModule','ReportCardCSVDataModule','ReportCardEffortGroupModule'])
  .controller('ReportCardCtrl', function(OAuth, UserModelService, CSVDataService, $rootScope, EffortGroupService) {
    var reportCard = this;

    // Headers, with display names
    reportCard.loadCSVHeaders = function() {
      // The CSV headers array is extracted from the groups
      var csvHeaders = [
        { key: "user", value: "User" },
        { key: "startDate", value: "Start" },
        { key: "endDate", value: "End" }
      ];
      var categories = EffortGroupService.categoriesForUser(reportCard.user);
      categories.forEach(function(category) {
        csvHeaders.push({ key: category.csvHeader, value: category.shortLabel });
      });
      reportCard.csvHeaders = csvHeaders;
      // For display purposes we don't show the user name
      reportCard.displayHeaders = csvHeaders.slice(1);
    };

    reportCard.resetEffort = function() {
      var categories = EffortGroupService.categoriesForUser(reportCard.user);
      var effort = categories.map(function(category) {
        return { key: category.shortLabel,
                 y: 1, // will be normalized
                 title: category.longLabel,
                 summary: category.summary};
      });
      reportCard.effort = effort;
      reportCard.normalizeEffort();
    };


    // Date handling
    // Date is stored internally as Date. We convert to 'YYYY-MM-DD' when saving to CSV

    var convertDate = function(date) {
      return formatLocalDate(date).substring(0,10);
    };

    /*
      Originally dates were converted to strings using date.toISOString(), but this uses
      UTC, so could be off by a day. formatLocalDate() uses local timezone
      via http://stackoverflow.com/questions/17415579/how-to-iso-8601-format-a-date-with-timezone-offset-in-javascript
    */

    var pad = function(num) {
      var norm = Math.abs(Math.floor(num));
      return (norm < 10 ? '0' : '') + norm;
    };

    var formatTZO = function(date) {
      var tzo = -date.getTimezoneOffset(),
        dif = tzo >= 0 ? '+' : '-';
        return dif + pad(tzo / 60) + ':' + pad(tzo % 60);
    }

    var formatLocalDate = function(date) {
      return date.getFullYear()
          + '-' + pad(date.getMonth()+1)
          + '-' + pad(date.getDate())
          + 'T' + pad(date.getHours())
          + ':' + pad(date.getMinutes())
          + ':' + pad(date.getSeconds())
          + formatTZO(date);
    }

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
      // Normalization happens in two phases
      // 1. scale to 100 and round to integer percentages
      var total = reportCard.effort.map(function(each) {
        return Number(each.y);
      }).reduce(function(prev, curr) {
        return prev + curr;
      });
      var factor = total / 100;
      var normalized = angular.copy(reportCard.effort);
      normalized.forEach(function(curr) {
        curr.y = Math.round(curr.y / factor);
      });

      // 2. If any rounding causes efforts not to add to 100, fix surpluses/shortfalls
      var totals = function(effortArray) {
        return effortArray.map(function(c) { return c.y; }).reduce(function(p,c) { return p+c; });
      };

      var surplus = totals(normalized) - 100; // Are we at exactly 100?
      if(surplus != 0) { // If we're at 100, don't want to divide 0 by 0.
        // If over 100, unit should be -1, otherwise +1
        var unit = -(Math.abs(surplus) / surplus);
        // Distribute the surplus or shortfall
        for(var i=0;i<Math.abs(surplus);i++) {
          // Add (or subtract) the unit to the efforts array,
          // using modulo in case we have more surplus than efforts
          normalized[i % normalized.length].y += unit;
        }
      }
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
          effort[index].y = Number(currentValue);
        });
        reportCard.effort = effort;
      }
    };

    var daysBetween = function(startDate, endDate) {
      var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
      return Math.round(Math.abs((startDate.getTime() - endDate.getTime())/(oneDay)));
    };

    // via http://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-in-javascript
    var isValidDate = function(date) {
      if ( Object.prototype.toString.call(date) === "[object Date]" ) {
        // it is a date
        if ( isNaN( date.getTime() ) ) {  // d.valueOf() could also work
          // date is not valid
          return false;
        } else {
          // date is valid
          return true;
        }
      } else {
        // not a date
        return false;
      }
    };

    // Sets dates to assume next period
    reportCard.defaultToNextPeriod = function() {
      if(reportCard.efforts.length == 0) {
        // Can't calculate period without a report
        return;
      }
      var lastEffortRow = reportCard.efforts[reportCard.efforts.length - 1];

      // When reading dates in a format like '2015-08-10', they will be assumed UTC
      // Unless we provide a timezone offset
      var tzo = formatTZO(new Date());
      var lastStartDate = new Date(lastEffortRow['startDate'] + 'T00:00:00' + tzo);
      var lastEndDate = new Date(lastEffortRow['endDate'] + 'T00:00:00' + tzo);

      if(!isValidDate(lastStartDate) || !isValidDate(lastEndDate)) {
        // Can't calculate period without valid dates
        return;
      }
      // Default startDate to lastEndDate + 1 day
      var startDate = new Date(lastEndDate);
      startDate.setDate(lastEndDate.getDate() + 1);

      // Default endDate to startDate + last period
      var lastPeriod = daysBetween(lastStartDate, lastEndDate);
      var endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + lastPeriod);

      var startDateObject = reportCard.dateModel[0]; // Contains date at .date
      var endDateObject = reportCard.dateModel[1]; // Contains date at .date

      // Now set the calculated dates into the model
      startDateObject.date = startDate;
      endDateObject.date = endDate;

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
      reportCard.loadCSVHeaders();
      reportCard.loadData();
      reportCard.resize();
    });

    // CSV data to<->from GitHub
    reportCard.loadData = function(successMessage) {
      CSVDataService.readCSV(function(err, rows) {
        if(err) {
          // GitHub will return 404 error for either Not Found or
          // Private repo, we're not telling you.
          // Optimistically we'll assume new user and if user
          // does not have access to the repo, saving will fail later
          if(err.status == 404) {
            reportCard.status = 'No effort reported';
            reportCard.statusClass = 'alert-info';
            reportCard.efforts = [];
            reportCard.dirty = false;
            reportCard.csvFileExists = false;
            reportCard.resetEffort();
          } else {
            reportCard.status = err.data.message;
            reportCard.statusClass = 'alert-danger';
          }
        } else {
          reportCard.status = successMessage || 'Loaded data successfully';
          reportCard.statusClass = 'alert-success';
          reportCard.efforts = rows;
          reportCard.dirty = false;
          reportCard.csvFileExists = true;
          reportCard.resetEffort();
          reportCard.defaultToLastEffort();
          reportCard.defaultToNextPeriod();
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
      CSVDataService.writeCSV(reportCard.efforts, reportCard.csvFileExists, function(err) {
        // Clear out dirty regardless of success or failure
        // Dirty controls the status box
        reportCard.dirty = false;
        if(err) {
          reportCard.status = err;
          reportCard.statusClass = 'alert-danger';
        } else {
          var dateString = new Date().toString();
          reportCard.status = 'Saved for ' + UserModelService.getUserName() + ' on ' + dateString;
          // Previously was calling loadData here to update the SHA, but the API doesn't
          // return the new SHA fast enough
          reportCard.statusClass = 'alert-success';
          reportCard.csvFileExists = true;
          reportCard.defaultToLastEffort();
          reportCard.defaultToNextPeriod();
        }
      });
    };

    reportCard.getStatusClass = function() {
      if(reportCard.dirty) {
        return 'alert-warning';
       } else {
        return reportCard.statusClass;
       }
    };

    reportCard.getStatusText = function() {
      if(reportCard.dirty) {
        return 'Unsaved changes';
       } else {
        return reportCard.status;
       }
    };

    // Initialization
    reportCard.title = 'GCB Effort Reporting';
    reportCard.status = '';
    reportCard.statusClass = ''
    reportCard.dirty = false;
    // Assume the file exists until we know it doesn't.
    // This way, we can't accidentally clobber an existing file by not loading the previous
    // version's SHA
    reportCard.csvFileExists = false;
    reportCard.csvHeaders = [];
    reportCard.efforts = [];
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
  this.writeCSV = function(rows, updateExistingFile, callback) { // callback args are (err)
    var sha = localThis.sha || '';
    if(sha.length == 0 && updateExistingFile) {
      callback('No SHA for previous file. Has the file been loaded first?');
      return;
    }
    // transform the JS Array back to CSV
    var csv = d3.csv.format(angular.copy(rows)); // Copy to remove $$hashKey which is added by angular
    // Add a newline at the end - d3.csv.format doesn't put newlines at end
    csv = csv + '\n';
    // Base64-encode it
    var encodedContent = btoa(csv);
    // Construct a commit message
    var message = 'Updates by ' + UserModelService.getUserName();
    // Commit
    ReportCardGitHubAPIService.commitFile(encodedContent, message, sha, function(err, data) {
      // Have to read the commit SHA out of data, since an immediate API call won't update
      if(err) {
        var message = err.data.message;
        if(err.status == 409) { // code 409 is a conflict
          message = 'Error: the file on GitHub has changed since you loaded it. Please wait few seconds, reset, and try again. (' + message + ')';
        } else if(err.status == 404) {
          message = 'Your file could not be saved. Please contact your administrator to verify your GitHub account is configured for access.';
        }
        callback(message);
      } else {
        localThis.sha = data.content.sha;
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
        callback({'data': data, 'status': status});
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
        callback({'data': data, 'status': status});
      });
  };
});

