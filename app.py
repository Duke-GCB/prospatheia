from flask import Flask, flash, request, session, redirect, url_for, send_from_directory, make_response
from flask_github import GitHub

import secrets

app = Flask(__name__)
app.config['GITHUB_CLIENT_ID'] = secrets.github_client_id
app.config['GITHUB_CLIENT_SECRET'] = secrets.github_client_secret
app.config['SECRET_KEY'] = secrets.secret_key

github = GitHub(app)

# static file routes

@app.route('/')
def root():
  print 'root'
  return send_from_directory('.','index.html')

@app.route('/js/<path:path>')
def send_js(path):
  return send_from_directory('js', path)

@app.route('/lib/<path:path>')
def send_lib(path):
  return send_from_directory('lib', path)

@app.route('/login')
def login():
    if session.get('user_id', None) is None:
        return github.authorize()
    else:
        return 'Already logged in'

@app.route('/github-callback')
@github.authorized_handler
def authorized(oauth_token):
    next_url = request.args.get('next') or url_for('root')
    if oauth_token is None:
        flash("Authorization failed.")
        return redirect(next_url)
    resp = make_response(redirect(url_for('root')))
    resp.set_cookie('rcghAccessToken', oauth_token)
    return resp

if __name__ == '__main__':
    app.run(debug=True)
