# prospatheia

Web-based effort reporting tool for GCB informatics.

Uses [AngularJS](https://angularjs.org), [nvd3](http://nvd3.org), and [GitHub](https://developer.github.com/v3/) to commit reports to GitHub in CSV format.

[duke-gcb.github.io/prospatheia](https://duke-gcb.github.io/prospatheia)

## Screenshot

![prospatheia screenshot](/prospatheia-screenshot-1x.png "Prospatheia screenshot")

## Local Development

1. Register a GitHub OAuth application at https://github.com/settings/applications/new
2. Set the callback URL to something you can host locally (e.g. `http://localhost:8080/github-callback`)
3. Create a new repository on GitHub to house the reports. Can be public: https://github.com/new
4. Edit app.js to set this.owner and this.repo on lines 670-671 to your new repo.
    - This is the repo where prospatheia will write its reports, so do not commit this change to the production app
5. Run the server locally, providing your GitHub client ID and secret as the environment variables:
```
$ GITHUB_CLIENT_ID=your-client-id \
  GITHUB_CLIENT_SECRET=your-client-secret \
  SECRET_KEY=arbitrary-secret-you-create \
  python app.py 8080
```
6. Visit http://localhost:8080. Make/verify changes. Commit and pull-request, but make sure to remove the overrides to owner/repo

