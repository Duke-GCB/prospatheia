from flask import Flask, flash, request, session, redirect, url_for
from flask_github import GitHub

import secrets

app = Flask(__name__)
app.config['GITHUB_CLIENT_ID'] = secrets.github_client_id
app.config['GITHUB_CLIENT_SECRET'] = secrets.github_client_secret
app.config['SECRET_KEY'] = secrets.secret_key

github = GitHub(app)

@app.route('/index')
def index():
    return ''

@app.route('/login')
def login():
    if session.get('user_id', None) is None:
        return github.authorize()
    else:
        return 'Already logged in'

@app.route('/github-callback')
@github.authorized_handler
def authorized(oauth_token):
    next_url = request.args.get('next') or url_for('index')
    if oauth_token is None:
        flash("Authorization failed.")
        return redirect(next_url)
    # Pass the token to the user
    print 'oauth token', oauth_token
    # What should this return?
    return oauth_token

if __name__ == '__main__':
    app.run(debug=True)
