import contextlib
import copy
import importlib.util
import io
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('provision',Path(__file__).parents[1]/'scripts/provision_students.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def row(i=0):
 return {'displayName':f'Synthetic Student {i}','username':f'SyntheticLearner{i}',
         'password':'Synthetic-private-password-123!','rosterDocumentId':'roster-'+format(i,'032x')}
class FakeAPI:
 def __init__(self):
  self.rows=[row(i) for i in range(23)]; self.users={}; self.profiles={}; self.creates=0; self.binds=0
  self.rosters={r['rosterDocumentId']:{'name':m.COLLECTION+'/'+r['rosterDocumentId'],'updateTime':'version-1','fields':m.encode({'displayName':r['displayName'],'active':True})} for r in self.rows}
 def get(self,path):
  if path==m.PARENT:return {'name':m.PARENT,'fields':m.encode({'name':'8 Daisy','branch':'TM','yearGroup':8,'academicYear':2026,'active':True})}
  if path.startswith(m.COLLECTION+'/'):return copy.deepcopy(self.rosters.get(path.split('/')[-1]))
  return copy.deepcopy(self.profiles.get(path.split('/')[-1]))
 def lookup(self,r):return self.users.get(m.ident(r['username']))
 def create(self,r):
  self.creates+=1;uid=m.ident(r['username']);self.users[uid]={'localId':uid,'email':m.alias(r['username'])};return self.users[uid]
 def bind(self,r,roster):
  self.binds+=1;uid=m.ident(r['username'])
  assert uid not in self.profiles
  self.profiles[uid]={'fields':m.encode(m.profile(r))}
  self.rosters[r['rosterDocumentId']]['fields']['authUid']={'stringValue':uid}
class Tests(unittest.TestCase):
 def test_manifest_scope_and_duplicates(self):
  rows=[row(i) for i in range(23)]; payload={'projectId':m.PROJECT,'classId':m.CLASS,'students':rows}
  self.assertEqual(m.manifest(payload),rows)
  for changed in [{**payload,'projectId':'other'},{**payload,'students':rows[:22]},{**payload,'students':[row(0)]*23}]:
   with self.assertRaises(RuntimeError):m.manifest(changed)
 def test_preview_no_writes(self):
  api=FakeAPI()
  with contextlib.redirect_stdout(io.StringIO()):m.run(api.rows,api)
  self.assertEqual((api.creates,api.binds),(0,0))
 def test_apply_and_rerun_do_not_reset_or_duplicate(self):
  api=FakeAPI()
  with contextlib.redirect_stdout(io.StringIO()):m.run(api.rows,api,True);m.run(api.rows,api,True)
  self.assertEqual((api.creates,api.binds),(23,23))
  self.assertFalse(any('password' in d['fields'] for d in api.profiles.values()))
 def test_conflicting_last_record_aborts_before_any_create(self):
  api=FakeAPI();api.rosters[api.rows[-1]['rosterDocumentId']]['fields']['authUid']={'stringValue':'different'}
  with contextlib.redirect_stdout(io.StringIO()),self.assertRaises(RuntimeError):m.run(api.rows,api,True)
  self.assertEqual(api.creates,0)
 def test_partial_auth_create_resumes_without_reset(self):
  api=FakeAPI();api.create(api.rows[0])
  with contextlib.redirect_stdout(io.StringIO()):m.run(api.rows,api,True)
  self.assertEqual((api.creates,api.binds),(23,23))
 def test_existing_staff_profile_is_never_overwritten(self):
  api=FakeAPI();r=api.rows[0];api.create(r);api.profiles[m.ident(r['username'])]={'fields':m.encode({'role':'admin'})}
  with self.assertRaises(RuntimeError):m.inspect(api,r)
  self.assertEqual(api.binds,0)
 def test_uid_and_alias_case_consistency(self):
  self.assertEqual(m.ident('Sample'),m.ident('SAMPLE'));self.assertEqual(m.alias('Sample'),'sample@students.maplewood.invalid')
if __name__=='__main__':unittest.main()
