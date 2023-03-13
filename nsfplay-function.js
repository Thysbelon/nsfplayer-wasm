const INT16_MAX = 65535;
async function nsfplay(url, tracknum) { // Most of this code is copied from Chip Player JS
	var response = await fetch(url)
	
	const audioCtx=new AudioContext({latencyHint:"playback",sampleRate:44100});
	
	const bufferSize = Math.max( // Make sure script node bufferSize is at least baseLatency
		Math.pow(2, Math.ceil(Math.log2((audioCtx.baseLatency || 0.001) * audioCtx.sampleRate))), 2048);
	console.log(bufferSize);
	
	var audioNode=audioCtx.createScriptProcessor(bufferSize,2,2)
	audioNode.connect(audioCtx.destination)
	
	response = await response.arrayBuffer()
	var data=new Uint8Array(response)
	
	Module.ccall(
		"setupNSF",
		"number",
		["array", "number", "number", "number"],
		[data, data.length, bufferSize, tracknum/* track number */]
	)
	var playNSF=Module.cwrap("playNSF", "number", null)
	audioNode.onaudioprocess=function(e){
		//console.log("gme_play"); 
		
		let numchannels=e.outputBuffer.numberOfChannels
		
		let bufPtr=playNSF()
		
		let outputData=[];
		
		for(let channel=0; channel<numchannels; channel++){
			outputData[channel]=e.outputBuffer.getChannelData(channel); /*nested loop*/
			for(let i=0; i<bufferSize; i++){
				outputData[channel][i] = Module.getValue(bufPtr+i * 2 * numchannels + /* frame offset * bytes per sample * num channels + */ channel * 2  /* channel offset * bytes per sample */, 'i16') / INT16_MAX // convert int16 to float
			}
		}
		
	}
	
}

