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
    reportCard.addEffort = function() {
      reportCard.efforts.push(angular.copy(reportCard.effort));
    }
    reportCard.login = function() {
      OAuth.popup('github');
    };
    $rootScope.$on('login', function(event) {
      reportCard.user = UserModelService.getUserName();
    });
});

var userModelService = angular.module('ReportCardUserModule', []).service('UserModelService', function($http, $rootScope) {
  var githubRoot = 'https://api.github.com';
  var localThis = this;
  localThis.userModel = {};
  this.getUserModel = function() {
    return localThis.userModel;
  };
  this.getUserName = function() {
    return localThis.userModel.user;
  };
  this.lookupUser = function(handler) {
    var h = handler;
    $http.get(githubRoot + '/user?' + this.tokenAsParameter())
      .success(function(data) {
        console.log(data);
        localThis.userModel.user = data.login;
        handler(null);
      })
      .error(function(data, status, headers, config) {
        handler(data);
      });
  };
  this.setAccessToken = function(accessToken) {
    localThis.userModel.accessToken = accessToken;
    console.log('accessToken: ' + accessToken);
    this.lookupUser();
  };
  this.tokenAsParameter = function() {
    return 'access_token=' + localThis.userModel.accessToken;
  }
  this.notifyLogin = function() {
    $rootScope.$broadcast('login');
  };
  this.notifyError = function(error) {
    // TODO: implement error
  };
  this.handleToken = function(accessToken) {
    localThis.setAccessToken(accessToken);
    var handler = f;
    localThis.lookupUser(function(err) {
      if(err) {
        localThis.notifyError(err);
      } else {
        localThis.notifyLogin();
      }
    });
  };
});

app.config(['OAuthProvider', function (OAuthProvider) {
  OAuthProvider.setPublicKey('_kdpfaZV5uH9ByiaekYxsbhdS4U');
  OAuthProvider.setHandler('github', function (OAuthData, $http, UserModelService) {
    console.log(OAuthData.result);
    // save the token, get the userid
    UserModelService.handleToken(OAuthData.result.access_token);

  });
}]);
