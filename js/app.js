var gitHubRoot = 'https://api.github.com';

var app = angular.module('prospatheia', [ 'nvd3ChartDirectives','ui.bootstrap', 'oauth.io', 'ProspatheiaUserModule','ProspatheiaCSVDataModule','ProspatheiaEffortGroupModule'])
  .controller('ProspatheiaCtrl', function(OAuth, UserModelService, CSVDataService, $rootScope, EffortGroupService) {
    var prospatheia = this;

    // Headers, with display names
    prospatheia.loadCSVHeaders = function() {
      // The CSV headers array is extracted from the groups
      var csvHeaders = [
        { key: "user", value: "User" },
        { key: "groups", value: "Group" },
        { key: "startDate", value: "Start" },
        { key: "endDate", value: "End" }
      ];
      var categories = EffortGroupService.categoriesForUser(prospatheia.user);
      categories.forEach(function(category) {
        csvHeaders.push({ key: category.csvHeader, value: category.shortLabel });
      });

      prospatheia.csvHeaders = csvHeaders;
      // For display purposes we don't show the user name or groups
      prospatheia.displayHeaders = csvHeaders.slice(2);
    };

    prospatheia.resetEffort = function() {
      var categories = EffortGroupService.categoriesForUser(prospatheia.user);
      var effort = categories.map(function(category) {
        return { key: category.shortLabel,
                 y: 1, // will be normalized
                 title: category.longLabel,
                 summary: category.summary};
      });
      prospatheia.effort = effort;
      prospatheia.normalizeEffort();
    };

    // Pagination

    prospatheia.pageSize = 10;
    prospatheia.currentPage = 0;
    prospatheia.numberOfPages=function() {
      return Math.ceil(prospatheia.effort.length/prospatheia.pageSize);
    }

    prospatheia.nextPage = function() {
      prospatheia.currentPage = prospatheia.currentPage + 1;
    };

    prospatheia.previousPage = function() {
      prospatheia.currentPage = prospatheia.currentPage - 1;
    };

    prospatheia.disableNextPage = function() {
      return prospatheia.currentPage >= prospatheia.effort.length/prospatheia.pageSize - 1;
    };

    prospatheia.disablePreviousPage = function() {
      return prospatheia.currentPage == 0;
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

    prospatheia.dateModel = [
      {'date':new Date(), 'open':false, 'label':'Start'},
      {'date':new Date(), 'open':false, 'label':'End'}
    ];

    // Date pickers
    prospatheia.datePickerOpen = false;
    prospatheia.openDatePicker = function($event, dateModel) {
      $event.preventDefault();
      $event.stopPropagation();
      dateModel.open = true;
    };

    // Data-binding is to whole collection, not individual slices
    var changeEffort = function(index, delta) {
      var effort = angular.copy(prospatheia.effort)
      effort[index].y = effort[index].y + delta;
      prospatheia.effort = effort;
    };
    prospatheia.reduceEffort = function(index) {
      changeEffort(index, -5);
    };
    prospatheia.increaseEffort = function(index) {
      changeEffort(index, 5);
    };
    prospatheia.normalizeEffort = function() {
      // Normalization happens in two phases
      // 1. scale to 100 and round to integer percentages
      var total = prospatheia.effort.map(function(each) {
        return Number(each.y);
      }).reduce(function(prev, curr) {
        return prev + curr;
      });
      var factor = total / 100;
      var normalized = angular.copy(prospatheia.effort);
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
      prospatheia.effort = normalized;
    };

    // D3 handling - functions to provide data values for x/y
    prospatheia.xFunction = function() {
      return function(d) {
        return d.key;
      }
    };

    prospatheia.yFunction = function() {
      return function(d) {
        return d.y;
      }
    };

    prospatheia.tooltipFunction = function() {
      return function(key, x, y, e, graph) {
        var title = prospatheia.effort[y.pointIndex].title;
        var summary = prospatheia.effort[y.pointIndex].summary;
        var tooltip = '<div class="prospatheia-tooltip"><p class="prospatheia-tooltip title">' + title +'</p><p class="prospatheia-tooltip summary">' + summary +'</p></div>';
        return tooltip;
      }
    };

    // Private function to make a row object with provided data
    var makeRow = function(user, groups, startDate, endDate, effortArray) {
      var row = {};
      row.user = user;
      row.groups = groups;
      row.startDate = startDate;
      row.endDate = endDate;
      // since effortArray is an array, we'll index it
      var keys = prospatheia.csvHeaders.map(function(header) { return header.key; });
      // The keys array will be larger than the efforts array, since it includes
      // user, groups, etc.
      var offset = Object.keys(row).length;
      for(var keyIndex=offset;keyIndex < keys.length;keyIndex++) {
        row[keys[keyIndex]] = effortArray[keyIndex - offset].y;
      }
      return row;
    };

    var extractEffortValues = function(row) {
      // Incoming row is an object that maps CSV fields to values
      // This extracts the effort percentages in the same order as the CSV fields.
      var extracted = [];
      var keys = prospatheia.csvHeaders.map(function(header) { return header.key; });
      keys.forEach(function(key, keyIndex) {
        if(key.indexOf('pct') == 0) {
          var value = "0";
          if(row.hasOwnProperty(key)) {
            value = row[key];
          }
          extracted.push(value);
        }
      });
      return extracted;
    }

    // Add this effort to the list
    prospatheia.addEffort = function() {
      // make a new object
      var user = prospatheia.user;
      var groups = prospatheia.groups.join(',');
      var startDate = convertDate(prospatheia.dateModel[0].date);
      var endDate = convertDate(prospatheia.dateModel[1].date);
      var effort = prospatheia.effort;
      var row = makeRow(user, groups, startDate, endDate, effort);
      prospatheia.efforts.push(row);
      prospatheia.dirty = true;
    }

    // Sets effort in pie chart to the last effort
    prospatheia.defaultToLastEffort = function() {
      if(prospatheia.efforts.length > 0) {
        // get the CSV-ready row
        var lastEffortRow = prospatheia.efforts[prospatheia.efforts.length - 1];
        // splice off the user, start, and end date
        var lastEffortValues = extractEffortValues(lastEffortRow);
        var effort = angular.copy(prospatheia.effort);
        // now inject the values into the effort array
        lastEffortValues.forEach(function(currentValue, index) {
          effort[index].y = Number(currentValue);
        });
        prospatheia.effort = effort;
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
    prospatheia.defaultToNextPeriod = function() {
      if(prospatheia.efforts.length == 0) {
        // Can't calculate period without a report
        return;
      }
      var lastEffortRow = prospatheia.efforts[prospatheia.efforts.length - 1];

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

      var startDateObject = prospatheia.dateModel[0]; // Contains date at .date
      var endDateObject = prospatheia.dateModel[1]; // Contains date at .date

      // Now set the calculated dates into the model
      startDateObject.date = startDate;
      endDateObject.date = endDate;

    };

    prospatheia.login = function() {
      OAuth.popup('github');
    };

    prospatheia.logout = function() {
      UserModelService.logout();
    };

    // The svg graph is sized based on its parent.
    // Since its div container is initially hidden (ng-show="prospatheia.user"),
    // the svg is sized very small. When the container is hidden, the svg doesn't
    // get resized automatically, so we trigger a window event on the next loop
    prospatheia.resize = function() {
      setTimeout(function() {
        window.dispatchEvent(new Event('resize'));
      }, 0);
    };

    $rootScope.$on('userChanged', function(event) {
      prospatheia.user = UserModelService.getUserName();
      prospatheia.groups = EffortGroupService.groupNamesForUser(prospatheia.user);
      prospatheia.loadCSVHeaders();
      prospatheia.loadData();
      prospatheia.resize();
    });

    // CSV data to<->from GitHub
    prospatheia.loadData = function(successMessage) {
      CSVDataService.readCSV(function(err, rows) {
        if(err) {
          // GitHub will return 404 error for either Not Found or
          // Private repo, we're not telling you.
          // Optimistically we'll assume new user and if user
          // does not have access to the repo, saving will fail later
          if(err.status == 404) {
            prospatheia.status = 'No effort reported';
            prospatheia.statusClass = 'alert-info';
            prospatheia.efforts = [];
            prospatheia.dirty = false;
            prospatheia.csvFileExists = false;
            prospatheia.resetEffort();
          } else {
            prospatheia.status = err.data.message;
            prospatheia.statusClass = 'alert-danger';
          }
        } else {
          prospatheia.status = successMessage || 'Loaded data successfully';
          prospatheia.statusClass = 'alert-success';
          prospatheia.efforts = rows;
          prospatheia.dirty = false;
          prospatheia.csvFileExists = true;
          prospatheia.resetEffort();
          prospatheia.defaultToLastEffort();
          prospatheia.defaultToNextPeriod();
        }
      });
    };

    prospatheia.commitData = function() {
      if(!prospatheia.dirty) {
        // No changes
        prospatheia.status = 'No changes';
        prospatheia.statusClass = 'alert-info';
        return;
      }
      CSVDataService.writeCSV(prospatheia.efforts, prospatheia.csvFileExists, function(err) {
        // Clear out dirty regardless of success or failure
        // Dirty controls the status box
        prospatheia.dirty = false;
        if(err) {
          prospatheia.status = err;
          prospatheia.statusClass = 'alert-danger';
        } else {
          var dateString = new Date().toString();
          prospatheia.status = 'Saved for ' + UserModelService.getUserName() + ' on ' + dateString;
          // Previously was calling loadData here to update the SHA, but the API doesn't
          // return the new SHA fast enough
          prospatheia.statusClass = 'alert-success';
          prospatheia.csvFileExists = true;
          prospatheia.defaultToLastEffort();
          prospatheia.defaultToNextPeriod();
        }
      });
    };

    prospatheia.getStatusClass = function() {
      if(prospatheia.dirty) {
        return 'alert-warning';
       } else {
        return prospatheia.statusClass;
       }
    };

    prospatheia.getStatusText = function() {
      if(prospatheia.dirty) {
        return 'Unsaved changes';
       } else {
        return prospatheia.status;
       }
    };

    // Initialization
    prospatheia.title = 'GCB Effort Reporting';
    prospatheia.status = '';
    prospatheia.statusClass = ''
    prospatheia.dirty = false;
    // Assume the file exists until we know it doesn't.
    // This way, we can't accidentally clobber an existing file by not loading the previous
    // version's SHA
    prospatheia.csvFileExists = false;
    prospatheia.csvHeaders = [];
    prospatheia.efforts = [];
});

// Actually depends on d3
var csvDataService = angular.module('ProspatheiaCSVDataModule', ['ProspatheiaGitHubAPIModule','ProspatheiaUserModule']).service('CSVDataService', function(ProspatheiaGitHubAPIService, UserModelService) {
  var localThis = this;
  this.sha = ''; // SHA of the last-read file, initialized to empty string
  this.readCSV = function(callback) { // callback args are (err, rows)
    ProspatheiaGitHubAPIService.loadFile(function(err, data) {
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
    ProspatheiaGitHubAPIService.commitFile(encodedContent, message, sha, function(err, data) {
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

var userModelService = angular.module('ProspatheiaUserModule', ['ngCookies']).service('UserModelService', function($http, $rootScope, $cookies) {
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

var gitHubAPIService = angular.module('ProspatheiaGitHubAPIModule', ['ProspatheiaUserModule']).service('ProspatheiaGitHubAPIService', function($http, $rootScope, $cookies, UserModelService) {
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

// For pagination
app.filter('startFrom', function() {
    return function(input, start) {
        start = +start; //parse to int
        return input.slice(start);
    }
});

app.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});
