import test from 'node:test';
import assert from 'node:assert/strict';
import {earlierLessonRedirect} from '../home-entry.mjs';

test('existing lesson bookmarks retain the original lesson through the earlier Hub login',()=>{
  for(const lesson of ['unit8-1.html','unit8-2.html','unit8-3.html','speaking-assessment.html']){
    assert.equal(earlierLessonRedirect('?next='+lesson),'earlier-hub.html?next='+lesson);
    assert.equal(earlierLessonRedirect('?next='+encodeURIComponent(lesson)+'&from=bookmark'),'earlier-hub.html?next='+lesson);
  }
});
test('the homepage ignores missing, duplicate, external, encoded-path and unrecognised redirect targets',()=>{
  for(const search of [null,undefined,'','?unit=8','?next=','?next=unit8-1.html&next=unit8-2.html',
    '?next=https://example.invalid/unit8-1.html','?next=//example.invalid/unit8-1.html',
    '?next=javascript:alert(1)','?next=../unit8-1.html','?next=%2Funit8-1.html',
    '?next=unit8-1.html%3Frole%3Dadmin','?next=unit8-1.html%23section',
    '?next=unit8-1%252Ehtml','?next=student-login.html','?next=admin-login.html',
    '?next=unit8-4.html','?next=UNIT8-1.html','?next=unit8-1.html%0A'])assert.equal(earlierLessonRedirect(search),null,String(search));
});
