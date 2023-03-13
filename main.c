#include <stdlib.h>
#include <stdio.h>

#include <gme.h>
#include <emscripten/webaudio.h>

//#include <math.h> //for sin

Music_Emu* emu;
void* nsfdata;
long nsfdataSize=0;
//int track;
//int limitlogs=0;
int buf_size;

short* buf;

void handle_error( const char* str );

//static void play_siren( long count, short* out )
//	{
//		static double a, a2;
//		while ( count-- )
//			*out++ = 0x2000 * sin( a += .1 + .05*sin( a2+=.00005 ) );
//	}

EMSCRIPTEN_KEEPALIVE
int setupNSF(void* inputdata, long inputdataSize, int inputBufSize, int tracknum)
{
	printf("setupNSF\n");
	
	nsfdata = inputdata;
	
	nsfdataSize = inputdataSize;
			
	buf_size = inputBufSize;
	
	int sample_rate = 44100;
	
	/* Open music file in new emulator */
	handle_error( gme_open_data( nsfdata, nsfdataSize, &emu, sample_rate ) );
	
	printf("nsfdataSize: %li \n", nsfdataSize);
	
	/* Start track */
	handle_error( gme_start_track( emu, tracknum ) );
	
	
	buf = malloc(sizeof(*buf) * buf_size); // https://stackoverflow.com/questions/4240331/c-initializing-a-global-array-in-a-function
	//printf("array buf entry number 3: %d\n", buf[3]);
	
	printf("voice count: %d\n", gme_voice_count( emu ));
	
	for (int i=0;i<10;++i){
		gme_play( emu, buf_size*2, buf ); // I think doing this decreases the frequency of it crackling on startup
	}
	handle_error( gme_start_track( emu, tracknum ) );
	
	printf("setupNSF done\n");
	return 0;
}

EMSCRIPTEN_KEEPALIVE
short* playNSF() { // run in script processor node's on audio process event
	/* Sample buffer */
	gme_play( emu, buf_size*2, buf ); // I don't know why buf_size is multiplied by 2 here, but it only works when it's multiplied by 2. I figured this out from studying Chip Player JS.
	//if (limitlogs<1) {
	//	short tempbuf [buf_size];
	//	size_t n = sizeof(tempbuf)/sizeof(tempbuf[0]);
	//	printf("total size of buf: %zu\n", sizeof(tempbuf));
	//	printf("number of elements in buf: %zu\n", n);
	//	printf("size of buf_size: %d\n", buf_size);
	//	printf("size of buf_size times 2: %d\n", buf_size*2);
	//	printf("size of one element in buf: %lu\n", sizeof(buf[1]));
	//	++limitlogs;
	//}
	//play_siren(buf_size, buf);
	/*if (limitlogs < 50) {
		handle_error( gme_play( emu, buf_size, buf ) );
		printf("array buf entry number 0: %d\n", buf[0]);
		printf("array buf entry number 1: %d\n", buf[1]);
		printf("array buf entry number 2: %d\n", buf[2]);
		printf("array buf entry number 3: %d\n", buf[3]);
		printf("array buf entry number 4: %d\n", buf[4]);
		printf("array buf entry number 5: %d\n", buf[5]);
		++limitlogs;
	} else {
		gme_play( emu, buf_size, buf );
	}*/
	
	// the c code cannot return an array to javascript, use runtime method getValue to access the buf array.
	return buf; //buf is a pointer, c arrays are pointers.
}

void handle_error( const char* str )
{
	if ( str )
	{
		printf( "Error: %s\n", str ); //getchar();
		//exit( EXIT_FAILURE );
	}
}