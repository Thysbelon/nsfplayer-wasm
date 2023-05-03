const INT16_MAX = 65535;

async function nsfplay(url, tracknum, settingsObject /*contains introEnd (milliseconds) and panningObject*/) {
	/*
	NOTE ON panningObject AND THE N163 AND FAMISTUDIO
	If you make a song in famistudio while only using some of the 8 Wave channels, the channels used in the exported nsf may be different. For example, a song that uses only two wave channels will have Wave 1 and Wave 2 mapped to Wave 8 and Wave 7 respectively when exported to nsf.
	*/
	// to do, don't render each track separately if there is no panningObject DONE. to do: only separate tracks specified in panningObject
	// to do, use wasm workers or something to do smart multi threading
	if (settingsObject) {
		if (settingsObject.panningObject) {
			var panningObject=settingsObject.panningObject
		} else if (settingsObject.introEnd) {
			var introEnd=settingsObject.introEnd
		}
	}
	
	var response = await fetch(url)
	response = await response.arrayBuffer()
	var data=new Uint8Array(response)
	const audioCtx=new AudioContext({latencyHint:"playback",sampleRate:44100});
	const bufferSize = Math.max( // Make sure script node bufferSize is at least baseLatency
		Math.pow(2, Math.ceil(Math.log2((audioCtx.baseLatency || 0.001) * audioCtx.sampleRate))), 2048);
	console.log(bufferSize);
	var nsfLength=Module.ccall( // length of the entire song without being looped
		"setupNSFstereo",
		"number",
		["array", "number", "number", "number"],
		[data, data.length, bufferSize, tracknum/* track number */]
	)
	var playNSF=Module.cwrap("playNSF", "number", null)
	var NSFrec=[] // an array of arrays. each array contains two channels, then the sample data of each voice in the track.
	var getTime=Module.cwrap("getTime", "number", null) // returns elapsed track time in milliseconds
	
	if (panningObject) {
		console.log("panningObject true")
		var changeVoice=Module.cwrap("setVoiceForRecording", "number", "number")
		var totalVoices=Module.ccall(
			"getTotalVoices",
			"number"
		)
		console.log("totalVoices: "+totalVoices)
		// make the getVoiceName() function go out of scope when it is no longer needed
		let getVoiceName=Module.cwrap("getVoiceName", "string", "number")
		var VoiceDict=[] // holds the name and voice num of each voice.
		for (let i=0; i<totalVoices; i++) {
			VoiceDict[i]=getVoiceName(i)
		}
		console.log(VoiceDict)
		var toNSFrecOther=[]
		for (let i=0; i<totalVoices; i++) {
			if (panningObject[VoiceDict[i]]) {
				console.log("i: "+i)
				NSFrec[i]=[]
				//NSFrec[i][0]=[] // left stereo channel (even thought the nsf music is mono, it's outputted in stereo. Maybe this should be changed? update: it's been changed)
				//NSFrec[i][1]=[] // right stereo channel
				let curTime=0
				changeVoice(i)
				while (curTime<nsfLength) {// to do: figure out how to calculate the required number of gme_play calls from sampleRate and time, to replace this 'while' with a 'for'
					let bufPtr=playNSF()
					//for(let channel=0; channel<2; channel++){ // commented out because, even though gme_play always outputs in stereo, famicom music is mono.
					// NSFrec[i][channel]=[] // this resets data
					let channel=0;
					for(let j=0; j<bufferSize; j++){
						NSFrec[i]/*[channel]*/.push( Module.getValue(bufPtr+j * 2 * 2/*numchannels*/ + /* frame offset * bytes per sample * num channels + */ channel * 2  /* channel offset * bytes per sample */, 'i16') / INT16_MAX /* convert int16 to float*/ )
					}
					//}
					curTime=getTime()
				}
				console.log("curTime: "+curTime)
			} else {
				toNSFrecOther.push(i)
			}
		}
		console.log(NSFrec) // okay
		console.log(NSFrec.length)
		console.log(toNSFrecOther)
		var NSFrecOther=[] // contains sample data of every voice not in panningObject
		var unmuteVoice=Module.cwrap("unmuteVoice", "number", "number")
		changeVoice(toNSFrecOther[0])
		console.log("NSFrecOther[0]: "+toNSFrecOther[0])
		for (let i=0; i<totalVoices; i++) {
			if (toNSFrecOther.includes(i)) {
				unmuteVoice(i)
			}
		}
		let curTime=0
		while (curTime<nsfLength) {// to do: figure out how to calculate the required number of gme_play calls from sampleRate and time, to replace this 'while' with a 'for'
			let bufPtr=playNSF()
			let channel=0;
			for(let i=0; i<bufferSize; i++){
				NSFrecOther.push( Module.getValue(bufPtr+i * 2 * 2/*numchannels*/ + /* frame offset * bytes per sample * num channels + */ channel * 2  /* channel offset * bytes per sample */, 'i16') / INT16_MAX /* convert int16 to float*/ )
			}
			//}
			curTime=getTime()
		}
		console.log("curTime: "+curTime)
		console.log("NSFrecOther")
		console.log(NSFrecOther)
		
	} else {
		let curTime=0
		while (curTime<nsfLength) {// to do: figure out how to calculate the required number of gme_play calls from sampleRate and time, to replace this 'while' with a 'for'
			let bufPtr=playNSF()
			let channel=0;
			for(let i=0; i<bufferSize; i++){
				NSFrec/*[channel]*/.push( Module.getValue(bufPtr+i * 2 * 2/*numchannels*/ + /* frame offset * bytes per sample * num channels + */ channel * 2  /* channel offset * bytes per sample */, 'i16') / INT16_MAX /* convert int16 to float*/ )
			}
			//}
			curTime=getTime()
		}
		console.log("curTime: "+curTime)
	}
	
	console.log(NSFrec)
	
	
	bufferlength=(nsfLength/1000)*audioCtx.sampleRate
	if (panningObject) {
		var NSFrecBuffer=[]
		for (let i=0; i<totalVoices; i++) {
			if (NSFrec[i]!=null) {
				NSFrecBuffer[i]=audioCtx.createBuffer(
					1, // mono
					bufferlength,
					audioCtx.sampleRate
				);
				let nowBuffering=NSFrecBuffer[i].getChannelData(0)
				for (let j = 0; j < bufferlength; j++) {
					nowBuffering[j]=NSFrec[i][j]
				}
			}
		}
		var NSFrecBufferOther=audioCtx.createBuffer(
			1,
			bufferlength,
			audioCtx.sampleRate
		);
		let nowBuffering=NSFrecBufferOther.getChannelData(0)
		for (let i = 0; i < bufferlength; i++) {
			nowBuffering[i]=NSFrecOther[i]
		}
		sources=[]
		stereoPannerNodes=[]
	} else {
		var NSFrecBuffer=audioCtx.createBuffer(
			1, // mono
			bufferlength,
			audioCtx.sampleRate
		);
		let nowBuffering=NSFrecBuffer.getChannelData(0)
		for (let i = 0; i < bufferlength; i++) {
			nowBuffering[i]=NSFrec[i]
		}
	}
	
	var sourceNodeSettingsObject;
	if (introEnd) {
		sourceNodeSettingsObject={loop:true, loopEnd:nsfLength/1000, loopStart:introEnd/1000, channelCount:1}
	} else {
		sourceNodeSettingsObject={channelCount:1}
	}
	
	if (panningObject) {
		for (let i=0; i<totalVoices; i++) {
			if (NSFrecBuffer[i]!=null){
				sources[i] = new AudioBufferSourceNode(audioCtx, sourceNodeSettingsObject)
				//sources[0].buffer=NSFrecBuffer[0]
				sources[i].buffer=NSFrecBuffer[i]
				//sources[i].connect(audioCtx.destination)
				if (panningObject[VoiceDict[i]]) {
					console.log("Applying pan to Voice #"+i+" "+VoiceDict[i])
					console.log("panningObject[VoiceDict[i]]: "+panningObject[VoiceDict[i]])
					stereoPannerNodes[i]=new StereoPannerNode(audioCtx, {pan:panningObject[VoiceDict[i]]})
					sources[i].connect(stereoPannerNodes[i])
					stereoPannerNodes[i].connect(audioCtx.destination)
				} else {
					sources[i].connect(audioCtx.destination)
					console.log("source "+i+" connected")
				}
			}
		}
		var sourceOther=new AudioBufferSourceNode(audioCtx, sourceNodeSettingsObject)
		sourceOther.buffer=NSFrecBufferOther
		sourceOther.connect(audioCtx.destination)
		console.log("sourceOther connected")
		for (let i=0; i<totalVoices; i++) {
			if (sources[i]!=null){
				sources[i].start(audioCtx.currentTime+0.5)
				console.log("started "+i)
			}
		}
		sourceOther.start(audioCtx.currentTime+0.5)
		console.log("started other")
	} else {
		var source=new AudioBufferSourceNode(audioCtx, sourceNodeSettingsObject)
		source.buffer=NSFrecBuffer
		source.connect(audioCtx.destination) // don't forget this
		source.start()
		console.log("started")
	}
}

async function nsfplay_scriptnode(url, tracknum) { // Most of this code is copied from Chip Player JS
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

