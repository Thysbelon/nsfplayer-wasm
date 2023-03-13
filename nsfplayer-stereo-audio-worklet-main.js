// the below file should be used in a post-js argument to emscripten.

var playNSF=Module.cwrap("playNSF", "number", null);
const INT16_MAX = 65535;
const INT32_MAX = 2147483647;
let bufReadCount=16;
var bufPtr
class NSFPlayer extends AudioWorkletProcessor {
	constructor(options) {
		super();
		console.log(options);
		var setupArgs=options.processorOptions;
		Module.ccall(
			"setupNSF",
			"number",
			["array", "number", "number", "number"],
			[setupArgs.data, setupArgs.dataLength, 128*2, setupArgs.tracknum/* track number */]
		)
	}

	process(inputList, outputList, parameters) {
		// Using the inputs (or not, as needed),
		// write the output into each of the outputs
	
		const output=outputList[0];
		let channelCount=output.length;
		//if (bufReadCount<16){
		//	bufReadCount++
		//} else {
		//	bufPtr=playNSF()
		//	bufReadCount=0
		//}
		bufPtr=playNSF()
		for (let channel = 0; channel < channelCount; channel++) {
			let sampleCount = output[channel].length;
			//console.log(sampleCount) // is it always 128?
			for (let i = 0; i < sampleCount; i++) {
				//let int16sample = Module.getValue( bufPtr+i * 2 * channelCount + /* frame offset * bytes per sample * num channels + */ channel * 2  /* channel offset * bytes per sample */ + 128*bufReadCount*2 /* worklet block offset */, 'i16')
				let int16sample = Module.getValue( bufPtr+i * 2 * channelCount + /* frame offset * bytes per sample * num channels + */ channel * 2  /* channel offset * bytes per sample */, 'i16')
				let float32sample = (int16sample >= 0x8000) ? -(0x10000 - int16sample) / 0x8000 : int16sample / 0x7FFF;
				output[channel][i]=float32sample
				// I'm doing everything right and it still sounds awful
			}
		}
	
		return true;
	}
};

registerProcessor("nsfplayer", NSFPlayer);
