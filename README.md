# nsfplayer-wasm
Play a single NSF file in the browser and loop infinitely.

You can see a demonstration in index.html.

**The audio worklet functionality is non-functional.** It is part of this repository in case anyone wants to make a pull request.

## How to build
Download the source of game-music-emu from its bitbucket repository. Follow the wiki steps to compile, but use emscripten tools. Use this command for cmake:
`emcmake cmake ../ -DUSE_GME_AY=0 -DUSE_GME_GBS=0 -DUSE_GME_GYM=0 -DUSE_GME_HES=0 -DUSE_GME_KSS=0 -DUSE_GME_SAP=0 -DUSE_GME_SPC=0 -DUSE_GME_VGM=0 -DENABLE_UBSAN=OFF -DBUILD_SHARED_LIBS=OFF`

If you get errors like "gme_ay_type undefined, gme_gbs_type undefined...", you have to either edit blargg_config.h or the type_list function in gme.cpp.

Then, build the wasm and js with `emcc -O3 -I./game-music-emu/gme ./game-music-emu/build/gme/libgme.a main.c -o nsfplayerO3-mono.js -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue`

Stereo functionality is implemented by using a copy of the library that has been [hard coded to hard pan the two 2A03 square channels left and right](https://github.com/mmontag/chip-player-js/commit/839b9c27aa994b21e987a11c0ab5c6f9db5a5a67).

### Audio Worklet
Build the audio worklet module with `emcc -O3 -I./game-music-emu/gme ./game-music-emu/build/gme/libgme.a main.c -o nsfplayer-audio-worklet-mono.js -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue -s WASM_ASYNC_COMPILATION=0 -s SINGLE_FILE --post-js nsfplayer-audio-worklet-main.js`
