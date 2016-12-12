from flask import Flask, flash, redirect, url_for, send_from_directory, make_response
from flask_github import GitHub

import secrets

app = Flask(__name__)
app.config['GITHUB_CLIENT_ID'] = secrets.github_client_id
app.config['GITHUB_CLIENT_SECRET'] = secrets.github_client_secret
app.config['SECRET_KEY'] = secrets.secret_key

github = GitHub(app)

# These routes serve static files for the html/javascript application


@app.route('/')
def root():
    return send_from_directory('.','index.html')


@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('js', path)


@app.route('/lib/<path:path>')
def send_lib(path):
    return send_from_directory('lib', path)

# Handle the /login route, redirecting to GitHub


@app.route('/login')
def login():
    return github.authorize()


@app.route('/github-callback')
@github.authorized_handler
def authorized(oauth_token):
    resp = make_response(redirect(url_for('root')))
    if oauth_token is None:
        flash("Authorization failed.")
        return resp
    resp.set_cookie('rcghAccessToken', oauth_token)
    return resp

if __name__ == '__main__':
    app.run(debug=True)
