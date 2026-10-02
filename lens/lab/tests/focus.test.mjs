import test from 'node:test';
import assert from 'node:assert/strict';
import {bindKeyboardFocus} from '../design-system/index.js';

function fixture() {
  const doc = new EventTarget();
  doc.nodeType = 9;
  doc.defaultView = new EventTarget();
  const scope = () => {
    const attributes = new Map();
    return {ownerDocument: doc, setAttribute: (name, value) => attributes.set(name, value),
      getAttribute: name => attributes.get(name) ?? null, removeAttribute: name => attributes.delete(name)};
  };
  doc.documentElement = scope();
  const send = (type, properties = {}, target = doc) => target.dispatchEvent(Object.assign(new Event(type), properties));
  const mode = (root = doc.documentElement) => root.getAttribute('data-lg-input');
  return {doc, scope, send, mode};
}

test('keyboard rings yield immediately to movement, clicks, wheel and touch', () => {
  const f = fixture(), unbind = bindKeyboardFocus(f.doc);
  assert.equal(f.mode(), 'pointer');
  for (const type of ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'touchmove']) {
    f.send('keydown', {key: 'Tab'}); assert.equal(f.mode(), 'keyboard');
    f.send(type); assert.equal(f.mode(), 'pointer', type);
    f.send('keydown', {key: 'ArrowRight', repeat: true}); assert.equal(f.mode(), 'pointer');
    f.send('keydown', {key: 'ArrowRight'}); assert.equal(f.mode(), 'keyboard');
  }
  unbind();
});

test('modifiers and browser shortcuts do not enable rings; leaving the page hides them', () => {
  const f = fixture(), unbind = bindKeyboardFocus(f.doc);
  for (const properties of [{key: 'Shift'}, {key: 'Control'}, {key: 'a', ctrlKey: true}, {key: 'k', metaKey: true}, {key: 'Tab', altKey: true}, {key: 'Process', isComposing: true}]) {
    f.send('keydown', properties); assert.equal(f.mode(), 'pointer');
  }
  f.send('keydown', {key: 'Enter'}); assert.equal(f.mode(), 'keyboard');
  f.send('blur', {}, f.doc.defaultView); assert.equal(f.mode(), 'pointer');
  f.send('keydown', {key: ' '}); f.doc.hidden = true;
  f.send('visibilitychange'); assert.equal(f.mode(), 'pointer');
  unbind();
});

test('independent roots share modality and one cleanup cannot disable another root', () => {
  const f = fixture(), stage = f.scope(), pageOff = bindKeyboardFocus(f.doc);
  f.send('keydown', {key: 'Tab'});
  const firstOff = bindKeyboardFocus(stage), secondOff = bindKeyboardFocus(stage);
  assert.equal(f.mode(stage), 'keyboard');
  pageOff(); firstOff(); firstOff();
  f.send('wheel'); assert.equal(f.mode(stage), 'pointer');
  f.send('keydown', {key: 'Tab'}); assert.equal(f.mode(stage), 'keyboard');
  secondOff(); assert.equal(f.mode(stage), null);
  f.send('keydown', {key: 'Enter'}); assert.equal(f.mode(stage), null);
  const freshOff = bindKeyboardFocus(f.doc);
  assert.equal(f.mode(), 'pointer'); freshOff();
});
