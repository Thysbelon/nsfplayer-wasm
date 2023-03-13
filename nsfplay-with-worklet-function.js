async function nsfplayWorklet(url, tracknum, stereopref) { // this doesn't work. output is garbled.
	var response = await fetch(url)
	
	const audioCtx=new AudioContext({latencyHint:"playback",sampleRate:44100});
	
	const bufferSize = Math.max( // Make sure script node bufferSize is at least baseLatency
		Math.pow(2, Math.ceil(Math.log2((audioCtx.baseLatency || 0.001) * audioCtx.sampleRate))), 2048);
	console.log(bufferSize);
	
	response = await response.arrayBuffer()
	var data=new Uint8Array(response)
	
	await audioCtx.audioWorklet.addModule("nsfplayer-stereo-audio-worklet.js");
	var nsfplayerworklet=new AudioWorkletNode(audioCtx, "nsfplayer", {processorOptions: {data: data, dataLength: data.length, bufferSize: bufferSize, tracknum: tracknum} });
	nsfplayerworklet.connect(audioCtx.destination)
	
}