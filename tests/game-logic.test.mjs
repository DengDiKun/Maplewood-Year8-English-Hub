import test from 'node:test';
import assert from 'node:assert/strict';
import {VOCABULARY} from '../vocabulary-bank.mjs';
import {shuffled,vocabularyQuestion,BLOCKS,rotate,collides,mergeBlocks,MAZE,mazeStep,memoryDeck} from '../game-logic.mjs';
test('vocabulary rounds cover all levels and modes with unique options and the correct answer exactly once',()=>{
  assert.ok(VOCABULARY.length>=69);assert.equal(new Set(VOCABULARY.map(e=>e.w)).size,VOCABULARY.length);
  for(const word of VOCABULARY)for(const mode of ['definition','context','synonym','antonym','family','mixed']){
    const q=vocabularyQuestion(word,mode,VOCABULARY);assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.equal(q.options.filter(v=>v===q.correct).length,1);assert.ok(q.prompt);
  }
  assert.throws(()=>vocabularyQuestion(VOCABULARY[0],'invalid',VOCABULARY));
});
test('every block can rotate four times without changing its shape or mutating the original',()=>{
  for(const block of BLOCKS){const original=structuredClone(block);let value=block;for(let i=0;i<4;i++)value=rotate(value);assert.deepEqual(value,original);assert.deepEqual(block,original);}
});
test('block collision detects walls and occupied cells, and clearing lines preserves the board size',()=>{
  const board=Array.from({length:20},()=>Array(10).fill(0));board[19]=Array(10).fill(1);board[19][4]=0;
  assert.ok(collides(board,{x:-1,y:0,shape:[[1]]}));assert.ok(collides(board,{x:10,y:0,shape:[[1]]}));assert.ok(collides(board,{x:0,y:19,shape:[[1]]}));
  const result=mergeBlocks(board,{x:4,y:19,shape:[[1]],color:2});assert.equal(result.lines,1);assert.equal(result.board.length,20);assert.ok(result.board.every(row=>row.length===10));assert.equal(board[19][4],0);
  assert.equal(mergeBlocks(board,{x:0,y:-1,shape:[[1]],color:2}).overflow,true);
});
test('every maze collectible is reachable, walls block movement and the board is rectangular',()=>{
  assert.equal(new Set(MAZE.map(r=>r.length)).size,1);const start={x:1,y:1},seen=new Set(['1,1']),queue=[start];
  for(let i=0;i<queue.length;i++)for(const d of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]){const p=mazeStep(MAZE,queue[i],d),key=p.x+','+p.y;if(!seen.has(key)){seen.add(key);queue.push(p);}}
  const cells=MAZE.join('').split('').filter(v=>v!=='#').length;assert.equal(seen.size,cells);assert.equal(mazeStep(MAZE,start,{x:0,y:-1}),start);
});
test('memory boards contain exactly one word and one matching meaning per pair, in shuffled order',()=>{
  const words=VOCABULARY.slice(0,6),deck=memoryDeck(words);assert.equal(deck.length,12);
  for(let i=0;i<6;i++){const pair=deck.filter(c=>c.pair===i);assert.equal(pair.length,2);assert.deepEqual(new Set(pair.map(c=>c.kind)),new Set(['Word','Meaning']));}
  const values=[1,2,3,4];assert.deepEqual([...shuffled(values)].sort(),values);assert.deepEqual(values,[1,2,3,4]);
});
