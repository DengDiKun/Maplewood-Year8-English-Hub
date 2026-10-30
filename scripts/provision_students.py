#!/usr/bin/env python3
"""Run privately in Cloud Shell. Default is a read-only preview.
python3 provision_students.py --file 8_Daisy_Learning_Hub_Accounts_PRIVATE.json
Add --apply only after checking the preview. No service account key/packages needed.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PROJECT = 'maplewood-english-learning'
CLASS = 'tm-y8-daisy-2026'
DOMAIN = 'students.maplewood.invalid'
ROOT = f'projects/{PROJECT}/databases/(default)/documents'
PARENT = ROOT + '/classes/' + CLASS
COLLECTION = PARENT + '/students'
VERSION = 'student-login-v1'


def ident(username):
    return 'lh-student-' + hashlib.sha256(username.lower().encode()).hexdigest()[:32]


def alias(username):
    return username.lower() + '@' + DOMAIN


def manifest(data):
    rows = data.get('students')
    if data.get('projectId') != PROJECT or data.get('classId') != CLASS or not isinstance(rows, list) or len(rows) != 23:
        raise RuntimeError('Expected the private 23-student file for TM / 8 Daisy / 2026.')
    names, usernames, ids = set(), set(), set()
    for row in rows:
        if (not isinstance(row, dict) or
            not isinstance(row.get('username'), str) or not re.fullmatch(r'[A-Za-z0-9]{1,64}', row['username']) or
            not isinstance(row.get('displayName'), str) or not row['displayName'].strip() or
            not isinstance(row.get('password'), str) or len(row['password']) < 12 or
            not isinstance(row.get('rosterDocumentId'), str) or not re.fullmatch(r'roster-[a-f0-9]{32}', row['rosterDocumentId'])):
            raise RuntimeError('Invalid student fields in the private file. No passwords were printed.')
        if row['username'].lower() in usernames or row['displayName'] in names or row['rosterDocumentId'] in ids:
            raise RuntimeError('Duplicate student identity in the private file.')
        usernames.add(row['username'].lower()); names.add(row['displayName']); ids.add(row['rosterDocumentId'])
    return rows


def decode(document):
    result = {}
    for key, value in document.get('fields', {}).items():
        if 'stringValue' in value: result[key] = value['stringValue']
        elif 'booleanValue' in value: result[key] = value['booleanValue']
        elif 'integerValue' in value: result[key] = int(value['integerValue'])
    return result


def encode(data):
    fields = {}
    for key, value in data.items():
        if isinstance(value, bool): fields[key] = {'booleanValue': value}
        elif isinstance(value, int): fields[key] = {'integerValue': str(value)}
        elif isinstance(value, str): fields[key] = {'stringValue': value}
        else: raise RuntimeError('Unexpected profile field type.')
    return fields


def profile(row):
    return {'displayName': row['displayName'], 'username': row['username'],
            'role': 'student', 'active': True, 'classId': CLASS, 'studentId': row['rosterDocumentId'],
            'className': '8 Daisy', 'branch': 'TM', 'yearGroup': 8, 'academicYear': 2026,
            'provisioningVersion': VERSION}


class API:
    def __init__(self):
        result = subprocess.run(['gcloud', 'auth', 'print-access-token'], capture_output=True, text=True, timeout=60)
        if result.returncode or not result.stdout.strip():
            raise RuntimeError('Authorize Google Cloud Shell, then run preview again.')
        self.token = result.stdout.strip()

    def request(self, service, path, payload=None, missing=False):
        hosts = {'db': 'https://firestore.googleapis.com/v1/', 'auth': 'https://identitytoolkit.googleapis.com/v1/'}
        if service == 'db':
            if not (path.startswith(ROOT + '/') or path == ROOT + ':commit'):
                raise RuntimeError('Unexpected Firestore destination.')
        elif service == 'auth':
            if not path.startswith('projects/' + PROJECT + '/accounts'):
                raise RuntimeError('Unexpected Authentication destination.')
        else: raise RuntimeError('Unexpected service.')
        raw = None if payload is None else json.dumps(payload).encode()
        req = urllib.request.Request(hosts[service] + path, data=raw,
              headers={'Authorization': 'Bearer ' + self.token, 'Content-Type': 'application/json',
                       'X-Goog-User-Project': PROJECT})
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs): return None
        try:
            with urllib.request.build_opener(NoRedirect).open(req, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if missing and error.code == 404: return None
            raise RuntimeError(f'Google {service} request failed (HTTP {error.code}). '
                               'Run preview again to check progress; existing passwords were not reset.') from None
        except (urllib.error.URLError, TimeoutError):
            raise RuntimeError('Connection interrupted. Some accounts may have been created. Run preview again before retrying.') from None

    def get(self, path): return self.request('db', path, missing=True)
    def lookup(self, row):
        uid = ident(row['username'])
        # Check UID and alias separately to detect another account occupying either.
        a = self.request('auth', 'projects/' + PROJECT + '/accounts:lookup', {'localId': [uid]}).get('users', [])
        b = self.request('auth', 'projects/' + PROJECT + '/accounts:lookup', {'email': [alias(row['username'])]}).get('users', [])
        records = {u['localId']: u for u in a + b}
        if not records: return None
        if len(records) != 1 or uid not in records: raise RuntimeError('A student username is already used by a different account. Nothing will be overwritten.')
        user = records[uid]
        if user.get('email', '').lower() != alias(row['username']) or user.get('disabled'):
            raise RuntimeError('An existing account is disabled or conflicts with this setup. Review it before continuing.')
        if any(item.get('providerId') != 'password' for item in user.get('providerUserInfo', [])):
            raise RuntimeError('An existing account has an unexpected sign-in provider. Review it before continuing.')
        return user

    def create(self, row):
        # Active Auth alone grants no student Firestore access: profile + roster
        # binding are both required. A failed/partial setup can be rerun safely.
        return self.request('auth', 'projects/' + PROJECT + '/accounts', {
          'localId': ident(row['username']), 'email': alias(row['username']),
          'password': row['password'], 'displayName': row['displayName'],
          'disabled': False, 'emailVerified': False})

    def bind(self, row, roster):
        uid = ident(row['username'])
        return self.request('db', ROOT + ':commit', {'writes': [
          {'update': {'name': ROOT + '/users/' + uid, 'fields': encode(profile(row))},
           'currentDocument': {'exists': False}},
          {'update': {'name': roster['name'], 'fields': {'authUid': {'stringValue': uid}}},
           'updateMask': {'fieldPaths': ['authUid']},
           'currentDocument': {'updateTime': roster['updateTime']}}
        ]})


def check_class(api):
    parent = api.get(PARENT)
    data = decode(parent or {})
    if parent is None or parent.get('name') != PARENT or any(data.get(k) != v for k,v in
            {'name':'8 Daisy','branch':'TM','yearGroup':8,'academicYear':2026,'active':True}.items()):
        raise RuntimeError('The class is missing, inactive or differs from TM / 8 Daisy / 2026.')


def inspect(api, row):
    uid = ident(row['username'])
    roster = api.get(COLLECTION + '/' + row['rosterDocumentId'])
    r = decode(roster or {})
    if not roster or r.get('displayName') != row['displayName'] or r.get('active') is not True:
        raise RuntimeError('A roster record is missing, inactive or has a changed name. Review the roster before proceeding.')
    if r.get('authUid') not in (None, uid): raise RuntimeError('A roster record is already linked to a different account.')
    user = api.lookup(row)
    existing = api.get(ROOT + '/users/' + uid)
    if existing is not None:
        if not user or decode(existing) != profile(row) or r.get('authUid') != uid:
            raise RuntimeError('An existing student profile/binding differs from the proposed setup. Nothing will be overwritten.')
        return 'ready', roster, user
    if r.get('authUid') is not None:
        raise RuntimeError('Roster binding exists without its profile. Review it before continuing.')
    return ('resume' if user else 'create'), roster, user


def run(rows, api, apply=False):
    check_class(api)
    # Validate every account/roster first, so ordinary conflicts cause no writes.
    plan = [(row, *inspect(api, row)) for row in rows]
    print('Project: ' + PROJECT + '\nClass: TM / 8 Daisy / 2026')
    for row, state, _, _ in plan:
        print(row['displayName'] + ' | ' + row['username'] + ' | ' + state)
    print('Passwords are hidden. No existing Auth password is changed by this script.')
    if not apply:
        print('PREVIEW ONLY. No accounts or profiles were created. Add --apply after reviewing.')
        return
    for row, state, _, _ in plan:
        if state == 'ready': continue
        check_class(api)
        # Re-read before mutations; commits also protect the exact roster version.
        state, roster, user = inspect(api, row)
        if state == 'ready': continue
        if user is None:
            created = api.create(row)
            if created.get('localId') != ident(row['username']): raise RuntimeError('Unexpected created UID. Stop and review the project.')
        api.bind(row, roster)
    if any(inspect(api, row)[0] != 'ready' for row in rows):
        raise RuntimeError('Verification incomplete. Run preview again before retrying.')
    print('VERIFIED: all 23 student accounts are created and linked to their existing roster records.')
    print('Passwords were stored by Firebase Authentication only. Profiles/rosters contain no passwords.')
    print('This verifies setup, not a live sign-in. Test the deployed student page before distributing logins.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--file', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    try:
        rows = manifest(json.loads(Path(args.file).read_text()))
        run(rows, API(), args.apply)
    except RuntimeError as error:
        print('STOPPED: ' + str(error), file=sys.stderr)
        return 1
    except (ValueError, OSError, subprocess.SubprocessError):
        # Do not print file contents, passwords, tokens or raw upstream exceptions.
        print('STOPPED: Setup did not complete. Run preview again; if it still fails, ask for help. '
              'Check the Google account, existing student bindings and Cloud Shell permissions. '
              'Existing passwords were not reset.', file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__': sys.exit(main())
