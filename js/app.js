var gitHubRoot = 'https://api.github.com';

var app = angular.module('reportcard', [ 'nvd3ChartDirectives','ui.bootstrap', 'oauth.io', 'ReportCardUserModule','ReportCardCSVDataModule'])
  .controller('ReportCardCtrl', function(OAuth, UserModelService, CSVDataService, $rootScope) {
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

    // Add this effort to the list
    reportCard.addEffort = function() {
      reportCard.efforts.push(angular.copy(reportCard.effort));
    }

    reportCard.login = function() {
      OAuth.popup('github');
    };

    reportCard.logout = function() {
      UserModelService.logout();
    };

    $rootScope.$on('userChanged', function(event) {
      reportCard.user = UserModelService.getUserName();
    });

    // CSV data to<->from GitHub
    reportCard.error = '';
    reportCard.loadData = function() {
      CSVDataService.readCSV(function(err, rows) {
        if(err) {
          reportCard.error = err;
        } else {
          reportCard.error = '';
          reportCard.data = rows;
          console.log(rows);
        }
      });
    };

    reportCard.commitData = function() {
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
        var decodedContent = atob(data.content);
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
    var csv = d3.csv.format(rows);
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
    var accessToken = $cookies.rcghAccessToken;
    if(accessToken != null) {
      localThis.handleToken(accessToken);
    }
  };

  this.saveCookies = function() {
    if(localThis.userModel.accessToken != null) {
      $cookies.rcghAccessToken = localThis.userModel.accessToken;
    }
  };

  this.clearCookies = function () {
    $cookies.rcghAccessToken = null;
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
  this.owner = 'Leehro';
  this.repo = 'csv-report-data';
  this.path = 'data.csv';
  this.buildURL = function() {
    return gitHubRoot + '/repos/' + localThis.owner + '/' + localThis.repo + '/contents/' + localThis.path;
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

