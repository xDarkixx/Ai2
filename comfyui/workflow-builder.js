const unsafe=/\b(explicit porn|pornographic|graphic sexual|sex act|sexual intercourse|penetration|genitals|nude sex|hardcore)\b/i;

export function assertSafePrompt(prompt){
  const text=String(prompt||'').trim();
  if(!text)throw new Error('Prompt is required');
  if(unsafe.test(text))throw new Error('Graphic sexual media generation is not supported.');
  return text.slice(0,1500);
}

export function buildTextToImageWorkflow({prompt,negativePrompt='',checkpoint,seed=0,width=832,height=480,steps=20,cfg=7}={}){
  const safe=assertSafePrompt(prompt);
  if(!checkpoint)throw new Error('COMFYUI_CHECKPOINT is not configured');
  const actualSeed=Number.isFinite(Number(seed))?Math.abs(Math.trunc(Number(seed))):0;
  return {
    '3':{class_type:'KSampler',inputs:{seed:actualSeed,steps:Number(steps)||20,cfg:Number(cfg)||7,sampler_name:'euler',scheduler:'normal',denoise:1.0,model:['4',0],positive:['6',0],negative:['7',0],latent_image:['5',0]}},
    '4':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:String(checkpoint)}},
    '5':{class_type:'EmptyLatentImage',inputs:{width:Number(width)||832,height:Number(height)||480,batch_size:1}},
    '6':{class_type:'CLIPTextEncode',inputs:{text:safe,clip:['4',1]}},
    '7':{class_type:'CLIPTextEncode',inputs:{text:String(negativePrompt||''),clip:['4',1]}},
    '8':{class_type:'VAEDecode',inputs:{samples:['3',0],vae:['4',2]}},
    '9':{class_type:'SaveImage',inputs:{filename_prefix:'Ai2',images:['8',0]}}
  };
}
