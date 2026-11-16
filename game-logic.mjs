export function shuffled(values,random=Math.random){const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
export function vocabularyQuestion(entry,mode,bank,random=Math.random){
  const kinds=['definition','context','synonym','antonym','family'],kind=mode==='mixed'?kinds[Math.floor(random()*kinds.length)]:mode;
  const keys={definition:'d',context:'w',synonym:'s',antonym:'a',family:'f'},key=keys[kind];
  if(!key)throw new Error('Unknown vocabulary mode');
  const correct=entry[key],alternatives=shuffled([...new Set(bank.filter(e=>e.w!==entry.w).map(e=>e[key]).filter(v=>v && v!==correct))],random).slice(0,3);
  const prompts={definition:'Choose the best definition.',context:entry.c.replace('___','_____'),synonym:'Choose the closest synonym.',antonym:'Choose the best antonym.',family:'Choose a word from the same word family.'};
  return {word:entry.w,level:entry.l,kind,label:kind==='context'?'Complete the sentence':entry.w,prompt:prompts[kind],correct,options:shuffled([correct,...alternatives],random),definition:entry.d};
}
export const BLOCKS=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]]];
export function rotate(matrix){return matrix[0].map((_,x)=>matrix.map(row=>row[x]).reverse());}
export function collides(board,piece){return piece.shape.some((row,y)=>row.some((cell,x)=>cell&&(piece.x+x<0||piece.x+x>=board[0].length||piece.y+y>=board.length||(piece.y+y>=0&&board[piece.y+y][piece.x+x]))));}
export function mergeBlocks(board,piece){const copy=board.map(row=>[...row]);let overflow=false;piece.shape.forEach((row,y)=>row.forEach((cell,x)=>{if(cell){if(piece.y+y<0)overflow=true;else copy[piece.y+y][piece.x+x]=piece.color;}}));const remaining=copy.filter(row=>row.some(v=>!v)),lines=board.length-remaining.length;while(remaining.length<board.length)remaining.unshift(Array(board[0].length).fill(0));return {board:remaining,lines,overflow};}
export const MAZE=[
 '###############',
 '#o....#....o..#',
 '#.##.#.#.###..#',
 '#....#.#......#',
 '###..#...#.##.#',
 '#....###.#....#',
 '#.##.....###..#',
 '#....#...#....#',
 '#.##.#.#.#.##.#',
 '#....#.#......#',
 '#.####.#####..#',
 '#.............#',
 '#.##.#####.##.#',
 '#o...........o#',
 '###############'
];
export function mazeStep(map,point,direction){const next={x:point.x+direction.x,y:point.y+direction.y};return map[next.y]?.[next.x] && map[next.y][next.x]!=='#'?next:point;}
export function memoryDeck(words,random=Math.random){return shuffled(words.flatMap((word,index)=>[{pair:index,text:word.w,kind:'Word'},{pair:index,text:word.d,kind:'Meaning'}]),random);}
