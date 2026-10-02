import test from 'node:test';
import assert from 'node:assert/strict';
import { Spring, jellyMatrix, boundDrag, togglePose } from '../jelly-physics.js';

test('a released card settles at its origin across frame rates without exploding',()=>{
  for(const hz of [24,60,120]){
    const spring=new Spring();spring.target=170;
    for(let i=0;i<hz*.7;i++)spring.step(1/hz,260,22);
    assert.ok(spring.value>155&&spring.value<185);
    spring.target=0;let crossed=false;
    for(let i=0;i<hz*2;i++){spring.step(1/hz,260,17);crossed ||= spring.value<0;assert.ok(Number.isFinite(spring.value)&&Math.abs(spring.value)<250);}
    assert.ok(crossed,'release should visibly overshoot before settling');
    assert.ok(Math.abs(spring.value)<.03&&Math.abs(spring.velocity)<.05);
  }
});

test('a new drag interrupts a returning spring and follows the new target',()=>{
  const spring=new Spring(160);spring.target=0;
  for(let i=0;i<9;i++)spring.step(1/60);
  spring.target=-100;
  for(let i=0;i<120;i++)spring.step(i%7===0?.05:1/60,260,22);
  assert.ok(Math.abs(spring.value+100)<.02);
});

test('directional jelly remains invertible and conserves area',()=>{
  for(const stretch of [-.2,0,.15,.34,100])for(const angle of [0,.6,Math.PI/2,2.7]){
    const [a,b,c,d]=jellyMatrix(stretch,angle,1.04);
    assert.ok(Math.abs(a*d-b*c-1.04**2)<1e-10);
    assert.ok([a,b,c,d].every(Number.isFinite));
  }
});

test('dragging cannot throw a surface out of the preview viewport',()=>{
  const box={left:130,top:100,right:466,bottom:420},viewport={width:800,height:630};
  for(const [x,y] of [[10000,10000],[-10000,-10000],[60,20]]){
    const result=boundDrag(x,y,box,viewport,22);
    assert.ok(box.left+result.x>=22&&box.right+result.x<=viewport.width-22);
    assert.ok(box.top+result.y>=22&&box.bottom+result.y<=viewport.height-22);
  }
});

test('the focus thumb stays inside its track while stretched or springing back',()=>{
  for(const [width,height,size] of [[48,28,22],[60,34,28]]){
    const travel=width-size-6;
    for(const hz of [24,60,120]){
      const spring=new Spring();spring.target=travel;
      for(let i=0;i<hz*3;i++){
        if(i===hz)spring.target=0;
        if(i===hz*2)spring.target=travel;
        spring.step(1/hz,300,23);
        const pose=togglePose(spring.value,travel,size,1.16,.3);
        const edge=(pose.scaleX-1)*size/2;
        assert.ok(3+pose.x-edge>=3-1e-8);
        assert.ok(3+pose.x+size+edge<=width-3+1e-8);
        assert.ok(pose.scaleY*size<=height-6);
        assert.ok(Math.abs(pose.scaleX*pose.scaleY-1)<1e-10);
      }
    }
  }
});
