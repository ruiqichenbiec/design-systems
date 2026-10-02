import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { messages, translate } from '../i18n.js';

test('both languages cover every visible and accessible markup label',()=>{
  assert.deepEqual(Object.keys(messages.zh).sort(),Object.keys(messages.en).sort());
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const [,key] of html.matchAll(/data-i18n(?:-aria|-placeholder|-title|-content)?="([^"]+)"/g)){
    for(const language of ['zh','en'])assert.ok(messages[language][key],`${language}: ${key}`);
  }
  for(const key of Object.keys(messages.zh)){
    const tokens=text=>[...text.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort();
    assert.deepEqual(tokens(messages.zh[key]),tokens(messages.en[key]),key);
  }
});

test('dynamic notifications and position feedback interpolate in either language',()=>{
  assert.equal(translate('zh','notificationTitle',{type:translate('zh','work')}),'给工作一点空间');
  assert.equal(translate('en','notificationTitle',{type:translate('en','work')}),'Make room for Work');
  assert.equal(translate('en','notificationText',{duration:30}),'Take 30 minutes. Be here, now.');
  assert.equal(translate('en','lensPosition',{x:35,y:60}),'Horizontal 35%, vertical 60%');
  for(const language of ['zh','en'])for(const kind of ['Idle','Selected','Liked','Unliked','Reset']){
    assert.ok(!translate(language,`feedback${kind}`,{type:'Work',duration:30}).includes('{'));
  }
});
