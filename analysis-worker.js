importScripts(
  'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia-wasm.web.js',
  'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia.js-core.min.js'
);
let enginePromise;
async function getEngine(){
  if(!enginePromise) enginePromise=EssentiaWASM().then(w=>new Essentia(w));
  return enginePromise;
}
self.onmessage=async event=>{
  const {samples,sampleRate}=event.data;
  let signal=null,tempo=null;
  try{
    const es=await getEngine();
    signal=es.arrayToVector(new Float32Array(samples));
    tempo=es.RhythmExtractor2013(signal,208,'multifeature',40);
    const tonal=es.KeyExtractor(signal,true,4096,4096,12,3500,60,25,0.2,'bgate',sampleRate);
    self.postMessage({
      ok:true,
      bpm:Number(tempo.bpm),
      bpmConfidence:Number(tempo.confidence)||0,
      key:String(tonal.key||''),
      scale:String(tonal.scale||''),
      keyStrength:Number(tonal.strength)||0
    });
  }catch(error){
    self.postMessage({ok:false,error:error&&error.message?error.message:String(error)});
  }finally{
    try{if(tempo&&tempo.ticks&&tempo.ticks.delete)tempo.ticks.delete()}catch(e){}
    try{if(signal&&signal.delete)signal.delete()}catch(e){}
  }
};