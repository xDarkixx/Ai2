import assert from 'node:assert/strict';
import { buildTextToImageWorkflow, assertSafePrompt } from '../workflow-builder.js';

const prompt=assertSafePrompt('a friendly fictional adult character portrait, studio lighting');
const workflow=buildTextToImageWorkflow({prompt,checkpoint:'test-model.safetensors',width:256,height:256,steps:4,cfg:5,seed:42});
assert.equal(workflow['4'].class_type,'CheckpointLoaderSimple');
assert.equal(workflow['4'].inputs.ckpt_name,'test-model.safetensors');
assert.equal(workflow['5'].inputs.width,256);
assert.equal(workflow['5'].inputs.height,256);
assert.equal(workflow['3'].inputs.seed,42);
assert.equal(workflow['9'].class_type,'SaveImage');
assert.throws(()=>assertSafePrompt('graphic sexual intercourse'),/not supported/i);
console.log('ComfyUI workflow smoke test: PASS');
