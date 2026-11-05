// Older lesson bookmarks still enter through index.html?next=... for their
// existing code login. Keep only those known local routes; no role or profile
// is inferred from the URL or from browser storage.
const earlierLessons=new Set(['unit8-1.html','unit8-2.html','unit8-3.html','speaking-assessment.html']);
export function earlierLessonRedirect(search) {
  if(typeof search!=='string')return null;
  const values=new URLSearchParams(search).getAll('next');
  if(values.length!==1 || !earlierLessons.has(values[0]))return null;
  return 'earlier-hub.html?next='+encodeURIComponent(values[0]);
}
if(typeof window!=='undefined') {
  const destination=earlierLessonRedirect(window.location.search);
  if(destination)window.location.replace(destination);
}
