import test from 'node:test';
import assert from 'node:assert/strict';
import {opticRange, opticXY, opticPoint, opticDropTarget, sampleOpticalTransition} from '../design-system/internal/optics.js';
import {OpticalDragMotion} from '../design-system/internal/optical-motion.js';

test('optical values clamp and quantize without accepting NaN or invalid bounds', () => {
  assert.equal(opticRange(104, 0, 100), 100);
  assert.equal(opticRange(-24, -20, 20, .5), -20);
  assert.equal(opticRange(.36, 0, 1, .1), .4);
  for (const args of [[NaN, 0, 100], [1, 1, 1], [2, 0, 10, 0]]) assert.throws(() => opticRange(...args));
  assert.deepEqual(opticXY({x: -110, y: 26}, -100, 100, 5), {x: -100, y: 25});
});

test('XY pointer coordinates preserve camera-style upward-positive Y and safe lens insets', () => {
  const rect = {left: 50, top: 100, width: 300, height: 200};
  assert.deepEqual(opticPoint(200, 200, rect, 40), {x: .5, y: .5});
  assert.deepEqual(opticPoint(-100, -100, rect, 40), {x: 0, y: 1});
  assert.deepEqual(opticPoint(900, 900, rect, 40), {x: 1, y: 0});
});

test('drop attraction chooses the nearest enabled well, including gaps and edges', () => {
  const targets = [{value: 'a', x: 40, y: 40, rx: 20, ry: 20}, {value: 'b', x: 100, y: 40, rx: 20, ry: 20, disabled: true}, {value:'c',x:180,y:40,rx:20,ry:20}];
  assert.equal(opticDropTarget({x: 45, y: 45}, targets), 'a');
  assert.equal(opticDropTarget({x: 59, y: 59}, targets), 'a');
  assert.equal(opticDropTarget({x: 140, y: 90}, targets), 'c');
  assert.equal(opticDropTarget({x: 100, y: 40}, targets), 'a');
  assert.equal(opticDropTarget({x: 110, y: 40}, targets), 'a', 'Equal distances use stable option order');
  assert.equal(opticDropTarget({x: 400, y: -100}, targets), 'c');
  assert.equal(opticDropTarget({x:40,y:40},targets.map(target=>({...target,disabled:true}))),null);
});

test('completion advances through a bounded color-and-light sequence, then becomes still', () => {
  const record = {from: {fill: .6, complete: 0}, to: {fill: 1, complete: 1}, start: 100, duration: 1100, flowStart: 100};
  const start = sampleOpticalTransition(record, 100), middle = sampleOpticalTransition(record, 650), end = sampleOpticalTransition(record, 1300);
  assert.equal(start.complete, 0);
  assert(middle.fill > .6 && middle.fill < 1);
  assert(middle.complete > 0 && middle.complete < 1);
  assert.equal(end.complete, 1);
  assert.equal(end.flow, -1);
  assert.equal(sampleOpticalTransition(record, 100, true).flow, -1);
  assert.equal(sampleOpticalTransition(record, 100, true).fill, 1);
});

test('an interrupted completion can retreat continuously to partial progress', () => {
  const running = {from: {fill: .8, complete: 0}, to: {fill: 1, complete: 1}, start: 0, duration: 1100, flowStart: 0};
  const current = sampleOpticalTransition(running, 500);
  const retreat = {from: current, to: {fill: .2, complete: 0}, start: 500, duration: 280, flowStart: null};
  assert.equal(sampleOpticalTransition(retreat, 500).fill, current.fill);
  assert.equal(sampleOpticalTransition(retreat, 900).fill, .2);
  assert.equal(sampleOpticalTransition(retreat, 900).flow, -1);
});

test('drag pickup, retarget and release preserve the current pose while lens deformation follows motion', () => {
  const motion = new OpticalDragMotion();
  motion.target(50, 70, {snap:true}); const resting = motion.step(0);
  motion.hold(true); motion.target(210, 110);
  assert.deepEqual(motion.step(0), resting, 'Pointer down cannot cause a size or position jump');
  for (let i = 0; i < 8; i++) motion.step(1/60);
  const moving = motion.step(0);
  assert(moving.x > 50 && moving.x < 210);
  assert(moving.matrix[0] > moving.matrix[3], 'Stretch follows the predominantly horizontal drag');
  assert(motion.optical.bend[0] > 0 && motion.optical.energy > 0, 'Shader receives edge lag and refraction energy');
  motion.hold(false); motion.target(200, 90);
  assert.deepEqual(motion.step(0), moving, 'Release changes the spring target, not the current pose');
  motion.hold(true); motion.target(70, 70);
  assert.deepEqual(motion.step(0), moving, 'Re-grabbing a returning capsule must not snap to its dock');
});

test('drop lens springs settle at the destination across frame rates and reduced-motion settings', () => {
  for (const fps of [30, 60, 120]) for (const reduced of [false, true]) {
    const motion = new OpticalDragMotion({reduced}); motion.target(50,70,{snap:true}); motion.hold(true); motion.target(220,110);
    for (let i = 0; i < fps/3; i++) motion.step(1/fps);
    motion.hold(false); motion.target(200,70);
    for (let i = 0; i < fps*5; i++) {
      const pose = motion.step(1/fps);
      assert(pose.matrix.every(Number.isFinite));
      assert(pose.matrix[0]*pose.matrix[3]-pose.matrix[1]*pose.matrix[2] > .95, 'No collapse or inversion');
    }
    assert.equal(motion.moving, false);
    const resting = motion.step(0);
    assert.equal(resting.x, 200); assert.equal(resting.y, 70);
    resting.matrix.forEach((value,index) => assert(Math.abs(value - [1,0,0,1][index]) < 1e-12));
    assert.deepEqual(motion.optical, {bend:[0,0],pressure:0,energy:0});
  }
});
