var app = angular.module('reportcard', [ 'nvd3ChartDirectives','ui.bootstrap', 'oauth.io', 'ReportCardUserModule'])
  .controller('ReportCardCtrl', function(OAuth, UserModelService) {
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
});

var userModelService = angular.module('ReportCardUserModule', []).service('UserModelService', function($http) {
  var githubRoot = 'https://api.github.com';
  var localThis = this;
  localThis.userModel = {};
  this.getUserModel = function() {
    return localThis.userModel;
  };
  this.setAccessToken = function(accessToken) {
    localThis.userModel.accessToken = accessToken;
    console.log('accessToken: ' + accessToken);
  };
  this.tokenAsParameter = function() {
    return 'access_token=' + localThis.userModel.accessToken;
  }
  this.lookupUser = function() {
    $http.get(githubRoot + '/user?' + this.tokenAsParameter())
      .then(function(resp) {
        console.log(resp);
        localThis.userModel.user = resp.data.login;
      });
  };
});

app.config(['OAuthProvider', function (OAuthProvider) {
  OAuthProvider.setPublicKey('_kdpfaZV5uH9ByiaekYxsbhdS4U');
  OAuthProvider.setHandler('github', function (OAuthData, $http, UserModelService) {
    console.log(OAuthData.result);
    // save the token, get the userid
    UserModelService.setAccessToken(OAuthData.result.access_token);
    UserModelService.lookupUser();

  });
}]);
