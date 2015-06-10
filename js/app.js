var app = angular.module('reportcard', [ 'nvd3ChartDirectives','ui.bootstrap', 'oauth.io', 'ReportCardUserModule'])
  .controller('ReportCardCtrl', function(OAuth, UserModelService, $rootScope) {
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
});

var userModelService = angular.module('ReportCardUserModule', ['ngCookies']).service('UserModelService', function($http, $rootScope, $cookies) {
  // Singleton data model object - stores user and token
  var localThis = this;
  localThis.userModel = {user: null, accessToken: null};
  // User is exposed publicly
  this.getUserName = function() {
    return localThis.userModel.user;
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
  var githubRoot = 'https://api.github.com';
  this.lookupUser = function(callback) {
    $http.get(githubRoot + '/user?' + this.tokenAsParameter())
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
