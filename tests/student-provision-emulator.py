"""Real REST protocol tests: requires both loopback emulators; uses synthetic data only."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import urllib.request
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
spec=importlib.util.spec_from_file_location('provision',Path(__file__).parents[1]/'scripts/provision_students.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.PROJECT='demo-maplewood-classes';m.ROOT=f'projects/{m.PROJECT}/databases/(default)/documents';m.PARENT=m.ROOT+'/classes/'+m.CLASS;m.COLLECTION=m.PARENT+'/students'
class LocalAPI(m.API):
 def __init__(self):self.creates=0;self.binds=0
 def request(self,service,path,payload=None,missing=False):
  origins={'db':'http://127.0.0.1:8080/v1/','auth':'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/'}
  req=urllib.request.Request(origins[service]+path,data=None if payload is None else json.dumps(payload).encode(),headers={'Authorization':'Bearer owner','Content-Type':'application/json'})
  try:
   with urllib.request.urlopen(req,timeout=20) as response:return json.load(response)
  except urllib.error.HTTPError as e:
   if missing and e.code==404:return None
   # Response body might contain synthetic credentials: report status only.
   raise RuntimeError(f'Local {service} protocol failed: {e.code}') from None
 def create(self,row):self.creates+=1;return super().create(row)
 def bind(self,row,roster):self.binds+=1;return super().bind(row,roster)
api=LocalAPI()
rows=[{'displayName':f'Protocol Sample {i}','username':f'ProtocolLearner{i}','password':'Synthetic-password-only-123!',
       'rosterDocumentId':'roster-'+format(i,'032x')} for i in range(23)]
api.request('db',m.ROOT+':commit',{'writes':[
 {'update':{'name':m.PARENT,'fields':m.encode({'name':'8 Daisy','branch':'TM','yearGroup':8,'academicYear':2026,'active':True})}},
 *[{'update':{'name':m.COLLECTION+'/'+r['rosterDocumentId'],'fields':m.encode({'displayName':r['displayName'],'active':True})}} for r in rows]
]})
with contextlib.redirect_stdout(io.StringIO()):
 m.run(rows,api) # dry run
 assert api.creates==api.binds==0
 api.create(rows[0]) # simulate interruption after Auth creation
 m.run(rows,api,True)
 assert (api.creates,api.binds)==(23,23)
 m.run(rows,api,True)
 assert (api.creates,api.binds)==(23,23)
# Verify that the password sent through the admin REST endpoint really works.
r=rows[0]
result=api.request('auth','accounts:signInWithPassword?key=demo-key',{'email':m.alias(r['username']),'password':r['password'],'returnSecureToken':True})
assert result['localId']==m.ident(r['username'])
assert m.decode(api.get(m.ROOT+'/users/'+m.ident(r['username'])))==m.profile(r)
print('Provisioning protocol passed: preview, 23 create/link, interrupted-run resume, unchanged rerun and credential sign-in.')
